package com.jess.shop.returns.dto;

import com.jess.shop.returns.entity.ReturnStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ReturnDtos {

    public record ReturnItemRequest(@NotNull UUID orderItemId, @Positive int quantity, String reason) {}

    /** At least two condition photos (front/back) are required -- a text reason alone isn't enough for
     * admin to judge whether an item is actually in returnable condition before approving a refund.
     * The exact count is enforced in ReturnService.create, where the error message can explain why. */
    public record CreateReturnRequest(@NotEmpty List<ReturnItemRequest> items, String reason,
                                       @NotEmpty List<String> photoUrls) {}

    /** shopFault determines who pays for return shipping -- true (defective/wrong item) means the shop
     * eats the label cost; false (customer's choice) means it gets deducted from the refund later. */
    public record ApproveReturnRequest(boolean shopFault) {}

    /** note is an optional message to the customer explaining why -- same pattern as OrderService.cancel. */
    public record RejectReturnRequest(String note) {}

    public record ReturnItemResponse(UUID id, UUID orderItemId, String productName, int quantity, String reason) {}

    public record ReturnResponse(UUID id, UUID orderId, ReturnStatus status, String reason,
                                  Instant requestedAt, Instant resolvedAt, Boolean shopFault,
                                  String returnLabelUrl, String returnTrackingUrl, BigDecimal returnLabelCost,
                                  List<ReturnItemResponse> items, List<String> photoUrls) {}

    public record PhotoUploadResponse(String url) {}

    /** restock=true increments stock back (item is sellable); false is used for damaged/final-sale returns. */
    public record ResolveReturnRequest(boolean restock) {}
}
