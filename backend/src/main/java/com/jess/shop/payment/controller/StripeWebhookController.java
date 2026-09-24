package com.jess.shop.payment.controller;

import com.jess.shop.payment.service.StripeWebhookService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/webhooks")
public class StripeWebhookController {

    private final StripeWebhookService stripeWebhookService;

    public StripeWebhookController(StripeWebhookService stripeWebhookService) {
        this.stripeWebhookService = stripeWebhookService;
    }

    /** Body is bound as a raw String (not parsed to an object) because Stripe's signature check
     * needs the exact original bytes -- re-serializing a parsed object would invalidate it. */
    @PostMapping("/stripe")
    public ResponseEntity<Void> handle(@RequestBody String payload, @RequestHeader("Stripe-Signature") String sigHeader) {
        stripeWebhookService.handle(payload, sigHeader);
        return ResponseEntity.ok().build();
    }
}
