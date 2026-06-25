import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import ListingPageClient from "./ListingPageClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://daivzemi.bg";

// ---------------------------------------------------------------------------
// Server-side metadata generation — runs at request time, never on the client
// ---------------------------------------------------------------------------

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: listing } = await supabase
    .from("listings")
    .select("title, description, price, city, category, image_url, image_urls")
    .eq("id", id)
    .maybeSingle();

  if (!listing) {
    return {
      title: "Обява не е намерена",
      description: "Тази обява не съществува или е изтрита.",
    };
  }

  const title = listing.title ?? "Обява в DaiVzemi";
  const price = listing.price ? `${listing.price} €` : null;
  const city = listing.city ?? null;
  const category = listing.category ?? null;

  const descriptionParts = [
    listing.description?.slice(0, 120),
    price,
    city,
    category,
  ].filter(Boolean);
  const description = descriptionParts.join(" · ") || "Разгледай тази обява в DaiVzemi.";

  const ogImage =
    (listing.image_urls as string[] | null)?.[0] ??
    listing.image_url ??
    `${SITE_URL}/og-default.png`;

  const pageUrl = `${SITE_URL}/listing/${id}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

// ---------------------------------------------------------------------------
// Page — renders the full interactive client component
// ---------------------------------------------------------------------------

export default async function ListingPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return <ListingPageClient id={id} />;
}
