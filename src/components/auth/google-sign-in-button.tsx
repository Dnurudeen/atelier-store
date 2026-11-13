"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            ux_mode?: "popup" | "redirect";
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

type Props = {
  role?: "customer" | "vendor";
  label?: "signin_with" | "signup_with" | "continue_with";
  onSuccess: () => void;
  onError: (message: string) => void;
};

export function GoogleSignInButton({
  role = "customer",
  label = "continue_with",
  onSuccess,
  onError,
}: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    function mountButton() {
      if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response.credential) {
            onErrorRef.current("Google did not return a credential.");
            return;
          }
          try {
            await loginWithGoogle(response.credential, role);
            onSuccessRef.current();
          } catch (err) {
            onErrorRef.current((err as { message?: string })?.message || "Google sign-in failed");
          }
        },
        ux_mode: "popup",
        auto_select: false,
      });

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text: label,
        shape: "rectangular",
        width: Math.min(376, Math.max(240, buttonRef.current.offsetWidth || 320)),
      });
      setReady(true);
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-gsi="true"]');
    if (existing && window.google?.accounts?.id) {
      mountButton();
      return () => {
        cancelled = true;
      };
    }

    const script = existing || document.createElement("script");
    if (!existing) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleGsi = "true";
      document.head.appendChild(script);
    }

    script.addEventListener("load", mountButton);
    if (window.google?.accounts?.id) mountButton();

    return () => {
      cancelled = true;
      script.removeEventListener("load", mountButton);
    };
  }, [label, loginWithGoogle, role]);

  if (!GOOGLE_CLIENT_ID) {
    // Only developers need to know why the button is missing.
    if (process.env.NODE_ENV !== "production") {
      return (
        <p className="rounded-md border border-dashed border-border bg-surface px-4 py-3 text-center text-xs text-muted">
          Google sign-in appears once <code className="text-foreground">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> is set.
        </p>
      );
    }
    return null;
  }

  return (
    <div className="space-y-2">
      <div ref={buttonRef} className="flex min-h-11 w-full justify-center" />
      {!ready && <p className="text-center text-xs text-muted">Loading Google…</p>}
    </div>
  );
}

export const googleEnabled = Boolean(GOOGLE_CLIENT_ID);

export function AuthDivider({ text = "or" }: { text?: string }) {
  if (!GOOGLE_CLIENT_ID && process.env.NODE_ENV === "production") return null;
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wide">
        <span className="bg-white px-3 text-muted">{text}</span>
      </div>
    </div>
  );
}
