"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductForm } from "@/components/vendor/product-form";
import { ListSkeleton } from "@/components/ui/empty-state";
import type { Product } from "@/lib/api";
import { useVendorQuery } from "@/lib/vendor";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useVendorQuery<{ data: Product }>("vendor-product", `/vendor/products/${id}`);

  if (isLoading) return <ListSkeleton rows={6} />;
  if (error || !data) {
    return (
      <p className="rounded-md bg-white p-6 text-sm">
        Product not found. <Link href="/vendor/products" className="font-semibold text-crimson">Back to products</Link>
      </p>
    );
  }
  // Re-mount the form when a different product loads.
  return <ProductForm key={`${data.data.id}-${data.data.updated_at ?? ""}`} product={data.data} />;
}
