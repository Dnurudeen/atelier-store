"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { AccountCard } from "@/components/account/account-card";
import { AddressForm } from "@/components/account/address-form";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, type Address } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function AddressBookPage() {
  const client = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { data: addresses, isLoading } = useQuery({
    queryKey: ["addresses", token],
    queryFn: async () => (await api<{ data: Address[] }>("/account/addresses")).data,
    enabled: Boolean(token),
  });
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["addresses"] });
    void client.invalidateQueries({ queryKey: ["account-overview"] });
  };

  async function makeDefault(a: Address) {
    try {
      await api(`/account/addresses/${a.id}`, { method: "PUT", body: { is_default: true } });
      toast.success("Default address updated");
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/account/addresses/${deleting.id}`, { method: "DELETE" });
      toast.success("Address deleted");
      setDeleting(null);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <AccountCard title={editing === "new" ? "Add a new address" : "Edit address"} bodyClassName="p-4">
        <AddressForm
          initial={editing === "new" ? { full_name: user?.name ?? "", phone: user?.phone ?? "" } : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            toast.success("Address saved");
            setEditing(null);
            refresh();
          }}
        />
      </AccountCard>
    );
  }

  return (
    <AccountCard
      title={`Address Book${addresses?.length ? ` (${addresses.length})` : ""}`}
      action={
        <button type="button" onClick={() => setEditing("new")} className="inline-flex items-center gap-1 rounded-md bg-crimson px-3 py-1.5 text-[12px] font-bold text-white uppercase hover:bg-crimson-hover">
          <Plus size={14} /> Add new address
        </button>
      }
    >
      {isLoading ? (
        <ListSkeleton />
      ) : !addresses?.length ? (
        <EmptyState icon={MapPin} title="You have not added any address yet" text="Add your delivery address to check out faster." action={{ label: "Add address", onClick: () => setEditing("new") }} />
      ) : (
        <ul className="grid gap-3 p-4 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-col rounded-md border border-border">
              <div className="flex-1 p-3 text-[13px]">
                <p className="flex items-center gap-2 font-semibold">
                  {a.full_name} {a.label && <span className="rounded bg-surface px-1.5 text-[11px] font-normal text-muted">{a.label}</span>}
                </p>
                <p className="text-muted">
                  {a.address_line}, {a.city}, {a.state}
                  {a.postal_code ? ` ${a.postal_code}` : ""}
                </p>
                <p className="text-muted">{a.phone}</p>
                {a.is_default && <p className="mt-1 text-[12px] font-semibold text-emerald-700">DEFAULT ADDRESS</p>}
              </div>
              <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
                {a.is_default ? (
                  <span />
                ) : (
                  <button type="button" onClick={() => void makeDefault(a)} className="text-[12px] font-bold text-crimson uppercase">
                    Set as default
                  </button>
                )}
                <div className="flex gap-1">
                  <button type="button" onClick={() => setEditing(a)} className="rounded-full p-2 text-crimson hover:bg-crimson/10" aria-label="Edit address">
                    <Pencil size={15} />
                  </button>
                  <button type="button" onClick={() => setDeleting(a)} className="rounded-full p-2 text-crimson hover:bg-crimson/10" aria-label="Delete address">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete address?"
        message={deleting ? `${deleting.address_line}, ${deleting.city} will be removed from your address book.` : ""}
        confirmLabel="Delete"
        loading={busy}
        onConfirm={() => void remove()}
        onClose={() => setDeleting(null)}
      />
    </AccountCard>
  );
}
