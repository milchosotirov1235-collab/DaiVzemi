"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ModerationStatus = "pending" | "approved" | "rejected" | null;

type AdminListing = {
  id: number;
  title: string;
  category: string | null;
  city: string | null;
  user_id: string | null;
  created_at: string | null;
  expires_at: string | null;
  hidden: boolean;
  moderation_status: ModerationStatus;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (v: string | null) => {
  if (!v) return "—";
  return new Intl.DateTimeFormat("bg-BG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v));
};

const shortId = (id: string | null) => (id ? id.slice(0, 8) + "…" : "—");

function ModerationBadge({ status }: { status: ModerationStatus }) {
  if (status === "approved") return <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">Одобрена</span>;
  if (status === "rejected") return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-600 ring-1 ring-red-200">Отхвърлена</span>;
  if (status === "pending")  return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">Очаква</span>;
  return <span className="text-xs text-slate-400">—</span>;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

type ModerationFilter = "all" | "pending" | "approved" | "rejected";
type HiddenFilter = "all" | "visible" | "hidden";
type ExpiryFilter = "all" | "active" | "expired";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminListings() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const [modFilter, setModFilter] = useState<ModerationFilter>("all");
  const [hidFilter, setHidFilter] = useState<HiddenFilter>("all");
  const [expFilter, setExpFilter] = useState<ExpiryFilter>("all");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("id, title, category, city, user_id, created_at, expires_at, hidden, moderation_status")
      .order("created_at", { ascending: false })
      .limit(300);
    setListings((data as AdminListing[]) ?? []);
    setLoading(false);
  };

  const toggleHidden = async (listing: AdminListing) => {
    setActionId(listing.id);
    const { error } = await supabase.from("listings").update({ hidden: !listing.hidden }).eq("id", listing.id);
    if (!error) setListings((prev) => prev.map((l) => l.id === listing.id ? { ...l, hidden: !l.hidden } : l));
    setActionId(null);
  };

  const setModeration = async (listing: AdminListing, status: ModerationStatus) => {
    setActionId(listing.id);
    const { error } = await supabase
      .from("listings")
      .update({ moderation_status: status })
      .eq("id", listing.id);

    if (!error) {
      setListings((prev) =>
        prev.map((l) => l.id === listing.id ? { ...l, moderation_status: status } : l)
      );
      // Notify the seller about the moderation decision
      if (listing.user_id && (status === "approved" || status === "rejected")) {
        const messageText =
          status === "approved"
            ? `Обявата Ви "${listing.title}" беше одобрена и е вече видима публично.`
            : `Обявата Ви "${listing.title}" беше отхвърлена от модераторите.`;
        await supabase.from("notifications").insert({
          user_id: listing.user_id,
          type: "listing_moderated",
          message: messageText,
          listing_id: listing.id,
          read: false,
        });
      }
    }
    setActionId(null);
  };

  // Client-side filters
  const now = new Date();
  const visible = listings.filter((l) => {
    if (modFilter !== "all" && l.moderation_status !== modFilter) return false;
    if (hidFilter === "visible" && l.hidden) return false;
    if (hidFilter === "hidden" && !l.hidden) return false;
    if (expFilter === "active" && l.expires_at && new Date(l.expires_at) < now) return false;
    if (expFilter === "expired" && !(l.expires_at && new Date(l.expires_at) < now)) return false;
    return true;
  });

  const filterBtn = (active: boolean) =>
    `rounded-xl px-3 py-1.5 text-xs font-black transition ${active ? "bg-blue-950 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300"}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Обяви</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {loading ? "Зареждане…" : `${visible.length} от ${listings.length} обяви`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Moderation */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Модерация</span>
          {(["all","pending","approved","rejected"] as ModerationFilter[]).map((f) => (
            <button key={f} type="button" onClick={() => setModFilter(f)} className={filterBtn(modFilter === f)}>
              {f === "all" ? "Всички" : f === "pending" ? "Очакват" : f === "approved" ? "Одобрени" : "Отхвърлени"}
            </button>
          ))}
        </div>
        {/* Hidden */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Видимост</span>
          {(["all","visible","hidden"] as HiddenFilter[]).map((f) => (
            <button key={f} type="button" onClick={() => setHidFilter(f)} className={filterBtn(hidFilter === f)}>
              {f === "all" ? "Всички" : f === "visible" ? "Видими" : "Скрити"}
            </button>
          ))}
        </div>
        {/* Expiry */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Изтичане</span>
          {(["all","active","expired"] as ExpiryFilter[]).map((f) => (
            <button key={f} type="button" onClick={() => setExpFilter(f)} className={filterBtn(expFilter === f)}>
              {f === "all" ? "Всички" : f === "active" ? "Активни" : "Изтекли"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-blue-950" /></div>
        ) : visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Няма обяви за тези филтри.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Заглавие</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Категория</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Град</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Потребител</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Дата</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Изтича</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Модерация</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Видимост</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((l) => {
                  const busy = actionId === l.id;
                  const expired = l.expires_at && new Date(l.expires_at) < now;
                  return (
                    <tr key={l.id} className={`transition hover:bg-slate-50 ${l.hidden ? "opacity-50" : ""}`}>
                      <td className="max-w-[200px] px-5 py-3.5">
                        <Link href={`/listing/${l.id}`} target="_blank" className="block truncate font-semibold text-blue-950 hover:underline">{l.title}</Link>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{l.category ?? "—"}</td>
                      <td className="px-4 py-3.5 text-slate-600">{l.city ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        <Link href={`/admin/users/${l.user_id}`} className="font-mono text-xs text-slate-400 hover:text-blue-950 hover:underline">
                          {shortId(l.user_id)}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{formatDate(l.created_at)}</td>
                      <td className="px-4 py-3.5">
                        {l.expires_at ? (
                          <span className={expired ? "font-semibold text-red-600" : "text-slate-500"}>{formatDate(l.expires_at)}</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5"><ModerationBadge status={l.moderation_status} /></td>
                      <td className="px-4 py-3.5">
                        {l.hidden
                          ? <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-600 ring-1 ring-red-200">Скрита</span>
                          : <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">Видима</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1">
                          {l.moderation_status !== "approved" && (
                            <button type="button" onClick={() => setModeration(l, "approved")} disabled={busy}
                              className="inline-flex items-center gap-1 rounded-xl border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-bold text-green-700 hover:bg-green-100 disabled:opacity-50">
                              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />} Одобри
                            </button>
                          )}
                          {l.moderation_status !== "rejected" && (
                            <button type="button" onClick={() => setModeration(l, "rejected")} disabled={busy}
                              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50">
                              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />} Отхвърли
                            </button>
                          )}
                          {l.moderation_status !== "pending" && l.moderation_status !== null && (
                            <button type="button" onClick={() => setModeration(l, "pending")} disabled={busy}
                              className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50">
                              Преглед
                            </button>
                          )}
                          <button type="button" onClick={() => toggleHidden(l)} disabled={busy}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-950 hover:text-blue-950 disabled:opacity-50">
                            {l.hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {l.hidden ? "Покажи" : "Скрий"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
