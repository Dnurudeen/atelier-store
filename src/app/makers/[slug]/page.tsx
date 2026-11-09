import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MapPin, Package, Star } from "lucide-react";
import { ProductCard } from "@/components/products/product-card";
import { AppImage } from "@/components/ui/app-image";
import { PageLoader } from "@/components/ui/page-loader";
import { getStore, getStoreProducts, getStores } from "@/lib/catalog";
import { media } from "@/lib/media";
import { formatRating } from "@/lib/utils";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const stores = await getStores();
  return stores.filter((s) => s.status === "approved").map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return { title: "Maker not found" };
  return { title: store.name, description: store.bio || `${store.name} on Atelier Nigeria` };
}

export default function MakerStorefrontPage({ params }: PageProps) {
  return (
    <Suspense fallback={<PageLoader label="Meeting the maker" />}>
      <MakerStorefront params={params} />
    </Suspense>
  );
}

async function MakerStorefront({ params }: PageProps) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store || store.status !== "approved") notFound();

  const products = await getStoreProducts(slug);

  return (
    <div className="relative">
      <div className="relative h-48 bg-burgundy/15 md:h-64">
        <AppImage
          src={store.banner || media.makerBanner(1)}
          alt=""
          fill
          priority
          sizes="100vw"
          frameClassName="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/10" />
      </div>
      <div className="container-atelier relative -mt-16 pb-14">
        <div className="flex flex-col gap-6 rounded-2xl border border-border bg-white p-6 shadow-sm md:flex-row md:items-end md:gap-8 md:p-8">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-md">
            <AppImage
              src={store.logo || media.makerAvatar(1)}
              alt={store.name}
              fill
              sizes="96px"
              frameClassName="absolute inset-0"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl md:text-4xl">{store.name}</h1>
            {store.bio && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{store.bio}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted">
              {store.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={15} className="text-burgundy" />
                  {store.location}
                </span>
              )}
              {formatRating(store.rating) && (
                <span className="inline-flex items-center gap-1.5 text-foreground/85">
                  <Star size={15} className="fill-crimson text-crimson" />
                  {formatRating(store.rating)} rating
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Package size={15} className="text-burgundy" />
                {products.length} {products.length === 1 ? "piece" : "pieces"}
              </span>
            </div>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Collection</h2>
          {products.length === 0 ? (
            <p className="mt-4 text-muted">No published pieces yet. Check back soon.</p>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
