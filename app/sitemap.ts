import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://daivzemi.bg";

const CATEGORIES = [
  "Имоти",
  "Автомобили",
  "Авточасти",
  "Електроника",
  "Детски стоки",
  "Дом и градина",
  "Мода",
  "Спорт и хоби",
  "Услуги",
  "Работа",
  "Компютри",
  "Книги",
];

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  { url: `${SITE_URL}/listings`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
  { url: `${SITE_URL}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${SITE_URL}/register`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${SITE_URL}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
];

const CATEGORY_ROUTES: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
  url: `${SITE_URL}/listings?category=${encodeURIComponent(cat)}`,
  lastModified: new Date(),
  changeFrequency: "hourly" as const,
  priority: 0.8,
}));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const now = new Date();

  const { data: listings } = await supabase
    .from("listings")
    .select("id, created_at, expires_at")
    .or("hidden.is.null,hidden.eq.false")
    .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(5000);

  const listingRoutes: MetadataRoute.Sitemap = (listings ?? []).map((l) => ({
    url: `${SITE_URL}/listing/${l.id}`,
    lastModified: l.created_at ? new Date(l.created_at) : now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...STATIC_ROUTES, ...CATEGORY_ROUTES, ...listingRoutes];
}
