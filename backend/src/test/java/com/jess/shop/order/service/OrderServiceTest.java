package com.jess.shop.order.service;

import com.jess.shop.cart.repository.CartItemRepository;
import com.jess.shop.catalog.entity.ProductVariant;
import com.jess.shop.catalog.repository.ProductVariantRepository;
import com.jess.shop.customer.entity.Customer;
import com.jess.shop.customer.repository.AddressRepository;
import com.jess.shop.customer.repository.CustomerRepository;
import com.jess.shop.notification.service.EmailService;
import com.jess.shop.order.entity.Order;
import com.jess.shop.order.entity.OrderItem;
import com.jess.shop.order.entity.OrderStatus;
import com.jess.shop.order.repository.OrderItemRepository;
import com.jess.shop.order.repository.OrderRepository;
import com.jess.shop.payment.service.StripeRefundService;
import com.jess.shop.shipping.repository.ShipmentRepository;
import com.jess.shop.shipping.service.ShippoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Covers OrderService.markPaid -- the one place money, stock, and email all get touched together
 * once Stripe confirms payment. The idempotency guard and the oversell path are the two behaviors
 * this shop explicitly depends on never regressing silently. */
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderItemRepository orderItemRepository;
    @Mock private ProductVariantRepository variantRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private AddressRepository addressRepository;
    @Mock private EmailService emailService;
    @Mock private StripeRefundService stripeRefundService;
    @Mock private ShippoService shippoService;
    @Mock private CartItemRepository cartItemRepository;
    @Mock private ShipmentRepository shipmentRepository;

    private OrderService service;

    @BeforeEach
    void setUp() {
        service = new OrderService(orderRepository, orderItemRepository, variantRepository, customerRepository,
            addressRepository, emailService, stripeRefundService, shippoService, cartItemRepository, shipmentRepository);
    }

    private Order pendingOrderWithOneItem(UUID orderId, UUID variantId, int quantity) {
        Order order = Order.builder().id(orderId).email("buyer@example.com").status(OrderStatus.PENDING)
            .subtotal(BigDecimal.valueOf(50)).total(BigDecimal.valueOf(50)).build();
        OrderItem item = OrderItem.builder().id(UUID.randomUUID()).orderId(orderId).productVariantId(variantId)
            .quantity(quantity).unitPrice(BigDecimal.valueOf(50)).lineTotal(BigDecimal.valueOf(50)).build();
        when(orderRepository.findAndLockByStripeCheckoutSessionId("sess_1")).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(orderId)).thenReturn(List.of(item));
        when(customerRepository.findByEmail("buyer@example.com"))
            .thenReturn(Optional.of(Customer.builder().id(UUID.randomUUID()).email("buyer@example.com").build()));
        return order;
    }

    @Test
    void doesNothingIfOrderIsAlreadyPaid() {
        UUID orderId = UUID.randomUUID();
        Order alreadyPaid = Order.builder().id(orderId).status(OrderStatus.PAID).build();
        when(orderRepository.findAndLockByStripeCheckoutSessionId("sess_1")).thenReturn(Optional.of(alreadyPaid));

        service.markPaid("sess_1", "pi_1", "buyer@example.com", null, null, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.TEN);

        verifyNoInteractions(variantRepository, emailService, cartItemRepository);
        verify(orderRepository, never()).save(any());
    }

    @Test
    void happyPathDecrementsStockMarksPaidAndEmailsConfirmation() {
        UUID orderId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        Order order = pendingOrderWithOneItem(orderId, variantId, 2);
        when(variantRepository.decrementStock(variantId, 2)).thenReturn(1);

        service.markPaid("sess_1", "pi_1", "buyer@example.com", null, null,
            BigDecimal.valueOf(4), BigDecimal.valueOf(6), BigDecimal.valueOf(60));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(order.getPaidAt()).isNotNull();
        verify(variantRepository).decrementStock(variantId, 2);
        verify(variantRepository, never()).findById(any());
        verify(emailService, never()).sendOversellAlert(any(), any(), anyInt(), anyInt());
        verify(emailService).sendOrderConfirmation(eq("buyer@example.com"), eq(orderId), any(), any(),
            any(), any(), any(), eq(BigDecimal.valueOf(60)));
        verify(orderRepository).save(order);
    }

    @Test
    void stillCompletesTheOrderButAlertsWarehouseWhenStockRanOut() {
        UUID orderId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        Order order = pendingOrderWithOneItem(orderId, variantId, 3);
        when(variantRepository.decrementStock(variantId, 3)).thenReturn(0); // oversold
        when(variantRepository.findById(variantId))
            .thenReturn(Optional.of(ProductVariant.builder().id(variantId).stockQty(1).build()));

        service.markPaid("sess_1", "pi_1", "buyer@example.com", null, null,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.valueOf(50));

        // Payment already succeeded -- the order still completes even though stock fell short.
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
        verify(emailService).sendOversellAlert(orderId, variantId, 3, 1);
        verify(emailService).sendOrderConfirmation(eq("buyer@example.com"), eq(orderId), any(), any(), any(), any(), any(), any());
    }
}
