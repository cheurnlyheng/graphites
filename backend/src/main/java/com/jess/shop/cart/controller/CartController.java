package com.jess.shop.cart.controller;

import com.jess.shop.cart.dto.CartDtos.*;
import com.jess.shop.cart.service.CartService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** No customer accounts exist -- every cart is a guest cart, identified by the X-Cart-Token header. */
@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public CartResponse get(@RequestHeader(value = "X-Cart-Token", required = false) String cartToken) {
        return cartService.getCart(cartToken);
    }

    @PostMapping("/items")
    public CartResponse addItem(@RequestHeader(value = "X-Cart-Token", required = false) String cartToken,
                                 @Valid @RequestBody AddItemRequest request) {
        return cartService.addItem(cartToken, request);
    }

    @PatchMapping("/items/{itemId}")
    public CartResponse updateItem(@RequestHeader(value = "X-Cart-Token", required = false) String cartToken,
                                    @PathVariable UUID itemId,
                                    @Valid @RequestBody UpdateItemRequest request) {
        return cartService.updateItem(cartToken, itemId, request);
    }

    @DeleteMapping("/items/{itemId}")
    public CartResponse removeItem(@RequestHeader(value = "X-Cart-Token", required = false) String cartToken,
                                    @PathVariable UUID itemId) {
        return cartService.removeItem(cartToken, itemId);
    }
}
