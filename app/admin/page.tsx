"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle, Clock, Flag, List, Loader2, ShieldOff, Users, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Stats = {
  totalUsers: number;
  totalListings: number;
  pendingListings: number;
  approvedListings: number;
  rejectedListings: number;
  openReports: number;
  underReviewReports: number;
  suspendedUsers: number;
  avgTrustScore: number | null;
};

type PendingListing = {
  id: number;
  title: string;
  category: string | null;
  city: string | null;
  created_at: string | null;
};

type OpenReport = {
  id: string;
  reason: string;
  status: string;
  reporter_user_id: string;
  reported_listing_id: number | null;
  reported_user_id: string | null;
  created_at: string;
};

type SuspendedUser = {
  id: string;
  username: string | null;
  city: string | null;
  created_at: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (v: string | null) => {
  if (!v) return "—";
  return new Intl.DateTimeFormat("bg-BG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v));
};

const shortId = (id: string | null) => (id ? id.slice(0, 8) + "…" : "—");

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  href,
}: {
  label: string;
  value: number | string | null;
  icon: React.ElementType;
  accent: string;
  href?: string;
}) {
  const inner = (
    <div className={`flex items-center gap-5 rounded-[20px] bg-white p-6 shadow-sm ring-1 ring-slate-200 transition ${href ? "hover:ring-blue-300" : ""}`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900">
          {value === null ? "—" : typeof value === "number" ? value.toLocaleString("bg-BG") : value}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-base font-black text-slate-900">{title}</h3>
      <Link href={href} className="text-xs font-bold text-blue-950 hover:underline">{label} →</Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [openReports, setOpenReports] = useState<OpenReport[]>([]);
  const [suspendedUsers, setSuspendedUsers] = useState<SuspendedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [
        { count: totalUsers },
        { count: totalListings },
        { count: pendingListings },
        { count: approvedListings },
        { count: rejectedListings },
        { count: openReports },
        { count: underReviewReports },
        { count: suspendedUsers },
        { data: avgData },
        { data: pendingRows },
        { data: reportRows },
        { data: suspendedRows },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("listings").select("*", { count: "exact", head: true }),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("moderation_status", "pending"),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("moderation_status", "approved"),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("moderation_status", "rejected"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "under_review"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("suspended", true),
        supabase.from("profiles").select("trust_score").limit(500),
        supabase.from("listings").select("id, title, category, city, created_at").eq("moderation_status", "pending").order("created_at", { ascending: false }).limit(5),
        supabase.from("reports").select("id, reason, status, reporter_user_id, reported_listing_id, reported_user_id, created_at").in("status", ["open", "under_review"]).order("created_at", { ascending: false }).limit(5),
        supabase.from("profiles").select("id, username, city, created_at").eq("suspended", true).order("created_at", { ascending: false }).limit(5),
      ]);

      const scores = (avgData ?? []).map((r: { trust_score: number }) => r.trust_score).filter((v): v is number => typeof v === "number");
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

      setStats({
        totalUsers: totalUsers ?? 0,
        totalListings: totalListings ?? 0,
        pendingListings: pendingListings ?? 0,
        approvedListings: approvedListings ?? 0,
        rejectedListings: rejectedListings ?? 0,
        openReports: openReports ?? 0,
        underReviewReports: underReviewReports ?? 0,
        suspendedUsers: suspendedUsers ?? 0,
        avgTrustScore: avg,
      });

      setPendingListings((pendingRows as PendingListing[]) ?? []);
      setOpenReports((reportRows as OpenReport[]) ?? []);
      setSuspendedUsers((suspendedRows as SuspendedUser[]) ?? []);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-950" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-slate-900">Команден център</h2>
        <p className="mt-1 text-sm text-slate-500">Статистика и задачи за модерация в реално време.</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Общо потребители"      value={stats?.totalUsers ?? null}         icon={Users}        accent="bg-blue-50 text-blue-700"    href="/admin/users" />
        <StatCard label="Общо обяви"            value={stats?.totalListings ?? null}       icon={List}         accent="bg-slate-100 text-slate-700"  href="/admin/listings" />
        <StatCard label="Спрени потребители"    value={stats?.suspendedUsers ?? null}      icon={ShieldOff}    accent="bg-red-50 text-red-700"       href="/admin/users" />
        <StatCard label="Среден Trust Score"    value={stats?.avgTrustScore ?? null}       icon={Users}        accent="bg-violet-50 text-violet-700" />
      </div>

      {/* Moderation status row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Обяви — Очакват"       value={stats?.pendingListings ?? null}     icon={Clock}        accent="bg-amber-50 text-amber-700"   href="/admin/listings" />
        <StatCard label="Обяви — Одобрени"      value={stats?.approvedListings ?? null}    icon={CheckCircle}  accent="bg-green-50 text-green-700"   href="/admin/listings" />
        <StatCard label="Обяви — Отхвърлени"    value={stats?.rejectedListings ?? null}    icon={XCircle}      accent="bg-red-50 text-red-700"       href="/admin/listings" />
        <StatCard label="Доклади отворени"      value={stats?.openReports ?? null}         icon={Flag}         accent="bg-orange-50 text-orange-700" href="/admin/reports" />
      </div>

      {/* ── Quick sections ── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Pending listings */}
        <div className="rounded-[20px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <SectionHeader title="Обяви за преглед" href="/admin/listings" label="Виж всички" />
          {pendingListings.length === 0 ? (
            <p className="mt-4 text-xs font-semibold text-slate-400">Няма чакащи обяви.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {pendingListings.map((l) => (
                <li key={l.id} className="py-2.5">
                  <Link href={`/listing/${l.id}`} target="_blank" className="block truncate text-sm font-bold text-blue-950 hover:underline">
                    {l.title}
                  </Link>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400">
                    {l.category ?? "—"} · {l.city ?? "—"} · {formatDate(l.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Open reports */}
        <div className="rounded-[20px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <SectionHeader title="Отворени доклади" href="/admin/reports" label="Виж всички" />
          {openReports.length === 0 ? (
            <p className="mt-4 text-xs font-semibold text-slate-400">Няма отворени доклади.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {openReports.map((r) => (
                <li key={r.id} className="py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{r.reason}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      r.status === "open" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                    }`}>
                      {r.status === "open" ? "Отворен" : "При проверка"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400">
                    {r.reported_listing_id ? (
                      <Link href={`/listing/${r.reported_listing_id}`} target="_blank" className="text-blue-950 hover:underline">
                        Обява #{r.reported_listing_id}
                      </Link>
                    ) : r.reported_user_id ? (
                      <Link href={`/admin/users/${r.reported_user_id}`} className="text-blue-950 hover:underline">
                        {shortId(r.reported_user_id)}
                      </Link>
                    ) : "—"}
                    {" · "}{formatDate(r.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Suspended users */}
        <div className="rounded-[20px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <SectionHeader title="Спрени потребители" href="/admin/users" label="Виж всички" />
          {suspendedUsers.length === 0 ? (
            <p className="mt-4 text-xs font-semibold text-slate-400">Няма спрени потребители.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {suspendedUsers.map((u) => (
                <li key={u.id} className="py-2.5">
                  <Link href={`/admin/users/${u.id}`} className="text-sm font-bold text-blue-950 hover:underline">
                    {u.username ?? shortId(u.id)}
                  </Link>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400">
                    {u.city ?? "—"} · {formatDate(u.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* AI Moderator Queue placeholder — structure ready for future integration */}
      <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <p className="text-sm font-black text-slate-600">AI Модератор — предстои</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              Опашката за автоматична проверка ще се появи тук, след като AI модераторът бъде активиран.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
