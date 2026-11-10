import type { SellerScore as Score } from "@/lib/api";

function percent(value?: number | null) {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}

export function SellerScore({ score }: { score?: Score | null }) {
  if (!score || score.score == null) {
    return (
      <p className="text-sm text-muted">
        New maker. Shipping speed, rating, cancellations, and returns appear after delivered orders.
      </p>
    );
  }

  const rows = [
    ["Shipping speed", percent(score.shipping_speed)],
    ["Customer rating", score.customer_rating != null ? score.customer_rating.toFixed(1) : "—"],
    ["Cancellation rate", percent(score.cancellation_rate)],
    ["Return rate", percent(score.return_rate)],
  ];

  return (
    <div>
      <p className="font-display text-3xl text-burgundy">{score.score.toFixed(1)}</p>
      <p className="text-xs tracking-wide text-muted uppercase">Seller score</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white px-3 py-2">
            <dt className="text-[11px] text-muted">{label}</dt>
            <dd className="font-medium text-burgundy">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
