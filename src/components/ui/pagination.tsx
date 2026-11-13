import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageWindow, withParams } from "@/lib/catalog-query";
import { cn } from "@/lib/utils";

/** Link-based pagination (works without JS, crawlable). */
export function Pagination({
  current,
  last,
  basePath,
  query,
}: {
  current: number;
  last: number;
  basePath: string;
  /** Current query string, without "?". */
  query: string;
}) {
  if (last <= 1) return null;
  const href = (page: number) => {
    const qs = withParams(query, { page: page > 1 ? String(page) : null });
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const base = "flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      {current > 1 ? (
        <Link href={href(current - 1)} className={cn(base, "hover:bg-surface")} aria-label="Previous page">
          <ChevronLeft size={16} />
        </Link>
      ) : (
        <span className={cn(base, "text-muted/50")} aria-hidden>
          <ChevronLeft size={16} />
        </span>
      )}
      {pageWindow(current, last).map((p, i) =>
        p === "…" ? (
          <span key={`gap${i}`} className={cn(base, "text-muted")}>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === current ? "page" : undefined}
            className={cn(base, p === current ? "bg-crimson font-semibold text-white" : "hover:bg-surface")}
          >
            {p}
          </Link>
        )
      )}
      {current < last ? (
        <Link href={href(current + 1)} className={cn(base, "hover:bg-surface")} aria-label="Next page">
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span className={cn(base, "text-muted/50")} aria-hidden>
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
