"use client";

import { useState } from "react";

type Point = { label: string; value: number; sub?: string };

/**
 * Single-series column chart (validated brand crimson on white).
 * - One series → no legend; the panel title names it.
 * - Recessive grid, 4px rounded data-ends on the baseline, 2px gaps between bars.
 * - Per-bar hover/focus tooltip with a hit target taller than the mark.
 * - A visually hidden table carries the same data for screen readers.
 */
export function BarChart({
  data,
  format = (v) => String(v),
  height = 180,
  ariaLabel,
}: {
  data: Point[];
  format?: (v: number) => string;
  height?: number;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  if (!data.some((d) => d.value > 0)) {
    return (
      <div className="flex items-center justify-center rounded-md border border-dashed border-border text-sm text-muted" style={{ height }} role="img" aria-label={`${ariaLabel}: no data yet`}>
        No sales in this period yet.
      </div>
    );
  }
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const n = data.length || 1;

  return (
    <figure className="w-full" aria-label={ariaLabel}>
      <div className="relative" style={{ height }}>
        {/* grid + y labels */}
        {ticks.map((t) => (
          <div key={t} className="pointer-events-none absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(t / max) * 100}%` }}>
            <span className="w-14 shrink-0 -translate-y-1/2 text-right text-[10px] text-muted tabular-nums">{format(t)}</span>
            <span className={`h-px flex-1 ${t === 0 ? "bg-foreground/25" : "bg-border"}`} />
          </div>
        ))}
        <div className="absolute inset-y-0 right-0 left-16 flex items-end" style={{ gap: 2 }}>
          {data.map((d, i) => {
            const h = d.value > 0 ? Math.max(2, (d.value / max) * 100) : 0;
            return (
              <button
                key={d.label + i}
                type="button"
                className="group relative flex h-full flex-1 items-end focus:outline-none"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${d.label}: ${format(d.value)}${d.sub ? `, ${d.sub}` : ""}`}
              >
                <span
                  className="block w-full rounded-t-[4px] bg-crimson transition-opacity"
                  style={{ height: `${h}%`, opacity: hover === null || hover === i ? 1 : 0.45 }}
                />
                {hover === i && (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full z-10 mb-1.5 rounded-md border border-border bg-white px-2 py-1 text-left text-[11px] whitespace-nowrap shadow-lg"
                    style={i > n * 0.7 ? { right: 0 } : { left: 0 }}
                  >
                    <span className="block text-muted">{d.label}</span>
                    <span className="block font-semibold text-foreground">{format(d.value)}</span>
                    {d.sub && <span className="block text-muted">{d.sub}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex justify-between pl-16 text-[10px] text-muted">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(n / 2)]?.label}</span>
        <span>{data[n - 1]?.label}</span>
      </div>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
