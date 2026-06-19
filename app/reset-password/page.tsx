"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type Notice = { type: "error" | "success"; message: string };

export default function ResetPasswordPage() {
  const router = useRouter();

  // Whether Supabase has fired a PASSWORD_RECOVERY event (valid reset link)
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase picks up the #access_token hash fragment automatically and
    // fires an AUTH_STATE_CHANGE event with type PASSWORD_RECOVERY.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setChecking(false);
      }
    });

    // Fallback: if the user already has a recovery session (page reload)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (password.length < 8) {
      setNotice({ type: "error", message: "Паролата трябва да е поне 8 символа." });
      return;
    }

    if (password !== confirm) {
      setNotice({ type: "error", message: "Паролите не съвпадат." });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setNotice({ type: "error", message: "Грешка при смяна на паролата. Линкът може да е изтекъл — поискайте нов." });
      return;
    }

    setDone(true);
    setNotice({ type: "success", message: "Паролата беше сменена успешно! Пренасочване..." });

    setTimeout(() => router.push("/login"), 2500);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black md:text-6xl">Нова парола</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-blue-100">
            Въведете новата си парола за достъп до акаунта.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-200 md:p-12">

          {checking ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-950" />
            </div>
          ) : !ready ? (
            <div className="space-y-6 text-center">
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Линкът за нулиране на паролата е невалиден или е изтекъл. Моля поискайте нов.
              </div>
              <Link
                href="/forgot-password"
                className="inline-block rounded-3xl bg-blue-950 px-8 py-4 font-black text-white transition hover:bg-blue-900"
              >
                Поискай нов линк
              </Link>
            </div>
          ) : (
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div>
                <h2 className="text-3xl font-black text-blue-950">Задай нова парола</h2>
                <p className="mt-3 text-sm text-slate-600">Паролата трябва да е поне 8 символа.</p>
              </div>

              {notice && (
                <div
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold ${
                    notice.type === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-800"
                  }`}
                >
                  {notice.type === "error" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  {notice.message}
                </div>
              )}

              {!done && (
                <>
                  <label className="block space-y-3">
                    <span className="text-sm font-semibold text-slate-700">Нова парола</span>
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      placeholder="Минимум 8 символа"
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block space-y-3">
                    <span className="text-sm font-semibold text-slate-700">Потвърди нова парола</span>
                    <input
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      type="password"
                      placeholder="Повтори паролата"
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-3xl bg-blue-950 px-6 py-4 text-base font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Запазване..." : "Запази новата парола"}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
