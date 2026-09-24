package com.jess.shop.shipping.controller;

import com.jess.shop.shipping.dto.AdminShippingDtos.*;
import com.jess.shop.shipping.service.ShipmentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/orders/{orderId}/shipping")
public class AdminShipmentController {

    private final ShipmentService shipmentService;

    public AdminShipmentController(ShipmentService shipmentService) {
        this.shipmentService = shipmentService;
    }

    @GetMapping("/rates")
    public ShippingRatesResponse rates(@PathVariable UUID orderId) {
        return shipmentService.getRatesForOrder(orderId);
    }

    /** So the admin can still see/print the label and tracking link after navigating away and back --
     * previously this only ever appeared in the immediate response of buying it, then was lost. */
    @GetMapping
    public List<ShipmentDto> shipments(@PathVariable UUID orderId) {
        return shipmentService.getShipmentsForOrder(orderId);
    }

    @PostMapping("/label")
    public ShipmentDto buyLabel(@PathVariable UUID orderId, @Valid @RequestBody BuyLabelRequest request) {
        return shipmentService.buyLabel(orderId, request);
    }
}
