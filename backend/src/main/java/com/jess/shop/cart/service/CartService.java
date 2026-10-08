package com.jess.shop.cart.service;

import com.jess.shop.cart.dto.CartDtos.*;
import com.jess.shop.cart.entity.Cart;
import com.jess.shop.cart.entity.CartItem;
import com.jess.shop.cart.repository.CartItemRepository;
import com.jess.shop.cart.repository.CartRepository;
import com.jess.shop.catalog.entity.Product;
import com.jess.shop.catalog.entity.ProductVariant;
import com.jess.shop.catalog.repository.ProductRepository;
import com.jess.shop.catalog.repository.ProductVariantRepository;
import com.jess.shop.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** No customer accounts exist -- every cart is a guest cart, identified purely by its session token. */
@Service
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductRepository productRepository;

    public CartService(CartRepository cartRepository, CartItemRepository cartItemRepository,
                        ProductVariantRepository variantRepository, ProductRepository productRepository) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.variantRepository = variantRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public Cart resolveCart(String cartToken) {
        if (cartToken != null) {
            Optional<Cart> existing = cartRepository.findBySessionToken(cartToken);
            if (existing.isPresent()) {
                return existing.get();
            }
        }
        return cartRepository.save(Cart.builder().sessionToken(UUID.randomUUID().toString()).build());
    }

    public CartResponse getCart(String cartToken) {
        return toResponse(resolveCart(cartToken));
    }

    @Transactional
    public CartResponse addItem(String cartToken, AddItemRequest request) {
        Cart cart = resolveCart(cartToken);
        ProductVariant variant = variantRepository.findById(request.productVariantId())
            .orElseThrow(() -> new ResourceNotFoundException("Variant not found: " + request.productVariantId()));

        CartItem item = cartItemRepository.findByCartIdAndProductVariantId(cart.getId(), variant.getId())
            .orElseGet(() -> CartItem.builder().cartId(cart.getId()).productVariantId(variant.getId()).quantity(0).build());
        item.setQuantity(item.getQuantity() + request.quantity());
        cartItemRepository.save(item);

        return toResponse(cart);
    }

    @Transactional
    public CartResponse updateItem(String cartToken, UUID cartItemId, UpdateItemRequest request) {
        Cart cart = resolveCart(cartToken);
        CartItem item = cartItemRepository.findById(cartItemId)
            .filter(i -> i.getCartId().equals(cart.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Cart item not found: " + cartItemId));
        item.setQuantity(request.quantity());
        cartItemRepository.save(item);
        return toResponse(cart);
    }

    @Transactional
    public CartResponse removeItem(String cartToken, UUID cartItemId) {
        Cart cart = resolveCart(cartToken);
        cartItemRepository.findById(cartItemId)
            .filter(i -> i.getCartId().equals(cart.getId()))
            .ifPresent(cartItemRepository::delete);
        return toResponse(cart);
    }

    private CartResponse toResponse(Cart cart) {
        List<CartItem> items = cartItemRepository.findByCartIdOrderByCreatedAtAsc(cart.getId());
        List<CartItemResponse> itemResponses = items.stream().map(this::toItemResponse).toList();
        BigDecimal subtotal = itemResponses.stream().map(CartItemResponse::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CartResponse(cart.getId(), cart.getSessionToken(), itemResponses, subtotal);
    }

    private CartItemResponse toItemResponse(CartItem item) {
        ProductVariant variant = variantRepository.findById(item.getProductVariantId())
            .orElseThrow(() -> new ResourceNotFoundException("Variant not found: " + item.getProductVariantId()));
        Product product = productRepository.findById(variant.getProductId())
            .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + variant.getProductId()));
        String attrs = describeVariant(variant);
        BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
        return new CartItemResponse(item.getId(), variant.getId(), product.getName(), attrs, product.getPrice(),
            item.getQuantity(), lineTotal, variant.getStockQty() >= item.getQuantity(), product.getTaxCode());
    }

    private String describeVariant(ProductVariant v) {
        if (v.getSize() == null && v.getColor() == null) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        if (v.getSize() != null) {
            sb.append("Size ").append(v.getSize());
        }
        if (v.getColor() != null) {
            if (sb.length() > 0) sb.append(" / ");
            sb.append(v.getColor());
        }
        return sb.toString();
    }
}
