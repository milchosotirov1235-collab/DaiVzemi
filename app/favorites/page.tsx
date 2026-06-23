"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";

type Listing = {
  id: number;
  title: string;
  price: string | number | null;
  city: string | null;
  category: string | null;
  image_url: string | null;
  image_urls: string[] | null;
};

export default function FavoritesPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        router.push("/login");
        return;
      }

      const { data: favorites } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", user.id);

      if (!favorites || favorites.length === 0) {
        setLoading(false);
        return;
      }

      const listingIds = favorites.map((f) => f.listing_id);

      const now = new Date().toISOString();
      const { data: listingsData } = await supabase
        .from("listings")
        .select("id, title, price, city, category, image_url, image_urls")
        .in("id", listingIds)
        .eq("hidden", false)
        .eq("moderation_status", "approved")
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false });

      setListings((listingsData as Listing[]) || []);
      setLoading(false);
    };

    loadFavorites();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-5xl font-black">Любими обяви</h1>
          <p className="mt-4 text-blue-100">
            Всички обяви, които сте запазили.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {loading ? (
          <p className="text-center text-lg font-semibold">
            Зареждане...
          </p>
        ) : listings.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-xl font-black text-slate-900">
              Все още нямате запазени обяви.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Разгледайте обявите и натиснете сърцето, за да запазите любимите си.
            </p>
            <Link
              href="/listings"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-900"
            >
              Разгледай обявите
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => {
              const image =
                listing.image_urls?.[0] || listing.image_url;

              return (
                <Link
                  key={listing.id}
                  href={`/listing/${listing.id}`}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg"
                >
                  {image ? (
                    <img
                      src={image}
                      alt={listing.title}
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center bg-blue-950 text-5xl text-white">
                      📦
                    </div>
                  )}

                  <div className="p-6">
                    <h2 className="text-2xl font-black text-slate-900">
                      {listing.title}
                    </h2>

                    <p className="mt-2 text-xl font-black text-blue-950">
                      {listing.price || "По договаряне"}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {listing.city || "Без град"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}