export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentCategoryId: string | null;
}

export interface ProductSummaryResponse {
  id: string;
  name: string;
  slug: string;
  price: number;
  thumbnailUrl: string | null;
  inStock: boolean;
}

export interface VariantResponse {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  stockQty: number;
  inStock: boolean;
}

export interface ImageResponse {
  id: string;
  colorGroup: string | null;
  url: string;
  sortOrder: number;
}

export interface ProductDetailResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string | null;
  status: string;
  taxCode: string | null;
  price: number;
  variants: VariantResponse[];
  images: ImageResponse[];
}

export interface CartItemResponse {
  cartItemId: string;
  productVariantId: string;
  productName: string;
  variantAttributes: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  inStock: boolean;
}

export interface CartResponse {
  cartId: string;
  cartToken: string | null;
  items: CartItemResponse[];
  subtotal: number;
}

export interface OrderItemResponse {
  id: string;
  productName: string;
  variantAttributes: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderResponse {
  id: string;
  email: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  items: OrderItemResponse[];
  shippingAddressValid: boolean | null;
  shippingAddressValidationNote: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

export interface ShipmentResponse {
  id: string;
  orderId: string;
  carrier: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  trackingUrl: string | null;
  returnLabel: boolean;
  shippedAt: string | null;
}

export interface AuthResponse {
  token: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
}

export interface ReturnItemResponse {
  id: string;
  orderItemId: string;
  productName: string;
  quantity: number;
  reason: string | null;
}

export interface ReturnResponse {
  id: string;
  orderId: string;
  status: string;
  reason: string | null;
  requestedAt: string;
  resolvedAt: string | null;
  items: ReturnItemResponse[];
}

export interface ShippingRateOption {
  rateObjectId: string;
  provider: string;
  serviceLevel: string | null;
  amount: string;
  currency: string;
  estimatedDays: number | null;
}

export interface SupplierResponse {
  id: string;
  name: string;
  contactEmail: string | null;
  phone: string | null;
  notes: string | null;
}

export interface LowStockVariant {
  variantId: string;
  sku: string;
  productName: string;
  stockQty: number;
  lowStockThreshold: number;
}

export interface PurchaseOrderItemResponse {
  id: string;
  productVariantId: string;
  sku: string;
  quantity: number;
  unitCost: number | null;
}

export interface PurchaseOrderResponse {
  id: string;
  supplierId: string;
  supplierName: string;
  status: string;
  createdAt: string;
  items: PurchaseOrderItemResponse[];
}
