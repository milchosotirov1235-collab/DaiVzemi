"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Flag } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Report = {
  id: string;
  reported_listing_id: number | null;
  reported_user_id: string | null;
  reason: string;
  description: string | null;
  status: "open" | "under_review" | "resolved" | "dismissed";
  created_at: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<Report["status"], string> = {
  open: "Отворен",
  under_review: "При проверка",
  resolved: "Решен",
  dismissed: "Отхвърлен",
};

const STATUS_COLORS: Record<Report["status"], string> = {
  open: "bg-amber-50 text-amber-700 border-amber-200",
  under_review: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
  dismissed: "bg-slate-100 text-slate-500 border-slate-200",
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;

      if (!user) {
        setAuthed(false);
        setLoading(false);
        return;
      }

      setAuthed(true);

      const { data } = await supabase
        .from("reports")
        .select(
          "id, reported_listing_id, reported_user_id, reason, description, status, created_at"
        )
        .eq("reporter_user_id", user.id)
        .order("created_at", { ascending: false });

      setReports((data as Report[]) ?? []);
      setLoading(false);
    };

    load();
  }, []);

  // ── Not logged in ──────────────────────────────────────────────────────────

  if (authed === false) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-20 text-white">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
            <h1 className="mt-3 text-4xl font-black md:text-5xl">Моите доклади</h1>
          </div>
        </section>
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-600">
            Влезте в профила си, за да видите вашите доклади.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-900"
          >
            Вход
          </Link>
        </section>
      </main>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <section className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6">
          <p className="text-base font-semibold text-slate-500">Зареждане...</p>
        </section>
      </main>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">Моите доклади</h1>
          <p className="mt-4 text-base text-blue-100">
            Преглед на всички доклади, които сте изпратили.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-3xl px-6 py-10">
        {reports.length === 0 ? (
          <div className="rounded-[28px] bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <Flag className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="text-lg font-black text-slate-800">Нямате изпратени доклади</p>
            <p className="mt-2 text-sm text-slate-500">
              Ако забележите нарушение, можете да докладвате обява или потребител директно от страницата на обявата.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const targetLabel = report.reported_listing_id
                ? `Обява #${report.reported_listing_id}`
                : report.reported_user_id
                ? "Потребител"
                : "—";

              return (
                <div
                  key={report.id}
                  className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{report.reason}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-semibold text-slate-500">{targetLabel}</span>
                      </div>
                      {report.description && (
                        <p className="text-sm text-slate-600">{report.description}</p>
                      )}
                      <p className="text-xs text-slate-400">{formatDate(report.created_at)}</p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${
                        STATUS_COLORS[report.status]
                      }`}
                    >
                      {STATUS_LABELS[report.status]}
                    </span>
                  </div>

                  {report.reported_listing_id && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <Link
                        href={`/listing/${report.reported_listing_id}`}
                        className="text-xs font-semibold text-blue-950 underline underline-offset-2 hover:text-blue-700"
                      >
                        Виж обявата →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
