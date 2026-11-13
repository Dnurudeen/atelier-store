"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Clock, Heart, Inbox, LogOut, MapPin, MessageSquareText, Package, RotateCcw, Settings, Store, Ticket, User } from "lucide-react";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAccountOverview } from "@/lib/account";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

type Item = { href: string; label: string; icon: typeof User; badge?: (c: NonNullable<ReturnType<typeof useAccountOverview>["data"]>["counts"]) => number };

const MAIN: Item[] = [
  { href: "/account", label: "My Atelier Account", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/inbox", label: "Inbox", icon: Inbox, badge: (c) => c.unread },
  { href: "/account/reviews", label: "Pending Reviews", icon: MessageSquareText, badge: (c) => c.pending_reviews },
  { href: "/account/vouchers", label: "Vouchers", icon: Ticket, badge: (c) => c.vouchers },
  { href: "/account/wishlist", label: "Saved Items", icon: Heart },
  { href: "/account/following", label: "Followed Sellers", icon: Store },
  { href: "/account/recently-viewed", label: "Recently Viewed", icon: Clock },
  { href: "/account/returns", label: "Returns", icon: RotateCcw },
];

const SETTINGS: Item[] = [
  { href: "/account/profile", label: "Account Management", icon: Settings },
  { href: "/account/addresses", label: "Address Book", icon: MapPin },
];

function NavLink({ item, active, count }: { item: Item; active: boolean; count?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn("flex items-center gap-3 px-4 py-2.5 text-[14px] hover:bg-surface", active && "bg-surface font-semibold")}
    >
      <Icon size={18} className={active ? "text-crimson" : "text-foreground/70"} />
      <span className="flex-1">{item.label}</span>
      {count ? <span className="rounded-full bg-crimson px-1.5 text-[11px] font-bold text-white">{count > 99 ? "99+" : count}</span> : null}
    </Link>
  );
}

export default function AccountLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/account";
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const { data } = useAccountOverview();
  const isActive = (href: string) => (href === "/account" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  const isHome = pathname === "/account";

  return (
    <RequireAuth>
      <div className="bg-[var(--page-bg)] pb-12">
        <div className="container-atelier grid gap-3 pt-4 md:grid-cols-[260px_minmax(0,1fr)]">
          <aside className={cn("h-fit overflow-hidden rounded-md bg-white", !isHome && "hidden md:block")}>
            <nav aria-label="My account">
              {MAIN.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} count={data && item.badge ? item.badge(data.counts) : undefined} />
              ))}
              <p className="border-t border-border px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">Settings</p>
              {SETTINGS.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
                className="flex w-full items-center justify-center gap-2 border-t border-border px-4 py-3 text-sm font-bold text-crimson uppercase hover:bg-crimson/5"
              >
                <LogOut size={16} /> Logout
              </button>
            </nav>
          </aside>

          <section className="min-w-0">
            {!isHome && (
              <Link href="/account" className="mb-2 inline-flex text-[13px] font-semibold text-burgundy md:hidden">
                ← My account
              </Link>
            )}
            {children}
          </section>
        </div>
      </div>
    </RequireAuth>
  );
}
