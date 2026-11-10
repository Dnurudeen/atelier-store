"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/logo";
import { PageFade } from "@/components/motion/page-fade";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth";

export type DashNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

export function DashboardShell({
  title,
  nav,
  children,
  homeHref = "/",
}: {
  title: string;
  nav: DashNavItem[];
  children: ReactNode;
  homeHref?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-warm">
      <aside className="hidden h-full w-64 shrink-0 flex-col overflow-y-auto bg-burgundy text-white md:flex">
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
          <BrandLogo variant="footer" href={homeHref} className="h-9 md:h-10" />
          <p className="mt-3 text-xs tracking-widest text-white/55 uppercase">{title}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active =
              item.href === "/vendor" || item.href === "/admin" || item.href === "/account"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 space-y-1 border-t border-white/10 p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            Back to store
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-20 shrink-0 border-b border-border bg-white/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-2xl text-foreground">{title}</h1>
            <div className="flex gap-2 overflow-x-auto md:hidden">
              {nav.slice(0, 4).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-xs"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
          <PageFade>{children}</PageFade>
        </main>
      </div>
    </div>
  );
}
