import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductRail } from "@/components/home/product-rail";
import { RecentlyViewedRail } from "@/components/home/recently-viewed-rail";
import { DeliveryCard } from "@/components/products/delivery-card";
import { ProductGallery } from "@/components/products/product-gallery";
import { ProductInfo, StickyBuyBox } from "@/components/products/product-info";
import { ProductPurchase } from "@/components/products/product-purchase";
import { SellerCard } from "@/components/products/seller-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageLoader } from "@/components/ui/page-loader";
import { getProduct, getRelated } from "@/lib/catalog";

type PageProps = { params: Promise<{ slug: string }> };

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };
  const description =
    product.meta_description ||
    (product.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) ||
    `${product.name} on Atelier Nigeria`;
  const image = product.images?.[0]?.url;
  return {
    title: product.meta_title || product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { title: product.name, description, images: image ? [{ url: image }] : undefined, type: "website" },
  };
}

export default function ProductPage({ params }: PageProps) {
  return (
    <Suspense fallback={<PageLoader label="Loading product" />}>
      <ProductDetail params={params} />
    </Suspense>
  );
}

async function ProductDetail({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const related = await getRelated(slug);

  const crumbs = [
    ...(product.category?.parent ? [{ label: product.category.parent.name, href: `/category/${product.category.parent.slug}` }] : []),
    ...(product.category ? [{ label: product.category.name, href: `/category/${product.category.slug}` }] : []),
    { label: product.name },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images?.map((i) => i.url),
    sku: product.sku ?? String(product.id),
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    aggregateRating:
      Number(product.reviews_count) > 0
        ? { "@type": "AggregateRating", ratingValue: Number(product.rating), reviewCount: product.reviews_count }
        : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "NGN",
      price: Number(product.price),
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: product.store ? { "@type": "Organization", name: product.store.name } : undefined,
    },
  };

  return (
    <div id="top" className="bg-[var(--page-bg)] pb-24 md:pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-atelier pt-3">
        <Breadcrumbs items={crumbs} />

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-4 rounded-md bg-white p-3 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:p-4">
            <ProductGallery product={product} />
            <ProductPurchase product={product} />
          </div>

          <div className="space-y-3">
            <DeliveryCard store={product.store} />
            {product.store && <SellerCard store={product.store} followers={product.followers_count ?? 0} />}
          </div>
        </div>
      </div>

      <ProductRail title="You may also like" products={related.similar} tone="light" href={product.category ? `/category/${product.category.slug}` : undefined} />

      <div className="container-atelier pt-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <ProductInfo product={product} />
          <aside className="hidden lg:block">
            <StickyBuyBox product={product} />
          </aside>
        </div>
      </div>

      {product.store && (
        <ProductRail
          title={`More from ${product.store.name}`}
          products={related.from_seller}
          tone="dark"
          href={`/makers/${product.store.slug}`}
        />
      )}
      <RecentlyViewedRail excludeId={product.id} tone="light" />
    </div>
  );
}
