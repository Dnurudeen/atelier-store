"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function VendorOnboardingPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/apply`, {
        method: "POST",
      });
    } catch {
      // demo fallback
    }
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-lg rounded-2xl border border-border bg-white p-8">
        <h2 className="font-display text-2xl">Application received</h2>
        <p className="mt-2 text-sm text-muted">
          Our team will review your store profile within 2 to 3 business days. You&apos;ll get an email
          once approved.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl">Store application</h2>
        <p className="mt-1 text-sm text-muted">
          Tell us about your craft. Verified makers get a dedicated storefront on Atelier Nigeria.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-white p-6">
        <Input name="storeName" label="Store name" required placeholder="Adebayo Studio" />
        <Input name="owner" label="Owner full name" required />
        <Input name="email" label="Business email" type="email" required />
        <Input name="location" label="City / state" required placeholder="Lagos, Lagos" />
        <Textarea name="bio" label="About your craft" rows={4} required placeholder="What you make and your story…" />
        <Input name="instagram" label="Instagram or portfolio (optional)" />
        <Button type="submit" loading={loading}>
          Submit application
        </Button>
      </form>
    </div>
  );
}
