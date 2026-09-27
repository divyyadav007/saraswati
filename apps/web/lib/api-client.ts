/**
 * Saraswati API Client
 * Single typed wrapper for all calls to the FastAPI backend.
 * Attaches Supabase JWT automatically, centralizes error handling.
 * Per docs/13-WEB-APP.md §4 and docs/21-CODING-CONVENTIONS.md §5
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

/** Standard API error from the backend error envelope */
export interface ApiError {
  code: string;
  message: string;
  details: unknown | null;
}

/** Wrapper around fetch errors to provide typed API errors */
export class ApiClientError extends Error {
  constructor(
    public readonly error: ApiError,
    public readonly status: number,
  ) {
    super(error.message);
    this.name = "ApiClientError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

// ── Models ────────────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  label: string;
  weight_grams: number | null;
  price: number;
  mrp: number | null;
  sku: string | null;
  stock_status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  stock_quantity: number | null;
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  storage_path: string;
  is_primary: boolean;
  display_order: number;
}

export interface ProductListItem {
  id: string;
  category_id: string;
  category_name?: string | null;
  name: string;
  slug: string;
  description: string | null;
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  primary_image_url: string | null;
  starting_price: number | null;
  min_price: number | null;
  max_price: number | null;
  variants: ProductVariant[];
  created_at?: string;
}

export interface RatingSummary {
  average_rating: number;
  total_reviews: number;
}

export interface ProductDetail {
  id: string;
  category_id: string;
  category: Category | null;
  name: string;
  slug: string;
  description: string | null;
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  variants: ProductVariant[];
  images: ProductImage[];
  rating_summary: RatingSummary;
  created_at?: string;
  updated_at?: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  user_name: string | null;
  created_at?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

// ── Phase 3 Models ────────────────────────────────────────────────────────────
export interface Address {
  id: string;
  user_id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  delivery_instructions: string | null;
  is_default: boolean;
  created_at?: string;
}

export interface ServiceabilityInfo {
  pincode: string;
  is_serviceable: boolean;
  city: string;
  state: string;
  delivery_charge: number;
  free_delivery_above: number | null;
  estimated_delivery: string;
}

export interface DeliverySlotItem {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  label: string;
  capacity: number;
  booked_count: number;
  is_available: boolean;
  status: string;
}

export interface CartItemModel {
  id: string;
  item_type?: string;
  product_id?: string | null;
  product_variant_id?: string | null;
  gift_hamper_id?: string | null;
  product_name: string;
  product_slug: string;
  variant_label: string;
  weight_grams: number | null;
  unit_price: number;
  mrp: number | null;
  quantity: number;
  line_total: number;
  image_url: string | null;
  stock_status: string;
  is_available: boolean;
}


export interface CartModel {
  id: string;
  user_id: string;
  items: CartItemModel[];
  items_count: number;
  subtotal: number;
  delivery_charge: number;
  free_delivery_above: number | null;
  free_delivery_remaining: number | null;
  estimated_total: number;
  has_out_of_stock_items: boolean;
}

export interface OrderItemModel {
  id: string;
  item_type: string;
  product_variant_id: string | null;
  product_name_snapshot: string;
  variant_label_snapshot: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface DeliveryAssignmentBrief {
  id: string;
  order_id: string;
  delivery_partner_id: string;
  assigned_at: string;
  delivered_at: string | null;
  notes: string | null;
  partner_name?: string | null;
  partner_phone?: string | null;
  partner_vehicle_number?: string | null;
}

export interface DeliveryPartnerModel {
  id: string;
  name: string;
  phone: string;
  vehicle_type: string | null;
  vehicle_number: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationModel {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationModel[];
  unread_count: number;
}

export interface OrderModel {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  discount_amount: number;
  delivery_charge: number;
  tax_amount: number;
  total_amount: number;
  address_snapshot: {
    recipient_name: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
    landmark?: string | null;
    delivery_instructions?: string | null;
  };
  delivery_slot: {
    id: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    label: string;
  } | null;
  delivery_assignment?: DeliveryAssignmentBrief | null;
  special_instructions: string | null;
  packaging_notes: string | null;
  placed_at: string | null;
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  items: OrderItemModel[];
  razorpay_order_id?: string | null;
  razorpay_key_id?: string | null;
  currency?: string;
  created_at: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, idempotencyKey, signal } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    const text = await response.text();
    const json = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const apiError: ApiError = json?.error ?? {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        details: null,
      };
      throw new ApiClientError(apiError, response.status);
    }

