"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { BookMarked, Loader2, Search, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SavedSearch = {
  id: string;
  title: string;
  category: string | null;
  listing_type: string | null;
  city: string | null;
  search: string | null;
  filters: Record<string, string>;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SavedSearchesPage() {
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;

      if (!user) {
        router.push("/login?redirect=/saved-searches");
        return;
      }

      const { data, error } = await supabase
        .from("saved_searches")
        .select("id, title, category, listing_type, city, search, filters, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) setSearches(data as SavedSearch[]);
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
          <div className="flex items-center justify-center rounded-3xl bg-white p-12 shadow-sm ring-1 ring-slate-200">
            <Loader2 className="h-6 w-6 animate-spin text-blue-950" />
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
          <div className="grid gap-4 sm:grid-cols-2">
            {searches.map((s) => (
              <div
                key={s.id}
                className="flex flex-col rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-950 text-white">
                      <Search className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">{s.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Изтрий"
                  >
                    {deletingId === s.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Tags */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {s.category && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {s.category}
                    </span>
                  )}
                  {s.listing_type && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {s.listing_type}
                    </span>
                  )}
                  {s.city && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {s.city}
                    </span>
                  )}
                  {s.search && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-950">
                      „{s.search}"
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">
                    {formatDate(s.created_at)}
                  </p>
                  <Link
                    href={buildSearchUrl(s)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-900"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Отвори търсенето
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
