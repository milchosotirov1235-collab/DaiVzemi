"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, Loader2, MessageSquare, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { onReportResolved } from "@/lib/trust/trustScore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReportStatus =
  | "open"
  | "under_review"
  | "resolved"           // legacy — existing rows only
  | "resolved_valid"
  | "resolved_invalid"
  | "dismissed";

type AdminReport = {
  id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  admin_note: string | null;
  reporter_user_id: string;
  reported_listing_id: number | null;
  reported_user_id: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ReportStatus, string> = {
  open:             "Отворен",
  under_review:     "При проверка",
  resolved:         "Решен",        // legacy label
  resolved_valid:   "Валиден",
  resolved_invalid: "Невалиден",
  dismissed:        "Отхвърлен",
};

const STATUS_COLORS: Record<ReportStatus, string> = {
  open:             "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  under_review:     "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  resolved:         "bg-green-50 text-green-700 ring-1 ring-green-200",
  resolved_valid:   "bg-green-50 text-green-700 ring-1 ring-green-200",
  resolved_invalid: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  dismissed:        "bg-slate-100 text-slate-400",
};

// Statuses shown as filter tabs (excludes legacy "resolved" — it shows under its own tab if data exists)
const FILTER_STATUSES: ReportStatus[] = [
  "open",
  "under_review",
  "resolved_valid",
  "resolved_invalid",
  "dismissed",
];

const formatDate = (v: string) =>
  new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(v));

const shortId = (id: string | null) => (id ? id.slice(0, 8) + "…" : "—");

// ---------------------------------------------------------------------------
// Inline note editor
// ---------------------------------------------------------------------------

function NoteCell({
  report,
  onSave,
}: {
  report: AdminReport;
  onSave: (id: string, note: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(report.admin_note ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(report.id, draft);
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          autoFocus
          className="w-full min-w-[160px] resize-none rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
          placeholder="Бележка за администратора…"
        />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-blue-950 px-2.5 py-1 text-xs font-black text-white hover:bg-blue-900 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Запази"}
          </button>
          <button
            type="button"
            onClick={() => { setDraft(report.admin_note ?? ""); setEditing(false); }}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Отказ
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex items-start gap-1 text-left"
      title="Редактирай бележка"
    >
      <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-blue-950" />
      <span className="line-clamp-2 text-xs font-semibold text-slate-500 group-hover:text-slate-800">
        {report.admin_note || <span className="text-slate-300 italic">Добави бележка</span>}
      </span>
    </button>
  );
}

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
        "id, reason, description, status, admin_note, reporter_user_id, reported_listing_id, reported_user_id, created_at"
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

      // Fire trust hook on terminal resolution
      if (status === "resolved_valid") {
        await onReportResolved(report.reporter_user_id, "valid");
      } else if (status === "resolved_invalid") {
        await onReportResolved(report.reporter_user_id, "false");
      }
    }

    setActionId(null);
  };

  const saveNote = async (reportId: string, note: string) => {
    const { error } = await supabase
      .from("reports")
      .update({ admin_note: note.trim() || null })
      .eq("id", reportId);

    if (!error) {
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, admin_note: note.trim() || null } : r
        )
      );
    }
  };

  // Include legacy "resolved" in filter if any rows exist
  const hasLegacyResolved = reports.some((r) => r.status === "resolved");
  const filterOptions: (ReportStatus | "all")[] = [
    "all",
    ...FILTER_STATUSES,
    ...(hasLegacyResolved ? (["resolved"] as ReportStatus[]) : []),
  ];

  const visible =
    filterStatus === "all"
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
          {filterOptions.map((s) => (
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
              {s === "all" ? "Всички" : STATUS_LABELS[s as ReportStatus]}
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
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Причина</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Описание</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Цел</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Докладвал</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Дата</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Статус</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Бележка</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => {
                  const busy = actionId === r.id;
                  const isOpen = r.status === "open" || r.status === "under_review";
                  const isTerminal =
                    r.status === "resolved_valid" ||
                    r.status === "resolved_invalid" ||
                    r.status === "dismissed" ||
                    r.status === "resolved";

                  return (
                    <tr key={r.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{r.reason}</td>
                      <td className="max-w-[160px] px-4 py-3.5 text-slate-500">
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
                          <Link
                            href={`/admin/users/${r.reported_user_id}`}
                            className="font-mono text-blue-950 hover:underline"
                          >
                            {shortId(r.reported_user_id)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-400">
                        <Link
                          href={`/admin/users/${r.reporter_user_id}`}
                          className="hover:text-blue-950 hover:underline"
                        >
                          {shortId(r.reporter_user_id)}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{formatDate(r.created_at)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${STATUS_COLORS[r.status]}`}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td className="max-w-[180px] px-4 py-3.5">
                        <NoteCell report={r} onSave={saveNote} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {/* Open → under_review */}
                          {r.status === "open" && (
                            <button
                              type="button"
                              onClick={() => setStatus(r, "under_review")}
                              disabled={busy}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                            >
                              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "При проверка"}
                            </button>
                          )}

                          {/* Resolution actions — shown when open or under_review */}
                          {isOpen && (
                            <>
                              <button
                                type="button"
                                onClick={() => setStatus(r, "resolved_valid")}
                                disabled={busy}
                                className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs font-bold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                                title="Докладът е основателен"
                              >
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                Валиден
                              </button>
                              <button
                                type="button"
                                onClick={() => setStatus(r, "resolved_invalid")}
                                disabled={busy}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                                title="Докладът не е основателен"
                              >
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                Невалиден
                              </button>
                              <button
                                type="button"
                                onClick={() => setStatus(r, "dismissed")}
                                disabled={busy}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
                              >
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Отхвърли"}
                              </button>
                            </>
                          )}

                          {/* Reopen from terminal state */}
                          {isTerminal && (
                            <button
                              type="button"
                              onClick={() => setStatus(r, "under_review")}
                              disabled={busy}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                            >
                              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Преотвори"}
                            </button>
                          )}
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
