import { demoProducts, demoStores, demoCategories, demoBanners } from "./demo-data";
import { formatNaira } from "./utils";

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned"
  | "refunded";

export type DemoOrder = {
  id: string;
  date: string;
  status: OrderStatus;
  total: number;
  itemsCount: number;
  store?: string;
};

export type DemoAddress = {
  id: number;
  label: string;
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  isDefault: boolean;
};

export type DemoVendorApplication = {
  id: number;
  storeName: string;
  owner: string;
  location: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
};

export const demoCustomerOrders: DemoOrder[] = [
  {
    id: "ATL-10482",
    date: "2025-10-28",
    status: "delivered",
    total: 185000,
    itemsCount: 1,
    store: "Adebayo Studio",
  },
  {
    id: "ATL-10391",
    date: "2025-10-12",
    status: "shipped",
    total: 116000,
    itemsCount: 2,
    store: "Heritage Weave",
  },
  {
    id: "ATL-10244",
    date: "2025-09-30",
    status: "processing",
    total: 78000,
    itemsCount: 1,
    store: "Okafor Leather",
  },
];

export const demoAddresses: DemoAddress[] = [
  {
    id: 1,
    label: "Home",
    name: "Ada Okafor",
    phone: "+234 801 234 5678",
    line1: "14 Admiralty Way, Lekki Phase 1",
    city: "Lagos",
    state: "Lagos",
    isDefault: true,
  },
  {
    id: 2,
    label: "Studio pickup",
    name: "Ada Okafor",
    phone: "+234 801 234 5678",
    line1: "3 Abia Road, Artisans Quarter",
    city: "Aba",
    state: "Abia",
    isDefault: false,
  },
];

export const demoWishlist = demoProducts.slice(0, 5);

export const demoVendorStats = {
  sales: 4285000,
  orders: 38,
  products: demoProducts.filter((p) => p.store?.id === 1).length + 6,
  pendingOrders: 4,
};

export const demoVendorOrders: DemoOrder[] = [
  { id: "ATL-10501", date: "2025-11-05", status: "pending", total: 185000, itemsCount: 1 },
  { id: "ATL-10482", date: "2025-10-28", status: "delivered", total: 185000, itemsCount: 1 },
  { id: "ATL-10410", date: "2025-10-18", status: "shipped", total: 220000, itemsCount: 1 },
  { id: "ATL-10355", date: "2025-10-02", status: "processing", total: 150000, itemsCount: 1 },
];

export const demoVendorProducts = demoProducts.filter((p) => p.store?.id === 1);

export const demoVendorEarnings = {
  available: 612400,
  pending: 98400,
  lifetime: 4285000,
  lastPayout: { amount: 480000, date: "2025-10-01" },
  commissionRate: 12,
};

export const demoAdminStats = {
  gmv: 28450000,
  orders: 312,
  vendors: demoStores.length + 3,
  pendingVendors: 2,
  commissionCollected: 3414000,
};

export const demoPendingVendors: DemoVendorApplication[] = [
  {
    id: 101,
    storeName: "Nkwobi Crafts Co.",
    owner: "Chidi Nwosu",
    location: "Enugu",
    submittedAt: "2025-11-04",
    status: "pending",
  },
  {
    id: 102,
    storeName: "Sahel Loom House",
    owner: "Fatima Bello",
    location: "Kano",
    submittedAt: "2025-11-02",
    status: "pending",
  },
  {
    id: 103,
    storeName: "Delta Pottery Works",
    owner: "Ese Omorogbe",
    location: "Asaba",
    submittedAt: "2025-10-29",
    status: "pending",
  },
];

export const demoModerationProducts = demoProducts.slice(0, 6).map((p, i) => ({
  ...p,
  moderationStatus: (i % 3 === 0 ? "flagged" : "pending") as "pending" | "flagged" | "approved",
}));

export const demoAdminOrders: DemoOrder[] = [
  ...demoCustomerOrders,
  {
    id: "ATL-10512",
    date: "2025-11-06",
    status: "pending",
    total: 68000,
    itemsCount: 1,
    store: "Clay & Ember",
  },
];

export const demoPayouts = [
  { id: "PAY-8821", vendor: "Adebayo Studio", amount: 480000, status: "completed", date: "2025-10-01" },
  { id: "PAY-8804", vendor: "Clay & Ember", amount: 325000, status: "completed", date: "2025-10-01" },
  { id: "PAY-8819", vendor: "Okafor Leather", amount: 290000, status: "processing", date: "2025-11-01" },
  { id: "PAY-8825", vendor: "Heritage Weave", amount: 410000, status: "scheduled", date: "2025-11-08" },
];

export const DEFAULT_SHIPPING_FEE = 2500;
export const DEFAULT_COMMISSION_RATE = 12;

export { demoCategories, demoBanners, formatNaira };
