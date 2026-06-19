"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReportStatus = "open" | "under_review" | "resolved" | "dismissed";

type AdminReport = {
  id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  reporter_user_id: string;
  reported_listing_id: number | null;
  reported_user_id: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ReportStatus, string> = {
  open: "Отворен",
  under_review: "При проверка",
  resolved: "Решен",
  dismissed: "Отхвърлен",
};

const STATUS_COLORS: Record<ReportStatus, string> = {
  open: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  under_review: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  resolved: "bg-green-50 text-green-700 ring-1 ring-green-200",
  dismissed: "bg-slate-100 text-slate-500",
};

const ALL_STATUSES: ReportStatus[] = ["open", "under_review", "resolved", "dismissed"];

const formatDate = (v: string) =>
  new Intl.DateTimeFormat("bg-BG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v));

const shortId = (id: string | null) => (id ? id.slice(0, 8) + "…" : "—");

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminReports() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "all">("all");
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reports")
      .select(
        "id, reason, description, status, reporter_user_id, reported_listing_id, reported_user_id, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);
    setReports((data as AdminReport[]) ?? []);
    setLoading(false);
  };

  const setStatus = async (report: AdminReport, status: ReportStatus) => {
    if (report.status === status) return;
    setActionId(report.id);
    const { error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", report.id);
    if (!error) {
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, status } : r))
      );
    }
    setActionId(null);
  };

  const visible = filterStatus === "all"
    ? reports
    : reports.filter((r) => r.status === filterStatus);

  return (
    <div className="space-y-5">
      {/* Header + filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Доклади</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {loading ? "Зареждане…" : `${visible.length} от ${reports.length} доклада`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", ...ALL_STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                filterStatus === s
                  ? "bg-blue-950 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300"
              }`}
            >
              {s === "all" ? "Всички" : STATUS_LABELS[s]}
              {s !== "all" && (
                <span className="ml-1.5 opacity-70">
                  ({reports.filter((r) => r.status === s).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-950" />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Няма доклади.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Причина</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Описание</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Цел</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Докладвал</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Дата</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Статус</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Промени</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => {
                  const busy = actionId === r.id;
                  return (
                    <tr key={r.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{r.reason}</td>
                      <td className="max-w-[180px] px-4 py-3.5 text-slate-500">
                        <span className="block truncate">{r.description ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {r.reported_listing_id ? (
                          <Link
                            href={`/listing/${r.reported_listing_id}`}
                            target="_blank"
                            className="font-semibold text-blue-950 underline underline-offset-2 hover:text-blue-700"
                          >
                            Обява #{r.reported_listing_id}
                          </Link>
                        ) : r.reported_user_id ? (
                          <span className="font-mono text-slate-500">
                            {shortId(r.reported_user_id)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-400">
                        {shortId(r.reporter_user_id)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{formatDate(r.created_at)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${STATUS_COLORS[r.status]}`}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {ALL_STATUSES.filter((s) => s !== r.status).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setStatus(r, s)}
                              disabled={busy}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                            >
                              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : STATUS_LABELS[s]}
                            </button>
                          ))}
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
