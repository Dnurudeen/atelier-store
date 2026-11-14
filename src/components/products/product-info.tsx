"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { FileText, ListChecks, MessageSquareText, Star } from "lucide-react";
import { api, errorMessage, type Product, type Review } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating-stars";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { cn, formatNaira } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

function lines(text?: string | null) {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

/** Description is plain text from sellers; render paragraphs safely (no raw HTML). */
function Paragraphs({ text }: { text?: string | null }) {
  const blocks = (text ?? "")
    .replace(/<[^>]+>/g, " ")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (!blocks.length) return <p className="text-muted">The seller has not added a description yet.</p>;
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <p key={i} className="whitespace-pre-line">
          {b}
        </p>
      ))}
    </div>
  );
}

function specRows(product: Product) {
  const rows = [...(product.spec_list ?? [])];
  const add = (label: string, value?: string | number | null) => {
    if (value !== null && value !== undefined && String(value).trim() !== "") rows.push({ label, value: String(value) });
  };
  add("Brand", product.brand?.name);
  add("SKU", product.sku);
  add("Condition", product.condition ? product.condition.charAt(0).toUpperCase() + product.condition.slice(1) : null);
  add("Weight (kg)", product.weight_kg ? Number(product.weight_kg) : null);
  if (product.length_cm && product.width_cm && product.height_cm) {
    add("Dimensions (L × W × H cm)", `${Number(product.length_cm)} × ${Number(product.width_cm)} × ${Number(product.height_cm)}`);
  }
  add("Warranty", product.warranty);
  add("Category", product.category?.name);
  return rows;
}

