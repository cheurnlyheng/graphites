const CART_TOKEN_KEY = 'jess_shop_cart_token';
const VARIANT_IMAGES_KEY = 'jess_variant_images';

/** Guest carts are identified by this token (sent as the X-Cart-Token header); a logged-in
 * customer's cart is identified by their JWT instead -- see CartService on the backend. */
export function getCartToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CART_TOKEN_KEY);
}

export function setCartToken(token: string) {
  localStorage.setItem(CART_TOKEN_KEY, token);
}

export function getStoredVariantImage(variantId: string): string | null {
  if (typeof window === 'undefined' || !variantId) return null;
  try {
    const raw = localStorage.getItem(VARIANT_IMAGES_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[variantId] || null;
  } catch {
    return null;
  }
}

export function saveVariantImage(variantId: string, imageUrl: string) {
  if (typeof window === 'undefined' || !variantId || !imageUrl) return;
  try {
    const raw = localStorage.getItem(VARIANT_IMAGES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[variantId] = imageUrl;
    localStorage.setItem(VARIANT_IMAGES_KEY, JSON.stringify(map));
  } catch {}
}

