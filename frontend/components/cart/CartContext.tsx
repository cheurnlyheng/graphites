'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { getCartToken, setCartToken, saveVariantImage } from '@/lib/cart';
import type { CartResponse, CartItemResponse } from '@/lib/types';

interface CartContextType {
  cart: CartResponse | null;
  isOpen: boolean;
  isLoading: boolean;
  isMutating: boolean;
  itemCount: number;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (productVariantId: string, quantity?: number, imageUrl?: string) => Promise<boolean>;
  updateQty: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const refreshCart = useCallback(async () => {
    try {
      const data = await apiFetch<CartResponse>('/api/cart', { cartToken: getCartToken() });
      if (data?.cartToken) setCartToken(data.cartToken);
      setCart(data);
    } catch {
      // Backend may be offline or guest cart not yet created
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

  const addItem = useCallback(
    async (productVariantId: string, quantity = 1, imageUrl?: string): Promise<boolean> => {
      setIsMutating(true);
      if (imageUrl) {
        saveVariantImage(productVariantId, imageUrl);
      }
      try {
        const updatedCart = await apiFetch<CartResponse>('/api/cart/items', {
          method: 'POST',
          body: { productVariantId, quantity },
          cartToken: getCartToken()
        });
        if (updatedCart?.cartToken) setCartToken(updatedCart.cartToken);
        setCart(updatedCart);
        setIsOpen(true);
        return true;
      } catch (err) {
        console.error('Failed to add to cart:', err);
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  const updateQty = useCallback(async (itemId: string, quantity: number) => {
    setIsMutating(true);
    try {
      if (quantity <= 0) {
        await apiFetch(`/api/cart/items/${itemId}`, {
          method: 'DELETE',
          cartToken: getCartToken()
        });
      } else {
        await apiFetch(`/api/cart/items/${itemId}`, {
          method: 'PATCH',
          body: { quantity },
          cartToken: getCartToken()
        });
      }
      const data = await apiFetch<CartResponse>('/api/cart', { cartToken: getCartToken() });
      setCart(data);
    } catch (err) {
      console.error('Failed to update cart qty:', err);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const removeItem = useCallback(
    async (itemId: string) => {
      await updateQty(itemId, 0);
    },
    [updateQty]
  );

  const itemCount = useMemo(() => {
    if (!cart?.items) return 0;
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        isLoading,
        isMutating,
        itemCount,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        updateQty,
        removeItem,
        refreshCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
