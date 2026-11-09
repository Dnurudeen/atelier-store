"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageFade } from "@/components/motion/page-fade";
import { useAuthStore } from "@/store/auth";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const asVendor = params.get("as") === "vendor" || params.get("role") === "vendor";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    try {
      await register({
        name,
        email,
        password,
        password_confirmation: confirm,
        role: asVendor ? "vendor" : "customer",
      });
      router.push(asVendor ? "/vendor/onboarding" : "/account");
    } catch (err) {
      if (process.env.NEXT_PUBLIC_USE_DEMO === "true") {
        useAuthStore.getState().setSession(
          {
            id: Date.now(),
            name,
            email,
            roles: [asVendor ? "vendor" : "customer"],
          },
          "demo-token"
        );
        router.push(asVendor ? "/vendor/onboarding" : "/account");
        return;
      }
      setError((err as { message?: string })?.message || "Unable to register");
    }
  }

  return (
    <PageFade className="container-atelier flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-white p-8 shadow-sm">
        <p className="text-xs font-medium tracking-[0.2em] text-crimson uppercase">
          {asVendor ? "Vendor application" : "Join Atelier"}
        </p>
        <h1 className="mt-2 font-display text-3xl">
          {asVendor ? "Start selling your craft" : "Create your account"}
        </h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {error && <p className="text-sm text-crimson">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            {asVendor ? "Continue as vendor" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-burgundy hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </PageFade>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="container-atelier py-20 text-sm text-muted">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
