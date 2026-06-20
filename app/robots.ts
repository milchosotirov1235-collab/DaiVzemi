import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://daivzemi.bg";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/profile",
          "/my-listings",
          "/messages",
          "/notifications",
          "/favorites",
          "/saved-searches",
          "/publish",
          "/edit-listing/",
          "/reports",
          "/verify-email",
          "/auth/",
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
