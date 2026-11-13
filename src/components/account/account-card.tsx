import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** White content card used across My Account pages (Jumia style). */
export function AccountCard({ title, action, children, className, bodyClassName }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-md bg-white", className)}>
      <header className="flex min-h-[52px] items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <h1 className="font-sans text-lg font-bold tracking-normal">{title}</h1>
        {action}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border px-2">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[13px] font-semibold uppercase transition",
            value === t.value ? "border-crimson text-crimson" : "border-transparent text-muted hover:text-foreground"
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1 text-muted">({t.count})</span>}
        </button>
      ))}
    </div>
  );
}
