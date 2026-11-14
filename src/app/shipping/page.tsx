import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "Delivery options" };

const rows = [
  ["Within the seller's state", "1 to 3 business days"],
  ["Same region (for example South West)", "2 to 4 business days"],
  ["Other southern and central states", "3 to 6 business days"],
  ["Northern states", "4 to 8 business days"],
];

export default function ShippingPage() {
  return (
    <InfoPage title="Delivery options" intro="We deliver to all 36 states and the FCT." current="/shipping">
      <InfoSection title="Door delivery">
        <p>
          Every seller ships their items straight to your address. Your order is split into one package per seller,
          and each package has its own delivery fee shown at checkout before you pay.
        </p>
      </InfoSection>
      <InfoSection title="Estimated delivery times">
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-3 py-2 font-semibold">Destination</th>
                <th className="px-3 py-2 font-semibold">Estimated time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(([where, when]) => (
                <tr key={where}>
                  <td className="px-3 py-2">{where}</td>
                  <td className="px-3 py-2">{when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[13px] text-muted">
          Handmade and made to order pieces may need extra preparation time. The seller will note this on the product page.
        </p>
      </InfoSection>
      <InfoSection title="Tracking">
        <p>When a seller ships your package you&apos;ll get a notification and a tracking number in your order details.</p>
      </InfoSection>
    </InfoPage>
  );
}
