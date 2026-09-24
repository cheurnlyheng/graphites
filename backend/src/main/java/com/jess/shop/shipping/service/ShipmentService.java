package com.jess.shop.shipping.service;

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
import com.jess.shop.shipping.dto.ShippoDtos.*;
import com.jess.shop.shipping.entity.Shipment;
import com.jess.shop.shipping.repository.ShipmentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
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

        AddressPayload from = warehouseAddress();
        AddressPayload to = new AddressPayload(shipTo.getFullName(), shipTo.getLine1(), shipTo.getLine2(), shipTo.getCity(),
            shipTo.getState(), shipTo.getPostalCode(), shipTo.getCountry(), shipTo.getPhone(), order.getEmail());

        ShipmentResponse response = shippoService.getRates(from, to, estimateParcel(order));
        List<ShippingRateOption> options = response.rates().stream()
            .map(r -> new ShippingRateOption(r.objectId(), r.provider(),
                r.serviceLevel() != null ? String.valueOf(r.serviceLevel().get("name")) : null,
                r.amount(), r.currency(), r.estimatedDays()))
            .toList();
        return new ShippingRatesResponse(options);
    }

    @Transactional
    public ShipmentDto buyLabel(UUID orderId, BuyLabelRequest request) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

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
            .shippedAt(request.returnLabel() ? null : Instant.now())
            .build();
        shipment = shipmentRepository.save(shipment);

        if (!request.returnLabel()) {
            order.setStatus(OrderStatus.SHIPPED);
            orderRepository.save(order);
            emailService.sendShippingConfirmation(order.getEmail(), order.getId(), shipment.getCarrier(),
                shipment.getTrackingNumber(), shipment.getTrackingUrl());
        }

        return new ShipmentDto(shipment.getId(), orderId, shipment.getCarrier(), shipment.getTrackingNumber(),
            shipment.getLabelUrl(), shipment.getTrackingUrl(), shipment.isReturnLabel(), shipment.getShippedAt());
    }

    private AddressPayload warehouseAddress() {
        return new AddressPayload(warehouseName, warehouseStreet1, null, warehouseCity, warehouseState, warehouseZip,
            warehouseCountry, warehousePhone, warehouseEmail);
    }

    /** MVP approximation: sums each line item's product weight and assumes one fixed default box
     * size, since accurately bin-packing arbitrary items into an optimal box is out of scope for now. */
    private ParcelPayload estimateParcel(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        int totalGrams = 0;
        for (OrderItem item : items) {
            if (item.getProductVariantId() == null) continue; // product was deleted since this order was placed
            ProductVariant variant = variantRepository.findById(item.getProductVariantId()).orElse(null);
            if (variant == null) continue;
            Product product = productRepository.findById(variant.getProductId()).orElse(null);
            int weight = (product != null && product.getWeightGrams() != null) ? product.getWeightGrams() : 300;
            totalGrams += weight * item.getQuantity();
        }
        if (totalGrams == 0) {
            totalGrams = 300;
        }
        return new ParcelPayload("30", "20", "10", "cm", String.valueOf(totalGrams), "g");
    }
}
