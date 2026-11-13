"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell, FormAlert } from "@/components/auth/auth-shell";
import { PageLoader } from "@/components/ui/page-loader";
import { postAuthPath, safeNext } from "@/lib/auth-redirect";
import { errorMessage, fieldErrors } from "@/lib/api";
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
  const next = safeNext(params.get("next"));

  // null = untouched, so the form shows what we already know about the user.
  const [nameInput, setName] = useState<string | null>(null);
  const [phoneInput, setPhone] = useState<string | null>(null);
  const name = nameInput ?? user?.name ?? "";
  const phone = phoneInput ?? user?.phone ?? "";
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  }, [hydrated, token, user, router, next, asVendor]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\+?[0-9\s-]{7,20}$/.test(phone.trim())) {
      setErrors({ phone: "Enter a valid phone number." });
      return;
    }
    setErrors({});
    try {
      await completeOnboarding({
        name,
        phone,
        role: asVendor ? "vendor" : undefined,
      });
      const updated = useAuthStore.getState().user;
      router.replace(postAuthPath(updated, { next, asVendor }));
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err, "Unable to finish onboarding"));
    }
  }

  if (!hydrated || !user) {
    return <PageLoader label="Checking your session" />;
  }

  return (
    <AuthShell
      eyebrow="Almost there"
      title="Complete your profile"
      subtitle="Add a phone number so sellers and our delivery partners can reach you about your orders."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
        <Input
          label="Phone number (WhatsApp preferred)"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0803 000 0000"
          error={errors.phone}
          required
        />
        {asVendor && <FormAlert tone="info">Next, you&apos;ll add your store details.</FormAlert>}
        {error && !Object.keys(errors).length && <FormAlert>{error}</FormAlert>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Continue
        </Button>
      </form>
    </AuthShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<PageLoader label="Preparing onboarding" />}>
      <OnboardingForm />
    </Suspense>
  );
}
