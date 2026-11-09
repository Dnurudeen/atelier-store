import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductCard } from "@/components/products/product-card";
import { ProductBuyPanel, ProductGallery } from "@/components/products/product-buy-panel";
import { PageLoader } from "@/components/ui/page-loader";
import { getProduct, getProducts } from "@/lib/catalog";
import { demoProducts } from "@/lib/demo-data";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { data } = await getProducts();
  return data.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description || `${product.name} on Atelier Nigeria`,
  };
}

export default function ProductPage({ params }: PageProps) {
  return (
    <Suspense fallback={<PageLoader label="Loading this piece" />}>
      <ProductDetail params={params} />
    </Suspense>
  );
}

async function ProductDetail({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const relatedSource =
    process.env.NEXT_PUBLIC_USE_DEMO === "true"
      ? demoProducts.filter(
          (p) => p.id !== product.id && p.category?.slug === product.category?.slug
        )
      : (await getProducts(`?category=${product.category?.slug || ""}&per_page=8`)).data.filter(
          (p) => p.slug !== product.slug
        );

  const related = relatedSource.slice(0, 4);

  return (
    <div className="container-atelier py-5 pb-28 md:py-14 md:pb-14">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-16">
        <ProductGallery product={product} />
        <ProductBuyPanel product={product} />
      </div>

      {related.length > 0 && (
        <section className="mt-10 border-t border-border pt-8 md:mt-20 md:pt-14">
          <h2 className="font-display text-xl md:text-3xl">You may also like</h2>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4 lg:gap-5 md:mt-8">
            {related.map((item, index) => (
              <ProductCard key={item.id} product={item} index={index} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
