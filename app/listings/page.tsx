"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Listing = {
  id: string;
  title: string;
  description?: string | null;
  price: string | number | null;
  city: string | null;
  category: string | null;
  listing_type: string | null;
  created_at: string | null;
  image_url: string | null;
  image_urls: string[] | null;
};

const categories = [
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

const listingTypes = ["Продавам", "Подарявам", "Разменям", "Търся"];

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

function CustomDropdown({
  value,
  placeholder,
  options,
  isOpen,
  onToggle,
  onSelect,
}: {
  value: string;
  placeholder: string;
  options: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-950 shadow-sm outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
      >
        <span>{value || placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 text-blue-950 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[110%] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
          <button
            type="button"
            onClick={() => onSelect("")}
            className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            {placeholder}
          </button>

          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-950 transition hover:bg-slate-100"
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const formatPrice = (value: string | number | null) => {
  if (value === null || value === undefined || value === "") return "По договаряне";

  const formatted = String(value).trim();
  if (/€|EUR|\$|USD|лв|BGN/i.test(formatted)) return formatted;

  return `${formatted} €`;
};

const getNumericPrice = (value: string | number | null) => {
  if (value === null || value === undefined) return null;

  const cleaned = String(value).replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
};

const formatDate = (value: string | null) => {
  if (!value) return "Няма дата";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Няма дата";

  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

function ListingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [cityInput, setCityInput] = useState(searchParams.get("city") ?? "");
  const [categoryInput, setCategoryInput] = useState(searchParams.get("category") ?? "");
  const [typeInput, setTypeInput] = useState(searchParams.get("type") ?? "");
  const [minPriceInput, setMinPriceInput] = useState(searchParams.get("minPrice") ?? "");
  const [maxPriceInput, setMaxPriceInput] = useState(searchParams.get("maxPrice") ?? "");

  const [openDropdown, setOpenDropdown] = useState<"category" | "type" | null>(null);

  const search = searchParams.get("search") ?? "";
  const city = searchParams.get("city") ?? "";
  const category = searchParams.get("category") ?? "";
  const type = searchParams.get("type") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";

  const hasFilters =
    search.trim().length > 0 ||
    city.trim().length > 0 ||
    category.trim().length > 0 ||
    type.trim().length > 0 ||
    minPrice.trim().length > 0 ||
    maxPrice.trim().length > 0;

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (searchInput.trim()) params.set("search", searchInput.trim());
    if (cityInput.trim()) params.set("city", cityInput.trim());
    if (categoryInput.trim()) params.set("category", categoryInput.trim());
    if (typeInput.trim()) params.set("type", typeInput.trim());
    if (minPriceInput.trim()) params.set("minPrice", minPriceInput.trim());
    if (maxPriceInput.trim()) params.set("maxPrice", maxPriceInput.trim());

    router.push(`/listings${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const clearFilters = () => {
    setSearchInput("");
    setCityInput("");
    setCategoryInput("");
    setTypeInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setOpenDropdown(null);
    router.push("/listings");
  };

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true);

      let query = supabase
        .from("listings")
        .select(
          "id, title, description, price, city, category, listing_type, created_at, image_url, image_urls"
        )
        .order("created_at", { ascending: false });

      if (search.trim()) {
        const searchValue = `%${search.trim()}%`;
        query = query.or(`title.ilike.${searchValue},description.ilike.${searchValue}`);
      }

      if (city.trim()) query = query.ilike("city", `%${city.trim()}%`);
      if (category.trim()) query = query.eq("category", category.trim());
      if (type.trim()) query = query.eq("listing_type", type.trim());

      const { data, error } = await query;

      if (error || !data) {
        setListings([]);
        setLoading(false);
        return;
      }

      const filteredByPrice = data.filter((listing) => {
        const numericPrice = getNumericPrice(listing.price);

        if (minPrice.trim()) {
          const min = Number(minPrice.replace(",", "."));
          if (Number.isFinite(min) && (numericPrice === null || numericPrice < min)) return false;
        }

        if (maxPrice.trim()) {
          const max = Number(maxPrice.replace(",", "."));
          if (Number.isFinite(max) && (numericPrice === null || numericPrice > max)) return false;
        }

        return true;
      });

      setListings(filteredByPrice as Listing[]);
      setLoading(false);
    };

    loadListings();
  }, [search, city, category, type, minPrice, maxPrice]);

  return (
    <main className="min-h-screen bg-slate-50" onClick={() => setOpenDropdown(null)}>
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">
            DaiVzemi
          </p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            {hasFilters ? "Резултати от търсенето" : "Всички обяви"}
          </h1>
          <p className="mt-4 text-base text-blue-100 md:text-lg">
            {hasFilters
              ? "Покажи резултатите според избраните критерии."
              : "Разгледайте най-новите обяви в DaiVzemi."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-4 lg:grid-cols-6">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Търси обява"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10 lg:col-span-2"
            />

            <input
              value={cityInput}
              onChange={(event) => setCityInput(event.target.value)}
              placeholder="Град"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
            />

            <CustomDropdown
              value={categoryInput}
              placeholder="Всички категории"
              options={categories}
              isOpen={openDropdown === "category"}
              onToggle={() =>
                setOpenDropdown(openDropdown === "category" ? null : "category")
              }
              onSelect={(value) => {
                setCategoryInput(value);
                setOpenDropdown(null);
              }}
            />

            <CustomDropdown
              value={typeInput}
              placeholder="Всички типове"
              options={listingTypes}
              isOpen={openDropdown === "type"}
              onToggle={() => setOpenDropdown(openDropdown === "type" ? null : "type")}
              onSelect={(value) => {
                setTypeInput(value);
                setOpenDropdown(null);
              }}
            />

            <button
              type="button"
              onClick={applyFilters}
              className="rounded-2xl bg-blue-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-900"
            >
              Филтрирай
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={minPriceInput}
              onChange={(event) => setMinPriceInput(event.target.value)}
              placeholder="Цена от"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
            />

            <input
              value={maxPriceInput}
              onChange={(event) => setMaxPriceInput(event.target.value)}
              placeholder="Цена до"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
            />

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 lg:col-span-2"
            >
              Изчисти филтрите
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12">
        {loading ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-base font-semibold text-slate-600">Зареждане...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-xl font-black text-slate-900">
              Няма намерени обяви по това търсене.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => {
              const cardImage = listing.image_urls?.find(Boolean) ?? listing.image_url;

              return (
                <article
                  key={listing.id}
                  className="group cursor-pointer overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <Link href={`/listing/${listing.id}`} className="block">
                    {cardImage ? (
                      <img
                        src={cardImage}
                        alt={listing.title}
                        className="h-52 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-52 items-center justify-center bg-blue-950 text-5xl text-white transition duration-300 group-hover:bg-blue-900">
                        {listing.category
                          ? fallbackImageByCategory[listing.category] ?? "📦"
                          : "📦"}
                      </div>
                    )}

                    <div className="space-y-4 p-6">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-950">
                        {listing.listing_type ?? "Обява"}
                      </span>

                      <div>
                        <h2 className="text-2xl font-black text-slate-950">
                          {listing.title}
                        </h2>
                        <p className="mt-2 text-2xl font-black text-blue-950">
                          {formatPrice(listing.price)}
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

                      <p className="text-sm text-slate-500">
                        {formatDate(listing.created_at)}
                      </p>
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

export default function ListingsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50">
          <Header />
          <div className="flex min-h-[40vh] items-center justify-center">
            <p className="text-base font-semibold text-slate-600">Зареждане...</p>
          </div>
        </main>
      }
    >
      <ListingsPageContent />
    </Suspense>
  );
}