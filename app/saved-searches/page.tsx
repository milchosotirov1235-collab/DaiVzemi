"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { BookMarked, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type SavedSearch = {
  id: string;
  title: string;
  category: string | null;
  listing_type: string | null;
  city: string | null;
  search: string | null;
  filters: Record<string, string> | null;
  created_at: string;
};

const FILTER_LABELS: Record<string, string> = {
  minPrice: "от",
  maxPrice: "до",
  propertyPurpose: "",
  propertyType: "",
  rooms: "",
  floor: "ет.",
  sqmMin: "от кв.м.",
  sqmMax: "до кв.м.",
  furnished: "",
  heating: "",
  constructionType: "",
  propertyCondition: "",
  elevator: "асансьор",
  parking: "",
  vehicleType: "",
  carMake: "",
  carModel: "",
  yearFrom: "от г.",
  yearTo: "до г.",
  fuel: "",
  transmission: "",
  mileageFrom: "от км",
  mileageTo: "до км",
  condition: "",
  jobCategory: "",
  employmentType: "",
  experience: "",
  remote: "",
  salaryFrom: "от лв.",
  salaryTo: "до лв.",
};

function formatFilterChip(key: string, value: string): string {
  const suffix = FILTER_LABELS[key];
  if (suffix === undefined) return value;
  if (suffix === "") return value;
  return `${value} ${suffix}`;
}

function buildSearchUrl(row: SavedSearch): string {
  const params = new URLSearchParams();
  if (row.search) params.set("search", row.search);
  if (row.city) params.set("city", row.city);
  if (row.category) params.set("category", row.category);
  if (row.listing_type) params.set("type", row.listing_type);
  for (const [key, value] of Object.entries(row.filters ?? {})) {
    if (value) params.set(key, value);
  }
  return `/listings${params.toString() ? `?${params.toString()}` : ""}`;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("bg-BG", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(dateStr));
}

function SearchCard({ s, onDelete, deleting }: { s: SavedSearch; onDelete: () => void; deleting: boolean }) {
  const url = buildSearchUrl(s);

  const primaryChips = [
    s.category && { label: s.category, cls: "bg-blue-50 text-blue-800" },
    s.listing_type && { label: s.listing_type, cls: "bg-slate-100 text-slate-700" },
    s.city && { label: s.city, cls: "bg-slate-100 text-slate-700" },
    s.search && { label: `„${s.search}"`, cls: "bg-slate-100 text-slate-700" },
  ].filter(Boolean) as { label: string; cls: string }[];

  const extraFilters = Object.entries(s.filters ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => formatFilterChip(k, v));

  return (
    <article className="flex flex-col rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-950 text-white">
            <Search className="h-4 w-4" />
          </div>
          <h3 className="truncate text-base font-black leading-tight text-slate-900">{s.title}</h3>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          title="Изтрий"
        >
          {deleting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Primary chips */}
      {primaryChips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {primaryChips.map((chip, i) => (
            <span key={i} className={`rounded-full px-3 py-1 text-xs font-bold ${chip.cls}`}>
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {/* Extra filter chips */}
      {extraFilters.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <SlidersHorizontal className="h-3 w-3 shrink-0 text-slate-400" />
          {extraFilters.slice(0, 4).map((f, i) => (
            <span key={i} className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
              {f}
            </span>
          ))}
          {extraFilters.length > 4 && (
            <span className="text-xs font-semibold text-slate-400">+{extraFilters.length - 4}</span>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-400">{formatDate(s.created_at)}</p>
        <Link
          href={url}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-900"
        >
          <Search className="h-3.5 w-3.5" />
          Отвори
        </Link>
      </div>
    </article>
  );
}

export default function SavedSearchesPage() {
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;
      if (!user) { router.push("/login?redirect=/saved-searches"); return; }

      const { data } = await supabase
        .from("saved_searches")
        .select("id, title, category, listing_type, city, search, filters, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setSearches((data as SavedSearch[]) ?? []);
      setLoading(false);
    };
    load();
  }, [router]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await supabase.from("saved_searches").delete().eq("id", id);
    setSearches((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black">Запазени търсения</h1>
          <p className="mt-4 text-blue-100">Бързо отваряйте любимите си търсения с един клик.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200 shrink-0" />
                  <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-9 w-24 animate-pulse rounded-2xl bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : searches.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-16 text-center shadow-sm ring-1 ring-slate-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-950 text-white shadow-lg">
              <BookMarked className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-2xl font-black text-slate-900">Нямате запазени търсения</h2>
            <p className="mt-3 max-w-sm text-base font-semibold text-slate-500">
              Отидете в обявите, приложете филтри и натиснете „Запази търсенето".
            </p>
            <Link
              href="/listings"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-900"
            >
              <Search className="h-4 w-4" />
              Разгледай обяви
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {searches.map((s) => (
                <SearchCard
                  key={s.id}
                  s={s}
                  onDelete={() => handleDelete(s.id)}
                  deleting={deletingId === s.id}
                />
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-slate-400">{searches.length} запазени търсения</p>
          </>
        )}
      </section>
    </main>
  );
}
