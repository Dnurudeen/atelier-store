import Image from "next/image";
import { demoModerationProducts } from "@/lib/demo-dashboard";
import { formatNaira, cn } from "@/lib/utils";

const modStyles = {
  pending: "bg-amber-50 text-amber-900 ring-amber-200",
  flagged: "bg-rose-50 text-rose-900 ring-rose-200",
  approved: "bg-emerald-50 text-emerald-900 ring-emerald-200",
};

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Product moderation</h2>
        <p className="mt-1 text-sm text-muted">Review listings before they reach the storefront.</p>
      </div>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
        {demoModerationProducts.map((product) => {
          const img = product.images?.[0]?.url;
          return (
            <li key={product.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                {img ? <Image src={img} alt="" fill className="object-cover" sizes="56px" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted">{product.store?.name}</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
                  modStyles[product.moderationStatus]
                )}
              >
                {product.moderationStatus}
              </span>
              <span className="font-semibold text-burgundy">{formatNaira(product.price)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
