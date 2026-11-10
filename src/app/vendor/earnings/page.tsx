import { redirect } from "next/navigation";

export default function VendorEarningsRedirect() {
  redirect("/vendor/statements");
}
