import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/help", label: "Help Center" },
  { href: "/shipping", label: "Delivery options" },
  { href: "/returns", label: "Returns & refunds" },
  { href: "/terms", label: "Terms & conditions" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/contact", label: "Contact us" },
];

export function InfoPage({ title, intro, current, children }: { title: string; intro?: ReactNode; current: string; children: ReactNode }) {
  return (
    <div className="bg-[var(--page-bg)] pb-12">
      <div className="container-atelier pt-3">
        <Breadcrumbs items={[{ label: title }]} />
        <div className="mt-3 grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)]">
          <nav className="h-fit overflow-hidden rounded-md bg-white text-sm" aria-label="Help topics">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current === item.href ? "page" : undefined}
                className={cn("block border-b border-border px-4 py-2.5 last:border-0 hover:bg-surface", current === item.href && "border-l-4 border-l-crimson bg-surface font-semibold")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <article className="rounded-md bg-white p-5 md:p-8">
            <h1 className="font-display text-2xl text-burgundy md:text-3xl">{title}</h1>
            {intro && <p className="mt-2 text-sm text-muted">{intro}</p>}
            <div className="prose-atelier mt-6 space-y-6 text-[14px] leading-relaxed">{children}</div>
          </article>
        </div>
      </div>
    </div>
  );
}

export function InfoSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-40">
      <h2 className="mb-2 font-sans text-base font-bold tracking-normal">{title}</h2>
      <div className="space-y-2 text-foreground/85">{children}</div>
    </section>
  );
}

export function Faq({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {items.map((item) => (
        <details key={item.q} className="group px-4 py-3">
          <summary className="cursor-pointer list-none font-semibold marker:hidden">
            <span className="flex items-center justify-between gap-3">
              {item.q}
              <span className="text-crimson transition group-open:rotate-45">+</span>
            </span>
          </summary>
          <div className="mt-2 text-foreground/80">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
