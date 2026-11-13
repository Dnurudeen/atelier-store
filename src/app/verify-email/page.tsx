"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { api, errorMessage, fieldErrors, type User } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

function VerifyEmail() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"loading" | "ok" | "error">(email && token ? "loading" : "error");
  const [message, setMessage] = useState(email && token ? "" : "This verification link is incomplete.");
  const started = useRef(false);

  useEffect(() => {
    if (!email || !token || started.current) return;
    started.current = true;
    api<{ data: User }>("/auth/verify-email", { method: "POST", body: { email, token }, token: null })
      .then((res) => {
        const current = useAuthStore.getState().user;
        if (current && current.id === res.data.id) useAuthStore.getState().setUser(res.data);
        setState("ok");
      })
      .catch((err) => {
        setMessage(fieldErrors(err).token || errorMessage(err, "We couldn't verify your email."));
        setState("error");
      });
  }, [email, token]);

  if (state === "loading") return <PageLoader label="Confirming your email" />;

  if (state === "ok") {
    return (
      <AuthShell title="Email confirmed" subtitle="Thanks! You'll now receive order updates and receipts at this address.">
        <div className="flex flex-col items-center gap-5">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden />
          <Link href="/shop" className="w-full">
            <Button size="lg" className="w-full">
              Start shopping
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Link not valid" subtitle={message}>
      <div className="flex flex-col items-center gap-5">
        <XCircle className="h-12 w-12 text-crimson" aria-hidden />
        <p className="text-center text-[13px] text-muted">
          Sign in and use <strong>Resend verification email</strong> from your account page to get a fresh link.
        </p>
        <Link href="/account" className="w-full">
          <Button variant="outline" className="w-full">
            Go to my account
          </Button>
        </Link>
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading" />}>
      <VerifyEmail />
    </Suspense>
  );
}
