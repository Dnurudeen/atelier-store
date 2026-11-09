"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageFade } from "@/components/motion/page-fade";
import { postAuthPath } from "@/lib/auth-redirect";
import { useAuthStore } from "@/store/auth";

function OnboardingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const loading = useAuthStore((s) => s.loading);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const asVendor = params.get("role") === "vendor" || user?.roles?.includes("vendor");
  const next = params.get("next");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    if (!user.needs_onboarding) {
      router.replace(postAuthPath(user, { next, asVendor }));
      return;
    }
    setName(user.name || "");
    setPhone(user.phone || "");
  }, [hydrated, token, user, router, next, asVendor]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await completeOnboarding({
        name,
        phone,
        role: asVendor ? "vendor" : undefined,
      });
      const updated = useAuthStore.getState().user;
      router.replace(postAuthPath(updated, { next, asVendor }));
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to finish onboarding");
    }
  }

  if (!hydrated || !user) {
    return (
      <div className="container-atelier py-20 text-center text-sm text-muted">Checking your session…</div>
    );
  }

  return (
    <PageFade className="container-atelier flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-white p-8 shadow-sm">
        <p className="text-xs font-medium tracking-[0.2em] text-crimson uppercase">Almost there</p>
        <h1 className="mt-2 font-display text-3xl">Complete your profile</h1>
        <p className="mt-2 text-sm text-muted">
          You signed in with Google. Add a phone number so makers and Atelier can reach you about orders.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Phone (WhatsApp preferred)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0803…"
            required
          />
          {asVendor && (
            <p className="rounded-xl bg-surface-warm px-3 py-2 text-xs text-muted">
              Next you will finish your maker studio details.
            </p>
          )}
          {error && <p className="text-sm text-crimson">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Continue
          </Button>
        </form>
      </div>
    </PageFade>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="container-atelier py-20 text-sm text-muted">Loading...</div>}>
      <OnboardingForm />
    </Suspense>
  );
}
