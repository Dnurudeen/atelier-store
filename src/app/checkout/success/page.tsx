"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { api, errorMessage, type Order } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";

const PENDING_KEY = "atelier-pending-checkout";

function SuccessContent() {
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("trxref") || "";
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const clearCart = useCartStore((s) => s.clear);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    let timer = 0;
    let attempts = 0;

    async function verify() {
      try {
        const res = await api<{ data: Order }>(`/payments/verify/${encodeURIComponent(reference)}`);
        if (cancelled) return;
        setOrder(res.data);
        setError("");
        if (res.data.payment_status === "paid") {
          clearCart();
          sessionStorage.removeItem(PENDING_KEY);
        } else if (res.data.payment_status === "pending" && attempts < 4) {
          // Paystack can take a few seconds to confirm bank transfers.
          attempts += 1;
          timer = window.setTimeout(() => void verify(), 3000);
          return;
        }
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err, "We couldn't confirm this payment."));
      }
      setLoading(false);
    }

    timer = window.setTimeout(() => {
      if (!reference || !token) {
        setError(!reference ? "This page needs a payment reference." : "Sign in to see your order.");
        setLoading(false);
        return;
      }
      void verify();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hydrated, reference, token, clearCart]);

  if (loading) return <PageLoader label="Confirming your payment" />;

  const status = order?.payment_status;
  const paid = status === "paid";
  const pending = status === "pending";

  const Icon = paid ? CheckCircle2 : pending ? Clock : XCircle;
  const tone = paid ? "text-emerald-600" : pending ? "text-amber-500" : "text-crimson";
  const title = paid ? "Thank you for your order!" : pending ? "We're confirming your payment" : "Payment not completed";
  const message = paid
    ? "We've emailed your receipt. Sellers are preparing your items and you'll get updates as each package ships."
    : pending
      ? "This usually takes a moment. You can safely leave this page. Your order will update automatically."
      : error || "Your card was not charged, or the payment was cancelled. Your cart is still saved, so you can try again.";

  return (
    <div className="bg-[var(--page-bg)] py-8 md:py-14">
      <div className="container-atelier max-w-xl">
        <div className="rounded-md bg-white p-6 text-center md:p-10">
          <Icon className={`mx-auto ${tone}`} size={60} strokeWidth={1.5} />
          <h1 className="mt-4 font-display text-2xl text-burgundy md:text-3xl">{title}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">{message}</p>

          {order && (
            <dl className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-y-2 rounded-md bg-surface p-4 text-left text-sm">
              <dt className="text-muted">Order number</dt>
              <dd className="text-right font-semibold">{order.order_number}</dd>
              <dt className="text-muted">Total</dt>
              <dd className="text-right font-semibold">{formatNaira(order.total)}</dd>
              <dt className="text-muted">Packages</dt>
              <dd className="text-right font-semibold">{order.sub_orders?.length ?? 1}</dd>
            </dl>
          )}

          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            {order && (paid || pending) ? (
              <Link href={`/account/orders/${order.id}`}>
                <Button className="w-full sm:w-auto">Track my order</Button>
              </Link>
            ) : (
              <Link href="/cart">
                <Button className="w-full sm:w-auto">Return to cart</Button>
              </Link>
            )}
            <Link href="/shop">
              <Button variant="outline" className="w-full sm:w-auto">
                Continue shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<PageLoader label="Confirming your payment" />}>
      <SuccessContent />
    </Suspense>
  );
}
