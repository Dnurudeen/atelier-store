import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text?: ReactNode;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  const button = "mt-5 inline-flex rounded-md bg-crimson px-5 py-2.5 text-sm font-semibold text-white uppercase shadow-sm hover:bg-crimson-hover";
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-warm text-burgundy">
        <Icon size={34} strokeWidth={1.6} />
      </span>
      <p className="mt-4 font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action &&
        (action.href ? (
          <Link href={action.href} className={button}>
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className={button}>
            {action.label}
          </button>
        ))}
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="skeleton h-16 w-16 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
