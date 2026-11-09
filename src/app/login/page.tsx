"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageFade } from "@/components/motion/page-fade";
import { useAuthStore } from "@/store/auth";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const [email, setEmail] = useState("customer@atelier.ng");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      const roles = user?.roles || [];
      const next = params.get("next");
      if (next) router.push(next);
      else if (roles.includes("admin")) router.push("/admin");
      else if (roles.includes("vendor")) router.push("/vendor");
      else router.push("/account");
    } catch (err) {
      if (process.env.NEXT_PUBLIC_USE_DEMO === "true") {
        const role =
          email.includes("admin") ? "admin" : email.includes("vendor") ? "vendor" : "customer";
        useAuthStore.getState().setSession(
          {
            id: 1,
            name: role === "admin" ? "Platform Admin" : role === "vendor" ? "Demo Vendor" : "Ada Customer",
            email,
            roles: [role],
          },
          "demo-token"
        );
        router.push(role === "admin" ? "/admin" : role === "vendor" ? "/vendor" : "/account");
        return;
      }
      setError((err as { message?: string })?.message || "Unable to sign in");
    }
  }

  return (
    <PageFade className="container-atelier flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-white p-8 shadow-sm">
        <p className="text-xs font-medium tracking-[0.2em] text-crimson uppercase">Welcome back</p>
        <h1 className="mt-2 font-display text-3xl">Sign in to Atelier</h1>
        <p className="mt-2 text-sm text-muted">Access your orders, wishlist, or seller dashboard.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
          {error && <p className="text-sm text-crimson">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/forgot-password" className="font-medium text-burgundy hover:underline">
            Forgot password?
          </Link>
        </p>

        <p className="mt-4 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/register" className="font-medium text-burgundy hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </PageFade>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-atelier py-20 text-sm text-muted">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
