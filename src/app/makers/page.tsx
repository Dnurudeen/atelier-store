import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { getStores } from "@/lib/catalog";
import { media } from "@/lib/media";
import { formatRating } from "@/lib/utils";

export const metadata = {
  title: "Makers",
  description: "Meet verified artisans selling on Atelier Nigeria.",
};

export default async function MakersPage() {
  const stores = (await getStores()).filter((s) => s.status === "approved");

  return (
    <div className="container-atelier py-10 md:py-14">
      <div className="mb-10 max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-crimson uppercase">Artisan community</p>
        <h1 className="mt-2 font-display text-4xl">Meet the makers</h1>
        <p className="mt-3 text-muted leading-relaxed">
          Independent studios and workshops across Nigeria. Each storefront is reviewed by the Atelier
          team before going live.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store, index) => (
          <Link
            key={store.id}
            href={`/makers/${store.slug}`}
            className="group overflow-hidden rounded-2xl border border-border bg-white"
          >
            <div className="relative h-40 bg-surface">
              <AppImage
                src={store.banner || media.makerBanner(index + 1)}
                alt=""
                fill
                sizes="400px"
                className="transition duration-500 group-hover:scale-105"
                frameClassName="absolute inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
              <div className="absolute -bottom-7 left-5 h-14 w-14 overflow-hidden rounded-full border-4 border-white bg-white shadow">
                <AppImage
                  src={store.logo || media.makerAvatar(index + 1)}
                  alt={store.name}
                  fill
                  sizes="56px"
                  frameClassName="absolute inset-0"
                />
              </div>
            </div>
            <div className="px-5 pb-6 pt-10">
              <h2 className="font-display text-2xl group-hover:text-burgundy">{store.name}</h2>
              {store.bio && <p className="mt-2 line-clamp-3 text-sm text-muted">{store.bio}</p>}
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
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
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
