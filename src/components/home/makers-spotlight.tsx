import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import type { Store } from "@/lib/api";
import { AppImage } from "@/components/ui/app-image";
import { media } from "@/lib/media";
import { formatRating } from "@/lib/utils";

export function MakersSpotlight({ stores }: { stores: Store[] }) {
  const featured = stores.filter((s) => s.status === "approved").slice(0, 4);

  return (
    <section className="bg-surface-warm py-8 md:py-20">
      <div className="container-atelier">
        <div className="mb-5 max-w-2xl md:mb-10">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-crimson uppercase md:text-xs">
            Verified artisans
          </p>
          <h2 className="mt-1 font-display text-2xl md:mt-2 md:text-4xl">Makers in the spotlight</h2>
          <p className="mt-2 hidden text-muted leading-relaxed md:mt-3 md:block">
            Every storefront on Atelier Nigeria belongs to a practicing artisan, from Lagos studios to
            Aba leather houses.
          </p>
        </div>

        <div className="mobile-rail -mx-4 flex px-4 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-4">
          {featured.map((store, index) => (
            <Link
              key={store.id}
              href={`/makers/${store.slug}`}
              className="group w-[78vw] max-w-[280px] overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:shadow-md md:w-auto md:max-w-none"
            >
              <div className="relative h-24 overflow-hidden bg-burgundy/10 md:h-32">
                <AppImage
                  src={store.banner || media.makerBanner(index + 1)}
                  alt=""
                  fill
                  sizes="280px"
                  className="opacity-90 transition duration-500 group-hover:scale-105"
                  frameClassName="absolute inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute -bottom-8 left-5 h-16 w-16 overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
                  <AppImage
                    src={store.logo || media.makerAvatar(index + 1)}
                    alt={store.name}
                    fill
                    sizes="64px"
                    frameClassName="absolute inset-0"
                  />
                </div>
              </div>
              <div className="px-4 pb-4 pt-10 md:px-5 md:pb-5 md:pt-11">
                <h3 className="font-display text-lg group-hover:text-burgundy md:text-xl">{store.name}</h3>
                {store.bio && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{store.bio}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
                  {store.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} />
                      {store.location}
                    </span>
                  )}
                  {formatRating(store.rating) && (
                    <span className="inline-flex items-center gap-1 text-foreground/80">
                      <Star size={12} className="fill-crimson text-crimson" />
                      {formatRating(store.rating)}
                    </span>
                  )}
                  {store.products_count != null && (
                    <span>{store.products_count} pieces</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center md:mt-10">
          <Link
            href="/makers"
            className="inline-flex h-10 items-center justify-center rounded-full border border-burgundy px-5 text-sm font-medium text-burgundy transition hover:bg-burgundy hover:text-white md:h-11 md:px-6"
          >
            View all makers
          </Link>
        </div>
      </div>
    </section>
  );
}
