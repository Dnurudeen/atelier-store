"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira, cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart";

export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.close);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore((s) => s.subtotal());

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close cart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
            onClick={close}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 md:px-5 md:py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-burgundy" />
                <h2 className="font-display text-lg text-foreground md:text-xl">Your cart</h2>
                {items.length > 0 && (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted">
                    {items.reduce((n, i) => n + i.quantity, 0)} items
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-full p-2 text-foreground/70 hover:bg-surface"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-surface"
                  >
                    <ShoppingBag size={28} className="text-muted" />
                  </motion.div>
                  <div>
                    <p className="font-display text-lg text-foreground">Your cart is empty</p>
                    <p className="mt-1 text-sm text-muted">
                      Discover handcrafted pieces from Nigerian makers.
                    </p>
                  </div>
                  <Link
                    href="/shop"
                    onClick={close}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-burgundy px-5 text-sm font-medium text-white transition hover:bg-burgundy-deep"
                  >
                    Browse the shop
                  </Link>
                </div>
              ) : (
                <ul className="space-y-4">
                  {items.map((item) => {
                    const price = item.variant?.price ?? item.product.price;
                    const image = item.product.images?.[0]?.url || "/brand/logo.png";
                    return (
                      <li
                        key={item.key}
                        className="flex gap-3 rounded-xl border border-border bg-surface/50 p-3"
                      >
                        <Link
                          href={`/product/${item.product.slug}`}
                          onClick={close}
                          className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-surface"
                        >
                          <Image src={image} alt={item.product.name} fill className="object-cover" sizes="64px" />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <Link
                            href={`/product/${item.product.slug}`}
                            onClick={close}
                            className="truncate text-sm font-medium leading-snug hover:text-burgundy"
                          >
                            {item.product.name}
                          </Link>
                          {item.variant && (
                            <p className="text-xs text-muted">{item.variant.name}</p>
                          )}
                          <p className="text-sm font-semibold text-burgundy">{formatNaira(price)}</p>
                          <div className="mt-auto flex items-center justify-between gap-2">
                            <div className="inline-flex items-center rounded-full border border-border bg-white">
                              <button
                                type="button"
                                className="p-1.5 text-foreground/70 hover:text-burgundy"
                                onClick={() => updateQuantity(item.key, item.quantity - 1)}
                                aria-label="Decrease quantity"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="min-w-[1.5rem] text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                className="p-1.5 text-foreground/70 hover:text-burgundy"
                                onClick={() => updateQuantity(item.key, item.quantity + 1)}
                                aria-label="Increase quantity"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <button
                              type="button"
                              className="rounded-full p-1.5 text-muted hover:bg-white hover:text-crimson"
                              onClick={() => removeItem(item.key)}
                              aria-label="Remove item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-border bg-surface-warm/50 px-5 py-5">
                <div className="mb-4 flex items-center justify-between text-sm">
                  <span className="text-muted">Subtotal</span>
                  <span className="text-lg font-semibold text-foreground">{formatNaira(subtotal)}</span>
                </div>
                <p className="mb-4 text-xs text-muted">
                  Shipping and taxes calculated at checkout. Multi-vendor orders may ship separately.
                </p>
                <Button className="w-full" size="lg" onClick={() => (window.location.href = "/checkout")}>
                  Proceed to checkout
                </Button>
                <button
                  type="button"
                  onClick={close}
                  className={cn(
                    "mt-3 w-full text-center text-sm font-medium text-muted transition hover:text-burgundy"
                  )}
                >
                  Continue shopping
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
