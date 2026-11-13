"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { MailCheck } from "lucide-react";
import { AuthShell, FormAlert } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { api, errorMessage, fieldErrors } from "@/lib/api";

function ForgotPasswordForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/auth/forgot-password", { method: "POST", body: { email: email.trim() }, token: null });
      setSent(true);
    } catch (err) {
      setError(fieldErrors(err).email || errorMessage(err, "Unable to send the reset email."));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your inbox" subtitle={<>If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your password. It expires in 60 minutes.</>}>
        <div className="flex flex-col items-center gap-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-warm text-burgundy">
            <MailCheck className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-center text-[13px] text-muted">
            Didn&apos;t get it? Check your spam folder, or{" "}
            <button type="button" className="font-semibold text-burgundy hover:underline" onClick={() => setSent(false)}>
              try again
            </button>
            .
          </p>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter the email you use for Atelier and we'll send you a secure link to choose a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-burgundy hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && <FormAlert>{error}</FormAlert>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
