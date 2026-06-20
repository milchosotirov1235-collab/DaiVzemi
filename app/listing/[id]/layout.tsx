import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data } = await supabase
    .from("listings")
    .select("title, description, price, city, category, image_url, image_urls")
    .eq("id", id)
    .single();

  if (!data) {
    return { title: "Обява не е намерена" };
  }

  const title = data.title as string;
  const rawDescription = (data.description as string | null) ?? "";
  const metaDescription = rawDescription.length > 160
    ? rawDescription.slice(0, 157) + "…"
    : rawDescription || `${title} — обява в ДайВземи`;

  const imageUrl: string | null =
    (data.image_urls as string[] | null)?.[0] ??
    (data.image_url as string | null) ??
    null;

  const priceLabel = data.price ? `${data.price} €` : null;
  const locationLabel = data.city as string | null;
  const ogTitle = [title, priceLabel, locationLabel].filter(Boolean).join(" · ");

  return {
    title,
    description: metaDescription,
    openGraph: {
      title: ogTitle,
      description: metaDescription,
      url: `/listing/${id}`,
      type: "website",
      ...(imageUrl ? { images: [{ url: imageUrl, alt: title }] } : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: ogTitle,
      description: metaDescription,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
