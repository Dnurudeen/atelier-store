"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Bell, ExternalLink, LogOut, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

export type DashNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
};

export type DashNavGroup = { title?: string; items: DashNavItem[] };

/**
 * Shared Seller Center / Admin console frame: burgundy sidebar with grouped navigation,
 * a sticky top bar, and a slide-in drawer on phones (every link reachable on mobile).
 */
export function DashboardShell({
  title,
  nav,
  groups,
  children,
  homeHref = "/",
  rootHref,
  banner,
  topRight,
  notificationsHref,
  unread = 0,
}: {
  title: string;
  /** Flat list (legacy). Prefer `groups`. */
  nav?: DashNavItem[];
  groups?: DashNavGroup[];
  children: ReactNode;
  homeHref?: string;
  /** Exact-match root item, e.g. "/vendor". */
  rootHref?: string;
  banner?: ReactNode;
  topRight?: ReactNode;
  notificationsHref?: string;
  unread?: number;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const sections: DashNavGroup[] = groups ?? [{ items: nav ?? [] }];
  const root = rootHref ?? sections[0]?.items[0]?.href;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => (href === root ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  const current = sections.flatMap((s) => s.items).filter((i) => isActive(i.href)).sort((a, b) => b.href.length - a.href.length)[0];

  const sidebar = (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <BrandLogo variant="footer" href={homeHref} className="h-8 md:h-9" />
          <p className="mt-2 text-[11px] font-semibold tracking-[0.18em] text-white/60 uppercase">{title}</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-white/70 hover:bg-white/10 md:hidden" aria-label="Close menu">
          <X size={18} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label={`${title} navigation`}>
        {sections.map((section, i) => (
          <div key={section.title ?? i} className={cn(i > 0 && "mt-4")}>
            {section.title && <p className="px-3 pb-1 text-[10px] font-semibold tracking-[0.16em] text-white/45 uppercase">{section.title}</p>}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = current?.href === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition",
                      active ? "bg-white text-burgundy shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className={cn("rounded-full px-1.5 text-[11px] font-bold", active ? "bg-crimson text-white" : "bg-crimson text-white")}>{item.badge > 99 ? "99+" : item.badge}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 space-y-0.5 border-t border-white/10 p-3">
        <Link href="/" className="flex items-center gap-3 rounded-md px-3 py-2 text-[14px] text-white/75 hover:bg-white/10 hover:text-white">
          <ExternalLink size={16} /> Go to storefront
        </Link>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[14px] text-white/75 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--page-bg)] print:block print:h-auto print:overflow-visible print:bg-white">
      <aside className="hidden h-full w-64 shrink-0 flex-col bg-burgundy text-white md:flex print:hidden">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[84%] max-w-[300px] flex-col bg-burgundy text-white shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-white px-3 md:px-6 print:hidden">
          <button type="button" onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-surface md:hidden" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <h1 className="min-w-0 flex-1 truncate font-sans text-base font-bold tracking-normal md:text-lg">{current?.label ?? title}</h1>
          {topRight}
          {notificationsHref && (
            <Link href={notificationsHref} className="relative rounded-md p-2 text-foreground/70 hover:bg-surface hover:text-burgundy" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
              <Bell size={19} />
              {unread > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-crimson" />}
            </Link>
          )}
          {user && (
            <span className="hidden items-center gap-2 text-[13px] sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-warm font-semibold text-burgundy">{user.name.charAt(0)}</span>
              <span className="max-w-[140px] truncate font-medium">{user.name}</span>
            </span>
          )}
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto print:overflow-visible">
          {banner}
          <div className="p-3 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Card used across Seller Center and Admin pages. */
export function Panel({ title, action, children, className, bodyClassName }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-md border border-border bg-white", className)}>
      {(title || action) && (
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          {title && <h2 className="font-sans text-[15px] font-bold tracking-normal">{title}</h2>}
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, hint, tone = "default", href }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "alert" | "good"; href?: string }) {
  const body = (
    <div className={cn("h-full rounded-md border bg-white p-4", tone === "alert" ? "border-crimson/40" : "border-border", href && "transition hover:border-burgundy")}>
      <p className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">{label}</p>
      <p className={cn("mt-1.5 text-2xl font-bold", tone === "alert" && "text-crimson", tone === "good" && "text-emerald-700")}>{value}</p>
      {hint && <p className="mt-0.5 text-[12px] text-muted">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
