"use client";

import { useEffect, useState } from "react";
import { Flag, List, Users } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Stats = {
  totalUsers: number;
  totalListings: number;
  activeListings: number;
  totalReports: number;
  openReports: number;
};

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | null;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-5 rounded-[20px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900">
          {value === null ? "—" : value.toLocaleString("bg-BG")}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      const [
        { count: totalUsers },
        { count: totalListings },
        { count: activeListings },
        { count: totalReports },
        { count: openReports },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("listings").select("*", { count: "exact", head: true }),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("hidden", false),
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);

      setStats({
        totalUsers: totalUsers ?? 0,
        totalListings: totalListings ?? 0,
        activeListings: activeListings ?? 0,
        totalReports: totalReports ?? 0,
        openReports: openReports ?? 0,
      });
    };

    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-900">Общ преглед</h2>
        <p className="mt-1 text-sm text-slate-500">Статистика в реално време от базата данни.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Общо потребители"   value={stats?.totalUsers   ?? null} icon={Users} accent="bg-blue-50 text-blue-700" />
        <StatCard label="Общо обяви"         value={stats?.totalListings ?? null} icon={List}  accent="bg-slate-100 text-slate-700" />
        <StatCard label="Активни обяви"      value={stats?.activeListings ?? null} icon={List} accent="bg-green-50 text-green-700" />
        <StatCard label="Общо доклади"       value={stats?.totalReports  ?? null} icon={Flag}  accent="bg-amber-50 text-amber-700" />
        <StatCard label="Отворени доклади"   value={stats?.openReports   ?? null} icon={Flag}  accent="bg-red-50 text-red-700" />
      </div>
    </div>
  );
}
