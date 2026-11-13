const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export type ApiError = {
  message: string;
  status?: number;
  code?: string;
  errors?: Record<string, string[]>;
};

/** Fired when a signed-in request comes back 401 (token expired or revoked). */
export const UNAUTHORIZED_EVENT = "atelier:unauthorized";

async function parseResponse<T>(res: Response, sentToken: boolean): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && sentToken && typeof window !== "undefined") {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    const error: ApiError = {
      message:
        res.status === 429
          ? data.message || "Too many attempts. Please wait a minute and try again."
          : data.message || "Something went wrong",
      status: res.status,
      code: data.code,
      errors: data.errors,
    };
    throw error;
  }
  return data as T;
}

/** Human message from anything thrown by `api()`. */
export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  const e = err as Partial<ApiError> | undefined;
  return (e && typeof e.message === "string" && e.message) || fallback;
}

/** First validation message per field, e.g. { email: "The email has already been taken." }. */
export function fieldErrors(err: unknown): Record<string, string> {
  const errors = (err as Partial<ApiError> | undefined)?.errors;
  if (!errors) return {};
  return Object.fromEntries(
    Object.entries(errors).map(([key, messages]) => [key, Array.isArray(messages) ? messages[0] : String(messages)])
  );
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("atelier_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("atelier_token", token);
  else localStorage.removeItem("atelier_token");
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  formData?: FormData;
  /** Server-side only: cache the response for N seconds (ISR) instead of no-store. */
  revalidate?: number;
};

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token === undefined ? getToken() : options.token;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method || "GET",
      headers,
      body,
      ...(options.revalidate !== undefined && !token
        ? { next: { revalidate: options.revalidate } }
        : { cache: "no-store" as const }),
    });
  } catch {
    const error: ApiError = { message: "We couldn't reach Atelier. Check your connection and try again.", status: 0 };
    throw error;
  }

  return parseResponse<T>(res, Boolean(token));
}

export const apiPublic = {
  products: (params = "") => api<{ data: Product[]; meta: PaginationMeta }>(`/products${params}`),
  product: (slug: string) => api<{ data: Product }>(`/products/${slug}`),
  categories: () => api<{ data: Category[] }>("/categories"),
  stores: (params = "") => api<{ data: Store[]; meta?: PaginationMeta }>(`/stores${params}`),
  store: (slug: string) => api<{ data: Store }>(`/stores/${slug}`),
  banners: () => api<{ data: Banner[] }>("/banners"),
  search: (q: string) => api<{ data: { products: Product[]; stores: Store[] } }>(`/search?q=${encodeURIComponent(q)}`),
};

export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type Category = {
  id: number;
  parent_id?: number | null;
  name: string;
  slug: string;
  image?: string | null;
  icon?: string | null;
  is_active?: boolean;
  sort_order?: number;
  description?: string | null;
  children?: Category[];
};

export type Store = {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
  banner?: string | null;
  bio?: string | null;
  location?: string | null;
  rating?: number | string;
  products_count?: number;
  followers_count?: number;
  is_following?: boolean;
  seller_score?: SellerScore | null;
  created_at?: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  status_reason?: string | null;
  shipping_fee?: number | string;
  bank_name?: string | null;
  account_number?: string | null;
  account_number_masked?: string | null;
  account_name?: string | null;
  user?: User;
};

export type SellerScore = {
  score: number | null;
  shipping_speed: number | null;
  customer_rating: number | null;
  cancellation_rate: number | null;
  return_rate: number | null;
  orders?: number;
};

export type Review = {
  id: number;
  rating: number;
  title?: string | null;
  comment?: string | null;
  is_hidden?: boolean;
  vendor_reply?: string | null;
  vendor_replied_at?: string | null;
  created_at?: string;
  user?: { id: number; name: string };
  product?: Product;
  product_id?: number;
};

export type ProductImage = {
  id: number;
  url: string;
  is_primary?: boolean;
};

export type ProductVariant = {
  id: number;
  name: string;
  sku?: string;
  price?: number | null;
  stock: number;
  attributes?: Record<string, string>;
};

export type Brand = { id: number; name: string; slug: string; logo?: string | null; products_count?: number };

export type SpecRow = { label: string; value: string };

