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
  ChevronDown,
  ChevronRight,
  Hammer,
  Heart,
  Home as HomeIcon,
  MapPin,
  PawPrint,
  Search,
  Shirt,
  Smartphone,
  Trophy,
  Trees,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { formatDualPrice } from "@/lib/formatPrice";
import { BG_CITIES } from "@/lib/data/cities";

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
  Животни: "🐾",
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
  const [locationCity, setLocationCity] = useState("");
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
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (locationCity.trim()) params.set("city", locationCity.trim());
    const queryString = params.toString();
    router.push(`/listings${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 pb-16 pt-10 text-white md:py-24">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <h1 className="text-4xl font-black sm:text-5xl md:text-6xl xl:text-7xl">
            Дай. Вземи. Продай.
          </h1>

          <p className="mt-2 text-sm text-blue-200 md:hidden">
            Безплатни обяви за цяла България.
          </p>
          <p className="mx-auto mt-6 hidden max-w-3xl text-xl text-blue-100 md:block">
            Безплатни обяви за цяла България.
            Продавай, подарявай, разменяй и търси на едно място.
          </p>

          {Object.keys(categoryCounts).length > 0 && (
            <p className="mt-2 hidden text-sm font-semibold text-blue-300 md:block">
              {Object.values(categoryCounts).reduce((a, b) => a + b, 0)} активни обяви в момента
            </p>
          )}

          {/* Search */}
          <div className="mx-auto mt-5 max-w-4xl md:mt-10">
            <div className="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-white/20 md:rounded-3xl md:p-2">
              <Search className="ml-2.5 h-5 w-5 shrink-0 text-slate-400 md:ml-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                placeholder="Какво търсите?"
                className="flex-1 bg-transparent py-3 text-base font-bold text-slate-950 caret-blue-950 outline-none placeholder:text-slate-400 md:py-4 md:text-lg"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-xl bg-blue-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-900 md:rounded-2xl md:px-8 md:py-4 md:text-lg"
              >
                Търси
              </button>
            </div>

            {/* Location picker — mobile only, native <select> for smooth OS wheel picker */}
            <label className="relative mt-2.5 flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 md:hidden">
              <MapPin className="h-4 w-4 shrink-0 text-blue-300" />
              <span className="flex-1 text-left text-sm font-semibold text-white">
                {locationCity || "Цяла България"}
              </span>
              <ChevronDown className="h-4 w-4 text-blue-300" />
              <select
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                <option value="">Цяла България</option>
                {BG_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Popular search chips — desktop only */}
          <div className="mt-5 hidden flex-wrap justify-center gap-2 md:flex">
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

      {/* ── Floating content card — overlaps hero on mobile ──────────── */}
      <div className="-mt-5 rounded-t-[32px] bg-slate-50 pt-5 md:mt-0 md:rounded-none md:bg-transparent md:pt-0">

        {/* Actions */}
        <section className="px-5 py-5 md:mx-auto md:max-w-7xl md:px-6 md:py-16">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
            {([
              ["💰", "Продавам",  "Нов и употребяван", "Продавам"],
              ["🎁", "Подарявам", "Дай на някого",      "Подарявам"],
              ["🔄", "Разменям",  "Размяна на стоки",   "Разменям"],
              ["🔍", "Търся",     "Търся дадена вещ",   "Търся"],
            ] as [string, string, string, string][]).map(([icon, title, sub, type]) => (
              <Link
                key={title}
                href={`/listings?type=${encodeURIComponent(type)}`}
                className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-blue-100 transition active:scale-[0.97] hover:shadow-md hover:ring-blue-200 md:rounded-3xl md:p-8 md:shadow-md md:hover:shadow-xl"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-950/5 text-2xl md:h-16 md:w-16 md:rounded-2xl md:text-4xl">
                  {icon}
                </div>
                <h3 className="mt-2 text-sm font-black text-blue-950 md:mt-4 md:text-2xl">
                  {title}
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500 md:hidden">{sub}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Нови обяви ──────────────────────────────────────────────── */}
        <section className="px-5 pb-6 md:mx-auto md:max-w-7xl md:px-6 md:pb-24">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 md:text-4xl">Нови обяви</h2>
            <Link
              href="/listings"
              className="flex items-center gap-0.5 text-sm font-bold text-blue-950 transition hover:text-blue-700"
            >
              Виж всички <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {listingsLoading ? (
            <>
              {/* Mobile skeleton — horizontal */}
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2 md:hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-[148px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm">
                    <div className="h-[110px] w-full animate-pulse bg-slate-200" />
                    <div className="space-y-2 p-2.5">
                      <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-200" />
                      <div className="h-3 w-3/5 animate-pulse rounded-full bg-slate-200" />
                      <div className="h-3 w-2/5 animate-pulse rounded-full bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop skeleton — grid */}
              <div className="mt-10 hidden gap-6 sm:grid-cols-2 md:grid xl:grid-cols-4">
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
            </>
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
            <>
              {/* Mobile — horizontal scroll mini cards */}
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2 md:hidden">
                {latestListings.map((listing, index) => {
                  const cardImage = listing.image_urls?.find(Boolean) ?? listing.image_url;
                  const ms = listing.created_at ? Date.now() - new Date(listing.created_at).getTime() : 0;
                  const timeLabel = ms < 3_600_000
                    ? `${Math.floor(ms / 60_000)} мин.`
                    : ms < 86_400_000
                      ? `${Math.floor(ms / 3_600_000)} ч.`
                      : `${Math.floor(ms / 86_400_000)} дн.`;
                  return (
                    <Link
                      key={listing.id ?? `m-${index}`}
                      href={`/listing/${listing.id}`}
                      className="w-[148px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition active:scale-[0.97]"
                    >
                      <div className="relative h-[110px]">
                        {cardImage ? (
                          <img src={cardImage} alt={listing.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-blue-950 text-3xl text-white">
                            {listing.category ? fallbackImageByCategory[listing.category] ?? "📦" : "📦"}
                          </div>
                        )}
                        <span className="absolute left-2 top-2 rounded-full bg-slate-950/60 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                          {timeLabel} назад
                        </span>
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(e, listing.id)}
                          aria-label="Любими"
                          className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow transition ${
                            favoriteIds.has(listing.id) ? "bg-red-500 text-white" : "bg-white/85 text-slate-400"
                          }`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${favoriteIds.has(listing.id) ? "fill-current" : ""}`} />
                        </button>
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-2 text-[12px] font-bold leading-tight text-slate-900">{listing.title}</p>
                        <p className="mt-1 text-sm font-black text-blue-950">{formatDualPrice(listing.price)}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{listing.city ?? "—"}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Desktop — card grid */}
              <div className="mt-10 hidden gap-6 sm:grid-cols-2 md:grid md:gap-6 xl:grid-cols-4">
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
            </>
          )}
        </section>

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <section className="px-5 pb-12 md:mx-auto md:max-w-7xl md:px-6">
            <h2 className="mb-5 text-xl font-black text-slate-900 md:text-2xl">Наскоро разгледани</h2>
            <div className="flex gap-5 overflow-x-auto pb-2">
              {recentlyViewed.map((item) => (
                <Link
                  key={item.id}
                  href={`/listing/${item.id}`}
                  className="group flex w-56 shrink-0 flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="h-36 w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-blue-950 text-4xl text-white">
                      {item.category ? fallbackImageByCategory[item.category] ?? "📦" : "📦"}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    <p className="line-clamp-2 text-sm font-black leading-snug text-slate-900">{item.title}</p>
                    <p className="mt-auto text-sm font-black text-blue-950">{formatDualPrice(item.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Популярни категории ──────────────────────────────────────── */}
        {(() => {
          const cats = [
            { icon: HomeIcon,    label: "Имоти" },
            { icon: Car,         label: "Автомобили" },
            { icon: Wrench,      label: "Авточасти" },
            { icon: Smartphone,  label: "Електроника" },
            { icon: Baby,        label: "Детски стоки" },
            { icon: Trees,       label: "Дом и градина" },
            { icon: Shirt,       label: "Мода" },
            { icon: Trophy,      label: "Спорт и хоби" },
            { icon: PawPrint,    label: "Животни" },
            { icon: Hammer,      label: "Услуги" },
            { icon: Briefcase,   label: "Работа" },
            { icon: BookOpen,    label: "Книги" },
          ];
          return (
            <section className="pb-6 md:pb-20">
              <div className="mx-auto max-w-7xl px-5 md:px-6">
                <div className="mb-4 flex items-center justify-between md:mb-8">
                  <h2 className="text-xl font-black text-slate-900 md:text-4xl">
                    Популярни категории
                  </h2>
                  <Link
                    href="/listings"
                    className="flex items-center gap-0.5 text-sm font-bold text-blue-950 transition hover:text-blue-700 md:hidden"
                  >
                    Виж всички <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Mobile — horizontal scroll, branded dark-blue circles */}
              <div className="flex gap-5 overflow-x-auto pb-4 pl-5 pr-5 md:hidden">
                {cats.map(({ icon: Icon, label }) => (
                  <Link
                    key={label}
                    href={`/listings?category=${encodeURIComponent(label)}`}
                    className="flex shrink-0 flex-col items-center gap-2 transition active:scale-95"
                  >
                    <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-gradient-to-br from-blue-800 to-blue-950 shadow-md shadow-blue-950/30 ring-1 ring-blue-700/40">
                      <Icon className="h-7 w-7 text-white" strokeWidth={1.8} />
                    </div>
                    <span className="w-[70px] text-center text-[11px] font-bold leading-tight text-slate-800">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Desktop — card grid */}
              <div className="mx-auto hidden max-w-7xl px-6 md:grid md:grid-cols-4 md:gap-5">
                {cats.map(({ icon: Icon, label }) => (
                  <Link
                    key={label}
                    href={`/listings?category=${encodeURIComponent(label)}`}
                    className="group rounded-2xl bg-white p-7 text-center shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:ring-blue-300 hover:shadow-lg"
                  >
                    <Icon className="mx-auto h-9 w-9 text-blue-950" />
                    <div className="mt-5 text-[20px] font-extrabold text-slate-950">{label}</div>
                    <div className="mt-1.5 text-sm font-semibold text-slate-500">
                      {categoryCounts[label] ?? 0} обяви
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}

      </div>
    </main>
  );
}
