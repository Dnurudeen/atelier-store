"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/store/cart";
import { formatNaira, cn } from "@/lib/utils";
import { DEFAULT_SHIPPING_FEE } from "@/lib/demo-dashboard";
import { Check, MapPin, Package, CreditCard } from "lucide-react";

const STEPS = [
  { id: 1, label: "Address", icon: MapPin },
  { id: 2, label: "Delivery", icon: Package },
  { id: 3, label: "Payment", icon: CreditCard },
] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clear = useCartStore((s) => s.clear);

  const [step, setStep] = useState(1);
  const [paying, setPaying] = useState(false);
  const [address, setAddress] = useState({
    name: "Ada Okafor",
    phone: "+234 801 234 5678",
    line1: "14 Admiralty Way, Lekki Phase 1",
    city: "Lagos",
    state: "Lagos",
  });

  const shipping = items.length > 0 ? DEFAULT_SHIPPING_FEE : 0;
  const total = subtotal + shipping;

  const storeCount = useMemo(() => {
    const ids = new Set(items.map((i) => i.product.store?.id).filter(Boolean));
    return ids.size;
  }, [items]);

  async function handlePay() {
    setPaying(true);
    try {
      if (process.env.NEXT_PUBLIC_USE_DEMO !== "true") {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, address, total }),
        });
        if (!res.ok) throw new Error("Checkout failed");
      }
    } catch {
      // Demo fallback on API failure
    }
    await new Promise((r) => setTimeout(r, 900));
    clear();
    router.push("/checkout/success");
  }

  function onAddressSubmit(e: FormEvent) {
    e.preventDefault();
    setStep(2);
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
    <div className="container-atelier py-10 md:py-14">
      <p className="text-xs font-medium tracking-[0.2em] text-crimson uppercase">Checkout</p>
      <h1 className="mt-2 font-display text-3xl md:text-4xl">Complete your order</h1>

      <ol className="mt-8 flex flex-wrap gap-3">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
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
              {done ? <Check size={16} /> : <Icon size={16} />}
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
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  required
                />
                <Input
                  label="Phone"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Street address"
                value={address.line1}
                onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="City"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  required
                />
                <Input
                  label="State"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="mt-2">
                Continue to delivery
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4 rounded-2xl border border-border bg-white p-6">
              <h2 className="font-display text-xl">Delivery summary</h2>
              <p className="text-sm text-muted">
                Ships to {address.line1}, {address.city}, {address.state}
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
                Pay securely with card, bank transfer, or USSD. Demo mode simulates a successful charge.
              </p>
              <Input label="Card number (demo)" placeholder="4242 4242 4242 4242" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Expiry" placeholder="12/28" />
                <Input label="CVV" placeholder="123" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="button" loading={paying} onClick={handlePay}>
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
                    {img ? (
                      <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                    ) : null}
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
    </div>
  );
}
