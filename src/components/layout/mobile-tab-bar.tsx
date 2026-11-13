"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, Home, LayoutGrid, ShoppingCart, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";

/** Jumia-app style bottom navigation for phones. */
export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const count = useCartStore((s) => s.count());
  const user = useAuthStore((s) => s.user);

  const tabs = [
    { href: "/", label: "Home", icon: Home, active: pathname === "/" },
    {
      href: "/categories",
      label: "Categories",
      icon: LayoutGrid,
      active: pathname.startsWith("/categories") || pathname.startsWith("/category") || pathname.startsWith("/shop"),
    },
    { href: "/cart", label: "Cart", icon: ShoppingCart, active: pathname.startsWith("/cart"), badge: count },
    { href: user ? "/account" : "/login?next=/account", label: "Account", icon: UserRound, active: pathname.startsWith("/account") },
    { href: "/help", label: "Help", icon: CircleHelp, active: pathname.startsWith("/help") },
  ];

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white md:hidden" aria-label="Main">
      <ul className="grid h-[3.5rem] grid-cols-5">
        {tabs.map(({ href, label, icon: Icon, active, badge }) => (
          <li key={label}>
            <Link
              href={href}
              className={cn("flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium", active ? "text-crimson" : "text-foreground/70")}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative">
                <Icon size={21} strokeWidth={active ? 2.2 : 1.8} />
                {badge ? (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crimson px-1 text-[9px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
