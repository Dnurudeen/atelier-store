import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck, Truck, BadgeCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { CurrentYear } from "@/components/layout/current-year";

type AuthShellProps = {
  title: string;
  subtitle?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Standalone sign-in layout (Jumia pattern): calm grey canvas, centred logo,
 * a single focused card, and help links underneath. No storefront chrome.
 */
export function AuthShell({ title, subtitle, eyebrow, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-bg)]">
      <header className="border-b border-border bg-white">
        <div className="container-atelier flex h-14 items-center justify-between md:h-16">
          <BrandLogo priority />
          <Link href="/" className="text-[13px] font-medium text-burgundy hover:underline">
            Continue shopping
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 md:items-center md:py-12">
        <div className="w-full max-w-[440px]">
          <div className="rounded-md border border-border bg-white px-5 py-7 shadow-sm md:px-8 md:py-9">
            <div className="text-center">
              {eyebrow && (
                <p className="text-[11px] font-semibold tracking-[0.18em] text-crimson uppercase">{eyebrow}</p>
              )}
              <h1 className="mt-1.5 font-display text-[26px] leading-tight text-burgundy md:text-3xl">{title}</h1>
              {subtitle && <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted md:text-sm">{subtitle}</p>}
            </div>
            <div className="mt-6 md:mt-7">{children}</div>
          </div>

          {footer && <div className="mt-4 text-center text-sm text-muted">{footer}</div>}

          <ul className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] text-muted">
            <li className="flex flex-col items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-burgundy" aria-hidden />
              Secure payments
            </li>
            <li className="flex flex-col items-center gap-1">
              <BadgeCheck className="h-4 w-4 text-burgundy" aria-hidden />
              Verified makers
            </li>
            <li className="flex flex-col items-center gap-1">
              <Truck className="h-4 w-4 text-burgundy" aria-hidden />
              Nationwide delivery
            </li>
          </ul>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted">
            Need help? Visit our{" "}
            <Link href="/help" className="font-medium text-burgundy hover:underline">
              Help Center
            </Link>{" "}
            or{" "}
            <Link href="/contact" className="font-medium text-burgundy hover:underline">
              contact us
            </Link>
            .
          </p>
        </div>
      </main>

      <footer className="border-t border-border bg-white py-4 text-center text-[11px] text-muted">
        © <CurrentYear /> Atelier Nigeria ·{" "}
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
      </footer>
    </div>
  );
}

export function FormAlert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-crimson/30 bg-crimson/5 text-crimson",
    success: "border-emerald-600/30 bg-emerald-50 text-emerald-800",
    info: "border-burgundy/20 bg-surface-warm text-burgundy",
  }[tone];

  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-2.5 text-[13px] leading-snug ${styles}`}>
      {children}
    </div>
  );
}
