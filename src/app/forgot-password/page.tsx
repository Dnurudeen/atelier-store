"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageFade } from "@/components/motion/page-fade";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"request" | "reset" | "done">("request");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestReset(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: { email },
        token: null,
      });
      setMessage(res.message);
      setStep("reset");
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to send reset email");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: {
          email,
          token,
          password,
          password_confirmation: confirm,
        },
        token: null,
      });
      setStep("done");
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageFade className="container-atelier flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-white p-8 shadow-sm">
        <p className="text-xs font-medium tracking-[0.2em] text-crimson uppercase">Account recovery</p>
        <h1 className="mt-2 font-display text-3xl">Reset password</h1>

        {step === "request" && (
          <form onSubmit={requestReset} className="mt-8 space-y-4">
            <p className="text-sm text-muted">Enter your email and we will send a reset token.</p>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-sm text-crimson">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              Send reset token
            </Button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={resetPassword} className="mt-8 space-y-4">
            {message && <p className="text-sm text-muted">{message}</p>}
            <p className="text-sm text-muted">
              Check your inbox (or local mail log) for the token, then choose a new password.
            </p>
            <Input label="Reset token" value={token} onChange={(e) => setToken(e.target.value)} required />
            <Input
              label="New password"
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
              Update password
            </Button>
          </form>
        )}

        {step === "done" && (
          <div className="mt-8 space-y-4 text-center">
            <p className="text-sm text-muted">Password updated. You can sign in now.</p>
            <Button onClick={() => (window.location.href = "/login")}>Sign in</Button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-burgundy hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </PageFade>
  );
}
