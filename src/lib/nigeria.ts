export const NIGERIAN_STATES = [
  "Abia", "Abuja (FCT)", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna",
  "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

const REGIONS: Record<string, string[]> = {
  "south-west": ["Lagos", "Ogun", "Oyo", "Osun", "Ondo", "Ekiti"],
  "south-south": ["Rivers", "Delta", "Edo", "Bayelsa", "Akwa Ibom", "Cross River"],
  "south-east": ["Anambra", "Enugu", "Imo", "Abia", "Ebonyi"],
  "north-central": ["Abuja (FCT)", "Kogi", "Kwara", "Benue", "Nasarawa", "Niger", "Plateau"],
  north: ["Kano", "Kaduna", "Katsina", "Sokoto", "Kebbi", "Zamfara", "Jigawa", "Bauchi", "Gombe", "Adamawa", "Taraba", "Borno", "Yobe"],
};

function regionOf(place?: string | null): string | null {
  if (!place) return null;
  const p = place.toLowerCase();
  for (const [region, states] of Object.entries(REGIONS)) {
    if (states.some((s) => p.includes(s.toLowerCase().replace(" (fct)", "")))) return region;
  }
  return null;
}

/** Business-day delivery window from a seller's location to a buyer's state. */
export function deliveryWindow(sellerLocation?: string | null, buyerState?: string | null): [number, number] {
  const from = regionOf(sellerLocation);
  const to = regionOf(buyerState);
  if (!buyerState) return [2, 7];
  if (sellerLocation && buyerState && sellerLocation.toLowerCase().includes(buyerState.toLowerCase().replace(" (fct)", ""))) return [1, 3];
  if (from && to && from === to) return [2, 4];
  if (to === "north" || from === "north") return [4, 8];
  return [3, 6];
}

/** Add business days (skips Sat/Sun). */
export function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

export function formatDeliveryRange(sellerLocation: string | null | undefined, buyerState: string | null | undefined, now = new Date()) {
  const [min, max] = deliveryWindow(sellerLocation, buyerState);
  const fmt = (d: Date) => d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  return `${fmt(addBusinessDays(now, min))} to ${fmt(addBusinessDays(now, max))}`;
}

export function isValidNigerianPhone(phone: string) {
  const digits = phone.replace(/[\s-]/g, "");
  return /^(\+?234|0)[789][01]\d{8}$/.test(digits);
}
