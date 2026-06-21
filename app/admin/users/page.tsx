"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldOff, UserX, UserCheck } from "lucide-react";
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
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (v: string | null) => {
  if (!v) return "—";
  return new Intl.DateTimeFormat("bg-BG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v));
};

const shortId = (id: string) => id.slice(0, 8) + "…";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
      .select("id, username, city, role, suspended, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setUsers((data as AdminUser[]) ?? []);
    setLoading(false);
  };

  const setRole = async (user: AdminUser, role: "admin" | "user") => {
    setActionId(user.id);
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", user.id);
    if (!error) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
    }
    setActionId(null);
  };

  const toggleSuspend = async (user: AdminUser) => {
    setActionId(user.id);
    const { error } = await supabase
      .from("profiles")
      .update({ suspended: !user.suspended })
      .eq("id", user.id);
    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, suspended: !u.suspended } : u))
      );
    }
    setActionId(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-900">Потребители</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {loading ? "Зареждане…" : `${users.length} потребители (последните 200)`}
        </p>
      </div>

      <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-950" />
          </div>
        ) : users.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Няма потребители.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Потребител</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">ID</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Град</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Роля</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Статус</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Регистрация</th>
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const busy = actionId === u.id;
                  return (
                    <tr key={u.id} className={`transition hover:bg-slate-50 ${u.suspended ? "opacity-60" : ""}`}>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="font-semibold text-blue-950 hover:underline"
                        >
                          {u.username ?? <span className="italic text-slate-400">Без потребителско име</span>}
                        </Link>
                        {isSelf && (
                          <span className="ml-2 text-xs font-normal text-slate-400">(вие)</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-400">{shortId(u.id)}</td>
                      <td className="px-4 py-3.5 text-slate-600">{u.city ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        {u.role === "admin" ? (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-200">
                            Администратор
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">
                            Потребител
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {u.suspended ? (
                          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-600 ring-1 ring-red-200">
                            Спрян
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">
                            Активен
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3.5">
                        {isSelf ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {/* Role toggle */}
                            {u.role === "admin" ? (
                              <button
                                type="button"
                                onClick={() => setRole(u, "user")}
                                disabled={busy}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:border-amber-400 hover:text-amber-700 disabled:opacity-50"
                              >
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
                                Премахни admin
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setRole(u, "admin")}
                                disabled={busy}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:border-blue-500 hover:text-blue-700 disabled:opacity-50"
                              >
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                                Направи admin
                              </button>
                            )}

                            {/* Suspend toggle */}
                            <button
                              type="button"
                              onClick={() => toggleSuspend(u)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:border-red-400 hover:text-red-700 disabled:opacity-50"
                            >
                              {busy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : u.suspended ? (
                                <UserCheck className="h-3 w-3" />
                              ) : (
                                <UserX className="h-3 w-3" />
                              )}
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
