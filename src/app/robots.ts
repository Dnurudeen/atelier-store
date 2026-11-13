import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/vendor", "/admin", "/checkout", "/cart", "/login", "/register", "/reset-password", "/verify-email"],
      },
    ],
    sitemap: "https://www.atelierstore.studio/sitemap.xml",
  };
}
