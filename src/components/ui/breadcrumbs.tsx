import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="overflow-x-auto text-[12px] text-muted">
      <ol className="flex items-center gap-1 whitespace-nowrap">
        <li>
          <Link href="/" className="hover:text-burgundy">
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            <ChevronRight size={12} aria-hidden />
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="hover:text-burgundy">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground/80" aria-current={i === items.length - 1 ? "page" : undefined}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
