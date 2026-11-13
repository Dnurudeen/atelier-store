"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Store, User } from "lucide-react";
import { AuthShell, FormAlert } from "@/components/auth/auth-shell";
import { AuthDivider, GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { errorMessage, fieldErrors } from "@/lib/api";
import { postAuthPath, safeNext } from "@/lib/auth-redirect";
import { meetsPasswordRule } from "@/lib/password";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const next = safeNext(params.get("next"));

  const [asVendor, setAsVendor] = useState(params.get("as") === "vendor" || params.get("role") === "vendor");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    store_name: "",
    password: "",
    password_confirmation: "",
    newsletter_opt_in: false,
    terms: false,
  });
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function goAfterAuth() {
    router.replace(postAuthPath(useAuthStore.getState().user, { asVendor, next }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address.";
    if (form.phone && !/^\+?[0-9\s-]{7,20}$/.test(form.phone)) e.phone = "Enter a valid phone number.";
    if (asVendor && form.store_name.trim().length < 2) e.store_name = "Give your store a name.";
    if (!meetsPasswordRule(form.password)) e.password = "Use at least 8 characters with letters and numbers.";
    if (form.password !== form.password_confirmation) e.password_confirmation = "Passwords do not match.";
    if (!form.terms) e.terms = "Please accept the terms to continue.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        password_confirmation: form.password_confirmation,
        role: asVendor ? "vendor" : "customer",
        store_name: asVendor ? form.store_name.trim() : undefined,
        newsletter_opt_in: form.newsletter_opt_in,
      });
      goAfterAuth();
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      if (!Object.keys(fields).length) setError(errorMessage(err, "Unable to create your account."));
    }
  }

  return (
    <AuthShell
      eyebrow={asVendor ? "Sell on Atelier" : undefined}
      title={asVendor ? "Open your store" : "Create your account"}
      subtitle={
        asVendor
          ? "Reach buyers across Nigeria. We review every new store within 2 business days."
          : "Track orders, save favourites and check out faster."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-burgundy hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <div role="tablist" aria-label="Account type" className="mb-5 grid grid-cols-2 gap-1 rounded-md bg-surface p-1">
        {[
          { value: false, label: "I'm shopping", icon: User },
          { value: true, label: "I want to sell", icon: Store },
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={asVendor === value}
            onClick={() => setAsVendor(value)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded px-3 py-2 text-[13px] font-semibold transition",
              asVendor === value ? "bg-white text-burgundy shadow-sm" : "text-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <GoogleSignInButton
        role={asVendor ? "vendor" : "customer"}
        label="signup_with"
        onSuccess={goAfterAuth}
        onError={setError}
      />
      <AuthDivider text="or sign up with email" />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          autoComplete="name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          error={errors.name}
          required
        />
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          error={errors.email}
          required
        />
        <Input
          label="Phone number"
          type="tel"
          autoComplete="tel"
          placeholder="0803 000 0000"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          error={errors.phone}
          hint="For delivery updates. Optional."
        />
        {asVendor && (
          <Input
            label="Store name"
            value={form.store_name}
            onChange={(e) => update("store_name", e.target.value)}
            error={errors.store_name}
            hint="Shown to buyers. You can change it later."
            required
          />
        )}
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          error={errors.password}
          showStrength
          required
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          value={form.password_confirmation}
          onChange={(e) => update("password_confirmation", e.target.value)}
          error={errors.password_confirmation}
          required
        />

        <div className="space-y-2.5 pt-1 text-[13px]">
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--crimson)]"
              checked={form.newsletter_opt_in}
              onChange={(e) => update("newsletter_opt_in", e.target.checked)}
            />
            <span className="text-muted">Send me deals, new arrivals and maker stories by email.</span>
          </label>
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--crimson)]"
              checked={form.terms}
              onChange={(e) => update("terms", e.target.checked)}
              aria-invalid={errors.terms ? true : undefined}
            />
            <span className="text-muted">
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-burgundy underline" target="_blank">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-burgundy underline" target="_blank">
                Privacy Policy
              </Link>
              {asVendor && (
                <>
                  , including the{" "}
                  <Link href="/become-a-vendor" className="font-medium text-burgundy underline" target="_blank">
                    seller terms
                  </Link>
                </>
              )}
              .
            </span>
          </label>
          {errors.terms && <p className="text-xs text-crimson">{errors.terms}</p>}
        </div>

        {error && <FormAlert>{error}</FormAlert>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {asVendor ? "Create seller account" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<PageLoader label="Preparing your account" />}>
      <RegisterForm />
    </Suspense>
  );
}
