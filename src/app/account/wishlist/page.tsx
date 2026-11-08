import { ProductCard } from "@/components/products/product-card";
import { demoWishlist } from "@/lib/demo-dashboard";

export default function AccountWishlistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Wishlist</h2>
        <p className="mt-1 text-sm text-muted">Pieces you&apos;ve saved for later.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {demoWishlist.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
