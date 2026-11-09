"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageFade } from "@/components/motion/page-fade";
import { PageLoader } from "@/components/ui/page-loader";
import { api, type Order } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/auth";

function SuccessContent() {
  const params = useSearchParams();
  const reference = params.get("reference") || "";
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (!reference) {
      setError("Missing payment reference.");
      setLoading(false);
      return;
    }
    if (!token) {
      setError("Sign in to confirm your payment.");
      setLoading(false);
      return;
    }

    void api<{ data: Order }>(`/payments/verify/${encodeURIComponent(reference)}`)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(err?.message || "Unable to verify payment"))
      .finally(() => setLoading(false));
  }, [hydrated, reference, token]);

  if (loading) {
    return <PageLoader label="Confirming your payment" />;
  }

  return (
    <PageFade className="container-atelier flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <CheckCircle2 className="text-emerald-600" size={56} strokeWidth={1.5} />
      <p className="mt-6 text-xs font-medium tracking-[0.2em] text-crimson uppercase">Thank you</p>
      <h1 className="mt-2 font-display text-3xl md:text-4xl">
        {order?.payment_status === "paid" ? "Your order is confirmed" : "Payment received"}
      </h1>
      {error ? (
        <p className="mt-3 max-w-md text-crimson">{error}</p>
      ) : (
        <p className="mt-3 max-w-md text-muted">
          Reference <strong className="text-foreground">{order?.order_number || reference}</strong>
          {order ? ` · ${formatNaira(order.total)}` : ""}. Makers will prepare your pieces for dispatch
          shortly.
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={() => (window.location.href = "/account/orders")}>
          View orders
        </Button>
        <Link href="/shop">
          <Button variant="outline">Continue shopping</Button>
        </Link>
      </div>
    </PageFade>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<PageLoader label="Confirming your payment" />}>
      <SuccessContent />
    </Suspense>
  );
}
