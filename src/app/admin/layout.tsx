"use client";

import { ReactNode } from "react";
import { DashboardShell, type DashNavItem } from "@/components/layout/dashboard-shell";
import { RequireAuth } from "@/components/auth/require-auth";
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  FolderTree,
  Image,
  Banknote,
  Settings,
} from "lucide-react";

const nav: DashNavItem[] = [
  { href: "/admin", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { href: "/admin/vendors", label: "Vendors", icon: <Store size={16} /> },
  { href: "/admin/products", label: "Products", icon: <Package size={16} /> },
  { href: "/admin/orders", label: "Orders", icon: <ShoppingBag size={16} /> },
  { href: "/admin/categories", label: "Categories", icon: <FolderTree size={16} /> },
  { href: "/admin/banners", label: "Banners", icon: <Image size={16} /> },
  { href: "/admin/payouts", label: "Payouts", icon: <Banknote size={16} /> },
  { href: "/admin/settings", label: "Settings", icon: <Settings size={16} /> },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth roles={["admin"]}>
      <DashboardShell title="Admin" nav={nav}>
        {children}
      </DashboardShell>
    </RequireAuth>
  );
}
