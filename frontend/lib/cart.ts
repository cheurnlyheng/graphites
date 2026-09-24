const CART_TOKEN_KEY = 'jess_shop_cart_token';

/** Guest carts are identified by this token (sent as the X-Cart-Token header); a logged-in
 * customer's cart is identified by their JWT instead -- see CartService on the backend. */
export function getCartToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CART_TOKEN_KEY);
}

export function setCartToken(token: string) {
  localStorage.setItem(CART_TOKEN_KEY, token);
}
