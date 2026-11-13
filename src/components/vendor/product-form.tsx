"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, Trash2, X } from "lucide-react";
import { Panel } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors, type Brand, type Product } from "@/lib/api";
import { useCategories } from "@/lib/hooks";
import { buildVariants, draftFromProduct, EMPTY_DRAFT, payloadFromDraft, validateDraft, type ProductDraft } from "@/lib/product-form";
import { discountPercent, formatNaira } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

function Field({ label, hint, error, required, children }: { label: string; hint?: ReactNode; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-foreground/80">
        {label}
        {required && <span className="ml-0.5 text-crimson">*</span>}
      </label>
      {children}
      {error ? <p className="text-xs text-crimson">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

const selectCls = "h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-burgundy disabled:bg-surface";

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState("");
  const add = () => {
    const parts = text.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...new Set([...values, ...parts])]);
    setText("");
  };
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-border bg-white px-2 py-1.5 focus-within:border-burgundy">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded bg-surface-warm px-2 py-0.5 text-[13px]">
          {v}
          <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !text && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={values.length ? "" : placeholder}
        className="min-w-[120px] flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const client = useQueryClient();
  const storeApproved = useAuthStore((s) => s.user?.store?.status === "approved");
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => (await api<{ data: Brand[] }>("/brands", { token: null })).data,
    staleTime: 10 * 60_000,
  });
  const [d, setD] = useState<ProductDraft>(() => (product ? draftFromProduct(product) : EMPTY_DRAFT));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<"draft" | "published" | null>(null);

  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => {
    setD((prev) => ({ ...prev, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const parent = categories.find((c) => String(c.id) === d.parent_category_id);
  const children = parent?.children ?? [];
  const off = discountPercent(d.price, d.compare_at_price);
  const isLive = product?.status === "published";
  const variantTotal = useMemo(() => d.variants.reduce((n, v) => n + Number(v.stock || 0), 0), [d.variants]);

  function setOptions(options: ProductDraft["options"]) {
    setD((prev) => ({ ...prev, options, variants: buildVariants(options, prev.variants) }));
  }

  async function save(status: "draft" | "published") {
    const errs = validateDraft(d, status === "published");
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Please fix the highlighted fields.");
      document.querySelector("[data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(status);
    try {
      const body = payloadFromDraft(d, status);
      const res = product
        ? await api<{ data: Product }>(`/vendor/products/${product.id}`, { method: "PUT", body })
        : await api<{ data: Product }>("/vendor/products", { method: "POST", body });
      void client.invalidateQueries({ queryKey: ["vendor-products"] });
      void client.invalidateQueries({ queryKey: ["vendor-product"] });
      void client.invalidateQueries({ queryKey: ["vendor-overview"] });
      const s = res.data.status;
      toast.success(
        s === "draft" ? "Saved as draft." : s === "pending" ? "Submitted for review — we usually approve within 24 hours." : "Changes saved and live."
      );
      if (!product) router.replace(`/vendor/products/${res.data.id}`);
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      toast.error(errorMessage(err, "Could not save the product."));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-3 pb-24">
      {product && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-white px-4 py-3 text-sm">
          Status: <StatusBadge status={product.status} />
          {product.status === "published" && (
            <Link href={`/product/${product.slug}`} target="_blank" className="font-semibold text-burgundy hover:underline">
              View on store
            </Link>
          )}
          {product.status === "rejected" && product.rejection_reason && (
            <span className="flex items-center gap-1 text-crimson">
              <AlertTriangle size={14} /> {product.rejection_reason}
            </span>
          )}
          {isLive && <span className="text-[12px] text-muted">Price and stock changes go live instantly; other changes are re-checked before going live.</span>}
        </div>
      )}

      <Panel title="1. Basic information" bodyClassName="grid gap-4 p-4 md:grid-cols-2">
        <div className="md:col-span-2" data-error={Boolean(errors.name)}>
          <Field label="Product name" required error={errors.name} hint="Brand + product + key detail, e.g. “Ada Couture Ankara Wrap Dress – Red, Cotton”.">
            <input value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={180} className={selectCls} />
          </Field>
        </div>
        <div data-error={Boolean(errors.category_id)}>
          <Field label="Category" required error={errors.category_id}>
            <select
              value={d.parent_category_id}
              onChange={(e) => {
                const p = categories.find((c) => String(c.id) === e.target.value);
                setD((prev) => ({ ...prev, parent_category_id: e.target.value, category_id: p && !(p.children?.length) ? String(p.id) : "" }));
              }}
              className={selectCls}
            >
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Sub-category" required={children.length > 0} error={children.length ? errors.category_id : undefined}>
          <select value={children.length ? d.category_id : ""} onChange={(e) => set("category_id", e.target.value)} disabled={!children.length} className={selectCls}>
            <option value="">{children.length ? "Choose a sub-category" : "No sub-categories"}</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brand" hint="Start typing to pick an existing brand, or enter your own (use your store name for handmade items).">
          <input list="brand-list" value={d.brand_name} onChange={(e) => set("brand_name", e.target.value)} maxLength={120} className={selectCls} />
          <datalist id="brand-list">
            {brands.map((b) => (
              <option key={b.id} value={b.name} />
            ))}
          </datalist>
        </Field>
        <Field label="Condition">
          <select value={d.condition} onChange={(e) => set("condition", e.target.value as ProductDraft["condition"])} className={selectCls}>
            <option value="new">New</option>
            <option value="refurbished">Refurbished</option>
            <option value="used">Used</option>
          </select>
        </Field>
      </Panel>

      <Panel title="2. Photos" bodyClassName="p-4">
        <div data-error={Boolean(errors.images)}>
          <ImageUploader value={d.images} onChange={(v) => set("images", v)} purpose="product" max={10} hint="Up to 10 photos. Use a plain white or light background for the main photo, at least 800×800 px. Drag to reorder — the first is the main photo." />
          {errors.images && <p className="mt-1 text-xs text-crimson">{errors.images}</p>}
        </div>
      </Panel>

      <Panel title="3. Description & specifications" bodyClassName="grid gap-4 p-4">
        <div data-error={Boolean(errors.description)}>
          <Textarea label="Product description" value={d.description} onChange={(e) => set("description", e.target.value)} rows={7} maxLength={20000} error={errors.description} />
          <p className="mt-1 text-xs text-muted">Explain what it is, what it&apos;s made of, how to use or care for it. Plain text; leave a blank line between paragraphs.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Textarea label="Key features (one per line)" value={d.key_features} onChange={(e) => set("key_features", e.target.value)} rows={5} maxLength={4000} placeholder={"100% cotton\nHand-dyed adire pattern\nAdjustable waist tie"} />
          </div>
          <div>
            <Textarea label="What's in the box (one per line)" value={d.whats_in_box} onChange={(e) => set("whats_in_box", e.target.value)} rows={5} maxLength={2000} placeholder={"1 × wrap dress\n1 × matching head tie"} />
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Specifications</p>
          <div className="space-y-2">
            {d.specs.map((row, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={row.label}
                  onChange={(e) => set("specs", d.specs.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))}
                  placeholder="e.g. Material"
                  aria-label="Specification name"
                  className="h-10 w-2/5 rounded-md border border-border px-3 text-sm outline-none focus:border-burgundy"
                />
                <input
                  value={row.value}
                  onChange={(e) => set("specs", d.specs.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))}
                  placeholder="e.g. Cotton"
                  aria-label="Specification value"
                  className="h-10 flex-1 rounded-md border border-border px-3 text-sm outline-none focus:border-burgundy"
                />
                <button type="button" onClick={() => set("specs", d.specs.filter((_, j) => j !== i))} className="rounded-md px-2 text-muted hover:text-crimson" aria-label="Remove specification">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => set("specs", [...d.specs, { label: "", value: "" }])} className="inline-flex items-center gap-1 text-[13px] font-semibold text-crimson">
              <Plus size={15} /> Add specification
            </button>
          </div>
        </div>
        <Input label="Warranty" placeholder="e.g. 6 months manufacturer warranty" value={d.warranty} onChange={(e) => set("warranty", e.target.value)} maxLength={160} />
      </Panel>

      <Panel title="4. Price" bodyClassName="grid gap-4 p-4 md:grid-cols-3">
        <div data-error={Boolean(errors.price)}>
          <Input label="Selling price (₦)" required inputMode="decimal" value={d.price} onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))} error={errors.price} />
        </div>
        <div data-error={Boolean(errors.compare_at_price)}>
          <Input
            label="Old price (₦)"
            inputMode="decimal"
            value={d.compare_at_price}
            onChange={(e) => set("compare_at_price", e.target.value.replace(/[^\d.]/g, ""))}
            error={errors.compare_at_price}
            hint={off ? `Shows as -${off}% off` : "Optional. Shows a discount when higher than the selling price."}
          />
        </div>
        <div data-error={Boolean(errors.sale_ends_at)}>
          <Input label="Sale ends (optional)" type="datetime-local" value={d.sale_ends_at} onChange={(e) => set("sale_ends_at", e.target.value)} error={errors.sale_ends_at} hint="Adds a Flash Sale countdown; the old price is hidden after it ends." />
        </div>
      </Panel>

      <Panel title="5. Options & stock" bodyClassName="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Sizes" hint="Press Enter after each size, e.g. S, M, L or 40, 41, 42.">
            <TagInput values={d.options.size} onChange={(size) => setOptions({ ...d.options, size })} placeholder="Add sizes" />
          </Field>
          <Field label="Colours" hint="Leave both empty if the product has no options.">
            <TagInput values={d.options.color} onChange={(color) => setOptions({ ...d.options, color })} placeholder="Add colours" />
          </Field>
        </div>

        {d.variants.length > 0 ? (
          <div data-error={Boolean(errors.variants)}>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="bg-surface text-[11px] tracking-wide text-muted uppercase">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Option</th>
                    <th className="px-3 py-2 font-semibold">Stock *</th>
                    <th className="px-3 py-2 font-semibold">Price (₦)</th>
                    <th className="px-3 py-2 font-semibold">SKU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {d.variants.map((v, i) => {
                    const update = (patch: Partial<typeof v>) => set("variants", d.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                    return (
                      <tr key={JSON.stringify(v.attributes)}>
                        <td className="px-3 py-2 font-medium">{Object.values(v.attributes).join(" / ")}</td>
                        <td className="px-3 py-2">
                          <input inputMode="numeric" value={v.stock} onChange={(e) => update({ stock: e.target.value.replace(/\D/g, "") })} className="h-9 w-20 rounded-md border border-border px-2 outline-none focus:border-burgundy" aria-label="Stock" />
                        </td>
                        <td className="px-3 py-2">
                          <input inputMode="decimal" value={v.price} onChange={(e) => update({ price: e.target.value.replace(/[^\d.]/g, "") })} placeholder={d.price || "Same"} className="h-9 w-28 rounded-md border border-border px-2 outline-none focus:border-burgundy" aria-label="Price" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={v.sku} onChange={(e) => update({ sku: e.target.value })} maxLength={80} className="h-9 w-32 rounded-md border border-border px-2 outline-none focus:border-burgundy" aria-label="SKU" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-muted">Total stock: {variantTotal}. Leave price empty to use the selling price.</p>
            {errors.variants && <p className="text-xs text-crimson">{errors.variants}</p>}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3" data-error={Boolean(errors.stock)}>
            <Input label="Quantity in stock" required inputMode="numeric" value={d.stock} onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} error={errors.stock} />
            <Input label="SKU (your reference)" value={d.sku} onChange={(e) => set("sku", e.target.value)} maxLength={80} error={errors.sku} />
            <Input label="Low-stock alert at" inputMode="numeric" value={d.low_stock_threshold} onChange={(e) => set("low_stock_threshold", e.target.value.replace(/\D/g, ""))} />
          </div>
        )}
      </Panel>

      <Panel title="6. Shipping details" bodyClassName="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-4">
        <Input label="Weight (kg)" inputMode="decimal" value={d.weight_kg} onChange={(e) => set("weight_kg", e.target.value.replace(/[^\d.]/g, ""))} hint="Packed weight" />
        <Input label="Length (cm)" inputMode="decimal" value={d.length_cm} onChange={(e) => set("length_cm", e.target.value.replace(/[^\d.]/g, ""))} />
        <Input label="Width (cm)" inputMode="decimal" value={d.width_cm} onChange={(e) => set("width_cm", e.target.value.replace(/[^\d.]/g, ""))} />
        <Input label="Height (cm)" inputMode="decimal" value={d.height_cm} onChange={(e) => set("height_cm", e.target.value.replace(/[^\d.]/g, ""))} />
      </Panel>

      <Panel title="7. Search engine listing (optional)" bodyClassName="grid gap-4 p-4">
        <Input label="Page title" value={d.meta_title} onChange={(e) => set("meta_title", e.target.value)} maxLength={160} hint={`${d.meta_title.length}/160 · defaults to the product name`} />
        <Textarea label="Meta description" value={d.meta_description} onChange={(e) => set("meta_description", e.target.value)} maxLength={320} rows={2} />
      </Panel>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 px-3 py-3 backdrop-blur md:left-64">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!storeApproved && <p className="mr-auto text-[12px] text-amber-700">Your store is pending approval — you can save drafts now.</p>}
          {d.price && <p className="mr-auto hidden text-sm sm:block">Price: <span className="font-bold">{formatNaira(d.price)}</span></p>}
          <Button variant="outline" onClick={() => router.push("/vendor/products")}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => void save("draft")} loading={saving === "draft"} disabled={Boolean(saving)}>
            Save draft
          </Button>
          <Button onClick={() => void save("published")} loading={saving === "published"} disabled={Boolean(saving) || !storeApproved}>
            {isLive ? "Save changes" : "Submit for review"}
          </Button>
        </div>
      </div>
    </div>
  );
}
