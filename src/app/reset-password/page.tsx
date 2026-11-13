"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AuthShell, FormAlert } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { meetsPasswordRule } from "@/lib/password";

function ResetPasswordForm() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!email || !token) {
    return (
      <AuthShell title="This link is incomplete" subtitle="Open the reset link from your email again, or request a new one.">
        <Link href="/forgot-password">
          <Button className="w-full" size="lg">
            Request a new link
          </Button>
        </Link>
      </AuthShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const next: Record<string, string> = {};
    if (!meetsPasswordRule(password)) next.password = "Use at least 8 characters with letters and numbers.";
    if (password !== confirm) next.password_confirmation = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: { email, token, password, password_confirmation: confirm },
        token: null,
      });
      setDone(true);
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      setError(fields.token || (!Object.keys(fields).length ? errorMessage(err, "Unable to reset your password.") : ""));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You've been signed out of other devices. Sign in with your new password.">
        <div className="flex flex-col items-center gap-5">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden />
          <Link href={`/login?email=${encodeURIComponent(email)}`} className="w-full">
            <Button className="w-full" size="lg">
              Sign in
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle={<>For <strong>{email}</strong></>}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          showStrength
          required
        />
        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.password_confirmation}
          required
        />
        {error && (
          <FormAlert>
            {error}{" "}
            <Link href={`/forgot-password?email=${encodeURIComponent(email)}`} className="font-semibold underline">
              Request a new link
            </Link>
          </FormAlert>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
