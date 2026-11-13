import type { Voucher } from "@/lib/api";
import { formatNaira } from "@/lib/utils";

export function voucherHeadline(v: Pick<Voucher, "type" | "value" | "max_discount">) {
  if (v.type === "free_shipping") return "Free delivery";
  if (v.type === "percent") return `${Number(v.value)}% off${v.max_discount ? ` (up to ${formatNaira(v.max_discount)})` : ""}`;
  return `${formatNaira(v.value)} off`;
}
