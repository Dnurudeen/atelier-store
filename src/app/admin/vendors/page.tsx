"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AdminTable, useTableState } from "@/components/admin/admin-table";
import { AppImage } from "@/components/ui/app-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { qs, useAdmin, type Page } from "@/lib/admin";
import { formatDate } from "@/lib/account";
import type { Store } from "@/lib/api";
import { media } from "@/lib/media";

type Row = Store & { live_products_count: number; user?: { name: string; email: string; phone?: string } };

function VendorsInner() {
  const params = useSearchParams();
  const t = useTableState(params.get("status") ?? "pending");
  const { data, isFetching } = useAdmin<Page<Row>>(`/vendors${qs({ status: t.tab === "all" ? "" : t.tab, q: t.query, page: t.page })}`);
  const c = data?.meta.counts ?? {};

  return (
    <AdminTable<Row>
      tabs={[
        { value: "pending", label: "Awaiting approval", count: c.pending ?? 0 },
        { value: "approved", label: "Approved", count: c.approved ?? 0 },
        { value: "rejected", label: "Rejected", count: c.rejected ?? 0 },
        { value: "suspended", label: "Suspended", count: c.suspended ?? 0 },
        { value: "all", label: "All" },
      ]}
      tab={t.tab}
      onTab={t.onTab}
      onSearch={t.onSearch}
      searchPlaceholder="Search store name or owner email"
      rows={data?.data}
      meta={data?.meta}
      loading={isFetching}
      page={t.page}
      onPage={t.setPage}
      empty="No sellers here"
      columns={[
        {
          key: "store",
          label: "Store",
          render: (s) => (
            <Link href={`/admin/vendors/${s.id}`} className="flex items-center gap-3">
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-surface">
                <AppImage src={s.logo || media.makerAvatar(s.id)} alt="" fill sizes="40px" frameClassName="absolute inset-0" />
              </span>
              <span>
                <span className="block font-semibold hover:text-burgundy">{s.name}</span>
                <span className="text-muted">{s.location ?? "—"}</span>
              </span>
            </Link>
          ),
        },
        { key: "owner", label: "Owner", render: (s) => <span>{s.user?.name}<span className="block text-muted">{s.user?.email}</span></span> },
        { key: "products", label: "Products", render: (s) => <span>{s.live_products_count} live<span className="block text-muted">{s.products_count} total</span></span> },
        { key: "payout", label: "Payout account", render: (s) => (s.account_number_masked ? <span>{s.bank_name}<span className="block text-muted">{s.account_number_masked}</span></span> : <span className="text-amber-700">Not set</span>) },
        { key: "joined", label: "Joined", render: (s) => formatDate(s.created_at) },
        { key: "status", label: "Status", render: (s) => <StatusBadge status={s.status} /> },
        {
          key: "go",
          label: "",
          className: "text-right",
          render: (s) => (
            <Link href={`/admin/vendors/${s.id}`} className="rounded-md border border-border px-3 py-1.5 font-semibold hover:border-burgundy">
              {s.status === "pending" ? "Review" : "Open"}
            </Link>
          ),
        },
      ]}
    />
  );
}

export default function AdminVendorsPage() {
  return (
    <Suspense>
      <VendorsInner />
    </Suspense>
  );
}