    // Unwrap {"data": ...} envelope if present, else return json
    return (json && typeof json === "object" && "data" in json ? json.data : json) as T;
  } catch (err: unknown) {
    if (err instanceof ApiClientError) throw err;
    const fallbackError: ApiError = {
      code: "NETWORK_ERROR",
      message: err instanceof Error ? err.message : "Network request failed.",
      details: null,
    };
    throw new ApiClientError(fallbackError, 0);
  }
}

// ── Catalogue API Endpoints ───────────────────────────────────────────────────
export const catalogApi = {
  // Public
  getCategories: (includeInactive = false, token?: string | null) =>
    request<Category[]>(`/categories?include_inactive=${includeInactive}`, { token }),

  getCategoryBySlug: (slug: string) =>
    request<Category>(`/categories/${encodeURIComponent(slug)}`),

  getProducts: (params?: {
    category?: string;
    q?: string;
    min_price?: number;
    max_price?: number;
    tags?: string;
    is_featured?: boolean;
    sort?: string;
    page?: number;
    page_size?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.q) searchParams.set("q", params.q);
    if (params?.min_price !== undefined) searchParams.set("min_price", params.min_price.toString());
    if (params?.max_price !== undefined) searchParams.set("max_price", params.max_price.toString());
    if (params?.tags) searchParams.set("tags", params.tags);
    if (params?.is_featured !== undefined) searchParams.set("is_featured", params.is_featured.toString());
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size) searchParams.set("page_size", params.page_size.toString());

    const qs = searchParams.toString();
    return request<PaginatedResult<ProductListItem>>(`/products${qs ? `?${qs}` : ""}`);
  },

  getProductBySlug: (slug: string) =>
    request<ProductDetail>(`/products/${encodeURIComponent(slug)}`),

  getProductReviews: (slug: string, page = 1, pageSize = 20) =>
    request<PaginatedResult<ProductReview>>(`/products/${encodeURIComponent(slug)}/reviews?page=${page}&page_size=${pageSize}`),

  // Admin Categories
  adminCreateCategory: (
    data: {
      name: string;
      slug?: string;
      description?: string;
      image_url?: string;
      display_order?: number;
      is_active?: boolean;
    },
    token: string,
  ) => request<Category>("/admin/categories", { method: "POST", body: data, token }),

  adminUpdateCategory: (
    id: string,
    data: Partial<Category>,
    token: string,
  ) => request<Category>(`/admin/categories/${id}`, { method: "PATCH", body: data, token }),

  adminDeleteCategory: (id: string, token: string) =>
    request<{ message: string }>(`/admin/categories/${id}`, { method: "DELETE", token }),

  // Admin Products
  adminCreateProduct: (
    data: {
      category_id: string;
      name: string;
      slug?: string;
      description?: string;
      tags?: string[];
      is_active?: boolean;
      is_featured?: boolean;
    },
    token: string,
  ) => request<ProductDetail>("/admin/products", { method: "POST", body: data, token }),

  adminUpdateProduct: (
    id: string,
    data: {
      category_id?: string;
      name?: string;
      slug?: string;
      description?: string;
      tags?: string[];
      is_active?: boolean;
      is_featured?: boolean;
    },
    token: string,
  ) => request<ProductDetail>(`/admin/products/${id}`, { method: "PATCH", body: data, token }),

  adminDeleteProduct: (id: string, token: string) =>
    request<{ message: string }>(`/admin/products/${id}`, { method: "DELETE", token }),

