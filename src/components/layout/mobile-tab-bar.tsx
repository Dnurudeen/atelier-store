"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, ShoppingBag, UserRound, Compass } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Home, match: (path: string) => path === "/" },
  {
    href: "/shop",
    label: "Shop",
    icon: Compass,
    match: (path: string) => path.startsWith("/shop") || path.startsWith("/product"),
  },
  {
    href: "/makers",
    label: "Makers",
    icon: Store,
    match: (path: string) => path.startsWith("/makers"),
  },
] as const;

export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const count = useCartStore((s) => s.count());
  const openCart = useCartStore((s) => s.open);
  const user = useAuthStore((s) => s.user);

  const accountHref = user?.roles?.includes("admin")
    ? "/admin"
    : user?.roles?.includes("vendor")
      ? "/vendor"
      : user
        ? "/account"
        : "/login";

  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-white/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid h-14 max-w-lg grid-cols-5 px-1">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium tracking-wide transition",
                active ? "text-burgundy" : "text-muted hover:text-foreground"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
              <span>{tab.label}</span>
              {active && (
                <span className="absolute top-1 h-1 w-1 rounded-full bg-crimson" aria-hidden />
              )}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={openCart}
          className="relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium tracking-wide text-muted transition hover:text-foreground"
        >
          <span className="relative">
            <ShoppingBag size={20} strokeWidth={1.75} />
            {count > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crimson px-1 text-[9px] font-semibold text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </span>
          <span>Bag</span>
        </button>

        <Link
          href={accountHref}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium tracking-wide transition",
            pathname.startsWith("/account") ||
              pathname.startsWith("/login") ||
              pathname.startsWith("/vendor") ||
              pathname.startsWith("/admin")
              ? "text-burgundy"
              : "text-muted hover:text-foreground"
          )}
        >
          <UserRound size={20} strokeWidth={1.75} />
          <span>{user ? "You" : "Sign in"}</span>
        </Link>
      </div>
    </nav>
  );
}
