"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck, ShieldOff, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminUser = {
  id: string;
  username: string | null;
  city: string | null;
  role: string;
  suspended: boolean;
  created_at: string | null;
  trust_score: number | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (v: string | null) => {
  if (!v) return "—";
  return new Intl.DateTimeFormat("bg-BG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v));
};

const shortId = (id: string) => id.slice(0, 8) + "…";

function TrustBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-slate-400">—</span>;
  const color = score >= 70 ? "text-green-700 bg-green-50 ring-green-200" : score >= 40 ? "text-amber-700 bg-amber-50 ring-amber-200" : "text-red-600 bg-red-50 ring-red-200";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${color}`}>{score}</span>;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

type RoleFilter = "all" | "admin" | "user";
type SuspendedFilter = "all" | "active" | "suspended";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [suspendedFilter, setSuspendedFilter] = useState<SuspendedFilter>("all");
  const [trustMin, setTrustMin] = useState<string>("");
  const [trustMax, setTrustMax] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      setCurrentUserId(authData?.user?.id ?? null);
      await load();
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, city, role, suspended, created_at, trust_score")
      .order("created_at", { ascending: false })
      .limit(300);
    setUsers((data as AdminUser[]) ?? []);
    setLoading(false);
  };

  const setRole = async (user: AdminUser, role: "admin" | "user") => {
    setActionId(user.id);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", user.id);
    if (!error) setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role } : u));
    setActionId(null);
  };

  const toggleSuspend = async (user: AdminUser) => {
    setActionId(user.id);
    const { error } = await supabase.from("profiles").update({ suspended: !user.suspended }).eq("id", user.id);
    if (!error) setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, suspended: !u.suspended } : u));
    setActionId(null);
  };

  // Client-side filters
  const minVal = trustMin !== "" ? Number(trustMin) : null;
  const maxVal = trustMax !== "" ? Number(trustMax) : null;

  const visible = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (suspendedFilter === "active" && u.suspended) return false;
    if (suspendedFilter === "suspended" && !u.suspended) return false;
    if (minVal !== null && (u.trust_score ?? 50) < minVal) return false;
    if (maxVal !== null && (u.trust_score ?? 50) > maxVal) return false;
    return true;
  });

  const filterBtn = (active: boolean) =>
    `rounded-xl px-3 py-1.5 text-xs font-black transition ${active ? "bg-blue-950 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300"}`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-900">Потребители</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {loading ? "Зареждане…" : `${visible.length} от ${users.length} потребители`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Роля</span>
          {(["all","user","admin"] as RoleFilter[]).map((f) => (
            <button key={f} type="button" onClick={() => setRoleFilter(f)} className={filterBtn(roleFilter === f)}>
              {f === "all" ? "Всички" : f === "user" ? "Потребители" : "Администратори"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Статус</span>
          {(["all","active","suspended"] as SuspendedFilter[]).map((f) => (
            <button key={f} type="button" onClick={() => setSuspendedFilter(f)} className={filterBtn(suspendedFilter === f)}>
              {f === "all" ? "Всички" : f === "active" ? "Активни" : "Спрени"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Trust Score</span>
          <input
            type="number" min={0} max={100} placeholder="Мин" value={trustMin}
            onChange={(e) => setTrustMin(e.target.value)}
            className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-950"
          />
          <span className="text-xs text-slate-400">—</span>
          <input
            type="number" min={0} max={100} placeholder="Макс" value={trustMax}
            onChange={(e) => setTrustMax(e.target.value)}
            className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-950"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-blue-950" /></div>
        ) : visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Няма потребители за тези филтри.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Потребител</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">ID</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Град</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Trust</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Роля</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Статус</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Регистрация</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const busy = actionId === u.id;
                  return (
                    <tr key={u.id} className={`transition hover:bg-slate-50 ${u.suspended ? "opacity-60" : ""}`}>
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/users/${u.id}`} className="font-semibold text-blue-950 hover:underline">
                          {u.username ?? <span className="italic text-slate-400">Без потребителско име</span>}
                        </Link>
                        {isSelf && <span className="ml-2 text-xs font-normal text-slate-400">(вие)</span>}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-400">{shortId(u.id)}</td>
                      <td className="px-4 py-3.5 text-slate-600">{u.city ?? "—"}</td>
                      <td className="px-4 py-3.5"><TrustBadge score={u.trust_score} /></td>
                      <td className="px-4 py-3.5">
                        {u.role === "admin"
                          ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-200">Администратор</span>
                          : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">Потребител</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {u.suspended
                          ? <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-600 ring-1 ring-red-200">Спрян</span>
                          : <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">Активен</span>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3.5">
                        {isSelf ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {u.role === "admin" ? (
                              <button type="button" onClick={() => setRole(u, "user")} disabled={busy}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-amber-400 hover:text-amber-700 disabled:opacity-50">
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />} Премахни admin
                              </button>
                            ) : (
                              <button type="button" onClick={() => setRole(u, "admin")} disabled={busy}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-500 hover:text-blue-700 disabled:opacity-50">
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />} Направи admin
                              </button>
                            )}
                            <button type="button" onClick={() => toggleSuspend(u)} disabled={busy}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-red-400 hover:text-red-700 disabled:opacity-50">
                              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : u.suspended ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                              {u.suspended ? "Активирай" : "Спри"}
                            </button>
                          </div>
                        )}
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
