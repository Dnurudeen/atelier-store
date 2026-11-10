const faqs = [
  {
    q: "When does a product go live?",
    a: "After you submit it, the listing stays pending until Atelier approves it. Buyers cannot see it before that.",
  },
  {
    q: "How do orders move?",
    a: "Mark an order processing, then shipped with a tracking number if you have one, then delivered. Cancel if you cannot fulfill it. Mark returned if the piece comes back.",
  },
  {
    q: "When do I get paid?",
    a: "Your share appears as a pending balance only after delivery. Atelier closes the week from the admin payouts screen and marks that statement paid. Money is not available while an order is only paid or shipped.",
  },
  {
    q: "How do sponsored products get charged?",
    a: "You set a budget in naira. While the sponsorship is active, ₦500 a day is deducted from your pending balance until the budget is used up. It is not a separate card charge.",
  },
  {
    q: "What is the seller score?",
    a: "Buyers see a score built from the last four weeks: shipping within two days, customer rating, cancellations, and returns.",
  },
];

export default function VendorHelpPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl">Help</h2>
        <p className="text-sm text-muted">Answers for the questions that come up while you run the store.</p>
      </div>
      <div className="space-y-3">
        {faqs.map((item) => (
          <article key={item.q} className="rounded-2xl border border-border bg-white p-5">
            <h3 className="font-medium">{item.q}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.a}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
