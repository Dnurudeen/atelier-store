"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BadgePercent,
  Bell,
  Boxes,
  CircleHelp,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Package,
  PlusCircle,
  RotateCcw,
  Settings,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { RequireAuth } from "@/components/auth/require-auth";
import { DashboardShell, type DashNavGroup } from "@/components/layout/dashboard-shell";
import { useAccountOverview } from "@/lib/account";
import { STORE_STATUS_COPY, useVendorOverview } from "@/lib/vendor";
import { useAuthStore } from "@/store/auth";

function StatusBanner() {
  const store = useAuthStore((s) => s.user?.store);
  const copy = store && store.status !== "approved" ? STORE_STATUS_COPY[store.status] : null;
  if (!copy) return null;
  return (
    <div className={store?.status === "pending" ? "border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 md:px-6" : "border-b border-crimson/30 bg-crimson/5 px-4 py-3 text-crimson md:px-6"}>
      <p className="text-sm font-semibold">{copy.title}</p>
      <p className="text-[13px]">
        {store?.status_reason ? `Reason: ${store.status_reason}. ` : ""}
        {copy.text}{" "}
        <Link href="/contact" className="font-semibold underline">
          Contact support
        </Link>
      </p>
    </div>
  );
}

function SellerFrame({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const { data } = useVendorOverview();
  const { data: account } = useAccountOverview();
  const todo = data?.todo;

  const groups: DashNavGroup[] = [
    {
      items: [{ href: "/vendor", label: "Dashboard", icon: <LayoutDashboard size={17} /> }],
    },
    {
      title: "Sales",
      items: [
        { href: "/vendor/orders", label: "Orders", icon: <ShoppingBag size={17} />, badge: todo?.to_process },
        { href: "/vendor/returns", label: "Returns", icon: <RotateCcw size={17} />, badge: todo?.returns },
        { href: "/vendor/reviews", label: "Reviews", icon: <MessageSquareText size={17} />, badge: todo?.unanswered_reviews },
      ],
    },
    {
      title: "Catalogue",
      items: [
        { href: "/vendor/products", label: "Products", icon: <Package size={17} />, badge: todo?.rejected_products },
        { href: "/vendor/products/new", label: "Add a product", icon: <PlusCircle size={17} /> },
        { href: "/vendor/inventory", label: "Inventory", icon: <Boxes size={17} /> },
        { href: "/vendor/promotions", label: "Promotions", icon: <BadgePercent size={17} /> },
        { href: "/vendor/sponsored", label: "Sponsored ads", icon: <Megaphone size={17} /> },
      ],
    },
    {
      title: "Store",
      items: [
        { href: "/vendor/statements", label: "Earnings & payouts", icon: <Wallet size={17} /> },
        { href: "/vendor/notifications", label: "Notifications", icon: <Bell size={17} />, badge: account?.counts.unread },
        { href: "/vendor/settings", label: "Store settings", icon: <Settings size={17} /> },
        { href: "/vendor/help", label: "Seller help", icon: <CircleHelp size={17} /> },
      ],
    },
  ];

  return (
    <DashboardShell
      title="Seller Center"
      groups={groups}
      rootHref="/vendor"
      banner={<StatusBanner />}
      notificationsHref="/vendor/notifications"
      unread={account?.counts.unread ?? 0}
      topRight={
        user?.store?.slug && user.store.status === "approved" ? (
          <Link href={`/makers/${user.store.slug}`} target="_blank" className="hidden rounded-md border border-border px-3 py-1.5 text-[13px] font-semibold hover:border-burgundy sm:inline-flex">
            View my store
          </Link>
        ) : null
      }
    >
      {children}
    </DashboardShell>
  );
}

function NoStore() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--page-bg)] p-6">
      <div className="max-w-md rounded-md bg-white p-8 text-center">
        <h1 className="font-display text-2xl text-burgundy">Open your store first</h1>
        <p className="mt-2 text-sm text-muted">This account doesn&apos;t have a store yet. Set one up to start selling on Atelier.</p>
        <Link href="/vendor/onboarding" className="mt-5 inline-flex rounded-md bg-crimson px-5 py-2.5 text-sm font-semibold text-white">
          Set up my store
        </Link>
      </div>
    </div>
  );
}

export default function VendorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  // Any signed-in user can apply to sell; the rest of the Seller Center needs a store.
  if (pathname === "/vendor/onboarding") {
    return <RequireAuth>{children}</RequireAuth>;
  }

  return (
    <RequireAuth roles={["vendor", "admin"]}>
      {user && !user.store ? <NoStore /> : <SellerFrame>{children}</SellerFrame>}
    </RequireAuth>
  );
}
