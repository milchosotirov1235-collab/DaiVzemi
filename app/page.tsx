"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import {
  Baby,
  BookOpen,
  Briefcase,
  Camera,
  Car,
  Hammer,
  Heart,
  Home as HomeIcon,
  Monitor,
  Shirt,
  Smartphone,
  Trophy,
  Trees,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { formatDualPrice } from "@/lib/formatPrice";

type Listing = {
  id: string;
  title: string;
  price: string | number | null;
  city: string | null;
  category: string | null;
  listing_type: string | null;
  created_at: string | null;
  image_url: string | null;
  image_urls: string[] | null;
};

const fallbackImageByCategory: Record<string, string> = {
  Имоти: "🏙️",
  Автомобили: "🚗",
  Авточасти: "🔧",
  Електроника: "📺",
  "Детски стоки": "🧸",
  "Дом и градина": "🏡",
  Мода: "👗",
  "Спорт и хоби": "🏀",
  Услуги: "🛠️",
  Работа: "💼",
  Компютри: "💻",
  Книги: "📚",
};

export default function Home() {
  const router = useRouter();
  const [latestListings, setLatestListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [recentlyViewed, setRecentlyViewed] = useState<{
    id: string; title: string; price: string | number | null;
    category: string | null; city: string | null; image_url: string | null;
  }[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dv_recently_viewed");
      if (raw) setRecentlyViewed(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      setUserId(user.id);
      const { data: favs } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", user.id);
      if (favs) setFavoriteIds(new Set(favs.map((f: { listing_id: number }) => String(f.listing_id))));
    };
    loadUser();
  }, []);

  const toggleFavorite = async (e: React.MouseEvent, listingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) { router.push("/login"); return; }
    const isFav = favoriteIds.has(listingId);
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", userId).eq("listing_id", Number(listingId));
      setFavoriteIds((prev) => { const n = new Set(prev); n.delete(listingId); return n; });
    } else {
      await supabase.from("favorites").insert({ user_id: userId, listing_id: Number(listingId) });
      setFavoriteIds((prev) => new Set([...prev, listingId]));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const now = new Date().toISOString();
      // Latest listings
      const { data: listingsData, error } = await supabase
        .from("listings")
        .select("id, title, price, city, category, listing_type, created_at, image_url, image_urls")
        .or("hidden.is.null,hidden.eq.false")
        .or("moderation_status.is.null,moderation_status.eq.approved")
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(8);

      setLatestListings(!error && listingsData ? (listingsData as Listing[]) : []);
      setListingsLoading(false);

      // Category counts — server-side via RPC for efficiency
      const { data: catRows } = await supabase.rpc("get_category_counts");

      const counts: Record<string, number> = {};
      for (const row of (catRows ?? []) as { category: string; count: number }[]) {
        if (row.category) counts[row.category] = Number(row.count);
      }
      setCategoryCounts(counts);
    };

    loadData();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    }

    const queryString = params.toString();
    router.push(`/listings${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 py-24 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h1 className="text-6xl font-black md:text-7xl">
            Дай. Вземи. Продай.
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-xl text-blue-100">
            Безплатни обяви за цяла България.
            Продавай, подарявай, разменяй и търси на едно място.
          </p>

          {Object.keys(categoryCounts).length > 0 && (
            <p className="mt-3 text-sm font-semibold text-blue-300">
              {Object.values(categoryCounts).reduce((a, b) => a + b, 0)} активни обяви в момента
            </p>
          )}

          <div className="mx-auto mt-10 flex max-w-4xl flex-col gap-3 rounded-3xl bg-white p-3 shadow-2xl md:flex-row">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Какво търсите?"
              className="flex-1 rounded-2xl bg-white px-5 py-4 text-lg font-bold text-slate-950 caret-blue-950 outline-none placeholder:text-slate-400"
            />

            <button
              type="button"
              onClick={handleSearch}
              className="rounded-2xl bg-blue-950 px-8 py-4 text-lg font-black text-white"
            >
              Търси
            </button>
          </div>

          {/* Popular search chips */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {(Object.keys(categoryCounts).length > 0
              ? Object.entries(categoryCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([cat]) => cat)
              : ["Автомобили", "Имоти", "Електроника", "Мода", "Услуги", "Книги"]
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => router.push(`/listings?category=${encodeURIComponent(cat)}`)}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            ["💰", "Продавам"],
            ["🎁", "Подарявам"],
            ["🔄", "Разменям"],
            ["🔍", "Търся"],
          ].map(([icon, title]) => (
            <Link
              key={title}
              href={`/listings?type=${encodeURIComponent(title as string)}`}
              className="rounded-3xl bg-white p-8 text-center shadow-md transition hover:shadow-xl"
            >
              <div className="text-5xl">{icon}</div>
              <h3 className="mt-4 text-2xl font-black text-blue-950">
                {title}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <h2 className="mb-8 text-4xl font-black text-blue-950">
          Категории
        </h2>

        <div className="grid gap-5 md:grid-cols-4">
          {[
            { icon: HomeIcon, label: "Имоти" },
            { icon: Car, label: "Автомобили" },
            { icon: Wrench, label: "Авточасти" },
            { icon: Smartphone, label: "Електроника" },
            { icon: Baby, label: "Детски стоки" },
            { icon: Trees, label: "Дом и градина" },
            { icon: Shirt, label: "Мода" },
            { icon: Trophy, label: "Спорт и хоби" },
            { icon: Hammer, label: "Услуги" },
            { icon: Briefcase, label: "Работа" },
            { icon: Monitor, label: "Компютри" },
            { icon: BookOpen, label: "Книги" },
          ].map(({ icon: Icon, label }) => (
            <Link
              key={label}
              href={`/listings?category=${encodeURIComponent(label)}`}
              className="group rounded-2xl bg-white p-7 text-center shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:ring-blue-300 hover:shadow-lg"
            >
              <Icon className="mx-auto h-9 w-9 text-blue-950" />
              <div className="mt-5 text-[20px] font-extrabold text-slate-950">
                {label}
              </div>
              <div className="mt-1.5 text-sm font-semibold text-slate-500">
                {categoryCounts[label] ?? 0} обяви
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pb-12">
          <h2 className="mb-4 text-xl font-black text-slate-900">Наскоро разгледани</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentlyViewed.map((item) => (
              <Link
                key={item.id}
                href={`/listing/${item.id}`}
                className="group flex w-44 shrink-0 flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="h-28 w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                ) : (
                  <div className="flex h-28 items-center justify-center bg-blue-950 text-3xl text-white">
                    {item.category ? fallbackImageByCategory[item.category] ?? "📦" : "📦"}
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className="line-clamp-2 text-xs font-black leading-snug text-slate-900">{item.title}</p>
                  <p className="mt-auto text-xs font-black text-blue-950">{formatDualPrice(item.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Latest Listings */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-4xl font-black text-blue-950">Последни обяви</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Прегледайте най-новите предложения в DaiVzemi, прегледани специално за вас.
            </p>
          </div>
        </div>

        {listingsLoading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="h-56 w-full animate-pulse bg-slate-200" />
                <div className="space-y-4 p-6">
                  <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
                  <div className="space-y-2">
                    <div className="h-6 w-4/5 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-6 w-2/5 animate-pulse rounded-full bg-slate-200" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : latestListings.length === 0 ? (
          <div className="mt-10 rounded-[28px] border border-dashed border-slate-300 bg-white px-8 py-16 text-center shadow-sm">
            <p className="text-2xl font-black text-slate-900">Все още няма обяви</p>
            <p className="mt-2 text-sm text-slate-600">
              Бъдете първи — публикувайте безплатна обява сега.
            </p>
            <Link
              href="/publish"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-900"
            >
              Публикувай обява
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {latestListings.map((listing, index) => {
              const isNew = !!listing.created_at && (Date.now() - new Date(listing.created_at).getTime()) < 86_400_000;
              return (
              <article
                key={listing.id ?? `${listing.title}-${index}`}
                className="group cursor-pointer overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <Link href={`/listing/${listing.id}`} className="block">
                  <div className="relative">
                    {(() => {
                      const cardImage = listing.image_urls?.find(Boolean) ?? listing.image_url;
                      return cardImage ? (
                        <img
                          src={cardImage}
                          alt={listing.title}
                          className="h-56 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-56 items-center justify-center rounded-t-[28px] bg-blue-950 text-6xl text-white transition duration-300 group-hover:bg-blue-900">
                          {listing.category ? fallbackImageByCategory[listing.category] ?? "📦" : "📦"}
                        </div>
                      );
                    })()}
                    {isNew && (
                      <span className="absolute left-5 top-5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                        Нов
                      </span>
                    )}
                    {!isNew && (
                      <span className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-950 shadow-sm">
                        {listing.listing_type ?? "Обява"}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, listing.id)}
                      aria-label={favoriteIds.has(listing.id) ? "Премахни от любими" : "Добави в любими"}
                      className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full shadow-md transition ${
                        favoriteIds.has(listing.id)
                          ? "bg-red-500 text-white"
                          : "bg-white/85 text-slate-400 hover:text-red-500"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${favoriteIds.has(listing.id) ? "fill-current" : ""}`} />
                    </button>
                    {(listing.image_urls?.filter(Boolean).length ?? 0) > 1 && (
                      <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-slate-950/60 px-2 py-1 text-xs font-bold text-white backdrop-blur">
                        <Camera className="h-3 w-3" />
                        {listing.image_urls!.filter(Boolean).length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-4 p-6">
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-950">
                        {listing.title}
                      </h3>
                      <p className="text-lg font-extrabold text-blue-950">
                        {formatDualPrice(listing.price)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {listing.city ?? "Без град"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {listing.category ?? "Без категория"}
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="px-6 pb-6">
                  <Link
                    href={`/listing/${listing.id}`}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-950 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-900"
                  >
                    Виж обявата
                  </Link>
                </div>
              </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}