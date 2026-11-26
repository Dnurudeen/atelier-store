/** Official Atelier Nigeria social / chat destinations. */
export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/atelier_nigeria/",
  facebook: "https://web.facebook.com/profile.php?id=61595751698258",
  x: "https://x.com/ATELIERNIGERIA",
  tiktok: "https://www.tiktok.com/@atelier.nigeria",
  whatsapp: "https://wa.me/message/PSHRBTUQRRMXG1",
} as const;

export const FOOTER_SOCIAL = [
  { label: "Instagram", short: "IG", href: SOCIAL_LINKS.instagram },
  { label: "Facebook", short: "f", href: SOCIAL_LINKS.facebook },
  { label: "X", short: "X", href: SOCIAL_LINKS.x },
  { label: "TikTok", short: "TT", href: SOCIAL_LINKS.tiktok },
  { label: "WhatsApp", short: "WA", href: SOCIAL_LINKS.whatsapp },
] as const;
