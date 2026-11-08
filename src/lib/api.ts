const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export type ApiError = {
  message: string;
  errors?: Record<string, string[]>;
};

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error: ApiError = {
      message: data.message || "Something went wrong",
      errors: data.errors,
    };
    throw error;
  }
  return data as T;
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

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body,
    cache: "no-store",
  });

  return parseResponse<T>(res);
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
  name: string;
  slug: string;
  image?: string | null;
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
  status: "pending" | "approved" | "rejected" | "suspended";
  shipping_fee?: number | string;
  user?: User;
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

export type Product = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: number | string;
  compare_at_price?: number | string | null;
  stock: number;
  status: "draft" | "pending" | "published" | "rejected";
  is_featured?: boolean;
  rating?: number | string;
  reviews_count?: number;
  category?: Category;
  store?: Store;
  images?: ProductImage[];
  variants?: ProductVariant[];
  tags?: { id: number; name: string; slug: string }[];
};

export type Banner = {
  id: number;
  title: string;
  subtitle?: string | null;
  image: string;
  cta_label?: string | null;
  cta_url?: string | null;
  is_active: boolean;
};

export type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  roles?: string[];
  store?: Store | null;
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
  quantity: number;
  unit_price: number;
  total: number;
  product: Product;
  variant?: ProductVariant | null;
};

export type SubOrder = {
  id: number;
  store: Store;
  status: string;
  shipping_fee: number;
  subtotal: number;
  total: number;
  tracking_number?: string | null;
  items: OrderItem[];
};

export type Order = {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal: number;
  shipping_total: number;
  total: number;
  created_at: string;
  shipping_address?: Address;
  sub_orders: SubOrder[];
};
