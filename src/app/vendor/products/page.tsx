import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { demoVendorProducts } from "@/lib/demo-dashboard";
import { formatNaira } from "@/lib/utils";

export default function VendorProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Products</h2>
          <p className="mt-1 text-sm text-muted">Manage listings in your storefront.</p>
        </div>
        <Link href="/vendor/products/new">
          <Button size="sm">Add product</Button>
        </Link>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
        {demoVendorProducts.map((product) => {
          const img = product.images?.[0]?.url;
          return (
            <li key={product.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                {img ? <Image src={img} alt="" fill className="object-cover" sizes="56px" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted">
                  Stock {product.stock} · {product.status}
                </p>
              </div>
              <p className="font-semibold text-burgundy">{formatNaira(product.price)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
