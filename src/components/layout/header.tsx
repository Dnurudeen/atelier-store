"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  CircleHelp,
  Heart,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Phone,
  RotateCcw,
  ShoppingCart,
  Store,
  Ticket,
  Truck,
  User,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { CategoryDrawer } from "@/components/layout/category-drawer";
import { SearchBox } from "@/components/layout/search-box";
import { categoryIcon } from "@/lib/category-icons";
import { useCategories, useDismiss, useSite } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";

function Dropdown({
  label,
  icon: Icon,
  children,
  align = "right",
  buttonClassName,
}: {
  label: React.ReactNode;
  icon: typeof User;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm text-foreground/85 hover:bg-surface hover:text-burgundy md:px-2.5",
          open && "bg-surface text-burgundy",
          buttonClassName
        )}
      >
        <Icon size={20} strokeWidth={1.8} />
        <span className="hidden max-w-[110px] truncate font-medium lg:inline">{label}</span>
        <ChevronDown size={14} className={cn("hidden text-muted transition-transform lg:block", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-[60] mt-1 w-60 overflow-hidden rounded-md border border-border bg-white py-1.5 shadow-xl",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon: Icon, children, onClick }: { href: string; icon: typeof User; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface">
      <Icon size={17} className="text-foreground/70" />
      {children}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const count = useCartStore((s) => s.count());
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: categories = [] } = useCategories();
  const { data: site } = useSite();
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const roles = user?.roles ?? [];
  const dashboard = roles.includes("admin")
    ? { href: "/admin", label: "Admin console" }
    : roles.includes("vendor")
      ? { href: "/vendor", label: "Seller Center" }
      : null;
  const firstName = user?.name?.split(" ")[0];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isHome = pathname === "/";

  return (
    <>
      <header className={cn("sticky top-0 z-50 bg-white", scrolled && "shadow-[0_2px_8px_rgba(0,0,0,0.08)]")}>
        {site?.announcement && (
          <div className="bg-crimson px-4 py-1.5 text-center text-[12px] font-semibold text-white" role="status">
            {site.announcement}
          </div>
        )}
        {/* Top strip */}
        <div className="hidden border-b border-border bg-[var(--page-bg)] text-[12px] text-foreground/80 md:block">
          <div className="container-atelier flex h-8 items-center justify-between gap-4">
            <Link href="/become-a-vendor" className="inline-flex items-center gap-1.5 font-semibold text-crimson hover:text-burgundy">
              <Store size={13} />
              Sell on Atelier
            </Link>
            <div className="flex items-center gap-5">
              <span className="inline-flex items-center gap-1.5">
                <Truck size={13} className="text-burgundy" /> Nationwide delivery
              </span>
              <span className="inline-flex items-center gap-1.5">
                <RotateCcw size={13} className="text-burgundy" /> 7-day easy returns
              </span>
              <Link href="/contact" className="inline-flex items-center gap-1.5 hover:text-burgundy">
                <Phone size={13} className="text-burgundy" /> Contact us
              </Link>
            </div>
          </div>
        </div>

        {/* Main bar */}
        <div className="border-b border-border bg-white">
          <div className="container-atelier flex h-14 min-w-0 items-center gap-1.5 overflow-hidden md:h-[68px] md:gap-4">
            <div className="flex min-w-0 shrink items-center gap-0.5">
              <button
                className="-ml-1 shrink-0 rounded-md p-2 hover:bg-surface"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open categories menu"
              >
                <Menu size={20} />
              </button>
              <BrandLogo variant="header" priority />
            </div>

            <Suspense fallback={<div className="hidden h-10 min-w-0 flex-1 md:block" />}>
              <SearchBox className="hidden min-w-0 flex-1 md:block" />
            </Suspense>

            <div className="ml-auto flex shrink-0 items-center gap-0">
              <Dropdown label={user ? `Hi, ${firstName}` : "Account"} icon={User}>
                {(close) =>
                  user ? (
                    <>
                      <div className="border-b border-border px-4 pt-1.5 pb-2.5">
                        <p className="truncate text-sm font-semibold">{user.name}</p>
                        <p className="truncate text-xs text-muted">{user.email}</p>
                      </div>
                      {dashboard && (
                        <MenuLink href={dashboard.href} icon={LayoutDashboard} onClick={close}>
                          <span className="font-semibold text-burgundy">{dashboard.label}</span>
                        </MenuLink>
                      )}
                      <MenuLink href="/account" icon={User} onClick={close}>My Account</MenuLink>
                      <MenuLink href="/account/orders" icon={Package} onClick={close}>Orders</MenuLink>
                      <MenuLink href="/account/inbox" icon={Inbox} onClick={close}>Inbox</MenuLink>
                      <MenuLink href="/account/wishlist" icon={Heart} onClick={close}>Saved Items</MenuLink>
                      <MenuLink href="/account/vouchers" icon={Ticket} onClick={close}>Vouchers</MenuLink>
                      <div className="mt-1 border-t border-border pt-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            close();
                            void logout();
                          }}
                          className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-crimson hover:bg-surface"
                        >
                          <LogOut size={16} /> Log out
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="px-3 pt-1.5 pb-2">
                        <Link
                          href={`/login${pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : ""}`}
                          onClick={close}
                          className="flex h-10 w-full items-center justify-center rounded-md bg-crimson text-sm font-semibold text-white hover:bg-crimson-hover"
                        >
                          Sign in
                        </Link>
                        <p className="mt-2 text-center text-xs text-muted">
                          New here?{" "}
                          <Link href="/register" onClick={close} className="font-semibold text-burgundy hover:underline">
                            Create account
                          </Link>
                        </p>
                      </div>
                      <div className="border-t border-border pt-1">
                        <MenuLink href="/login?next=/account/orders" icon={Package} onClick={close}>Orders</MenuLink>
                        <MenuLink href="/login?next=/account/wishlist" icon={Heart} onClick={close}>Saved Items</MenuLink>
                      </div>
                    </>
                  )
                }
              </Dropdown>

              <div className="hidden lg:block">
                <Dropdown label="Help" icon={CircleHelp}>
                  {(close) => (
                    <>
                      <MenuLink href="/help" icon={CircleHelp} onClick={close}>Help Center</MenuLink>
                      <MenuLink href="/account/orders" icon={Package} onClick={close}>Track your order</MenuLink>
                      <MenuLink href="/returns" icon={RotateCcw} onClick={close}>Returns &amp; refunds</MenuLink>
                      <MenuLink href="/shipping" icon={Truck} onClick={close}>Delivery options</MenuLink>
                      <div className="px-3 pt-2 pb-1">
                        <Link
                          href="/contact"
                          onClick={close}
                          className="flex h-9 w-full items-center justify-center rounded-md border border-burgundy text-sm font-semibold text-burgundy hover:bg-burgundy hover:text-white"
                        >
                          Contact us
                        </Link>
                      </div>
                    </>
                  )}
                </Dropdown>
              </div>

              <Link
                href="/cart"
                className="relative inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm text-foreground/85 hover:bg-surface hover:text-burgundy md:px-2.5"
                aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
              >
                <span className="relative">
                  <ShoppingCart size={21} strokeWidth={1.8} />
                  {count > 0 && (
                    <span className="absolute -top-2 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-crimson px-1 text-[10px] font-bold text-white">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </span>
                <span className="hidden font-medium lg:inline">Cart</span>
              </Link>
            </div>
          </div>

          {/* Mobile search row (always visible, like Jumia's app-style header) */}
          <div className="container-atelier pb-2.5 md:hidden">
            <Suspense fallback={<div className="h-10" />}>
              <SearchBox />
            </Suspense>
          </div>
        </div>

        {/* Category row: desktop, shown on home and catalogue pages */}
        {(isHome || pathname?.startsWith("/category") || pathname?.startsWith("/shop")) && categories.length > 0 && (
          <div className="hidden border-b border-border bg-white md:block">
            <nav className="container-atelier flex gap-1 overflow-x-auto py-1.5 text-[13px]" aria-label="Categories">
              <Link href="/makers" className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-foreground/80 hover:bg-surface hover:text-burgundy">
                <Store size={15} /> Official Stores
              </Link>
              {categories.map((category) => {
                const Icon = categoryIcon(category.slug);
                return (
                  <Link
                    key={category.slug}
                    href={`/category/${category.slug}`}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-foreground/80 hover:bg-surface hover:text-burgundy",
                      pathname === `/category/${category.slug}` && "bg-surface font-semibold text-burgundy"
                    )}
                  >
                    <Icon size={15} />
                    {category.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <CategoryDrawer open={drawerOpen} onClose={closeDrawer} />
    </>
  );
}
