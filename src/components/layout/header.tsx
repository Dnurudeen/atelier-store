"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search, ShoppingBag, User, X, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?category=fine-art", label: "Fine Art" },
  { href: "/shop?category=fashion", label: "Fashion" },
  { href: "/shop?category=ceramics", label: "Ceramics" },
  { href: "/makers", label: "Makers" },
  { href: "/become-a-vendor", label: "Sell" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const count = useCartStore((s) => s.count());
  const openCart = useCartStore((s) => s.open);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const accountHref = user?.roles?.includes("admin")
    ? "/admin"
    : user?.roles?.includes("vendor")
      ? "/vendor"
      : "/account";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "border-border/80 bg-white/95 backdrop-blur-md shadow-sm"
          : "border-transparent bg-white"
      )}
    >
      <div className="container-atelier flex h-14 items-center justify-between gap-2 md:h-16">
        <div className="flex items-center gap-1.5 md:gap-3">
          <button
            className="rounded-full p-2 hover:bg-surface md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <BrandLogo variant="header" priority />
        </div>

        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-foreground/75 transition hover:text-burgundy"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            className="rounded-full p-2.5 text-foreground/80 hover:bg-surface hover:text-burgundy"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
          >
            <Search size={18} />
          </button>
          {user ? (
            <>
              <Link
                href={accountHref}
                className="hidden rounded-full p-2.5 text-foreground/80 hover:bg-surface hover:text-burgundy sm:inline-flex"
                aria-label="Account"
              >
                <User size={18} />
              </Link>
              <button
                className="hidden rounded-full p-2.5 text-foreground/80 hover:bg-surface hover:text-burgundy sm:inline-flex"
                onClick={() => void logout()}
                aria-label="Sign out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-full p-2.5 text-foreground/80 hover:bg-surface hover:text-burgundy sm:inline-flex"
              aria-label="Sign in"
            >
              <User size={18} />
            </Link>
          )}
          <button
            className="relative rounded-full p-2.5 text-foreground/80 hover:bg-surface hover:text-burgundy"
            onClick={openCart}
            aria-label="Cart"
          >
            <ShoppingBag size={18} />
            {count > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-crimson px-1 text-[10px] font-semibold text-white">
                {count}
              </span>
            )}
          </button>
          <Button
            size="sm"
            className="ml-1 hidden lg:inline-flex"
            onClick={() => {
              window.location.href = "/become-a-vendor";
            }}
          >
            Join as Vendor
          </Button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-border bg-white">
          <form
            className="container-atelier flex items-center gap-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = `/shop?q=${encodeURIComponent(query)}`;
            }}
          >
            <Search size={18} className="text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search art, ceramics, makers..."
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
            <button type="button" onClick={() => setSearchOpen(false)} className="text-sm text-muted">
              Close
            </button>
          </form>
        </div>
      )}

      {mobileOpen && (
        <div className="border-t border-border bg-white md:hidden">
          <nav className="container-atelier flex flex-col gap-1 py-3">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface"
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href={accountHref}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    void logout();
                  }}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-surface"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
