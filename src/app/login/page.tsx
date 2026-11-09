"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AuthDivider, GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageFade } from "@/components/motion/page-fade";
import { PageLoader } from "@/components/ui/page-loader";
import { postAuthPath } from "@/lib/auth-redirect";
import { useAuthStore } from "@/store/auth";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function goAfterAuth() {
    const user = useAuthStore.getState().user;
    router.push(postAuthPath(user, { next: params.get("next") }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      goAfterAuth();
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
            needs_onboarding: false,
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
    <PageFade className="container-atelier flex min-h-[70vh] items-center justify-center py-10 md:py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-sm md:rounded-3xl md:p-8">
        <p className="text-[10px] font-medium tracking-[0.2em] text-crimson uppercase md:text-xs">Welcome back</p>
        <h1 className="mt-1.5 font-display text-2xl md:mt-2 md:text-3xl">Sign in to Atelier</h1>
        <p className="mt-1.5 text-[13px] text-muted md:mt-2 md:text-sm">Access your orders, wishlist, or seller dashboard.</p>

        <div className="mt-6 md:mt-8">
          <GoogleSignInButton
            label="signin_with"
            onSuccess={goAfterAuth}
            onError={(message) => setError(message)}
          />
        </div>

        <AuthDivider />

        <form onSubmit={onSubmit} className="space-y-4">
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
    <Suspense fallback={<PageLoader label="Preparing sign in" />}>
      <LoginForm />
    </Suspense>
  );
}
