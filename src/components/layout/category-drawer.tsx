"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, HelpCircle, Package, Store, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { categoryIcon } from "@/lib/category-icons";
import { useCategories } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

/**
 * Jumia-style slide-in menu: every category with its sub-categories,
 * plus account and help shortcuts. Used on all screen sizes from the hamburger.
 */
export function CategoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: categories = [] } = useCategories();
  const [expanded, setExpanded] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div className={cn("fixed inset-0 z-[70]", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <div
        className={cn("absolute inset-0 bg-black/40 transition-opacity", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Browse categories"
        className={cn(
          "absolute inset-y-0 left-0 flex w-[86%] max-w-[340px] flex-col bg-white shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <BrandLogo href="/" />
          <button onClick={onClose} className="rounded-md p-2 hover:bg-surface" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <section className="py-2">
            <p className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">Need help?</p>
            <Link href="/help" onClick={onClose} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface">
              <HelpCircle size={17} className="text-burgundy" /> Help Center
            </Link>
            <Link href={user ? "/account/orders" : "/login?next=/account/orders"} onClick={onClose} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface">
              <Package size={17} className="text-burgundy" /> Track my order
            </Link>
          </section>

          <section className="border-t border-border py-2">
            <p className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">Our categories</p>
            <Link href="/shop" onClick={onClose} className="block px-4 py-2.5 text-sm font-medium hover:bg-surface">
              All products
            </Link>
            {categories.map((category) => {
              const Icon = categoryIcon(category.slug);
              const children = category.children ?? [];
              const isOpen = expanded === category.slug;
              return (
                <div key={category.id}>
                  <div className="flex items-center">
                    <Link
                      href={`/category/${category.slug}`}
                      onClick={onClose}
                      className="flex flex-1 items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface"
                    >
                      <Icon size={17} className="text-burgundy" />
                      {category.name}
                    </Link>
                    {children.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : category.slug)}
                        className="px-4 py-2.5 text-muted hover:text-burgundy"
                        aria-expanded={isOpen}
                        aria-label={`Show ${category.name} sub-categories`}
                      >
                        <ChevronRight size={16} className={cn("transition-transform", isOpen && "rotate-90")} />
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="bg-surface pb-1">
                      {children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/category/${child.slug}`}
                          onClick={onClose}
                          className="block py-2 pr-4 pl-12 text-[13px] text-foreground/80 hover:text-burgundy"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <section className="border-t border-border py-2">
            <Link href="/makers" onClick={onClose} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface">
              <Store size={17} className="text-burgundy" /> Official maker stores
            </Link>
            <Link href="/become-a-vendor" onClick={onClose} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-crimson hover:bg-surface">
              <Store size={17} /> Sell on Atelier
            </Link>
          </section>
        </div>
      </aside>
    </div>
  );
}
