"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function VendorProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ data: Product[] }>("/vendor/products")
      .then((res) => setProducts(res.data || []))
      .catch((err) => setError(err?.message || "Unable to load products"));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Products</h2>
        <Button onClick={() => (window.location.href = "/vendor/products/new")}>New product</Button>
      </div>
      {error && <p className="text-sm text-crimson">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs tracking-wider text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link href={`/product/${product.slug}`} className="font-medium hover:text-burgundy">
                    {product.name}
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize">{product.status}</td>
                <td className="px-4 py-3">{product.stock}</td>
                <td className="px-4 py-3 text-right font-semibold text-burgundy">
                  {formatNaira(product.price)}
                </td>
              </tr>
            ))}
            {products.length === 0 && !error && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
