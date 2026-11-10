"use client";

import { ReactNode } from "react";
import { DashboardShell, type DashNavItem } from "@/components/layout/dashboard-shell";
import { RequireAuth } from "@/components/auth/require-auth";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Wallet,
  Settings,
  Megaphone,
  BadgePercent,
  CircleHelp,
} from "lucide-react";

const nav: DashNavItem[] = [
  { href: "/vendor", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { href: "/vendor/orders", label: "Orders", icon: <ShoppingBag size={16} /> },
  { href: "/vendor/products", label: "Products", icon: <Package size={16} /> },
  { href: "/vendor/promotions", label: "Promotions", icon: <BadgePercent size={16} /> },
  { href: "/vendor/sponsored", label: "Sponsored", icon: <Megaphone size={16} /> },
  { href: "/vendor/statements", label: "Statements", icon: <Wallet size={16} /> },
  { href: "/vendor/help", label: "Help", icon: <CircleHelp size={16} /> },
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
