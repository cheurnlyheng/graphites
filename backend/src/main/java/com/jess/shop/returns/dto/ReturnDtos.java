package com.jess.shop.returns.dto;

import com.jess.shop.returns.entity.ReturnStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ReturnDtos {

    public record ReturnItemRequest(@NotNull UUID orderItemId, @Positive int quantity, String reason) {}

    public record CreateReturnRequest(@NotEmpty List<ReturnItemRequest> items, String reason) {}

    public record ReturnItemResponse(UUID id, UUID orderItemId, String productName, int quantity, String reason) {}

    public record ReturnResponse(UUID id, UUID orderId, ReturnStatus status, String reason,
                                  Instant requestedAt, Instant resolvedAt, List<ReturnItemResponse> items) {}

    /** restock=true increments stock back (item is sellable); false is used for damaged/final-sale returns. */
    public record ResolveReturnRequest(boolean restock) {}
}