function ReviewForm({ product, onDone }: { product: Product; onDone: (review: Review) => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!rating) {
      setError("Choose a star rating.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api<{ data: Review }>("/account/reviews", {
        method: "POST",
        body: { product_id: product.id, rating, title: title || undefined, comment: comment || undefined },
      });
      toast.success("Thanks! Your review is live.");
      onDone(res.data);
    } catch (err) {
      setError(errorMessage(err, "Could not submit your review."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border border-border p-3">
      <div>
        <p className="text-[13px] font-semibold">Your rating</p>
        <div className="mt-1 flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>
              <Star size={26} className={cn((hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-border")} />
            </button>
          ))}
        </div>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder="Review title (e.g. Beautiful finish)"
        className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:border-burgundy"
      />
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you like or dislike?" maxLength={2000} />
      {error && <p className="text-[13px] text-crimson">{error}</p>}
      <Button type="submit" loading={loading}>
        Submit review
      </Button>
    </form>
  );
}

export function ProductInfo({ product }: { product: Product }) {
  const user = useAuthStore((s) => s.user);
  const [reviews, setReviews] = useState<Review[]>(product.reviews ?? []);
  const [writing, setWriting] = useState(false);
  const features = lines(product.key_features);
  const box = lines(product.whats_in_box);
  const specs = specRows(product);
  const breakdown = product.rating_breakdown ?? {};
  const totalRatings = Object.values(breakdown).reduce((a, b) => a + Number(b), 0) || Number(product.reviews_count ?? 0);

  const card = "rounded-md bg-white";
  const heading = "flex items-center gap-2 border-b border-border px-4 py-3 font-sans text-[15px] font-bold tracking-normal md:px-5";

  return (
    <div className="space-y-3">
      <section id="details" className={card}>
        <h2 className={heading}>
          <FileText size={17} className="text-burgundy" /> Product details
        </h2>
        <div className="px-3 py-3 text-[14px] leading-relaxed md:px-4">
          <Paragraphs text={product.description} />
        </div>
      </section>

      {(features.length > 0 || box.length > 0 || specs.length > 0) && (
        <section id="specifications" className={card}>
          <h2 className={heading}>
            <ListChecks size={17} className="text-burgundy" /> Specifications
          </h2>
          <div className="grid gap-3 p-3 md:grid-cols-2 md:p-4">
            {features.length > 0 && (
              <div className="rounded-md border border-border">
                <h3 className="border-b border-border px-3 py-2 font-sans text-[13px] font-bold tracking-wide uppercase">Key features</h3>
                <ul className="list-disc space-y-1 py-2.5 pr-3 pl-7 text-[13px]">
                  {features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
            {box.length > 0 && (
              <div className="rounded-md border border-border">
                <h3 className="border-b border-border px-3 py-2 font-sans text-[13px] font-bold tracking-wide uppercase">What&apos;s in the box</h3>
                <ul className="list-disc space-y-1 py-2.5 pr-3 pl-7 text-[13px]">
                  {box.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
            {specs.length > 0 && (
              <div className="rounded-md border border-border md:col-span-2">
                <h3 className="border-b border-border px-3 py-2 font-sans text-[13px] font-bold tracking-wide uppercase">Specifications</h3>
                <dl className="divide-y divide-border text-[13px]">
                  {specs.map((row) => (
                    <div key={`${row.label}-${row.value}`} className="grid grid-cols-[minmax(110px,40%)_1fr] gap-3 px-3 py-2">
                      <dt className="font-semibold">{row.label}</dt>
                      <dd className="text-foreground/85">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </section>
      )}

      <section id="reviews" className={card}>
        <h2 className={cn(heading, "justify-between")}>
          <span className="flex items-center gap-2">
            <MessageSquareText size={17} className="text-burgundy" /> Verified customer feedback
          </span>
          {user && !writing && (
            <button type="button" onClick={() => setWriting(true)} className="text-[13px] font-semibold text-crimson hover:underline">
              Write a review
            </button>
          )}
        </h2>
        <div className="grid gap-6 p-4 md:grid-cols-[220px_1fr] md:p-5">
          <div>
            <p className="text-[12px] font-bold tracking-wide uppercase">Verified ratings ({totalRatings})</p>
            <div className="mt-2 rounded-md bg-surface p-3 text-center">
              <p className="text-3xl font-bold">
                {Number(product.rating ?? 0).toFixed(1)}
                <span className="text-base font-normal text-muted">/5</span>
              </p>
              <RatingStars value={product.rating} size={16} className="mt-1" />
              <p className="mt-1 text-[12px] text-muted">{totalRatings} verified ratings</p>
            </div>
            <ul className="mt-3 space-y-1.5 text-[12px]">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = Number(breakdown[n] ?? 0);
                const pct = totalRatings ? (count / totalRatings) * 100 : 0;
                return (
                  <li key={n} className="flex items-center gap-2">
                    <span className="w-3">{n}</span>
                    <Star size={11} className="fill-crimson text-crimson" />
                    <span className="text-muted">({count})</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                      <span className="block h-full rounded-full bg-crimson" style={{ width: `${pct}%` }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            {writing && (
              <div className="mb-4">
                <ReviewForm
                  product={product}
                  onDone={(review) => {
                    setReviews((r) => [review, ...r.filter((x) => x.id !== review.id)]);
                    setWriting(false);
                  }}
                />
                <p className="mt-1.5 text-[12px] text-muted">Only customers who received this item can leave a review.</p>
              </div>
            )}
            <p className="text-[12px] font-bold tracking-wide uppercase">Product reviews ({reviews.length})</p>
            {reviews.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No reviews yet.{" "}
                {!user && (
                  <>
                    <Link href={`/login?next=/product/${product.slug}`} className="font-semibold text-burgundy hover:underline">
                      Sign in
                    </Link>{" "}
                    to review a product you bought.
                  </>
                )}
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {reviews.map((review) => (
                  <li key={review.id} className="py-3">
                    <RatingStars value={review.rating} size={13} />
                    {review.title && <p className="mt-1 text-[14px] font-semibold">{review.title}</p>}
                    {review.comment && <p className="mt-1 text-[13px] whitespace-pre-line text-foreground/85">{review.comment}</p>}
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                      {review.created_at && <span>{new Date(review.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>}
                      <span>by {review.user?.name?.split(" ")[0] ?? "Customer"}</span>
                      <span className="inline-flex items-center gap-1 font-medium text-burgundy">✓ Verified purchase</span>
                    </p>
                    {review.vendor_reply && (
                      <div className="mt-2 rounded-md bg-surface px-3 py-2 text-[13px]">
                        <p className="text-[12px] font-semibold text-burgundy">Seller response</p>
                        <p className="mt-0.5 whitespace-pre-line">{review.vendor_reply}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Desktop sticky mini buy box beside the details (Jumia pattern). */
export function StickyBuyBox({ product }: { product: Product }) {
  return (
    <div className="sticky top-[150px] space-y-3">
      <nav className="overflow-hidden rounded-md bg-white text-[14px]" aria-label="Product sections">
        {[
          { href: "#details", label: "Product details", icon: FileText },
          { href: "#specifications", label: "Specifications", icon: ListChecks },
          { href: "#reviews", label: "Verified customer feedback", icon: MessageSquareText },
        ].map(({ href, label, icon: Icon }) => (
          <a key={href} href={href} className="flex items-center gap-2.5 border-b border-border px-3 py-2.5 last:border-0 hover:bg-surface">
            <Icon size={16} className="text-muted" /> {label}
          </a>
        ))}
      </nav>
      <div className="rounded-md bg-white p-3">
        <p className="line-clamp-2 text-[13px]">{product.name}</p>
        <p className="mt-1 text-lg font-bold">{formatNaira(product.price)}</p>
        <a href="#top" className="mt-2 flex h-10 items-center justify-center rounded-md bg-crimson text-sm font-semibold text-white uppercase hover:bg-crimson-hover">
          Add to cart
        </a>
      </div>
    </div>
  );
}