  // Admin Variants
  adminCreateVariant: (
    productId: string,
    data: {
      label: string;
      weight_grams?: number;
      price: number;
      mrp?: number;
      sku?: string;
      stock_status?: string;
      stock_quantity?: number;
      is_active?: boolean;
    },
    token: string,
  ) => request<ProductVariant>(`/admin/products/${productId}/variants`, { method: "POST", body: data, token }),

  adminUpdateVariant: (
    variantId: string,
    data: Partial<ProductVariant>,
    token: string,
  ) => request<ProductVariant>(`/admin/variants/${variantId}`, { method: "PATCH", body: data, token }),

  adminDeleteVariant: (variantId: string, token: string) =>
    request<{ message: string }>(`/admin/variants/${variantId}`, { method: "DELETE", token }),

  // Admin Images
  adminCreateImage: (
    productId: string,
    data: {
      url: string;
      storage_path: string;
      is_primary?: boolean;
      display_order?: number;
    },
    token: string,
  ) => request<ProductImage>(`/admin/products/${productId}/images`, { method: "POST", body: data, token }),

  adminDeleteImage: (imageId: string, token: string) =>
    request<{ message: string }>(`/admin/product-images/${imageId}`, { method: "DELETE", token }),
};

// ── Address API ──────────────────────────────────────────────────────────────
export const addressApi = {
  checkServiceability: (pincode: string) =>
    request<ServiceabilityInfo>(`/addresses/check-serviceability?pincode=${encodeURIComponent(pincode)}`),

  listAddresses: (token: string) =>
    request<Address[]>("/addresses", { token }),

  createAddress: (
    data: {
      label?: string;
      recipient_name: string;
      phone: string;
      line1: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode: string;
      landmark?: string;
      delivery_instructions?: string;
      is_default?: boolean;
    },
    token: string,
  ) => request<Address>("/addresses", { method: "POST", body: data, token }),

  updateAddress: (id: string, data: Partial<Address>, token: string) =>
    request<Address>(`/addresses/${id}`, { method: "PATCH", body: data, token }),

  deleteAddress: (id: string, token: string) =>
    request<void>(`/addresses/${id}`, { method: "DELETE", token }),

  setDefaultAddress: (id: string, token: string) =>
    request<Address>(`/addresses/${id}/set-default`, { method: "POST", token }),
};

// ── Delivery Slots API ───────────────────────────────────────────────────────
export const deliveryApi = {
  getSlots: (date?: string) =>
    request<DeliverySlotItem[]>(`/delivery-slots${date ? `?date=${encodeURIComponent(date)}` : ""}`),
};

// ── Cart API ─────────────────────────────────────────────────────────────────
export const cartApi = {
  getCart: (token: string) =>
    request<CartModel>("/cart", { token }),

  addItem: (
    variantOrOptions: string | { productVariantId?: string; giftHamperId?: string; quantity?: number },
    quantityOrToken?: number | string,
    maybeToken?: string
  ) => {
    let body: { product_variant_id?: string; gift_hamper_id?: string; quantity: number };
    let token: string | undefined;

    if (typeof variantOrOptions === "string") {
      body = {
        product_variant_id: variantOrOptions,
        quantity: typeof quantityOrToken === "number" ? quantityOrToken : 1,
      };
      token = maybeToken;
    } else {
      body = {
        product_variant_id: variantOrOptions.productVariantId,
        gift_hamper_id: variantOrOptions.giftHamperId,
        quantity: variantOrOptions.quantity ?? 1,
      };
      token = typeof quantityOrToken === "string" ? quantityOrToken : maybeToken;
    }

    return request<CartModel>("/cart/items", {
      method: "POST",
      body,
      token,
    });
  },

  updateQuantity: (itemId: string, quantity: number, token: string) =>
    request<CartModel>(`/cart/items/${itemId}`, {
      method: "PATCH",
      body: { quantity },
      token,
    }),

  removeItem: (itemId: string, token: string) =>
    request<CartModel>(`/cart/items/${itemId}`, { method: "DELETE", token }),

  mergeCart: (
    items: Array<{ product_variant_id?: string; gift_hamper_id?: string; quantity: number }>,
    token: string
  ) =>
    request<CartModel>("/cart/merge", { method: "POST", body: { items }, token }),
};

