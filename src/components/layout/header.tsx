"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Menu, Search, ShoppingBag, User, X, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
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

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>(fallbackCategories);
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

  function onSearch(event: FormEvent) {
    event.preventDefault();
    window.location.href = `/shop?q=${encodeURIComponent(query)}`;
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled ? "border-border/80 bg-white/95 backdrop-blur-md shadow-sm" : "border-border bg-white"
      )}
    >
      <div className="container-atelier flex h-14 items-center gap-2 md:h-16 md:gap-4">
        <div className="flex items-center gap-1.5">
          <button
            className="rounded-full p-2 hover:bg-surface md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <BrandLogo variant="header" priority />
        </div>

        <form onSubmit={onSearch} className="hidden min-w-0 flex-1 md:block">
          <label className="flex items-center overflow-hidden rounded-md border border-border bg-white focus-within:border-burgundy">
            <Search size={16} className="ml-3 shrink-0 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products, brands and categories"
              className="h-10 w-full bg-transparent px-2 text-sm outline-none placeholder:text-muted"
            />
            <button
              type="submit"
              className="m-1 h-8 shrink-0 rounded-sm bg-burgundy px-4 text-sm font-semibold text-white transition hover:bg-burgundy-deep"
            >
              Search
            </button>
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href={query ? `/shop?q=${encodeURIComponent(query)}` : "/shop"}
            className="rounded-full p-2.5 text-foreground/80 hover:bg-surface hover:text-burgundy md:hidden"
            aria-label="Search"
          >
            <Search size={18} />
          </Link>
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
          <Button size="sm" className="ml-1 hidden lg:inline-flex" onClick={() => (window.location.href = "/become-a-vendor")}>
            Join as Vendor
          </Button>
        </div>
      </div>

      <div className="border-t border-border bg-white lg:hidden">
        <nav className="container-atelier flex gap-1 overflow-x-auto py-2 text-sm">
          <Link href="/shop" className="shrink-0 rounded-md px-3 py-1.5 font-medium text-burgundy hover:bg-surface">
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/shop?category=${category.slug}`}
              className="shrink-0 rounded-md px-3 py-1.5 text-foreground/80 hover:bg-surface hover:text-burgundy"
            >
              {category.name}
            </Link>
          ))}
          <Link href="/makers" className="shrink-0 rounded-md px-3 py-1.5 text-foreground/80 hover:bg-surface hover:text-burgundy">
            Makers
          </Link>
        </nav>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-white md:hidden">
          <form onSubmit={onSearch} className="container-atelier py-3">
            <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-3">
              <Search size={16} className="text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search art, ceramics, makers..."
                className="h-10 w-full bg-transparent text-sm outline-none"
              />
            </label>
          </form>
          <nav className="container-atelier flex flex-col gap-1 pb-3">
            {user ? (
              <>
                <Link href={accountHref} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface">
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
