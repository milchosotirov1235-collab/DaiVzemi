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
  Check,
  ChevronDown,
  ChevronRight,
  Hammer,
  Heart,
  Home as HomeIcon,
  LayoutList,
  MapPin,
  MessageSquare,
  PawPrint,
  Search,
  Shirt,
  Smartphone,
  Trophy,
  Trees,
  User,
  Wrench,
  X,
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

const POPULAR_CITIES = [
  "София", "Пловдив", "Варна", "Бургас",
  "Стара Загора", "Русе", "Плевен", "Велико Търново",
  "Добрич", "Шумен", "Хасково", "Сливен",
];

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

const TYPE_BADGE: Record<string, string> = {
  Подарявам: "bg-emerald-500",
  Търся: "bg-amber-500",
  Разменям: "bg-purple-500",
  Продавам: "bg-blue-600",
};

// ── Constellation hero graphic ────────────────────────────────────────────────

function ConstellationHero() {
  // Node positions across a 520×480 canvas — loosely Bulgaria-shaped cluster
  const nodes: [number, number, number][] = [
    // [x, y, pulse-delay]
    [ 80,  72, 0.0], [210,  40, 0.4], [355,  88, 0.8], [475,  52, 1.2],
    [510, 195, 1.6], [488, 348, 2.0], [398, 445, 2.4], [248, 418, 2.8],
    [105, 382, 3.2], [ 30, 248, 3.6], [155, 198, 0.2], [320, 248, 0.6],
    [448, 295, 1.0], [375, 148, 1.4], [218, 295, 1.8], [480, 175, 2.2],
    [145, 135, 2.6], [302, 362, 3.0], [438, 148, 3.4], [178, 338, 0.1],
    [270, 165, 0.5], [410, 390, 0.9],
  ];

  const edges: [number, number][] = [
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],
    [10,11],[11,12],[12,5],[11,13],[13,2],[14,7],[14,10],[15,4],[15,13],
    [16,0],[16,10],[17,6],[17,11],[18,3],[18,13],[19,8],[19,14],
    [20,1],[20,11],[20,13],[21,6],[21,12],
  ];

  return (
    <div
      className="pointer-events-none select-none"
      style={{ animation: "hero-float 8s ease-in-out infinite" }}
    >
      <svg
        viewBox="0 0 520 480"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
        aria-hidden="true"
      >
        <defs>
          <filter id="cg">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection lines */}
        {edges.map(([a, b], i) => {
          const [x1, y1] = nodes[a];
          const [x2, y2] = nodes[b];
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#93c5fd"
              strokeWidth="0.75"
              strokeOpacity="0.35"
              strokeDasharray="5 4"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="90"
                to="0"
                dur={`${9 + i * 0.25}s`}
                begin={`${(i * 0.18) % 4}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-opacity"
                values="0.2;0.5;0.2"
                dur={`${5 + i * 0.2}s`}
                begin={`${(i * 0.15) % 3}s`}
                repeatCount="indefinite"
              />
            </line>
          );
        })}

        {/* Nodes */}
        {nodes.map(([x, y, delay], i) => (
          <g key={i} filter="url(#cg)">
            {/* Outer pulse halo */}
            <circle cx={x} cy={y} r="9" fill="#3b82f6" fillOpacity="0.1">
              <animate
                attributeName="r"
                values="7;16;7"
                dur={`${3.5 + (delay * 0.6)}s`}
                begin={`${delay}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="fill-opacity"
                values="0.12;0.03;0.12"
                dur={`${3.5 + (delay * 0.6)}s`}
                begin={`${delay}s`}
                repeatCount="indefinite"
              />
            </circle>
            {/* Node dot */}
            <circle cx={x} cy={y} r="3" fill="#93c5fd" fillOpacity="0.85">
              <animate
                attributeName="r"
                values="2.5;4;2.5"
                dur={`${3.5 + (delay * 0.6)}s`}
                begin={`${delay}s`}
                repeatCount="indefinite"
              />
            </circle>
            {/* White hot center */}
            <circle cx={x} cy={y} r="1.2" fill="white" fillOpacity="0.9" />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [latestListings, setLatestListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [citySearch, setCitySearch] = useState("");
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

  const isLoggedIn = Boolean(userId);
  const totalCount = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  const cats = [
    { icon: HomeIcon,   label: "Имоти" },
    { icon: Car,        label: "Автомобили" },
    { icon: Wrench,     label: "Авточасти" },
    { icon: Smartphone, label: "Електроника" },
    { icon: Baby,       label: "Детски стоки" },
    { icon: Trees,      label: "Дом и градина" },
    { icon: Shirt,      label: "Мода" },
    { icon: Trophy,     label: "Спорт и хоби" },
    { icon: PawPrint,   label: "Животни" },
    { icon: Hammer,     label: "Услуги" },
    { icon: Briefcase,  label: "Работа" },
    { icon: BookOpen,   label: "Книги" },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white">

        {/* Mobile hero */}
        <div className="px-5 pb-12 pt-8 lg:hidden">
          <div className="text-center">
            <h1 className="text-4xl font-black sm:text-5xl">Дай. Вземи. Продай.</h1>
            <p className="mt-2 text-sm text-blue-200 sm:text-base">
              Безплатни обяви за цяла България.
            </p>
          </div>

          {/* Search */}
          <div className="mx-auto mt-5 max-w-lg">
            <div className="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-white/20">
              <Search className="ml-2.5 h-5 w-5 shrink-0 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                placeholder="Какво търсите?"
                className="flex-1 bg-transparent py-3 text-base font-bold text-slate-950 caret-blue-950 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-xl bg-blue-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-900"
              >
                Търси
              </button>
            </div>

            {/* City picker trigger */}
            <button
              type="button"
              onClick={() => { setShowCityPicker(true); setCitySearch(""); }}
              className="mt-2.5 flex w-full items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-left transition active:bg-white/20"
            >
              <MapPin className="h-4 w-4 shrink-0 text-blue-300" />
              <span className="flex-1 text-sm font-semibold text-white">
                {locationCity || "Цяла България"}
              </span>
              <ChevronDown className="h-4 w-4 text-blue-300" />
            </button>
          </div>

          {/* Popular chips */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {(Object.keys(categoryCounts).length > 0
              ? Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cat]) => cat)
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

        {/* Desktop hero — two columns */}
        <div className="mx-auto hidden max-w-7xl items-center gap-10 px-6 py-14 lg:grid lg:grid-cols-[1fr_1fr] xl:gap-16 xl:py-16">
          {/* Left: headline + action pills + compact feature list */}
          <div>
            <h1 className="text-5xl font-black leading-tight text-white xl:text-6xl">
              Дай.<br />Вземи.<br />Продай.
            </h1>
            <p className="mt-4 text-lg text-blue-200">
              Безплатни обяви за цяла България.
            </p>
            {totalCount > 0 && (
              <p className="mt-1.5 text-sm font-semibold text-blue-300">
                {totalCount.toLocaleString("bg-BG")} активни обяви в момента
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-2.5">
              {(["Продавам", "Подарявам", "Разменям", "Търся"] as const).map((type) => (
                <Link
                  key={type}
                  href={`/listings?type=${encodeURIComponent(type)}`}
                  className="rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  {type}
                </Link>
              ))}
            </div>
            <div className="mt-7 space-y-2.5">
              {[
                { emoji: "🆓", label: "Публикувай безплатно" },
                { emoji: "🔒", label: "Сигурност и доверие" },
                { emoji: "📱", label: "Мобилно навсякъде" },
              ].map(({ emoji, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <span className="text-base leading-none">{emoji}</span>
                  <span className="text-sm font-semibold text-blue-200">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: constellation graphic */}
          <div className="flex items-center justify-center opacity-80">
            <ConstellationHero />
          </div>
        </div>
      </section>

      {/* ── Content area ─────────────────────────────────────────────────── */}
      <div className="-mt-5 rounded-t-[32px] bg-slate-50 pt-5 lg:mt-0 lg:rounded-none lg:pt-0">
        <div className="mx-auto max-w-7xl lg:px-6">
          <div className="lg:grid lg:grid-cols-[1fr_300px] lg:items-start lg:gap-8 lg:py-10">

            {/* ── Main column ─────────────────────────────────────────────── */}
            <div className="min-w-0">

              {/* Action grid */}
              <section className="px-5 py-5 lg:px-0 lg:pt-0">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
                  {([
                    ["💰", "Продавам",  "Нов и употребяван", "Продавам"],
                    ["🎁", "Подарявам", "Дай на някого",      "Подарявам"],
                    ["🔄", "Разменям",  "Размяна на стоки",   "Разменям"],
                    ["🔍", "Търся",     "Търся дадена вещ",   "Търся"],
                  ] as [string, string, string, string][]).map(([icon, title, sub, type]) => (
                    <Link
                      key={title}
                      href={`/listings?type=${encodeURIComponent(type)}`}
                      className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-blue-100 transition-all duration-200 active:scale-[0.97] hover:-translate-y-[2px] hover:shadow-lg hover:shadow-blue-100/60 hover:ring-blue-200 lg:rounded-[18px] lg:p-7 lg:shadow-md"
                    >
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-950/5 text-2xl">
                        {icon}
                      </div>
                      <h3 className="mt-3 text-sm font-black text-blue-950 lg:text-base">{title}</h3>
                      <p className="mt-0.5 text-[11px] text-slate-500 lg:hidden">{sub}</p>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Нови обяви */}
              <section className="px-5 pb-6 lg:px-0 lg:pb-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-900 lg:text-2xl">Нови обяви</h2>
                  <Link href="/listings" className="flex items-center gap-0.5 text-sm font-bold text-blue-950 transition hover:text-blue-700">
                    Виж всички <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                {listingsLoading ? (
                  <>
                    {/* Mobile skeleton */}
                    <div className="mt-4 flex gap-3 overflow-x-auto pb-2 lg:hidden">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="w-[148px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm">
                          <div className="h-[110px] w-full animate-pulse bg-slate-200" />
                          <div className="space-y-2 p-2.5">
                            <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-200" />
                            <div className="h-3 w-3/5 animate-pulse rounded-full bg-slate-200" />
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop skeleton */}
                    <div className="mt-4 hidden space-y-3 lg:block">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex gap-5 rounded-[18px] bg-white p-4 ring-1 ring-slate-200">
                          <div className="h-[152px] w-[152px] animate-pulse rounded-[14px] bg-slate-200" />
                          <div className="flex flex-1 flex-col justify-center space-y-2.5 py-2">
                            <div className="h-4 w-3/5 animate-pulse rounded-full bg-slate-200" />
                            <div className="h-5 w-2/5 animate-pulse rounded-full bg-slate-200" />
                            <div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-200" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : latestListings.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-14 text-center shadow-sm">
                    <p className="text-xl font-black text-slate-900">Все още няма обяви</p>
                    <p className="mt-2 text-sm text-slate-600">Бъдете първи — публикувайте безплатна обява сега.</p>
                    <Link href="/publish" className="mt-5 inline-flex items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-900">
                      Публикувай обява
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Mobile — horizontal scroll */}
                    <div className="mt-4 flex gap-3 overflow-x-auto pb-2 lg:hidden">
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
                                  {fallbackImageByCategory[listing.category ?? ""] ?? "📦"}
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

                    {/* Desktop — horizontal list cards */}
                    <div className="mt-4 hidden space-y-3 lg:block">
                      {latestListings.map((listing, index) => {
                        const cardImage = listing.image_urls?.find(Boolean) ?? listing.image_url;
                        const isNew = !!listing.created_at && (Date.now() - new Date(listing.created_at).getTime()) < 86_400_000;
                        const badgeClass = TYPE_BADGE[listing.listing_type ?? ""] ?? "bg-blue-600";
                        return (
                          <article
                            key={listing.id ?? `d-${index}`}
                            className="group overflow-hidden rounded-[18px] bg-white shadow-sm ring-1 ring-slate-200 transition-all duration-200 hover:-translate-y-[3px] hover:shadow-lg hover:shadow-blue-100/60 hover:ring-blue-200"
                          >
                            <Link href={`/listing/${listing.id}`} className="flex gap-5 p-4">
                              {/* Thumbnail — ~150×150 */}
                              <div className="relative h-[152px] w-[152px] shrink-0 overflow-hidden rounded-[14px]">
                                {cardImage ? (
                                  <img
                                    src={cardImage}
                                    alt={listing.title}
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.06]"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-blue-950 text-3xl text-white">
                                    {fallbackImageByCategory[listing.category ?? ""] ?? "📦"}
                                  </div>
                                )}
                                {isNew ? (
                                  <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
                                    Нов
                                  </span>
                                ) : (
                                  <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-black text-white shadow-sm ${badgeClass}`}>
                                    {listing.listing_type ?? "Обява"}
                                  </span>
                                )}
                                {(listing.image_urls?.filter(Boolean).length ?? 0) > 1 && (
                                  <span className="absolute bottom-2 left-2 flex items-center gap-0.5 rounded-full bg-slate-950/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                                    <Camera className="h-2.5 w-2.5" />
                                    {listing.image_urls!.filter(Boolean).length}
                                  </span>
                                )}
                              </div>

                              {/* Content — more breathing room */}
                              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                                <h3 className="line-clamp-2 text-[15px] font-black leading-snug text-slate-900">{listing.title}</h3>
                                <p className="text-lg font-extrabold text-blue-950">{formatDualPrice(listing.price)}</p>
                                <p className="text-xs font-medium text-slate-400">
                                  {listing.city ?? "—"}
                                  {listing.category ? ` · ${listing.category}` : ""}
                                </p>
                              </div>

                              {/* Favorite */}
                              <button
                                type="button"
                                onClick={(e) => toggleFavorite(e, listing.id)}
                                aria-label={favoriteIds.has(listing.id) ? "Премахни от любими" : "Добави в любими"}
                                className={`shrink-0 self-center rounded-full p-2.5 transition-all duration-150 ${
                                  favoriteIds.has(listing.id)
                                    ? "bg-red-500 text-white shadow-sm"
                                    : "text-slate-300 hover:bg-red-50 hover:text-red-400"
                                }`}
                              >
                                <Heart className={`h-4 w-4 ${favoriteIds.has(listing.id) ? "fill-current" : ""}`} />
                              </button>
                            </Link>
                          </article>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>

              {/* Feature strip — desktop only */}
              <section className="hidden px-0 pb-8 lg:block">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { emoji: "🆓", title: "Публикувай безплатно", desc: "Продай, подари или размени без никакви такси. Напълно безплатно за всички." },
                    { emoji: "🔒", title: "Сигурност и доверие",  desc: "Верифицирани профили, защитена комуникация и надеждни транзакции." },
                    { emoji: "📱", title: "Мобилно навсякъде",    desc: "iOS, Android и уеб. Управлявай обявите от всяко устройство." },
                  ].map(({ emoji, title, desc }) => (
                    <div key={title} className="rounded-2xl bg-blue-950 p-5 text-white">
                      <span className="text-2xl">{emoji}</span>
                      <h3 className="mt-3 text-sm font-black text-white">{title}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-blue-200">{desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recently Viewed — mobile only (desktop version is in sidebar) */}
              {recentlyViewed.length > 0 && (
                <section className="px-5 pb-10 lg:hidden">
                  <h2 className="mb-4 text-xl font-black text-slate-900">Наскоро разгледани</h2>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {recentlyViewed.map((item) => (
                      <Link
                        key={item.id}
                        href={`/listing/${item.id}`}
                        className="group flex w-48 shrink-0 flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                      >
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.title} className="h-32 w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                        ) : (
                          <div className="flex h-32 items-center justify-center bg-blue-950 text-4xl text-white">
                            {fallbackImageByCategory[item.category ?? ""] ?? "📦"}
                          </div>
                        )}
                        <div className="flex flex-1 flex-col gap-1 p-3">
                          <p className="line-clamp-2 text-xs font-black leading-snug text-slate-900">{item.title}</p>
                          <p className="mt-auto text-sm font-black text-blue-950">{formatDualPrice(item.price)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Категории */}
              <section className="pb-8 lg:pb-10">
                <div className="px-5 lg:px-0">
                  <div className="mb-4 flex items-center justify-between lg:mb-6">
                    <h2 className="text-xl font-black text-slate-900 lg:text-2xl">Популярни категории</h2>
                    <Link href="/listings" className="flex items-center gap-0.5 text-sm font-bold text-blue-950 transition hover:text-blue-700 lg:hidden">
                      Виж всички <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {/* Mobile — horizontal scroll */}
                <div className="flex gap-5 overflow-x-auto pb-4 pl-5 pr-5 lg:hidden">
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
                <div className="hidden px-0 lg:grid lg:grid-cols-4 lg:gap-4">
                  {cats.map(({ icon: Icon, label }) => (
                    <Link
                      key={label}
                      href={`/listings?category=${encodeURIComponent(label)}`}
                      className="group rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-blue-300 hover:shadow-md"
                    >
                      <Icon className="mx-auto h-8 w-8 text-blue-950" />
                      <div className="mt-3 text-sm font-extrabold text-slate-950">{label}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {categoryCounts[label] ?? 0} обяви
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>

            {/* ── Sidebar — desktop only ─────────────────────────────────── */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-4">

                {/* Publish CTA */}
                <div className="overflow-hidden rounded-2xl bg-blue-950 p-5 text-white shadow-lg">
                  <p className="text-base font-black">Публикувай обява</p>
                  <p className="mt-1 text-sm text-blue-200">Безплатно, бързо и лесно.</p>
                  <Link
                    href="/publish"
                    className="mt-4 block rounded-xl bg-white px-4 py-2.5 text-center text-sm font-black text-blue-950 transition hover:bg-blue-50"
                  >
                    + Публикувай сега
                  </Link>
                </div>

                {/* Recently viewed (desktop) */}
                {recentlyViewed.length > 0 && (
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <p className="mb-3 text-sm font-black text-slate-900">Наскоро разгледани</p>
                    <div className="space-y-2">
                      {recentlyViewed.slice(0, 3).map((item) => (
                        <Link
                          key={item.id}
                          href={`/listing/${item.id}`}
                          className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50"
                        >
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-950 text-xl text-white">
                              {fallbackImageByCategory[item.category ?? ""] ?? "📦"}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-900">{item.title}</p>
                            <p className="text-xs font-black text-blue-950">{formatDualPrice(item.price)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick actions */}
                {isLoggedIn && (
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <p className="mb-3 text-sm font-black text-slate-900">Бързи действия</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { href: "/my-listings", label: "Моите обяви", icon: LayoutList },
                        { href: "/favorites",   label: "Любими",       icon: Heart },
                        { href: "/messages",    label: "Съобщения",    icon: MessageSquare },
                        { href: "/profile",     label: "Профил",       icon: User },
                      ].map(({ href, label, icon: Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 p-3 text-center transition hover:bg-blue-50"
                        >
                          <Icon className="h-5 w-5 text-blue-950" strokeWidth={1.8} />
                          <span className="text-[11px] font-bold text-slate-700">{label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mobile app CTA */}
                <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950 to-blue-800 p-5 text-white">
                  <p className="text-sm font-black">📱 Мобилно приложение</p>
                  <p className="mt-1 text-xs text-blue-200">
                    Управлявай обявите си от всяко устройство
                  </p>
                  <div className="mt-3 flex gap-2">
                    <div className="flex items-center gap-1.5 rounded-xl bg-black/50 px-3 py-2 text-[11px] font-bold text-white ring-1 ring-white/10">
                      🍎 App Store
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl bg-black/50 px-3 py-2 text-[11px] font-bold text-white ring-1 ring-white/10">
                      ▶ Google Play
                    </div>
                  </div>
                </div>

              </div>
            </aside>

          </div>
        </div>
      </div>

      {/* ── City picker bottom sheet — mobile only ────────────────────── */}
      {showCityPicker && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCityPicker(false)}
          />
          <div className="relative flex max-h-[82vh] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl">
            <div className="flex justify-center pt-3">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 pt-3">
              <p className="text-base font-black text-slate-900">Избери град</p>
              <button
                type="button"
                onClick={() => setShowCityPicker(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition active:bg-slate-100"
                aria-label="Затвори"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-slate-100 px-4 pb-3">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200 focus-within:ring-blue-950/20">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Търси град..."
                  autoFocus
                  className="flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                />
                {citySearch && (
                  <button type="button" onClick={() => setCitySearch("")} className="text-slate-400 transition active:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <button
                type="button"
                onClick={() => { setLocationCity(""); setShowCityPicker(false); }}
                className="flex w-full items-center justify-between px-5 py-3.5 transition active:bg-slate-50"
              >
                <span className={`text-sm font-semibold ${locationCity === "" ? "font-black text-blue-950" : "text-slate-700"}`}>
                  🇧🇬 Цяла България
                </span>
                {locationCity === "" && <Check className="h-4 w-4 text-blue-950" />}
              </button>

              {citySearch.trim() ? (
                <div>
                  {BG_CITIES.filter((c) =>
                    c.toLowerCase().includes(citySearch.toLowerCase())
                  ).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setLocationCity(c); setShowCityPicker(false); }}
                      className="flex w-full items-center justify-between px-5 py-3.5 transition active:bg-slate-50"
                    >
                      <span className={`text-sm font-semibold ${locationCity === c ? "font-black text-blue-950" : "text-slate-700"}`}>
                        {c}
                      </span>
                      {locationCity === c && <Check className="h-4 w-4 text-blue-950" />}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Популярни</p>
                    <div className="grid grid-cols-3 gap-2">
                      {POPULAR_CITIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { setLocationCity(c); setShowCityPicker(false); }}
                          className={`rounded-2xl py-2.5 text-sm font-bold transition active:scale-95 ${
                            locationCity === c ? "bg-blue-950 text-white" : "bg-slate-100 text-slate-700 active:bg-slate-200"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-slate-100">
                    <p className="px-5 pb-2 pt-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Всички градове</p>
                    {BG_CITIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setLocationCity(c); setShowCityPicker(false); }}
                        className="flex w-full items-center justify-between px-5 py-3.5 transition active:bg-slate-50"
                      >
                        <span className={`text-sm font-semibold ${locationCity === c ? "font-black text-blue-950" : "text-slate-700"}`}>
                          {c}
                        </span>
                        {locationCity === c && <Check className="h-4 w-4 text-blue-950" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
