package com.jess.shop.shipping.service;

import com.jess.shop.cart.dto.CartDtos.CartItemResponse;
import com.jess.shop.catalog.entity.Product;
import com.jess.shop.catalog.entity.ProductVariant;
import com.jess.shop.catalog.repository.ProductRepository;
import com.jess.shop.catalog.repository.ProductVariantRepository;
import com.jess.shop.common.exception.ResourceNotFoundException;
import com.jess.shop.customer.entity.Address;
import com.jess.shop.customer.repository.AddressRepository;
import com.jess.shop.notification.service.EmailService;
import com.jess.shop.order.entity.Order;
import com.jess.shop.order.entity.OrderItem;
import com.jess.shop.order.entity.OrderStatus;
import com.jess.shop.order.repository.OrderItemRepository;
import com.jess.shop.order.repository.OrderRepository;
import com.jess.shop.shipping.dto.AdminShippingDtos.*;
import com.jess.shop.shipping.dto.CheckoutShippingDtos.ShippingAddressRequest;
import com.jess.shop.shipping.dto.ShippoDtos.*;
import com.jess.shop.shipping.entity.Shipment;
import com.jess.shop.shipping.repository.ShipmentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class ShipmentService {

    private final ShippoService shippoService;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final AddressRepository addressRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductRepository productRepository;
    private final ShipmentRepository shipmentRepository;
    private final EmailService emailService;

    @Value("${app.warehouse.name}") private String warehouseName;
    @Value("${app.warehouse.street1}") private String warehouseStreet1;
    @Value("${app.warehouse.city}") private String warehouseCity;
    @Value("${app.warehouse.state}") private String warehouseState;
    @Value("${app.warehouse.zip}") private String warehouseZip;
    @Value("${app.warehouse.country}") private String warehouseCountry;
    @Value("${app.warehouse.phone}") private String warehousePhone;
    @Value("${app.warehouse.email}") private String warehouseEmail;

    public ShipmentService(ShippoService shippoService, OrderRepository orderRepository, OrderItemRepository orderItemRepository,
                            AddressRepository addressRepository, ProductVariantRepository variantRepository,
                            ProductRepository productRepository, ShipmentRepository shipmentRepository,
                            EmailService emailService) {
        this.shippoService = shippoService;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.addressRepository = addressRepository;
        this.variantRepository = variantRepository;
        this.productRepository = productRepository;
        this.shipmentRepository = shipmentRepository;
        this.emailService = emailService;
    }

    public List<ShipmentDto> getShipmentsForOrder(UUID orderId) {
        return shipmentRepository.findByOrderId(orderId).stream()
            .map(s -> new ShipmentDto(s.getId(), s.getOrderId(), s.getCarrier(), s.getTrackingNumber(),
                s.getLabelUrl(), s.getTrackingUrl(), s.isReturnLabel(), s.getShippedAt()))
            .toList();
    }

    public ShippingRatesResponse getRatesForOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (order.getShippingAddressId() == null) {
            throw new IllegalStateException("Order has no shipping address yet");
        }
        Address shipTo = addressRepository.findById(order.getShippingAddressId())
            .orElseThrow(() -> new ResourceNotFoundException("Shipping address not found"));

        AddressPayload to = new AddressPayload(shipTo.getFullName(), shipTo.getLine1(), shipTo.getLine2(), shipTo.getCity(),
            shipTo.getState(), shipTo.getPostalCode(), shipTo.getCountry(), shipTo.getPhone(), order.getEmail());
        return quoteRates(to, estimateParcel(order));
    }

    /** Same rate quote, before an order even exists -- the checkout page calls this once the customer
     * has entered their address, so they can pick a real delivery method (and its real price) before
     * ever reaching Stripe. See CheckoutController. */
    public ShippingRatesResponse getRatesForAddress(List<CartItemResponse> cartItems, ShippingAddressRequest shipTo) {
        AddressPayload to = new AddressPayload(shipTo.fullName(), shipTo.line1(), shipTo.line2(), shipTo.city(),
            shipTo.state(), shipTo.postalCode(), shipTo.country(), shipTo.phone(), shipTo.email());
        return quoteRates(to, estimateParcelForCart(cartItems));
    }

    /** Guards against a forged checkout request: the customer picked a rate from a real quote earlier
     * (see getRatesForAddress), but nothing stops a direct API call from claiming any carrier/service/
     * price it wants instead -- without this, that forged amount would go straight into the Stripe
     * session as the actual shipping charge. Re-quotes fresh and requires an exact match on provider,
     * service level, and price; rates aren't identified by a stable id across calls (Shippo mints a new
     * object_id each time), so provider+service+amount is the only thing that can reasonably be
     * compared between the quote the customer saw and the one being verified against now. */
    public void verifySelectedRate(List<CartItemResponse> cartItems, ShippingAddressRequest shipTo,
                                    String carrier, String serviceLevel, BigDecimal claimedAmount) {
        ShippingRatesResponse freshRates = getRatesForAddress(cartItems, shipTo);
        boolean matches = freshRates.rates().stream().anyMatch(r ->
            r.provider().equalsIgnoreCase(carrier)
                && Objects.equals(r.serviceLevel(), serviceLevel)
                && new BigDecimal(r.amount()).compareTo(claimedAmount) == 0
        );
        if (!matches) {
            throw new IllegalStateException("That delivery method is no longer available -- please choose a delivery method again.");
        }
    }

    private ShippingRatesResponse quoteRates(AddressPayload to, ParcelPayload parcel) {
        ShipmentResponse response = shippoService.getRates(warehouseAddress(), to, parcel);
        List<ShippingRateOption> options = response.rates().stream()
            .map(r -> new ShippingRateOption(r.objectId(), r.provider(),
                r.serviceLevel() != null ? String.valueOf(r.serviceLevel().get("name")) : null,
                r.amount(), r.currency(), r.estimatedDays()))
            .toList();
        return new ShippingRatesResponse(options);
    }

    /** Buying a label spends money, so the order row is locked for the whole purchase: a double-clicked button (or two
     * admins) makes the second request wait, find the order already past PAID, and stop -- instead of buying twice.
     * This only ever moves the order to LABEL_PURCHASED (packing has started) -- it does NOT mean the carrier has the
     * package yet, so no shipping-confirmation email goes out here. See markShipped for that. */
    @Transactional
    public ShipmentDto buyLabel(UUID orderId, BuyLabelRequest request) {
        Order order = orderRepository.findAndLockById(orderId).orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!request.returnLabel()) {
            requireReadyToShip(order);
        }

        TransactionResponse transaction = shippoService.buyLabel(request.rateObjectId());
        if (!"SUCCESS".equalsIgnoreCase(transaction.status())) {
            String reason = (transaction.messages() == null || transaction.messages().isEmpty())
                ? "no reason given by Shippo"
                : transaction.messages().stream().map(TransactionMessage::text).reduce((a, b) -> a + "; " + b).orElseThrow();
            throw new IllegalStateException("Shippo could not create the label: " + reason);
        }

        Shipment shipment = Shipment.builder()
            .orderId(orderId)
            .carrier(request.carrier())
            .trackingNumber(transaction.trackingNumber())
            .shippoTransactionId(transaction.objectId())
            .labelUrl(transaction.labelUrl())
            .trackingUrl(transaction.trackingUrlProvider())
            .returnLabel(request.returnLabel())
            .build();
        shipment = shipmentRepository.save(shipment);

        if (!request.returnLabel()) {
            order.setStatus(OrderStatus.LABEL_PURCHASED);
            orderRepository.save(order);
        }

        return new ShipmentDto(shipment.getId(), orderId, shipment.getCarrier(), shipment.getTrackingNumber(),
            shipment.getLabelUrl(), shipment.getTrackingUrl(), shipment.isReturnLabel(), shipment.getShippedAt());
    }

    /** The actual "handed to the carrier" moment -- separate from buying the label, which just means packing has
     * started (see buyLabel). This is the only place the shipping-confirmation email goes out. */
    @Transactional
    public ShipmentDto markShipped(UUID orderId) {
        Order order = orderRepository.findAndLockById(orderId).orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (order.getStatus() != OrderStatus.LABEL_PURCHASED) {
            throw new IllegalStateException(switch (order.getStatus()) {
                case SHIPPED, DELIVERED -> "This order has already been marked as shipped.";
                case CANCELLED -> "This order was cancelled.";
                default -> "Buy a shipping label for this order before marking it as shipped.";
            });
        }

        Shipment shipment = shipmentRepository.findFirstByOrderIdAndReturnLabelFalseOrderByShippedAtDesc(orderId)
            .orElseThrow(() -> new IllegalStateException("No shipping label found for this order."));
        shipment.setShippedAt(Instant.now());
        shipment = shipmentRepository.save(shipment);

        order.setStatus(OrderStatus.SHIPPED);
        orderRepository.save(order);
        emailService.sendShippingConfirmation(order.getEmail(), order.getId(), shipment.getCarrier(),
            shipment.getTrackingNumber(), shipment.getTrackingUrl());

        return new ShipmentDto(shipment.getId(), orderId, shipment.getCarrier(), shipment.getTrackingNumber(),
            shipment.getLabelUrl(), shipment.getTrackingUrl(), shipment.isReturnLabel(), shipment.getShippedAt());
    }

    private void requireReadyToShip(Order order) {
        switch (order.getStatus()) {
            case PAID -> {
                if (order.getShippingAddressId() == null) {
                    throw new IllegalStateException("This order has no shipping address, so a label can't be bought for it");
                }
            }
            case PENDING -> throw new IllegalStateException("This order isn't paid yet -- a label can only be bought once payment is confirmed");
            case LABEL_PURCHASED, SHIPPED, DELIVERED -> {
                String tracking = shipmentRepository.findFirstByOrderIdAndReturnLabelFalseOrderByShippedAtDesc(order.getId())
                    .map(Shipment::getTrackingNumber).orElse(null);
                throw new IllegalStateException("A label has already been bought for this order" + (tracking != null ? " (tracking " + tracking + ")" : ""));
            }
            case CANCELLED -> throw new IllegalStateException("This order was cancelled, so no label can be bought for it");
        }
    }

    private AddressPayload warehouseAddress() {
        return new AddressPayload(warehouseName, warehouseStreet1, null, warehouseCity, warehouseState, warehouseZip,
            warehouseCountry, warehousePhone, warehouseEmail);
    }

    /** MVP approximation: sums each line item's product weight and assumes one fixed default box
     * size, since accurately bin-packing arbitrary items into an optimal box is out of scope for now. */
    private ParcelPayload estimateParcel(Order order) {
        Map<UUID, Integer> qtyByVariant = new HashMap<>();
        for (OrderItem item : orderItemRepository.findByOrderId(order.getId())) {
            if (item.getProductVariantId() == null) continue; // product was deleted since this order was placed
            qtyByVariant.merge(item.getProductVariantId(), item.getQuantity(), Integer::sum);
        }
        return estimateParcelFromVariants(qtyByVariant);
    }

    /** Same estimate, from a cart instead of a placed order -- see getRatesForAddress. */
    private ParcelPayload estimateParcelForCart(List<CartItemResponse> cartItems) {
        Map<UUID, Integer> qtyByVariant = new HashMap<>();
        for (CartItemResponse item : cartItems) {
            qtyByVariant.merge(item.productVariantId(), item.quantity(), Integer::sum);
        }
        return estimateParcelFromVariants(qtyByVariant);
    }

    private ParcelPayload estimateParcelFromVariants(Map<UUID, Integer> qtyByVariant) {
        int totalGrams = 0;
        for (Map.Entry<UUID, Integer> entry : qtyByVariant.entrySet()) {
            ProductVariant variant = variantRepository.findById(entry.getKey()).orElse(null);
            if (variant == null) continue;
            Product product = productRepository.findById(variant.getProductId()).orElse(null);
            int weight = (product != null && product.getWeightGrams() != null) ? product.getWeightGrams() : 300;
            totalGrams += weight * entry.getValue();
        }
        if (totalGrams == 0) {
            totalGrams = 300;
        }
        return new ParcelPayload("30", "20", "10", "cm", String.valueOf(totalGrams), "g");
    }
}
