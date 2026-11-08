"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutSuccessPage() {
  const orderRef = "ATL-10518";

  return (
    <div className="container-atelier flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <CheckCircle2 className="text-emerald-600" size={56} strokeWidth={1.5} />
      <p className="mt-6 text-xs font-medium tracking-[0.2em] text-crimson uppercase">Thank you</p>
      <h1 className="mt-2 font-display text-3xl md:text-4xl">Your order is confirmed</h1>
      <p className="mt-3 max-w-md text-muted">
        We&apos;ve sent a receipt to your email. Reference{" "}
        <strong className="text-foreground">{orderRef}</strong>. Makers will prepare your pieces for
        dispatch shortly.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={() => (window.location.href = "/account/orders")}>
          View orders
        </Button>
        <Link href="/shop">
          <Button variant="outline">Continue shopping</Button>
        </Link>
      </div>
    </div>
  );
}
