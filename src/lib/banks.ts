/** Common Nigerian banks for payout details (name only; the account is verified before the first payout). */
export const NIGERIAN_BANKS = [
  "Access Bank", "Citibank Nigeria", "Ecobank Nigeria", "Fidelity Bank", "First Bank of Nigeria", "First City Monument Bank (FCMB)",
  "Globus Bank", "Guaranty Trust Bank (GTBank)", "Heritage Bank", "Jaiz Bank", "Keystone Bank", "Kuda Bank", "Moniepoint MFB",
  "OPay", "PalmPay", "Parallex Bank", "Polaris Bank", "Providus Bank", "Stanbic IBTC Bank", "Standard Chartered Bank",
  "Sterling Bank", "SunTrust Bank", "Titan Trust Bank", "Union Bank of Nigeria", "United Bank for Africa (UBA)", "Unity Bank",
  "Wema Bank", "Zenith Bank",
];

export const isNuban = (value: string) => /^\d{10}$/.test(value.trim());
