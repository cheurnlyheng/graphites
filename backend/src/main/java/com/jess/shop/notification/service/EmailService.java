package com.jess.shop.notification.service;

import com.jess.shop.notification.dto.ResendDtos.SendEmailRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Transactional email via Resend. A guest's order-confirmation email doubles as their only way to
 * track the order later (no account required) -- see the "track your order" link in each template. */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final WebClient resendWebClient;

    @Value("${resend.api-key}")
    private String apiKey;

    @Value("${resend.from-email}")
    private String fromEmail;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    @Value("${app.warehouse.email}")
    private String warehouseEmail;

    public EmailService(WebClient resendWebClient) {
        this.resendWebClient = resendWebClient;
    }

    public void sendOrderConfirmation(String toEmail, UUID orderId, BigDecimal total) {
        String trackUrl = frontendBaseUrl + "/orders/" + orderId;
        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Thank you for your order!</h2>
              <p>Your payment of <strong>$%s</strong> went through and your order is being prepared.</p>
              <p><a href="%s" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;
                 text-decoration:none;border-radius:4px;">Track your order</a></p>
              <p style="color:#888;font-size:13px;">Order reference: %s</p>
            </div>
            """.formatted(total, trackUrl, orderId);
        send(toEmail, "Your order is confirmed", html);
    }

    public void sendShippingConfirmation(String toEmail, UUID orderId, String carrier, String trackingNumber, String trackingUrl) {
        String orderUrl = frontendBaseUrl + "/orders/" + orderId;
        String trackingLine = (trackingUrl != null && !trackingUrl.isBlank())
            ? "<p><a href=\"%s\" style=\"display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:4px;\">Track package (%s)</a></p>".formatted(trackingUrl, carrier)
            : "<p>Carrier: %s &middot; Tracking number: %s</p>".formatted(carrier, trackingNumber);
        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Your order has shipped!</h2>
              <p>Tracking number: <strong>%s</strong></p>
              %s
              <p><a href="%s">View order details</a></p>
            </div>
            """.formatted(trackingNumber, trackingLine, orderUrl);
        send(toEmail, "Your order has shipped", html);
    }

    public void sendOrderCancellation(String toEmail, UUID orderId, BigDecimal refundAmount, String reason) {
        String orderUrl = frontendBaseUrl + "/orders/" + orderId;
        String reasonLine = (reason != null && !reason.isBlank())
            ? "<p>%s</p>".formatted(escapeHtml(reason))
            : "";
        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Your order has been cancelled</h2>
              <p>Your order has been cancelled and <strong>$%s</strong> has been refunded in full to your original payment method.</p>
              %s
              <p><a href="%s">View order details</a></p>
              <p style="color:#888;font-size:13px;">Order reference: %s</p>
            </div>
            """.formatted(refundAmount, reasonLine, orderUrl, orderId);
        send(toEmail, "Your order has been cancelled", html);
    }

    /** Payment already succeeded when this fires (see OrderService) -- stock simply ran out between two
     * near-simultaneous checkouts. Nobody was watching the server log for the old OVERSOLD line, so this
     * sends the same alert to the shop's own warehouse address instead, where a human can actually act on
     * it (refund the item or substitute/backorder it). */
    public void sendOversellAlert(UUID orderId, UUID variantId, int quantityWanted, int quantityAvailable) {
        String orderUrl = frontendBaseUrl + "/admin/orders/" + orderId;
        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Oversold item needs attention</h2>
              <p>Order <strong>%s</strong> was paid for <strong>%d</strong> unit(s) of variant
                 <strong>%s</strong>, but only <strong>%d</strong> were in stock at the time.</p>
              <p>The customer has already been charged. Refund the shortfall, substitute, or contact
                 them about a backorder.</p>
              <p><a href="%s">Open this order</a></p>
            </div>
            """.formatted(orderId, quantityWanted, variantId, quantityAvailable, orderUrl);
        send(warehouseEmail, "Oversold item on order " + orderId, html);
    }

    /** The cancellation reason is free text an admin typed, dropped straight into an HTML email -- escaped
     * so it can't break the markup (or, worse, inject a link/script) if someone pastes something odd in. */
    private static String escapeHtml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private void send(String to, String subject, String html) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Resend not configured -- skipping email '{}' to {}", subject, to);
            return;
        }
        if (to == null || to.isBlank()) {
            log.warn("No recipient email -- skipping email '{}'", subject);
            return;
        }
        try {
            resendWebClient.post()
                .uri("/emails")
                .bodyValue(new SendEmailRequest(fromEmail, List.of(to), subject, html))
                .retrieve()
                .bodyToMono(String.class)
                .block();
        } catch (Exception e) {
            // Email is a side effect, never a reason to fail a payment or shipment that already succeeded.
            log.error("Failed to send email '{}' to {}", subject, to, e);
        }
    }
}
