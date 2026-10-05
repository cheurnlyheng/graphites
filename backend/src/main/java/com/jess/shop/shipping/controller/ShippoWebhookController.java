package com.jess.shop.shipping.controller;

import com.jess.shop.shipping.dto.ShippoDtos.TrackingWebhookPayload;
import com.jess.shop.shipping.service.ShippoWebhookService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/webhooks")
public class ShippoWebhookController {

    private final ShippoWebhookService shippoWebhookService;

    public ShippoWebhookController(ShippoWebhookService shippoWebhookService) {
        this.shippoWebhookService = shippoWebhookService;
    }

    /** URL to register with Shippo (Settings > API > Webhooks) for the track_updated event:
     * {frontend-facing backend URL}/api/webhooks/shippo?token={shippo.webhook-token}. */
    @PostMapping("/shippo")
    public ResponseEntity<Void> handle(@RequestParam(required = false) String token, @RequestBody TrackingWebhookPayload payload) {
        shippoWebhookService.handle(token, payload);
        return ResponseEntity.ok().build();
    }
}
