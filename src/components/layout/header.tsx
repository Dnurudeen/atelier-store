"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  CircleHelp,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Palette,
  Search,
  Shirt,
  ShoppingBag,
  Store,
  User,
  X,
  Gem,
  Footprints,
  Flower2,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { api, type Category } from "@/lib/api";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const fallbackCategories = [
  { slug: "fine-art", name: "Fine Art" },
  { slug: "fashion", name: "Fashion" },
  { slug: "ceramics", name: "Ceramics" },
  { slug: "sculpture", name: "Sculpture" },
  { slug: "leatherwork", name: "Leatherwork" },
  { slug: "home-decor", name: "Home Decor" },
];

const categoryIcons: Record<string, typeof Palette> = {
  "fine-art": Palette,
  fashion: Shirt,
  ceramics: Flower2,
  sculpture: Gem,
  leatherwork: Footprints,
  "home-decor": Home,
};

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>(fallbackCategories);
  const accountRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
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
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    void api<{ data: Category[] }>("/categories")
      .then((res) => {
        const rows = (res.data || [])
          .filter((category) => category.slug && category.name)
          .map((category) => ({ slug: category.slug, name: category.name }));
        if (rows.length) setCategories(rows);
      })
      .catch(() => setCategories(fallbackCategories));
  }, []);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (accountRef.current && !accountRef.current.contains(target)) setAccountOpen(false);
      if (helpRef.current && !helpRef.current.contains(target)) setHelpOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    window.location.href = `/shop?q=${encodeURIComponent(query)}`;
  }

  return (
    <header className={cn("sticky top-0 z-50 bg-white", scrolled && "shadow-sm")}>
      <div className="hidden border-b border-border bg-[var(--page-bg)] text-[12px] text-foreground/80 md:block">
        <div className="container-atelier flex h-8 items-center justify-between gap-4">
          <Link href="/become-a-vendor" className="inline-flex items-center gap-1.5 font-medium text-crimson hover:text-burgundy">
            <Store size={13} />
            Sell on Atelier
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/makers" className="hover:text-burgundy">
              Maker stores
            </Link>
            <Link href="/shop" className="hover:text-burgundy">
              Shop
            </Link>
            <a href="mailto:hello@atelier.ng" className="hover:text-burgundy">
              Call to order
            </a>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-white">
        <div className="container-atelier flex h-14 items-center gap-3 md:h-[72px] md:gap-5">
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              className="rounded-md p-2 hover:bg-surface md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <BrandLogo variant="header" priority />
          </div>

          <form onSubmit={onSearch} className="hidden min-w-0 flex-1 md:block">
            <div className="flex items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center rounded-md border border-[#c7c7cd] bg-white px-3 focus-within:border-burgundy">
                <Search size={16} className="shrink-0 text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products, brands and categories"
                  className="h-10 w-full bg-transparent px-2 text-sm outline-none placeholder:text-muted"
                />
              </label>
              <button
                type="submit"
                className="h-10 shrink-0 rounded-md bg-crimson px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-crimson-hover"
              >
                Search
              </button>
            </div>
          </form>

          <div className="ml-auto flex items-center gap-0.5 md:gap-1">
            <Link
              href={query ? `/shop?q=${encodeURIComponent(query)}` : "/shop"}
              className="rounded-md p-2.5 text-foreground/80 hover:bg-surface hover:text-burgundy md:hidden"
              aria-label="Search"
            >
              <Search size={18} />
            </Link>

            <div className="relative hidden sm:block" ref={accountRef}>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen((open) => !open);
                  setHelpOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-foreground/85 hover:bg-surface hover:text-burgundy"
              >
                <User size={18} />
                <span className="hidden lg:inline">Account</span>
                <ChevronDown size={14} className="text-muted" />
              </button>
              {accountOpen && (
                <div className="absolute top-full right-0 z-50 mt-1 w-48 overflow-hidden rounded-md border border-border bg-white py-1 shadow-lg">
                  {user ? (
                    <>
                      <Link
                        href={accountHref}
                        onClick={() => setAccountOpen(false)}
                        className="block px-3 py-2 text-sm hover:bg-surface"
                      >
                        My account
                      </Link>
                      <Link
                        href="/account/orders"
                        onClick={() => setAccountOpen(false)}
                        className="block px-3 py-2 text-sm hover:bg-surface"
                      >
                        Orders
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountOpen(false);
                          void logout();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface"
                      >
                        <LogOut size={14} />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setAccountOpen(false)}
                        className="block px-3 py-2 text-sm font-medium text-burgundy hover:bg-surface"
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setAccountOpen(false)}
                        className="block px-3 py-2 text-sm hover:bg-surface"
                      >
                        Create account
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="relative hidden sm:block" ref={helpRef}>
              <button
                type="button"
                onClick={() => {
                  setHelpOpen((open) => !open);
                  setAccountOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-foreground/85 hover:bg-surface hover:text-burgundy"
              >
                <CircleHelp size={18} />
                <span className="hidden lg:inline">Help</span>
                <ChevronDown size={14} className="text-muted" />
              </button>
              {helpOpen && (
                <div className="absolute top-full right-0 z-50 mt-1 w-52 overflow-hidden rounded-md border border-border bg-white py-1 shadow-lg">
                  <Link href="/become-a-vendor" onClick={() => setHelpOpen(false)} className="block px-3 py-2 text-sm hover:bg-surface">
                    Sell on Atelier
                  </Link>
                  <Link href="/makers" onClick={() => setHelpOpen(false)} className="block px-3 py-2 text-sm hover:bg-surface">
                    Find a maker
                  </Link>
                  <a href="mailto:hello@atelier.ng" className="block px-3 py-2 text-sm hover:bg-surface">
                    Contact support
                  </a>
                </div>
              )}
            </div>

            <button
              type="button"
              className="relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-foreground/85 hover:bg-surface hover:text-burgundy"
              onClick={openCart}
              aria-label="Cart"
            >
              <ShoppingBag size={18} />
              <span className="hidden lg:inline">Cart</span>
              {count > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-crimson px-1 text-[10px] font-semibold text-white lg:static lg:ml-0.5">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-[var(--page-bg)]">
        <nav className="container-atelier flex gap-1 overflow-x-auto py-2 text-[12px] md:gap-2 md:py-2.5 md:text-[13px]">
          <Link
            href="/makers"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-foreground/80 hover:bg-white hover:text-burgundy"
          >
            <Store size={15} />
            Official Store
          </Link>
          <Link
            href="/shop"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-foreground/80 hover:bg-white hover:text-burgundy"
          >
            <LayoutGrid size={15} />
            All
          </Link>
          {categories.map((category) => {
            const Icon = categoryIcons[category.slug] || LayoutGrid;
            return (
              <Link
                key={category.slug}
                href={`/shop?category=${category.slug}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-foreground/80 hover:bg-white hover:text-burgundy"
              >
                <Icon size={15} />
                {category.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {mobileOpen && (
        <div className="border-b border-border bg-white md:hidden">
          <form onSubmit={onSearch} className="container-atelier space-y-2 py-3">
            <label className="flex items-center gap-2 rounded-md border border-border bg-white px-3">
              <Search size={16} className="text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, brands and categories"
                className="h-10 w-full bg-transparent text-sm outline-none"
              />
            </label>
            <button type="submit" className="h-10 w-full rounded-md bg-crimson text-sm font-semibold text-white">
              Search
            </button>
          </form>
          <nav className="container-atelier flex flex-col gap-1 pb-3">
            <Link href="/become-a-vendor" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-crimson hover:bg-surface">
              Sell on Atelier
            </Link>
            {user ? (
              <>
                <Link href={accountHref} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface">
                  My account
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
              <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
