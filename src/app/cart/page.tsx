"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Minus, Plus, ShieldCheck, ShoppingCart, Trash2, Truck } from "lucide-react";
import { RecentlyViewedRail } from "@/components/home/recently-viewed-rail";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { ISSUE_TEXT, useCartQuote } from "@/lib/checkout";
import { cn, discountPercent, formatNaira } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { maxQuantity, unitPrice, useCartStore } from "@/store/cart";

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const count = useCartStore((s) => s.count());
  const token = useAuthStore((s) => s.token);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const { data: quote, isFetching } = useCartQuote(applied);

  const lineFor = (key: string) => quote?.lines.find((l) => l.key === key);
  const blocking = quote?.lines.some((l) => l.issue && l.issue !== "limited_stock");
  const subtotal = quote?.subtotal ?? items.reduce((s, i) => s + unitPrice(i) * i.quantity, 0);

  function checkout() {
    const params = applied ? `?voucher=${encodeURIComponent(applied)}` : "";
    router.push(token ? `/checkout${params}` : `/login?next=${encodeURIComponent(`/checkout${params}`)}`);
  }

  if (items.length === 0) {
    return (
      <div className="bg-[var(--page-bg)] pb-12">
        <div className="container-atelier pt-4">
          <div className="flex flex-col items-center rounded-md bg-white px-4 py-14 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-warm text-burgundy">
              <ShoppingCart size={34} />
            </span>
            <h1 className="mt-4 font-sans text-lg font-bold tracking-normal">Your cart is empty!</h1>
            <p className="mt-1 text-sm text-muted">Browse our categories and discover our best deals!</p>
            <Link href="/shop" className="mt-5 rounded-md bg-crimson px-6 py-3 text-sm font-semibold text-white uppercase shadow hover:bg-crimson-hover">
              Start shopping
            </Link>
          </div>
        </div>
        <RecentlyViewedRail tone="light" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--page-bg)] pb-28 md:pb-12">
      <div className="container-atelier pt-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-md bg-white">
            <h1 className="border-b border-border px-4 py-3 font-sans text-lg font-bold tracking-normal">Cart ({count})</h1>
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const line = lineFor(item.key);
                const price = line?.unit_price ?? unitPrice(item);
                const old = item.product.compare_at_price;
                const off = discountPercent(price, old);
                const cap = line ? Math.min(line.available || 0, 20) : maxQuantity(item.product, item.variant);
                return (
                  <li key={item.key} className="p-3 md:p-4">
                    <div className="flex gap-3">
                      <Link href={`/product/${item.product.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-surface md:h-24 md:w-24">
                        <AppImage src={item.product.images?.[0]?.url} alt={item.product.name} fill sizes="96px" frameClassName="absolute inset-0" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={`/product/${item.product.slug}`} className="line-clamp-2 text-[14px] hover:text-burgundy">
                              {item.product.name}
                            </Link>
                            {item.variant && <p className="mt-0.5 text-[12px] text-muted">Variation: {item.variant.name}</p>}
                            {item.product.store && <p className="text-[12px] text-muted">Seller: {item.product.store.name}</p>}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[16px] font-bold">{formatNaira(price)}</p>
                            {off && (
                              <p className="text-[12px] text-muted">
                                <span className="line-through">{formatNaira(old!)}</span>{" "}
                                <span className="rounded-sm bg-[#fde8e9] px-1 font-semibold text-crimson">-{off}%</span>
                              </p>
                            )}
                          </div>
                        </div>
                        {line?.issue && (
                          <p className={cn("mt-1.5 inline-flex items-center gap-1 text-[12px]", line.issue === "limited_stock" ? "text-amber-700" : "text-crimson")}>
                            <AlertTriangle size={13} /> {ISSUE_TEXT[line.issue]}
                          </p>
                        )}
                        {!line?.issue && cap > 0 && cap <= 5 && <p className="mt-1 text-[12px] text-crimson">Only {cap} left</p>}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-semibold text-crimson uppercase hover:bg-crimson/10"
                      >
                        <Trash2 size={15} /> Remove
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="flex h-8 w-8 items-center justify-center rounded-md bg-crimson text-white shadow-sm disabled:bg-border disabled:text-muted"
                          aria-label={`Decrease quantity of ${item.product.name}`}
                        >
                          <Minus size={15} />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          disabled={item.quantity >= cap}
                          className="flex h-8 w-8 items-center justify-center rounded-md bg-crimson text-white shadow-sm disabled:bg-border disabled:text-muted"
                          aria-label={`Increase quantity of ${item.product.name}`}
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <aside className="space-y-3 lg:sticky lg:top-[150px] lg:self-start">
            <section className="rounded-md bg-white">
              <h2 className="border-b border-border px-4 py-2.5 text-[13px] font-bold tracking-wide uppercase">Cart summary</h2>
              <div className="space-y-2 px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold">{formatNaira(subtotal)}</span>
                </div>
                {quote && quote.discount_total > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Voucher ({quote.voucher?.code})</span>
                    <span>-{formatNaira(quote.discount_total)}</span>
                  </div>
                )}
                <p className="flex items-start gap-1.5 text-[12px] text-muted">
                  <Truck size={14} className="mt-0.5 shrink-0" /> Delivery fees ({formatNaira(quote?.shipping_total ?? 0)} for {quote?.stores.length ?? 1} seller
                  {(quote?.stores.length ?? 1) === 1 ? "" : "s"}) are added at checkout.
                </p>

                <form
                  className="flex gap-2 pt-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setApplied(coupon.trim() || null);
                  }}
                >
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    placeholder="Voucher code"
                    aria-label="Voucher code"
                    className="h-9 min-w-0 flex-1 rounded-md border border-border px-2.5 text-[13px] uppercase outline-none focus:border-burgundy"
                  />
                  <button type="submit" className="h-9 rounded-md border border-crimson px-3 text-[12px] font-bold text-crimson uppercase hover:bg-crimson hover:text-white">
                    Apply
                  </button>
                </form>
                {applied && quote?.voucher_error && <p className="text-[12px] text-crimson">{quote.voucher_error}</p>}
                {applied && quote?.voucher && <p className="text-[12px] text-emerald-700">Voucher {quote.voucher.code} applied.</p>}
              </div>
              <div className="border-t border-border p-3">
                <Button size="lg" className="w-full uppercase" onClick={checkout} disabled={Boolean(blocking)} loading={isFetching && !quote}>
                  Checkout ({formatNaira(quote ? quote.subtotal - quote.discount_total : subtotal)})
                </Button>
                {blocking && <p className="mt-2 text-center text-[12px] text-crimson">Remove unavailable items to continue.</p>}
              </div>
            </section>
            <section className="rounded-md bg-white p-4 text-[12px] text-muted">
              <p className="flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheck size={16} className="text-burgundy" /> Returns are easy
              </p>
              <p className="mt-1">Free return within 7 days for eligible items. Payments are processed securely by Paystack.</p>
            </section>
          </aside>
        </div>
      </div>

      <RecentlyViewedRail tone="light" />

      {/* Mobile sticky checkout */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white p-2.5 md:hidden">
        <Button size="lg" className="h-12 w-full uppercase" onClick={checkout} disabled={Boolean(blocking)}>
          Checkout ({formatNaira(quote ? quote.subtotal - quote.discount_total : subtotal)})
        </Button>
      </div>
    </div>
  );
}