export type Product = {
  id: number;
  name: string;
  slug: string;
  sku?: string | null;
  condition?: "new" | "refurbished" | "used";
  description?: string | null;
  key_features?: string | null;
  whats_in_box?: string | null;
  warranty?: string | null;
  specs?: SpecRow[] | Record<string, string | undefined> | null;
  spec_list?: SpecRow[];
  price: number | string;
  compare_at_price?: number | string | null;
  sale_ends_at?: string | null;
  stock: number;
  low_stock_threshold?: number;
  sold_count?: number;
  weight_kg?: number | string | null;
  length_cm?: number | string | null;
  width_cm?: number | string | null;
  height_cm?: number | string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  status: "draft" | "pending" | "published" | "rejected";
  rejection_reason?: string | null;
  is_featured?: boolean;
  is_sponsored?: boolean;
  has_variants?: boolean;
  rating?: number | string;
  reviews_count?: number;
  rating_breakdown?: Record<string, number>;
  followers_count?: number;
  category_id?: number | null;
  brand_id?: number | null;
  category?: Category & { parent?: Category | null };
  brand?: Brand | null;
  store?: Store;
  images?: ProductImage[];
  variants?: ProductVariant[];
  reviews?: Review[];
  tags?: { id: number; name: string; slug: string }[];
  created_at?: string;
};

export type Banner = {
  id: number;
  title: string;
  subtitle?: string | null;
  image: string;
  cta_label?: string | null;
  cta_url?: string | null;
  placement?: "hero" | "side" | "tile";
  background?: string | null;
  is_active: boolean;
  sort_order?: number;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  roles?: string[];
  store?: Store | null;
  status?: "active" | "suspended" | "deleted";
  has_google?: boolean;
  email_verified?: boolean;
  newsletter_opt_in?: boolean;
  needs_onboarding?: boolean;
  created_at?: string;
};

export type Address = {
  id: number;
  label?: string | null;
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string | null;
  is_default?: boolean;
};

export type CartItem = {
  id: number;
  quantity: number;
  product: Product;
  variant?: ProductVariant | null;
};

export type Cart = {
  id?: number;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
};

export type OrderItem = {
  id: number;
  sub_order_id?: number;
  product_id: number;
  product_variant_id?: number | null;
  product_name: string;
  variant_name?: string | null;
  image?: string | null;
  quantity: number;
  unit_price: number | string;
  total: number | string;
  product?: Product | null;
  variant?: ProductVariant | null;
  reviewed?: boolean;
};

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned"
  | "expired";

export type ReturnRequest = {
  id: number;
  sub_order_id: number;
  order_item_id?: number | null;
  user_id: number;
  store_id: number;
  quantity: number;
  reason: string;
  reason_label?: string;
  details?: string | null;
  photos?: string[] | null;
  status: "requested" | "approved" | "rejected" | "received" | "escalated" | "resolved";
  vendor_note?: string | null;
  admin_note?: string | null;
  resolved_at?: string | null;
  created_at: string;
  item?: OrderItem | null;
  sub_order?: SubOrder;
  user?: User;
  store?: Store;
};

export type SubOrder = {
  id: number;
  order_id: number;
  store_id: number;
  store?: Store;
  status: OrderStatus | string;
  allowed_transitions?: string[];
  shipping_fee: number | string;
  discount?: number | string;
  subtotal: number | string;
  total: number | string;
  commission?: number | string;
  vendor_earning?: number | string;
  tracking_number?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  returned_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  cancelled_by?: string | null;
  refund_status?: "pending" | "refunded" | null;
  created_at?: string;
  items: OrderItem[];
  returns?: ReturnRequest[];
  order?: Order;
};

export type ShippingSnapshot = {
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  state: string;
  country?: string;
  postal_code?: string | null;
};

export type Payment = {
  id: number;
  reference: string;
  amount: number | string;
  currency: string;
  status: string;
  failure_reason?: string | null;
  created_at?: string;
};

export type Order = {
  id: number;
  order_number: string;
  user_id?: number;
  status: OrderStatus | string;
  payment_status: "pending" | "paid" | "failed" | "abandoned" | "refund_due" | string;
  subtotal: number | string;
  shipping_total: number | string;
  discount_total?: number | string;
  coupon_code?: string | null;
  total: number | string;
  created_at: string;
  shipping_snapshot?: ShippingSnapshot | null;
  sub_orders: SubOrder[];
  payment?: Payment | null;
  user?: User;
};

export type InboxMessage = {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read_at?: string | null;
  created_at: string;
};

export type Voucher = {
  id: number;
  code: string;
  description?: string | null;
  type: "percent" | "fixed" | "free_shipping";
  value: number | string;
  min_order?: number | string | null;
  max_discount?: number | string | null;
  usage_limit?: number | null;
  per_user_limit?: number;
  used_count?: number;
  store_id?: number | null;
  category_id?: number | null;
  first_order_only?: boolean;
  is_public?: boolean;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  store?: Store | null;
  category?: Category | null;
  used_by_me?: number;
};

export type Paginated<T> = { data: T[]; meta: PaginationMeta & Record<string, unknown> };
