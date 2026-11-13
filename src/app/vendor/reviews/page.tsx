"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react";
import { Tabs } from "@/components/account/account-card";
import { Panel } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { RatingStars } from "@/components/ui/rating-stars";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, type Review } from "@/lib/api";
import { formatDate } from "@/lib/account";
import { useVendorQuery } from "@/lib/vendor";

export default function VendorReviewsPage() {
  const client = useQueryClient();
  const [tab, setTab] = useState<"unanswered" | "all">("unanswered");
  const { data, isLoading } = useVendorQuery<{ data: Review[] }>("vendor-reviews", `/vendor/reviews?filter=${tab}`);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  async function reply(id: number) {
    setSaving(id);
    try {
      await api(`/vendor/reviews/${id}/reply`, { method: "PUT", body: { reply: drafts[id] } });
      toast.success("Reply posted");
      setDrafts((d) => ({ ...d, [id]: "" }));
      void client.invalidateQueries({ queryKey: ["vendor-reviews"] });
      void client.invalidateQueries({ queryKey: ["vendor-overview"] });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  return (
    <Panel>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "unanswered", label: "Needs a reply" },
          { value: "all", label: "All reviews" },
        ]}
      />
      {isLoading ? (
        <ListSkeleton />
      ) : !data?.data.length ? (
        <EmptyState icon={MessageSquareText} title={tab === "unanswered" ? "You've replied to every review" : "No reviews yet"} text="Polite, helpful replies build trust with future buyers." />
      ) : (
        <ul className="divide-y divide-border">
          {data.data.map((r) => (
            <li key={r.id} className="px-4 py-3 text-[13px]">
              <div className="flex flex-wrap items-center gap-2">
                <RatingStars value={r.rating} size={13} />
                {r.product && (
                  <Link href={`/product/${r.product.slug}`} target="_blank" className="font-medium hover:text-burgundy">
                    {r.product.name}
                  </Link>
                )}
              </div>
              {r.title && <p className="mt-1 font-semibold">{r.title}</p>}
              {r.comment && <p className="mt-0.5 whitespace-pre-line">{r.comment}</p>}
              <p className="mt-0.5 text-[12px] text-muted">
                {r.user?.name?.split(" ")[0]} · {formatDate(r.created_at)}
              </p>
              {r.vendor_reply ? (
                <p className="mt-2 rounded bg-surface px-3 py-2">
                  <span className="font-semibold text-burgundy">Your reply:</span> {r.vendor_reply}
                </p>
              ) : (
                <div className="mt-2 flex gap-2">
                  <input
                    value={drafts[r.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    placeholder="Write a public reply…"
                    maxLength={1000}
                    className="h-9 flex-1 rounded-md border border-border px-3 outline-none focus:border-burgundy"
                    aria-label="Reply"
                  />
                  <Button size="sm" onClick={() => void reply(r.id)} loading={saving === r.id} disabled={(drafts[r.id] ?? "").trim().length < 2}>
                    Reply
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
