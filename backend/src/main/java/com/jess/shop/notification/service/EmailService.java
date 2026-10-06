package com.jess.shop.notification.service;

import com.jess.shop.customer.entity.Address;
import com.jess.shop.notification.dto.ResendDtos.SendEmailRequest;
import com.jess.shop.order.entity.OrderItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

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

    @Value("${app.store.order-notification-email}")
    private String orderNotificationEmail;

    public EmailService(WebClient resendWebClient) {
        this.resendWebClient = resendWebClient;
    }

    public void sendOrderConfirmation(String toEmail, UUID orderId, List<OrderItem> items, Address shippingAddress,
                                       BigDecimal subtotal, BigDecimal shippingAmount, BigDecimal taxAmount, BigDecimal total) {
        String trackUrl = frontendBaseUrl + "/orders/" + orderId;

        String itemRows = items.stream().map(item -> {
            String variantLine = (item.getVariantAttributesSnapshot() != null && !item.getVariantAttributesSnapshot().isBlank())
                ? "<br><span style=\"color:#888;font-size:13px;\">%s</span>".formatted(escapeHtml(item.getVariantAttributesSnapshot()))
                : "";
            return """
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #eee;">%s%s<br><span style="color:#888;font-size:13px;">Qty %d &times; $%s</span></td>
                  <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">$%s</td>
                </tr>
                """.formatted(escapeHtml(item.getProductNameSnapshot()), variantLine, item.getQuantity(), item.getUnitPrice(), item.getLineTotal());
        }).collect(Collectors.joining());

        String addressBlock = shippingAddress == null ? "" : """
            <p style="margin-top:20px;">
              <strong>Shipping to</strong><br>
              %s<br>%s%s<br>%s%s %s<br>%s
            </p>
            """.formatted(
                escapeHtml(shippingAddress.getFullName()),
                escapeHtml(shippingAddress.getLine1()),
                (shippingAddress.getLine2() != null && !shippingAddress.getLine2().isBlank()) ? "<br>" + escapeHtml(shippingAddress.getLine2()) : "",
                escapeHtml(shippingAddress.getCity()),
                (shippingAddress.getState() != null && !shippingAddress.getState().isBlank()) ? ", " + escapeHtml(shippingAddress.getState()) : "",
                escapeHtml(shippingAddress.getPostalCode()),
                escapeHtml(shippingAddress.getCountry()));

        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Thank you for your order!</h2>
              <p>Your payment went through and your order is being prepared for shipment. Here's what's in it:</p>
              <table style="width:100%%;border-collapse:collapse;margin-top:12px;">
                %s
              </table>
              <table style="width:100%%;margin-top:8px;font-size:14px;color:#444;">
                <tr><td style="padding:2px 0;">Subtotal</td><td style="text-align:right;padding:2px 0;">$%s</td></tr>
                <tr><td style="padding:2px 0;">Shipping</td><td style="text-align:right;padding:2px 0;">$%s</td></tr>
                <tr><td style="padding:2px 0;">Tax</td><td style="text-align:right;padding:2px 0;">$%s</td></tr>
                <tr><td style="padding:6px 0 0;font-weight:bold;border-top:1px solid #ddd;">Total</td><td style="text-align:right;padding:6px 0 0;font-weight:bold;border-top:1px solid #ddd;">$%s</td></tr>
              </table>
              %s
              <p style="margin-top:20px;"><a href="%s" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:4px;">Track your order</a></p>
              <p style="color:#888;font-size:13px;">Questions about this order? Just reply to this email and mention order reference %s.</p>
            </div>
            """.formatted(itemRows, subtotal, shippingAmount, taxAmount, total, addressBlock, trackUrl, orderId);
        send(toEmail, "Your order is confirmed", html);
    }

    /** Fired once per paid order (see OrderService.markPaid) so the shop finds out about a sale
     * without needing to keep the admin dashboard open. Separate recipient from warehouse.email --
     * that one's for operational alerts (oversold items), this is the general "you made a sale" line. */
    public void sendNewOrderNotification(UUID orderId, String customerEmail, int itemCount, BigDecimal total) {
        String orderUrl = frontendBaseUrl + "/admin/orders/" + orderId;
        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>New order received</h2>
              <p><strong>$%s</strong> from <strong>%s</strong> (%d item%s).</p>
              <p><a href="%s" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:4px;">Open this order</a></p>
              <p style="color:#888;font-size:13px;">Order reference: %s</p>
            </div>
            """.formatted(total, escapeHtml(customerEmail), itemCount, itemCount == 1 ? "" : "s", orderUrl, orderId);
        send(orderNotificationEmail, "New order -- $" + total, html);
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

    /** Fired once per return request (see ReturnService.create) so the shop finds out without needing to
     * keep /admin/returns open. Links the photos rather than attaching them -- same pattern as every
     * other link in this app, and Resend has no attachment plumbing wired up here anyway. */
    public void sendNewReturnNotification(UUID returnId, UUID orderId, String customerEmail, String reason, List<String> photoUrls) {
        String returnUrl = frontendBaseUrl + "/admin/returns";
        String reasonLine = (reason != null && !reason.isBlank()) ? "<p>%s</p>".formatted(escapeHtml(reason)) : "";
        String photoLinks = photoUrls.stream()
            .map(url -> "<a href=\"%s\" style=\"margin-right:8px;\">Photo</a>".formatted(url))
            .collect(Collectors.joining());
        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>New return request</h2>
              <p>From <strong>%s</strong> on order <strong>%s</strong>.</p>
              %s
              <p>%s</p>
              <p><a href="%s" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:4px;">Review this return</a></p>
              <p style="color:#888;font-size:13px;">Return reference: %s</p>
            </div>
            """.formatted(escapeHtml(customerEmail), orderId, reasonLine, photoLinks, returnUrl, returnId);
        send(orderNotificationEmail, "New return request on order " + orderId, html);
    }

    /** Fired once the admin buys the return label (see ReturnService.buyReturnLabel) -- this is what the
     * "we'll email you with return label instructions once reviewed" message on the order page refers to. */
    public void sendReturnLabel(String toEmail, UUID returnId, String labelUrl, String trackingNumber, String carrier) {
        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Your return label is ready</h2>
              <p>Print the label below, attach it to your package, and drop it off with %s.</p>
              <p><a href="%s" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:4px;">Download return label</a></p>
              <p>Tracking number: <strong>%s</strong></p>
              <p style="color:#888;font-size:13px;">Once we receive and inspect the item, we'll process your refund. Return reference: %s</p>
            </div>
            """.formatted(escapeHtml(carrier), labelUrl, trackingNumber, returnId);
        send(toEmail, "Your return label is ready", html);
    }

    /** note is an optional admin-typed explanation -- same pattern as sendOrderCancellation's reasonLine. */
    public void sendReturnRejected(String toEmail, UUID returnId, String note) {
        String noteLine = (note != null && !note.isBlank()) ? "<p>%s</p>".formatted(escapeHtml(note)) : "";
        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Your return request wasn't approved</h2>
              <p>We're not able to process this return.</p>
              %s
              <p style="color:#888;font-size:13px;">Questions about this decision? Just reply to this email and mention return reference %s.</p>
            </div>
            """.formatted(noteLine, returnId);
        send(toEmail, "Update on your return request", html);
    }

    /** labelDeducted is only ever non-zero on a customer-fault return (see ReturnService.refund) --
     * called out explicitly so the refund total doesn't look like a mistake. */
    public void sendReturnRefunded(String toEmail, UUID returnId, BigDecimal refundAmount, BigDecimal labelDeducted) {
        String deductionLine = (labelDeducted != null && labelDeducted.compareTo(BigDecimal.ZERO) > 0)
            ? "<p style=\"color:#888;font-size:13px;\">Return shipping ($%s) was deducted from this refund.</p>".formatted(labelDeducted)
            : "";
        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Your refund has been issued</h2>
              <p><strong>$%s</strong> has been refunded to your original payment method.</p>
              %s
              <p style="color:#888;font-size:13px;">Return reference: %s</p>
            </div>
            """.formatted(refundAmount, deductionLine, returnId);
        send(toEmail, "Your refund has been issued", html);
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
