"use client";

import type { ReactNode } from "react";
import {
  BadgePercent,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  Package,
  RotateCcw,
  ScrollText,
  Settings,
  ShoppingBag,
  Store,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import { RequireAuth } from "@/components/auth/require-auth";
import { DashboardShell, type DashNavGroup } from "@/components/layout/dashboard-shell";
import { useAdmin } from "@/lib/admin";

type Overview = {
  data: { pending_vendors: number; pending_products: number; escalated_returns: number; refunds_due: number; pending_payouts: number; open_messages: number };
};

function AdminFrame({ children }: { children: ReactNode }) {
  const { data } = useAdmin<Overview>("/overview");
  const o = data?.data;

  const groups: DashNavGroup[] = [
    { items: [{ href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={17} /> }] },
    {
      title: "Marketplace",
      items: [
        { href: "/admin/orders", label: "Orders", icon: <ShoppingBag size={17} />, badge: o?.refunds_due },
        { href: "/admin/returns", label: "Returns", icon: <RotateCcw size={17} />, badge: o?.escalated_returns },
        { href: "/admin/products", label: "Products", icon: <Package size={17} />, badge: o?.pending_products },
        { href: "/admin/vendors", label: "Sellers", icon: <Store size={17} />, badge: o?.pending_vendors },
        { href: "/admin/users", label: "Customers & users", icon: <Users size={17} /> },
        { href: "/admin/reviews", label: "Reviews", icon: <MessageSquareText size={17} /> },
      ],
    },
    {
      title: "Catalogue",
      items: [
        { href: "/admin/categories", label: "Categories", icon: <FolderTree size={17} /> },
        { href: "/admin/brands", label: "Brands", icon: <Tag size={17} /> },
      ],
    },
    {
      title: "Marketing",
      items: [
        { href: "/admin/vouchers", label: "Vouchers", icon: <BadgePercent size={17} /> },
        { href: "/admin/banners", label: "Banners", icon: <ImageIcon size={17} /> },
      ],
    },
    {
      title: "Finance & support",
      items: [
        { href: "/admin/payouts", label: "Payouts", icon: <Wallet size={17} />, badge: o?.pending_payouts },
        { href: "/admin/messages", label: "Support messages", icon: <Mail size={17} />, badge: o?.open_messages },
        { href: "/admin/audit", label: "Audit log", icon: <ScrollText size={17} /> },
        { href: "/admin/settings", label: "Settings", icon: <Settings size={17} /> },
      ],
    },
  ];

  return (
    <DashboardShell title="Admin console" groups={groups} rootHref="/admin">
      {children}
    </DashboardShell>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth roles={["admin"]}>
      <AdminFrame>{children}</AdminFrame>
    </RequireAuth>
  );
}

