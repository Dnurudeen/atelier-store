"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageFade } from "@/components/motion/page-fade";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { estimateCartShipping, mapCartToCheckoutPayload } from "@/lib/checkout";
import { formatNaira, cn } from "@/lib/utils";
import { Check, MapPin, Package, CreditCard } from "lucide-react";

const STEPS = [
  { id: 1, label: "Address", icon: MapPin },
  { id: 2, label: "Delivery", icon: Package },
  { id: 3, label: "Payment", icon: CreditCard },
] as const;

type CheckoutResponse = {
  data: {
    authorization_url?: string | null;
    reference: string;
    demo?: boolean;
    order?: { order_number?: string; total?: number | string };
  };
};

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clear = useCartStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const [step, setStep] = useState(1);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [address, setAddress] = useState({
    full_name: "",
    phone: "",
    address_line: "",
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
  });

  useEffect(() => {
    if (!hydrated) return;
    if (!token || !user) {
      router.replace(`/login?next=${encodeURIComponent("/checkout")}`);
    } else {
      setAddress((a) => ({
        ...a,
        full_name: a.full_name || user.name || "",
      }));
    }
  }, [hydrated, token, user, router]);

  const shipping = estimateCartShipping(items);
  const total = subtotal + shipping;

  const storeCount = useMemo(() => {
    const ids = new Set(items.map((i) => i.product.store?.id).filter(Boolean));
    return ids.size;
  }, [items]);

  async function handlePay() {
    setPaying(true);
    setError("");
    try {
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/checkout/success`
          : undefined;
      const payload = mapCartToCheckoutPayload(items, address, callbackUrl);
      const res = await api<CheckoutResponse>("/checkout", {
        method: "POST",
        body: payload,
      });

      const url = res.data.authorization_url;
      if (!url) {
        throw new Error("No payment URL returned");
      }

      clear();
      window.location.href = url;
    } catch (err) {
      setError((err as { message?: string })?.message || "Checkout failed. Please try again.");
      setPaying(false);
    }
  }

  function onAddressSubmit(e: FormEvent) {
    e.preventDefault();
    setStep(2);
  }

  if (!hydrated || !token) {
    return (
      <div className="container-atelier py-20 text-center text-sm text-muted">
        Checking your session…
      </div>
    );
  }

  if (items.length === 0 && !paying) {
    return (
      <div className="container-atelier py-20 text-center">
        <h1 className="font-display text-3xl">Your cart is empty</h1>
        <p className="mt-2 text-muted">Add pieces from the shop before checking out.</p>
        <Button className="mt-6" onClick={() => router.push("/shop")}>
          Browse shop
        </Button>
      </div>
    );
  }

  return (
    <PageFade className="container-atelier py-10 md:py-14">
      <p className="text-xs font-medium tracking-[0.2em] text-crimson uppercase">Checkout</p>
      <h1 className="mt-2 font-display text-3xl md:text-4xl">Complete your order</h1>

      <ol className="mt-8 flex flex-wrap gap-3">
        {STEPS.map((s) => {
          const active = step === s.id;
          const done = step > s.id;
          const Icon = s.icon;
          return (
            <li
              key={s.id}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm",
                active && "border-burgundy bg-burgundy/5 text-burgundy",
                done && "border-emerald-200 bg-emerald-50 text-emerald-900",
                !active && !done && "border-border text-muted"
              )}
            >
              {done ? <Check size={14} /> : <Icon size={14} />}
              {s.label}
            </li>
          );
        })}
      </ol>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {step === 1 && (
            <form onSubmit={onAddressSubmit} className="space-y-4 rounded-2xl border border-border bg-white p-6">
              <h2 className="font-display text-xl">Delivery address</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full name"
                  value={address.full_name}
                  onChange={(e) => setAddress((a) => ({ ...a, full_name: e.target.value }))}
                  required
                />
                <Input
                  label="Phone"
                  value={address.phone}
                  onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))}
                  required
                />
              </div>
              <Input
                label="Address"
                value={address.address_line}
                onChange={(e) => setAddress((a) => ({ ...a, address_line: e.target.value }))}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="City"
                  value={address.city}
                  onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                  required
                />
                <Input
                  label="State"
                  value={address.state}
                  onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                  required
                />
              </div>
              <Button type="submit">Continue to delivery</Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4 rounded-2xl border border-border bg-white p-6">
              <h2 className="font-display text-xl">Delivery summary</h2>
              <p className="text-sm text-muted">
                Ships to {address.address_line}, {address.city}, {address.state}
              </p>
              <div className="rounded-xl bg-surface-warm p-4 text-sm">
                <p className="font-medium text-foreground">
                  {storeCount > 1
                    ? `${storeCount} makers. Items may arrive in separate parcels`
                    : "Single maker. One parcel"}
                </p>
                <p className="mt-2 text-muted">
                  Estimated delivery: 3 to 7 business days within Nigeria. Rural areas may take longer.
                </p>
                <p className="mt-2 font-medium text-burgundy">Shipping: {formatNaira(shipping)}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" type="button" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" onClick={() => setStep(3)}>
                  Continue to payment
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 rounded-2xl border border-border bg-white p-6">
              <h2 className="font-display text-xl">Payment</h2>
              <p className="text-sm text-muted">
                You will complete payment securely with Paystack (card, bank transfer, or USSD). If Paystack
                keys are not configured locally, demo checkout opens the success page instead.
              </p>
              {error && <p className="text-sm text-crimson">{error}</p>}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="button" loading={paying} onClick={() => void handlePay()}>
                  Pay {formatNaira(total)}
                </Button>
              </div>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg">Order summary</h2>
          <ul className="mt-4 space-y-4">
            {items.map((item) => {
              const price = item.variant?.price ?? item.product.price;
              const img = item.product.images?.[0]?.url;
              return (
                <li key={item.key} className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface">
                    {img ? <Image src={img} alt="" fill className="object-cover" sizes="64px" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted">Qty {item.quantity}</p>
                    <p className="text-sm font-semibold text-burgundy">
                      {formatNaira(Number(price) * item.quantity)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <dl className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{formatNaira(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Shipping</dt>
              <dd>{formatNaira(shipping)}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd className="text-burgundy">{formatNaira(total)}</dd>
            </div>
          </dl>
          <Link href="/shop" className="mt-4 block text-center text-sm text-muted hover:text-burgundy">
            Continue shopping
          </Link>
        </aside>
      </div>
    </PageFade>
  );
}
