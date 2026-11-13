"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AdminTable, useTableState } from "@/components/admin/admin-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { qs, useAdmin, type Page } from "@/lib/admin";
import { formatDate } from "@/lib/account";
import type { Order } from "@/lib/api";
import { formatNaira } from "@/lib/utils";

type Row = Order & { user?: { name: string; email: string } };

const TABS: Record<string, Record<string, string | boolean>> = {
  paid: { payment: "paid" },
  processing: { payment: "paid", status: "processing" },
  shipped: { payment: "paid", status: "shipped" },
  delivered: { payment: "paid", status: "delivered" },
  refunds: { refunds: true },
  unpaid: { payment: "pending" },
  all: {},
};

function OrdersInner() {
  const params = useSearchParams();
  const t = useTableState(params.get("refunds") ? "refunds" : "paid");
  const { data, isFetching } = useAdmin<Page<Row>>(`/orders${qs({ ...TABS[t.tab], q: t.query, page: t.page })}`);

  return (
    <AdminTable<Row>
      tabs={[
        { value: "paid", label: "Paid" },
        { value: "processing", label: "Processing" },
        { value: "shipped", label: "Shipped" },
        { value: "delivered", label: "Delivered" },
        { value: "refunds", label: "Refunds due" },
        { value: "unpaid", label: "Unpaid" },
        { value: "all", label: "All" },
      ]}
      tab={t.tab}
      onTab={t.onTab}
      onSearch={t.onSearch}
      searchPlaceholder="Order number, payment reference, customer name or email"
      rows={data?.data}
      meta={data?.meta}
      loading={isFetching}
      page={t.page}
      onPage={t.setPage}
      empty="No orders here"
      columns={[
        { key: "order", label: "Order", render: (o) => <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-burgundy">{o.order_number}<span className="block font-normal text-muted">{formatDate(o.created_at, true)}</span></Link> },
        { key: "customer", label: "Customer", render: (o) => <span>{o.user?.name}<span className="block text-muted">{o.user?.email}</span></span> },
        { key: "sellers", label: "Sellers", render: (o) => o.sub_orders.map((s) => s.store?.name).filter(Boolean).join(", ") },
        { key: "total", label: "Total", render: (o) => <span className="font-semibold">{formatNaira(o.total)}{Number(o.discount_total) > 0 && <span className="block font-normal text-emerald-700">-{formatNaira(o.discount_total!)} {o.coupon_code}</span>}</span> },
        { key: "payment", label: "Payment", render: (o) => <StatusBadge status={o.payment_status === "paid" ? "success" : o.payment_status} label={o.payment_status === "paid" ? "Paid" : undefined} /> },
        { key: "status", label: "Status", render: (o) => <StatusBadge status={o.status} /> },
        { key: "go", label: "", className: "text-right", render: (o) => <Link href={`/admin/orders/${o.id}`} className="rounded-md border border-border px-3 py-1.5 font-semibold hover:border-burgundy">Open</Link> },
      ]}
    />
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <OrdersInner />
    </Suspense>
  );
}
