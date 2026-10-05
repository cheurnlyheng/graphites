export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentCategoryId: string | null;
}

export interface AdminCategoryResponse extends CategoryResponse {
  productCount: number;
}

export interface SectionProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  thumbnailUrl: string | null;
  images: string[];
  inStock: boolean;
  /** Only used by a HANGING_RAIL block; null falls back to thumbnailUrl (without the hook alignment). */
  hangingImageUrl: string | null;
  hangingHookPercent: number | null;
}

export type HomeSectionType = 'PRODUCTS' | 'HERO' | 'SPLIT_BANNER' | 'HANGING_RAIL';

/** One side of a split banner. */
export interface BannerPanel {
  imageUrl: string;
  title: string;
  description: string | null;
}

/** A homepage block. Only the fields for its `type` are filled; the lists are empty for other types. */
export interface HomeSectionResponse {
  id: string;
  type: HomeSectionType;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  products: SectionProduct[];
  panels: BannerPanel[];
}

export interface AdminSectionProduct {
  id: string;
  name: string;
  price: number;
  thumbnailUrl: string | null;
  status: string;
  inStock: boolean;
  hangingImageUrl: string | null;
  hangingHookPercent: number | null;
}

export interface AdminHomeSectionResponse {
  id: string;
  type: HomeSectionType;
  active: boolean;
  sortOrder: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  panels: BannerPanel[];
  products: AdminSectionProduct[];
}

export interface ProductSummaryResponse {
  id: string;
  name: string;
  slug: string;
  price: number;
  thumbnailUrl: string | null;
  inStock: boolean;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
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
  /** A transparent-background cutout of the garment on a hanger, shown as the detail page's cover and on the
   * HANGING_RAIL homepage block. Null if this product doesn't have one yet. */
  hangingImageUrl: string | null;
  hangingHookPercent: number | null;
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
  imageUrl?: string | null;
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
  shippedAt: string | null;
  deliveredAt: string | null;
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

export interface HeroBannerResponse {
  id?: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  buttonText: string | null;
  buttonLink: string | null;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface TopProduct {
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface ReportSummaryResponse {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  revenueByDay: DailyRevenue[];
  topProducts: TopProduct[];
}

