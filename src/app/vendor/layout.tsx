"use client";

import { ReactNode } from "react";
import { DashboardShell, type DashNavItem } from "@/components/layout/dashboard-shell";
import { RequireAuth } from "@/components/auth/require-auth";
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  Wallet,
  Settings,
  PlusCircle,
} from "lucide-react";

const nav: DashNavItem[] = [
  { href: "/vendor", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { href: "/vendor/onboarding", label: "Onboarding", icon: <Store size={16} /> },
  { href: "/vendor/products", label: "Products", icon: <Package size={16} /> },
  { href: "/vendor/products/new", label: "New product", icon: <PlusCircle size={16} /> },
  { href: "/vendor/orders", label: "Orders", icon: <ShoppingBag size={16} /> },
  { href: "/vendor/earnings", label: "Earnings", icon: <Wallet size={16} /> },
  { href: "/vendor/settings", label: "Settings", icon: <Settings size={16} /> },
];

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth roles={["vendor", "admin"]}>
      <DashboardShell title="Vendor" nav={nav}>
        {children}
      </DashboardShell>
    </RequireAuth>
  );
}
