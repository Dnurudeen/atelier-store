"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CreditCard, Lock, MapPin, Truck } from "lucide-react";
import { AddressForm } from "@/components/account/address-form";
import { BrandLogo } from "@/components/brand/logo";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { api, errorMessage, type Address } from "@/lib/api";
import { ISSUE_TEXT, mapCartToCheckoutPayload, useCartQuote } from "@/lib/checkout";
import { formatDeliveryRange } from "@/lib/nigeria";
import { cn, formatNaira } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";

type CheckoutResponse = { data: { authorization_url: string | null; reference: string; demo?: boolean } };

const PENDING_KEY = "atelier-pending-checkout";

function Step({ n, title, done, children, action }: { n: number; title: string; done?: boolean; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-md bg-white">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 font-sans text-[13px] font-bold tracking-wide uppercase">
          {done ? <CheckCircle2 size={18} className="text-emerald-600" /> : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-border text-[11px]">{n}</span>}
          {title}
        </h2>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);

  const [couponInput, setCouponInput] = useState(params.get("voucher") ?? "");
  const [coupon, setCoupon] = useState<string | null>(params.get("voucher"));
  const [addressId, setAddressId] = useState<number | null>(null);
  const [editingAddress, setEditingAddress] = useState<"new" | "pick" | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const { data: quote, isFetching: quoting } = useCartQuote(coupon);
  const { data: addresses, isLoading: loadingAddresses } = useQuery({
    queryKey: ["addresses", token],
    queryFn: async () => (await api<{ data: Address[] }>("/account/addresses")).data,
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (hydrated && !token) router.replace("/login?next=/checkout");
  }, [hydrated, token, router]);

  const selected = useMemo(() => {
    if (!addresses?.length) return null;
    return addresses.find((a) => a.id === addressId) ?? addresses.find((a) => a.is_default) ?? addresses[0];
  }, [addresses, addressId]);

  const showAddressForm = editingAddress === "new" || (!loadingAddresses && addresses?.length === 0);
  const blocking = quote?.lines.some((l) => l.issue && l.issue !== "limited_stock");

  async function placeOrder() {
    if (!selected) {
      setError("Add a delivery address first.");
      return;
    }
    setPaying(true);
    setError("");
    try {
      const callbackUrl = `${window.location.origin}/checkout/success`;
      const payload = mapCartToCheckoutPayload(items, null, callbackUrl, { addressId: selected.id, couponCode: quote?.voucher ? coupon : null });
      const res = await api<CheckoutResponse>("/checkout", { method: "POST", body: payload });
      if (!res.data.authorization_url) throw { message: "Payment could not be started. Please try again." };
      // The cart is cleared only after the payment is confirmed (see /checkout/success).
      sessionStorage.setItem(PENDING_KEY, res.data.reference);
      window.location.href = res.data.authorization_url;
    } catch (err) {
      setError(errorMessage(err, "Checkout failed. Please try again."));
      void client.invalidateQueries({ queryKey: ["cart-quote"] });
      setPaying(false);
    }
  }

  if (!hydrated || !token) return <PageLoader label="Checking your session" />;

  if (items.length === 0 && !paying) {
    return (
      <div className="container-atelier py-20 text-center">
        <h1 className="font-display text-3xl">Your cart is empty</h1>
        <p className="mt-2 text-muted">Add products to your cart before checking out.</p>
        <Link href="/shop" className="mt-6 inline-flex rounded-md bg-crimson px-5 py-3 text-sm font-semibold text-white">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] pb-28 md:pb-12">
      <header className="border-b border-border bg-white">
        <div className="container-atelier flex h-14 items-center justify-between">
          <BrandLogo />
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
            <Lock size={14} /> Secure checkout
          </p>
          <Link href="/cart" className="hidden text-[13px] font-semibold text-burgundy hover:underline sm:block">
            Back to cart
          </Link>
        </div>
      </header>

      <div className="container-atelier grid gap-3 pt-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <Step
            n={1}
            title="Customer address"
            done={Boolean(selected) && !editingAddress}
            action={
              selected && !editingAddress ? (
                <button type="button" onClick={() => setEditingAddress("pick")} className="text-[13px] font-semibold text-crimson hover:underline">
                  Change
                </button>
              ) : null
            }
          >
            {loadingAddresses ? (
              <div className="skeleton h-16 rounded-md" />
            ) : showAddressForm ? (
              <AddressForm
                initial={{ full_name: user?.name ?? "", phone: user?.phone ?? "", is_default: !addresses?.length }}
                submitLabel="Save and use this address"
                onCancel={addresses?.length ? () => setEditingAddress(null) : undefined}
                onSaved={(a) => {
                  void client.invalidateQueries({ queryKey: ["addresses"] });
                  setAddressId(a.id);
                  setEditingAddress(null);
                }}
              />
            ) : editingAddress === "pick" ? (
              <div className="space-y-2">
                {addresses!.map((a) => (
                  <label key={a.id} className={cn("flex cursor-pointer gap-3 rounded-md border p-3 text-sm", selected?.id === a.id ? "border-crimson bg-crimson/5" : "border-border")}>
                    <input type="radio" name="address" checked={selected?.id === a.id} onChange={() => setAddressId(a.id)} className="mt-1 accent-[var(--crimson)]" />
                    <span>
                      <span className="font-semibold">{a.full_name}</span> {a.is_default && <span className="ml-1 rounded bg-surface px-1.5 text-[11px] text-muted">Default</span>}
                      <span className="block text-muted">
                        {a.address_line}, {a.city}, {a.state}
                      </span>
                      <span className="block text-muted">{a.phone}</span>
                    </span>
                  </label>
                ))}
                <div className="flex gap-2 pt-1">
                  <Button onClick={() => setEditingAddress(null)}>Use selected address</Button>
                  <Button variant="outline" onClick={() => setEditingAddress("new")}>
                    Add a new address
                  </Button>
                </div>
              </div>
            ) : (
              selected && (
                <div className="flex gap-3 text-sm">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-burgundy" />
                  <div>
                    <p className="font-semibold">{selected.full_name}</p>
                    <p className="text-muted">
                      {selected.address_line}, {selected.city}, {selected.state}
                    </p>
                    <p className="text-muted">{selected.phone}</p>
                  </div>
                </div>
              )
            )}
          </Step>

          <Step n={2} title="Delivery details" done={Boolean(selected && quote && !blocking)}>
            {!quote ? (
              <div className="skeleton h-24 rounded-md" />
            ) : (
              <div className="space-y-3">
                <p className="flex items-start gap-2 rounded-md bg-surface p-3 text-[13px]">
                  <Truck size={18} className="shrink-0 text-burgundy" />
                  <span>
                    <span className="font-semibold">Door delivery.</span> Each seller ships separately, so you may receive {quote.stores.length > 1 ? `${quote.stores.length} packages` : "your package"} on different days.
                  </span>
                </p>
                {quote.stores.map((s, i) => {
                  const lines = quote.lines.filter((l) => l.store_id === s.store.id && l.product);
                  return (
                    <div key={s.store.id} className="rounded-md border border-border">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 text-[13px]">
                        <p className="font-semibold">
                          Shipment {i + 1}/{quote.stores.length} <span className="font-normal text-muted">· Fulfilled by {s.store.name}</span>
                        </p>
                        <p className="text-muted">
                          Delivery {selected ? <span className="font-semibold text-foreground">{formatDeliveryRange(s.store.location, selected.state)}</span> : "—"} ·{" "}
                          {s.shipping_fee > 0 ? formatNaira(s.shipping_fee) : "Free"}
                        </p>
                      </div>
                      <ul className="divide-y divide-border">
                        {lines.map((l) => (
                          <li key={l.key} className="flex items-center gap-3 px-3 py-2">
                            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-surface">
                              <AppImage src={l.product!.images?.[0]?.url} alt="" fill sizes="48px" frameClassName="absolute inset-0" />
                            </span>
                            <span className="min-w-0 flex-1 text-[13px]">
                              <span className="line-clamp-1">{l.product!.name}</span>
                              <span className="text-muted">
                                {l.variant ? `${l.variant.name} · ` : ""}QTY: {l.quantity}
                              </span>
                            </span>
                            <span className="text-[13px] font-semibold">{formatNaira(l.total)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {quote.lines.filter((l) => l.issue).map((l) => (
                  <p key={l.key} className="flex items-center gap-1.5 text-[13px] text-crimson">
                    <AlertTriangle size={14} /> {l.product?.name ?? "An item"}: {ISSUE_TEXT[l.issue!]}{" "}
                    {l.issue !== "limited_stock" && (
                      <Link href="/cart" className="font-semibold underline">
                        Fix in cart
                      </Link>
                    )}
                  </p>
                ))}
              </div>
            )}
          </Step>

          <Step n={3} title="Payment method" done>
            <label className="flex items-start gap-3 rounded-md border border-crimson bg-crimson/5 p-3 text-sm">
              <input type="radio" checked readOnly className="mt-1 accent-[var(--crimson)]" />
              <span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <CreditCard size={16} /> Pay now with Paystack
                </span>
                <span className="block text-[13px] text-muted">Card, bank transfer or USSD. You&apos;ll be redirected to Paystack&apos;s secure page.</span>
              </span>
            </label>
          </Step>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-md bg-white">
            <h2 className="border-b border-border px-4 py-3 text-[13px] font-bold tracking-wide uppercase">Order summary</h2>
            <div className="space-y-2 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span>Item&apos;s total ({items.reduce((s, i) => s + i.quantity, 0)})</span>
                <span>{formatNaira(quote?.subtotal ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery fees</span>
                <span>{formatNaira(quote?.shipping_total ?? 0)}</span>
              </div>
              {quote && quote.discount_total > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Voucher {quote.voucher?.code}</span>
                  <span>-{formatNaira(quote.discount_total)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <span>Total</span>
                <span>{formatNaira(quote?.total ?? 0)}</span>
              </div>

              <form
                className="flex gap-2 pt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setCoupon(couponInput.trim() || null);
                }}
              >
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter voucher code"
                  aria-label="Voucher code"
                  className="h-9 min-w-0 flex-1 rounded-md border border-border px-2.5 text-[13px] uppercase outline-none focus:border-burgundy"
                />
                <button className="h-9 rounded-md border border-crimson px-3 text-[12px] font-bold text-crimson uppercase hover:bg-crimson hover:text-white">Apply</button>
              </form>
              {coupon && quote?.voucher_error && <p className="text-[12px] text-crimson">{quote.voucher_error}</p>}
              {coupon && quote?.voucher && (
                <p className="flex items-center justify-between text-[12px] text-emerald-700">
                  Voucher applied
                  <button
                    type="button"
                    className="font-semibold text-crimson"
                    onClick={() => {
                      setCoupon(null);
                      setCouponInput("");
                    }}
                  >
                    Remove
                  </button>
                </p>
              )}
            </div>
            <div className="border-t border-border p-3">
              {error && <p className="mb-2 rounded-md bg-crimson/5 px-3 py-2 text-[13px] text-crimson">{error}</p>}
              <Button size="lg" className="hidden w-full uppercase md:flex" onClick={() => void placeOrder()} loading={paying} disabled={!selected || !quote || Boolean(blocking) || quoting || Boolean(editingAddress)}>
                Confirm order
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted">
                By placing your order you agree to our{" "}
                <Link href="/terms" className="underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/returns" className="underline">
                  Return Policy
                </Link>
                .
              </p>
            </div>
          </section>
        </aside>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white p-2.5 md:hidden">
        <Button size="lg" className="h-12 w-full uppercase" onClick={() => void placeOrder()} loading={paying} disabled={!selected || !quote || Boolean(blocking) || quoting || Boolean(editingAddress)}>
          Confirm order · {formatNaira(quote?.total ?? 0)}
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageLoader label="Preparing checkout" />}>
      <CheckoutInner />
    </Suspense>
  );
}