// ── Checkout & Orders API ────────────────────────────────────────────────────
export const orderApi = {
  checkout: (
    data: {
      address_id: string;
      delivery_slot_id: string;
      payment_method?: string;
      special_instructions?: string;
      packaging_notes?: string;
      coupon_code?: string;
    },
    token: string,
    idempotencyKey?: string,
  ) =>
    request<OrderModel>("/checkout", {
      method: "POST",
      body: data,
      token,
      idempotencyKey,
    }),

  listOrders: (page = 1, pageSize = 10, status?: string, token?: string) => {
    const sp = new URLSearchParams();
    sp.set("page", page.toString());
    sp.set("page_size", pageSize.toString());
    if (status) sp.set("status", status);
    return request<PaginatedResult<OrderModel>>(`/orders?${sp.toString()}`, { token });
  },

  getOrderById: (orderId: string, token: string) =>
    request<OrderModel>(`/orders/${orderId}`, { token }),

  cancelOrder: (orderId: string, reason: string, token: string) =>
    request<OrderModel>(`/orders/${orderId}/cancel`, {
      method: "POST",
      body: { reason },
      token,
    }),
};

// ── Admin Orders API ─────────────────────────────────────────────────────────
export const adminOrderApi = {
  listOrders: (params: { page?: number; page_size?: number; status?: string; q?: string }, token: string) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", params.page.toString());
    if (params.page_size) sp.set("page_size", params.page_size.toString());
    if (params.status) sp.set("status", params.status);
    if (params.q) sp.set("q", params.q);
    return request<PaginatedResult<OrderModel>>(`/admin/orders?${sp.toString()}`, { token });
  },

  getOrder: (orderId: string, token: string) =>
    request<OrderModel>(`/admin/orders/${orderId}`, { token }),

  updateStatus: (orderId: string, status: string, cancelReason?: string, token?: string) =>
    request<OrderModel>(`/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: { status, cancel_reason: cancelReason },
      token: token || "",
    }),

  assignDelivery: (orderId: string, data: { delivery_partner_id: string; notes?: string }, token: string) =>
    request<DeliveryAssignmentBrief>(`/admin/orders/${orderId}/assign-delivery`, {
      method: "POST",
      body: data,
      token,
    }),
};

// ── Delivery Partners API (Admin) ───────────────────────────────────────────
export const deliveryPartnerApi = {
  list: (isActive?: boolean, token?: string) => {
    const sp = new URLSearchParams();
    if (isActive !== undefined) sp.set("is_active", String(isActive));
    const query = sp.toString() ? `?${sp.toString()}` : "";
    return request<DeliveryPartnerModel[]>(`/admin/delivery-partners${query}`, { token });
  },

  get: (id: string, token: string) =>
    request<DeliveryPartnerModel>(`/admin/delivery-partners/${id}`, { token }),

  create: (
    data: {
      name: string;
      phone: string;
      vehicle_type?: string;
      vehicle_number?: string;
      notes?: string;
    },
    token: string,
  ) =>
    request<DeliveryPartnerModel>("/admin/delivery-partners", {
      method: "POST",
      body: data,
      token,
    }),

  update: (id: string, data: Partial<DeliveryPartnerModel>, token: string) =>
    request<DeliveryPartnerModel>(`/admin/delivery-partners/${id}`, {
      method: "PATCH",
      body: data,
      token,
    }),

  delete: (id: string, token: string) =>
    request<void>(`/admin/delivery-partners/${id}`, {
      method: "DELETE",
      token,
    }),
};

// ── Notifications API ────────────────────────────────────────────────────────
export const notificationApi = {
  list: (unreadOnly?: boolean, limit = 20, token?: string) => {
    const sp = new URLSearchParams();
    if (unreadOnly) sp.set("unread_only", "true");
    sp.set("limit", limit.toString());
    return request<NotificationListResponse>(`/notifications?${sp.toString()}`, { token });
  },

  markRead: (id: string, token: string) =>
    request<{ success: boolean; id: string }>(`/notifications/${id}/read`, {
      method: "PATCH",
      token,
    }),

  registerDeviceToken: (deviceToken: string, token: string) =>
    request<{ success: boolean; message: string }>("/notifications/device-token", {
      method: "POST",
      body: { device_token: deviceToken },
      token,
    }),
};

// ── Payments API ─────────────────────────────────────────────────────────────
export interface PaymentVerifyRequest {
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentVerifyResponse {
  success: boolean;
  order_id: string;
  order_number: string;
  status: string;
  payment_status: string;
  amount: number;
  message: string;
}

export interface AdminRefundRequest {
  amount?: number;
  reason?: string;
}

export interface AdminRefundResponse {
  order_id: string;
  refund_id: string;
  refunded_amount: number;
  order_status: string;
  payment_status: string;
  message: string;
}

export const paymentApi = {
  verify: (data: PaymentVerifyRequest, token: string) =>
    request<PaymentVerifyResponse>("/payments/verify", {
      method: "POST",
      body: data,
      token,
    }),
};

export const adminPaymentApi = {
  refund: (orderId: string, data: AdminRefundRequest, token: string) =>
    request<AdminRefundResponse>(`/admin/orders/${orderId}/refund`, {
      method: "POST",
      body: data,
      token,
    }),
};

// ── Coupons & Promotions Models ───────────────────────────────────────────────
export interface CouponModel {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FLAT";
  value: number;
  min_order_value: number;
  max_discount_amount: number | null;
  usage_limit_total: number | null;
  usage_limit_per_user: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CouponValidateRequest {
  code: string;
  cart_total: number;
}

export interface CouponValidateResponse {
  is_valid: boolean;
  coupon_code: string;
  discount_amount: number;
  message: string;
}

export interface CouponCreateRequest {
  code: string;
  type: "PERCENTAGE" | "FLAT";
  value: number;
  min_order_value?: number;
  max_discount_amount?: number | null;
  usage_limit_total?: number | null;
  usage_limit_per_user?: number;
  valid_from: string;
  valid_until: string;
  is_active?: boolean;
}

export interface BannerModel {
  id: string;
  title: string;
  image_url: string;
  link_type: string;
  link_value: string | null;
  display_order: number;
  is_active: boolean;
  start_at?: string | null;
  end_at?: string | null;
  created_at?: string;
}

export interface OfferModel {
  id: string;
  title: string;
  description: string | null;
  coupon_id?: string | null;
  display_order: number;
  is_active: boolean;
  start_at?: string | null;
  end_at?: string | null;
  created_at?: string;
}

export interface ReviewModel {
  id: string;
  product_id: string;
  product_name?: string | null;
  user_id: string;
  user_name: string;
  order_id: string;
  rating: number;
  comment: string | null;
  is_published: boolean;
  created_at?: string;
}

export interface ProductReviewsSummaryResponse {
  average_rating: number;
  total_reviews: number;
  reviews: ReviewModel[];
}

export interface ReviewCreateRequest {
  product_id?: string;
  product_variant_id?: string;
  order_id: string;
  rating: number;
  comment?: string;
}

export interface ReviewModerationRequest {
  is_published: boolean;
}

export const couponApi = {
  validate: (data: CouponValidateRequest, token: string) =>
    request<CouponValidateResponse>("/coupons/validate", {
      method: "POST",
      body: data,
      token,
    }),
  listAdmin: (token: string) =>
    request<CouponModel[]>("/admin/coupons", { method: "GET", token }),
  createAdmin: (data: CouponCreateRequest, token: string) =>
    request<CouponModel>("/admin/coupons", {
      method: "POST",
      body: data,
      token,
    }),
  updateAdmin: (id: string, data: Partial<CouponCreateRequest>, token: string) =>
    request<CouponModel>(`/admin/coupons/${id}`, {
      method: "PATCH",
      body: data,
      token,
    }),
  deleteAdmin: (id: string, token: string) =>
    request<void>(`/admin/coupons/${id}`, { method: "DELETE", token }),
};

export const bannerApi = {
  listActive: () =>
    request<BannerModel[]>("/banners", { method: "GET" }),
  listAdmin: (token: string) =>
    request<BannerModel[]>("/admin/banners", { method: "GET", token }),
  createAdmin: (data: Partial<BannerModel>, token: string) =>
    request<BannerModel>("/admin/banners", {
      method: "POST",
      body: data,
      token,
    }),
  deleteAdmin: (id: string, token: string) =>
    request<void>(`/admin/banners/${id}`, { method: "DELETE", token }),
};

export const offerApi = {
  listActive: () =>
    request<OfferModel[]>("/offers", { method: "GET" }),
  listAdmin: (token: string) =>
    request<OfferModel[]>("/admin/offers", { method: "GET", token }),
  createAdmin: (data: Partial<OfferModel>, token: string) =>
    request<OfferModel>("/admin/offers", {
      method: "POST",
      body: data,
      token,
    }),
  deleteAdmin: (id: string, token: string) =>
    request<void>(`/admin/offers/${id}`, { method: "DELETE", token }),
};

export const reviewApi = {
  getProductReviews: (productId: string) =>
    request<ProductReviewsSummaryResponse>(`/reviews/product/${productId}`, { method: "GET" }),
  submit: (data: ReviewCreateRequest, token: string) =>
    request<ReviewModel>("/reviews", {
      method: "POST",
      body: data,
      token,
    }),
  listAdmin: (token: string, isPublished?: boolean) =>
    request<ReviewModel[]>(
      `/admin/reviews${isPublished !== undefined ? `?is_published=${isPublished}` : ""}`,
      { method: "GET", token }
    ),
  moderateAdmin: (reviewId: string, isPublished: boolean, token: string) =>
    request<ReviewModel>(`/admin/reviews/${reviewId}/moderation`, {
      method: "PATCH",
      body: { is_published: isPublished },
      token,
    }),
  deleteAdmin: (reviewId: string, token: string) =>
    request<void>(`/admin/reviews/${reviewId}`, { method: "DELETE", token }),
};

// ── Gift Hampers ─────────────────────────────────────────────────────────────
export interface GiftHamperItemModel {
  id: string;
  gift_hamper_id: string;
  product_id: string;
  product_name?: string | null;
  product_variant_id: string;
  variant_label?: string | null;
  quantity: number;
}

export interface GiftHamperImageModel {
  id: string;
  url: string;
  storage_path: string;
  is_primary: boolean;
  display_order: number;
}

export interface GiftHamperModel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hamper_price: number;
  is_active: boolean;
  primary_image_url: string | null;
  created_at?: string;
}

export interface GiftHamperDetailModel extends GiftHamperModel {
  images: GiftHamperImageModel[];
  items: GiftHamperItemModel[];
}

export interface PaginatedGiftHampersResponse {
  items: GiftHamperModel[];
  total: number;
  page: number;
  page_size: number;
}

export const giftHamperApi = {
  list: (page = 1, pageSize = 20) =>
    request<PaginatedGiftHampersResponse>(`/gift-hampers?page=${page}&page_size=${pageSize}`, { method: "GET" }),
  getBySlug: (slug: string) =>
    request<GiftHamperDetailModel>(`/gift-hampers/${slug}`, { method: "GET" }),
  adminList: (token: string, page = 1, pageSize = 20) =>
    request<PaginatedGiftHampersResponse>(`/admin/gift-hampers?page=${page}&page_size=${pageSize}`, { method: "GET", token }),
  adminCreate: (data: Partial<GiftHamperModel>, token: string) =>
    request<GiftHamperModel>("/admin/gift-hampers", { method: "POST", body: data, token }),
  adminUpdate: (id: string, data: Partial<GiftHamperModel>, token: string) =>
    request<GiftHamperDetailModel>(`/admin/gift-hampers/${id}`, { method: "PATCH", body: data, token }),
  adminDelete: (id: string, token: string) =>
    request<void>(`/admin/gift-hampers/${id}`, { method: "DELETE", token }),
  adminAddItem: (hamperId: string, data: { product_id: string; product_variant_id: string; quantity: number }, token: string) =>
    request<GiftHamperDetailModel>(`/admin/gift-hampers/${hamperId}/items`, { method: "POST", body: data, token }),
  adminDeleteItem: (hamperId: string, itemId: string, token: string) =>
    request<void>(`/admin/gift-hampers/${hamperId}/items/${itemId}`, { method: "DELETE", token }),
  adminAddImage: (hamperId: string, data: { url: string; storage_path?: string; is_primary?: boolean; display_order?: number }, token: string) =>
    request<GiftHamperDetailModel>(`/admin/gift-hampers/${hamperId}/images`, { method: "POST", body: data, token }),
  adminDeleteImage: (hamperId: string, imageId: string, token: string) =>
    request<void>(`/admin/gift-hampers/${hamperId}/images/${imageId}`, { method: "DELETE", token }),
};

// ── Bulk Enquiries ───────────────────────────────────────────────────────────
export interface BulkEnquiryModel {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  enquiry_type: string;
  event_date: string | null;
  estimated_quantity: string | null;
  items_of_interest: string | null;
  message: string | null;
  status: "NEW" | "CONTACTED" | "QUOTED" | "WON" | "LOST";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BulkEnquiryCreateRequest {
  name: string;
  phone: string;
  email?: string | null;
  enquiry_type?: string;
  event_date?: string | null;
  estimated_quantity?: string | null;
  items_of_interest?: string | null;
  message?: string | null;
}

export interface BulkEnquiryUpdateRequest {
  status?: string;
  admin_notes?: string;
}

export interface PaginatedBulkEnquiriesResponse {
  items: BulkEnquiryModel[];
  total: number;
  page: number;
  page_size: number;
}

export const bulkEnquiryApi = {
  submit: (data: BulkEnquiryCreateRequest, token?: string | null) =>
    request<BulkEnquiryModel>("/bulk-enquiries", { method: "POST", body: data, token: token || undefined }),
  adminList: (token: string, status?: string, page = 1, pageSize = 20) =>
    request<PaginatedBulkEnquiriesResponse>(
      `/admin/bulk-enquiries?page=${page}&page_size=${pageSize}${status ? `&status=${encodeURIComponent(status)}` : ""}`,
      { method: "GET", token }
    ),
  adminGet: (id: string, token: string) =>
    request<BulkEnquiryModel>(`/admin/bulk-enquiries/${id}`, { method: "GET", token }),
  adminUpdate: (id: string, data: BulkEnquiryUpdateRequest, token: string) =>
    request<BulkEnquiryModel>(`/admin/bulk-enquiries/${id}`, { method: "PATCH", body: data, token }),
  adminDelete: (id: string, token: string) =>
    request<void>(`/admin/bulk-enquiries/${id}`, { method: "DELETE", token }),
};

// ── Admin Dashboard & Analytics ──────────────────────────────────────────────
export interface LowStockItemModel {
  variant_id: string;
  product_id: string;
  product_name: string;
  variant_label: string;
  stock_quantity: number | null;
  stock_status: string;
  sku: string | null;
}

export interface DashboardSummaryModel {
  today: {
    orders: number;
    revenue: number;
    average_order_value: number;
  };
  pending_orders: number;
  orders_awaiting_action: number;
  total_active_products: number;
  low_stock_items: LowStockItemModel[];
}

export interface SalesGroupItemModel {
  group_key: string;
  total_orders: number;
  total_units: number;
  total_revenue: number;
}

export interface SalesReportModel {
  start_date: string;
  end_date: string;
  group_by: string;
  summary: {
    total_orders: number;
    total_units: number;
    total_revenue: number;
    average_order_value: number;
  };
  items: SalesGroupItemModel[];
}

export const adminAnalyticsApi = {
  getSummary: (token: string) =>
    request<DashboardSummaryModel>("/admin/dashboard/summary", { method: "GET", token }),
  getSalesReport: (token: string, startDate?: string, endDate?: string, groupBy = "category") => {
    let url = `/admin/reports/sales?group_by=${groupBy}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    return request<SalesReportModel>(url, { method: "GET", token });
  },
  getExportUrl: (startDate?: string, endDate?: string, groupBy = "category") => {
    let url = `${API_BASE_URL}/admin/reports/sales/export?group_by=${groupBy}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    return url;
  },
};

// ── Admin Customers ──────────────────────────────────────────────────────────
export interface CustomerListItemModel {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  total_orders: number;
  total_spend: number;
  created_at: string;
}

export interface CustomerDetailModel {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  total_orders: number;
  total_spend: number;
  recent_orders: {
    order_id: string;
    order_number: string;
    total_amount: number;
    status: string;
    created_at: string;
  }[];
  created_at: string;
}

export interface CustomerListResponse {
  items: CustomerListItemModel[];
  total: number;
  page: number;
  page_size: number;
}

export const adminCustomersApi = {
  list: (token: string, search?: string, page = 1, pageSize = 20) => {
    let url = `/admin/customers?page=${page}&page_size=${pageSize}`;
    if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
    return request<CustomerListResponse>(url, { method: "GET", token });
  },
  get: (id: string, token: string) =>
    request<CustomerDetailModel>(`/admin/customers/${id}`, { method: "GET", token }),
};

// ── Store Settings ───────────────────────────────────────────────────────────
export interface StoreSettingModel {
  id: number;
  store_name: string;
  store_phone: string;
  store_email: string;
  address_text: string;
  cod_limit_amount: number;
  cod_enabled: boolean;
  tax_enabled: boolean;
  tax_rate_percent: number;
  delivery_charge_flat: number;
  free_delivery_above: number | null;
  serviceable_pincodes: string[];
  max_qty_per_cart_item: number;
  business_hours: Record<string, unknown>;
  updated_at: string;
}

export const adminStoreSettingsApi = {
  get: (token: string) =>
    request<StoreSettingModel>("/admin/store-settings", { method: "GET", token }),
  update: (data: Partial<StoreSettingModel>, token: string) =>
    request<StoreSettingModel>("/admin/store-settings", { method: "PATCH", body: data, token }),
};

// ── Profile & Preferences ───────────────────────────────────────────────────
export interface UserProfileModel {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  notif_promotional_opt_in: boolean;
  created_at?: string;
}

export const userProfileApi = {
  get: (token: string) =>
    request<UserProfileModel>("/auth/me", { method: "GET", token }),
  update: (data: { full_name?: string; email?: string }, token: string) =>
    request<UserProfileModel>("/auth/me", { method: "PATCH", body: data, token }),
};

export const notificationPreferencesApi = {
  get: (token: string) =>
    request<{ notif_promotional_opt_in: boolean }>("/notifications/preferences", { method: "GET", token }),
  update: (optIn: boolean, token: string) =>
    request<{ notif_promotional_opt_in: boolean }>(
      "/notifications/preferences",
      { method: "PATCH", body: { notif_promotional_opt_in: optIn }, token }
    ),
};

// ── Generic API client ────────────────────────────────────────────────────────
export const apiClient = {
  get: <T>(path: string, token?: string | null, signal?: AbortSignal) =>
    request<T>(path, { method: "GET", token, signal }),
  post: <T>(path: string, body?: unknown, token?: string | null, idempotencyKey?: string) =>
    request<T>(path, { method: "POST", body, token, idempotencyKey }),
  patch: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "PATCH", body, token }),
  delete: <T>(path: string, token?: string | null) =>
    request<T>(path, { method: "DELETE", token }),
  put: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "PUT", body, token }),
};

export async function checkHealth(): Promise<{ status: string; environment: string }> {
  const baseUrl = API_BASE_URL.replace("/api/v1", "");
  const response = await fetch(`${baseUrl}/healthz`);
  if (!response.ok) throw new Error("Backend health check failed");
  return response.json();
}
