package com.jess.shop.cart.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class CartDtos {

    public record CartItemResponse(UUID cartItemId, UUID productVariantId, String productName, String variantAttributes,
                                    BigDecimal unitPrice, int quantity, BigDecimal lineTotal, boolean inStock,
                                    String taxCode) {}

    /** cartToken is returned so a guest's frontend can persist it (e.g. localStorage) and send it
     * back as the X-Cart-Token header on every subsequent cart request. */
    public record CartResponse(UUID cartId, String cartToken, List<CartItemResponse> items, BigDecimal subtotal) {}

    public record AddItemRequest(@NotNull UUID productVariantId, @Positive int quantity) {}

    public record UpdateItemRequest(@Positive int quantity) {}
}
