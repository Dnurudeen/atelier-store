"use client";

import Link from "next/link";
import { AdminTable, useTableState } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating-stars";
import { qs, useAdmin, useAdminAction, type Page } from "@/lib/admin";
import { formatDate } from "@/lib/account";
import type { Review } from "@/lib/api";

type Row = Review & { user?: { name: string; email?: string } };

export default function AdminReviewsPage() {
  const t = useTableState("low");
  const filter = { low: { rating: 2, hidden: "0" }, visible: { hidden: "0" }, hidden: { hidden: "1" }, all: {} }[t.tab as "low"] ?? {};
  const { data, isFetching } = useAdmin<Page<Row>>(`/reviews${qs({ ...filter, page: t.page })}`);
  const action = useAdminAction();

  return (
    <AdminTable<Row>
      tabs={[
        { value: "low", label: "1–2 stars" },
        { value: "visible", label: "Visible" },
        { value: "hidden", label: "Hidden" },
        { value: "all", label: "All" },
      ]}
      tab={t.tab}
      onTab={t.onTab}
      rows={data?.data}
      meta={data?.meta}
      loading={isFetching}
      page={t.page}
      onPage={t.setPage}
      empty="No reviews here"
      columns={[
        {
          key: "review",
          label: "Review",
          render: (r) => (
            <div className="max-w-md">
              <RatingStars value={r.rating} size={12} />
              {r.title && <p className="font-semibold">{r.title}</p>}
              <p className="whitespace-pre-line">{r.comment || <span className="text-muted">No comment</span>}</p>
              {r.vendor_reply && <p className="mt-1 text-muted">Seller: {r.vendor_reply}</p>}
            </div>
          ),
        },
        { key: "product", label: "Product", render: (r) => (r.product ? <Link href={`/product/${r.product.slug}`} target="_blank" className="hover:text-burgundy">{r.product.name}</Link> : "—") },
        { key: "by", label: "By", render: (r) => <span>{r.user?.name}<span className="block text-muted">{formatDate(r.created_at)}</span></span> },
        {
          key: "act",
          label: "",
          className: "text-right",
          render: (r) => (
            <Button size="sm" variant="outline" className={r.is_hidden ? "" : "border-crimson text-crimson"} onClick={() => action.mutate({ path: `/reviews/${r.id}`, body: { is_hidden: !r.is_hidden }, success: r.is_hidden ? "Review restored" : "Review hidden — rating recalculated" })}>
              {r.is_hidden ? "Restore" : "Hide"}
            </Button>
          ),
        },
      ]}
    />
  );
}
