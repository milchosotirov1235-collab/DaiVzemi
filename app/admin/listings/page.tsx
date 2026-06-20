"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminListing = {
  id: number;
  title: string;
  category: string | null;
  city: string | null;
  user_id: string | null;
  created_at: string | null;
  expires_at: string | null;
  hidden: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (v: string | null) => {
  if (!v) return "—";
  return new Intl.DateTimeFormat("bg-BG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v));
};

const shortId = (id: string | null) =>
  id ? id.slice(0, 8) + "…" : "—";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminListings() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("id, title, category, city, user_id, created_at, expires_at, hidden")
      .order("created_at", { ascending: false })
      .limit(200);
    setListings((data as AdminListing[]) ?? []);
    setLoading(false);
  };

  const toggleHidden = async (listing: AdminListing) => {
    setActionId(listing.id);
    const { error } = await supabase
      .from("listings")
      .update({ hidden: !listing.hidden })
      .eq("id", listing.id);
    if (!error) {
      setListings((prev) =>
        prev.map((l) => (l.id === listing.id ? { ...l, hidden: !l.hidden } : l))
      );
    }
    setActionId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Обяви</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {loading ? "Зареждане…" : `${listings.length} обяви (последните 200)`}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-950" />
          </div>
        ) : listings.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Няма обяви.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Заглавие</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Категория</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Град</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Потребител</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Дата</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Изтича</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Статус</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listings.map((l) => (
                  <tr key={l.id} className={`transition hover:bg-slate-50 ${l.hidden ? "opacity-50" : ""}`}>
                    <td className="max-w-[200px] px-5 py-3.5">
                      <Link
                        href={`/listing/${l.id}`}
                        target="_blank"
                        className="block truncate font-semibold text-blue-950 hover:underline"
                      >
                        {l.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{l.category ?? "—"}</td>
                    <td className="px-4 py-3.5 text-slate-600">{l.city ?? "—"}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-400">{shortId(l.user_id)}</td>
                    <td className="px-4 py-3.5 text-slate-500">{formatDate(l.created_at)}</td>
                    <td className="px-4 py-3.5">
                      {l.expires_at ? (
                        <span className={new Date(l.expires_at) < new Date() ? "font-semibold text-red-600" : "text-slate-500"}>
                          {formatDate(l.expires_at)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {l.hidden ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-600 ring-1 ring-red-200">
                          Скрита
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">
                          Активна
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => toggleHidden(l)}
                        disabled={actionId === l.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-blue-950 hover:text-blue-950 disabled:opacity-50"
                      >
                        {actionId === l.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : l.hidden ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                        {l.hidden ? "Покажи" : "Скрий"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
