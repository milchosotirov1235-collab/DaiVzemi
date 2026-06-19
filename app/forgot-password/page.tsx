"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";
import { AlertTriangle, CheckCircle2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const clean = email.trim().toLowerCase();
    if (!clean) {
      setNotice({ type: "error", message: "Моля въведете имейл адрес." });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setNotice({ type: "error", message: "Грешка при изпращане на имейла. Проверете адреса и опитайте отново." });
      return;
    }

    setNotice({
      type: "success",
      message: "Изпратихме линк за нулиране на паролата на вашия имейл. Проверете входящата си поща (и папка Спам).",
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black md:text-6xl">Забравена парола</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-blue-100">
            Въведете имейла си и ще ви изпратим линк за нулиране на паролата.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-200 md:p-12">
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div>
              <h2 className="text-3xl font-black text-blue-950">Нулиране на парола</h2>
              <p className="mt-3 text-sm text-slate-600">
                Въведете имейл адреса, с който сте регистрирани. Ще получите линк за смяна на паролата.
              </p>
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

            {notice?.type !== "success" && (
              <>
                <label className="block space-y-3">
                  <span className="text-sm font-semibold text-slate-700">Имейл адрес</span>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="example@mail.com"
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-5 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-3xl bg-blue-950 px-6 py-4 text-base font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Изпращане..." : "Изпрати линк"}
                </button>
              </>
            )}

            <p className="text-center text-sm text-slate-600">
              Спомнихте си?{" "}
              <Link href="/login" className="font-semibold text-blue-950 hover:text-blue-700">
                Влез в профила
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
