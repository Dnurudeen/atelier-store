"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { AuthShell, FormAlert } from "@/components/auth/auth-shell";
import { AuthDivider, GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { errorMessage, fieldErrors } from "@/lib/api";
import { postAuthPath, safeNext } from "@/lib/auth-redirect";
import { useAuthStore } from "@/store/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const hydrated = useAuthStore((s) => s.hydrated);
  const signedIn = useAuthStore((s) => Boolean(s.token && s.user));

  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const passwordRef = useRef<HTMLInputElement>(null);

  // Already signed in? Skip the form.
  useEffect(() => {
    if (hydrated && signedIn) {
      router.replace(postAuthPath(useAuthStore.getState().user, { next }));
    }
  }, [hydrated, signedIn, router, next]);

  useEffect(() => {
    if (step === "password") passwordRef.current?.focus();
  }, [step]);

  function goAfterAuth() {
    router.replace(postAuthPath(useAuthStore.getState().user, { next }));
  }

  function onEmail(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!EMAIL_RE.test(email.trim())) {
      setErrors({ email: "Enter a valid email address." });
      return;
    }
    setErrors({});
    setStep("password");
  }

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    setErrors({});
    try {
      await login(email.trim(), password);
      goAfterAuth();
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields.email) setError(fields.email);
      else setError(errorMessage(err, "Unable to sign in. Please try again."));
      setPassword("");
    }
  }

  const registerHref = `/register${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <AuthShell
      title="Welcome to Atelier"
      subtitle={
        step === "email"
          ? "Type your email address to sign in to your Atelier account."
          : "Enter your password to continue."
      }
      footer={
        <>
          New to Atelier?{" "}
          <Link href={registerHref} className="font-semibold text-burgundy hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {params.get("reason") === "expired" && (
        <div className="mb-4">
          <FormAlert tone="info">Your session expired. Please sign in again.</FormAlert>
        </div>
      )}

      {step === "email" ? (
        <form onSubmit={onEmail} className="space-y-4" noValidate>
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
          />
          <Button type="submit" size="lg" className="w-full">
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={onPassword} className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError("");
            }}
            className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5 text-left text-sm"
          >
            <Mail className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{email}</span>
            <span className="text-xs font-semibold text-burgundy">Edit</span>
          </button>
          <PasswordInput
            ref={passwordRef}
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <FormAlert>{error}</FormAlert>}
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Sign in
          </Button>
          <div className="flex items-center justify-between text-[13px]">
            <button
              type="button"
              onClick={() => setStep("email")}
              className="inline-flex items-center gap-1 text-muted hover:text-burgundy"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <Link
              href={`/forgot-password?email=${encodeURIComponent(email)}`}
              className="font-semibold text-burgundy hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </form>
      )}

      <AuthDivider />
      <GoogleSignInButton label="continue_with" onSuccess={goAfterAuth} onError={setError} />

      <p className="mt-5 text-center text-[11px] leading-relaxed text-muted">
        By continuing you agree to Atelier&apos;s{" "}
        <Link href="/terms" className="underline hover:text-burgundy">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-burgundy">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader label="Preparing sign in" />}>
      <LoginForm />
    </Suspense>
  );
}
