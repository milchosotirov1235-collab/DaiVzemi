"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<"sent" | "error" | "cooldown" | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user ?? null;

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);
      setIsVerified(!!user.email_confirmed_at);
      setLoading(false);
    };

    load();

    // Listen for verification via Supabase auth state change
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setEmail(session.user.email ?? null);
        setIsVerified(!!session.user.email_confirmed_at);
      }
    });

    return () => sub?.subscription.unsubscribe();
  }, []);

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
    setResendNotice(null);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    setResending(false);

    if (error) {
      // Supabase rate-limits resend requests
      if (error.message.toLowerCase().includes("rate") || error.message.toLowerCase().includes("limit")) {
        setResendNotice("cooldown");
      } else {
        setResendNotice("error");
      }
    } else {
      setResendNotice("sent");
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-7 w-7 animate-spin text-blue-950" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black md:text-6xl">Потвърди имейл</h1>
        </div>
      </section>

      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-200 md:p-12">

            {/* Not logged in */}
            {!email && (
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-700">
                  Трябва да сте влезли в профила си.
                </p>
                <Link
                  href="/login"
                  className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900"
                >
                  Вход
                </Link>
              </div>
            )}

            {/* Already verified */}
            {email && isVerified && (
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Имейлът е потвърден</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Вашият акаунт е активен. Можете да публикувате обяви и да изпращате съобщения.
                </p>
                <Link
                  href="/"
                  className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900"
                >
                  Към началната страница
                </Link>
              </div>
            )}

            {/* Awaiting verification */}
            {email && !isVerified && (
              <div>
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
                  <Mail className="h-8 w-8 text-amber-600" />
                </div>

                <h2 className="text-2xl font-black text-slate-900">Проверете имейла си</h2>
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  Изпратихме линк за потвърждение на{" "}
                  <span className="font-black text-slate-800">{email}</span>.
                  Кликнете върху линка в имейла, за да активирате акаунта си.
                </p>

                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="font-semibold">
                    Докато не потвърдите имейла си, не можете да:
                  </p>
                  <ul className="mt-2 space-y-1 pl-4">
                    <li>• Публикувате обяви</li>
                    <li>• Изпращате съобщения</li>
                    <li>• Докладвате обяви или потребители</li>
                  </ul>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-950 px-6 py-3.5 text-sm font-black text-white transition hover:bg-blue-900 disabled:opacity-60"
                  >
                    {resending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {resending ? "Изпращане..." : "Изпрати нов линк"}
                  </button>

                  {resendNotice === "sent" && (
                    <p className="text-center text-sm font-bold text-green-700">
                      ✓ Нов линк е изпратен. Проверете имейла си.
                    </p>
                  )}
                  {resendNotice === "cooldown" && (
                    <p className="text-center text-sm font-bold text-amber-700">
                      Изчакайте малко преди да изпратите нов линк.
                    </p>
                  )}
                  {resendNotice === "error" && (
                    <p className="text-center text-sm font-bold text-red-600">
                      Грешка при изпращане. Опитайте отново.
                    </p>
                  )}
                </div>

                <p className="mt-6 text-center text-xs text-slate-400">
                  Не намирате имейла? Проверете папката за спам.
                </p>
              </div>
            )}

          </div>
        </section>
      </main>
    </>
  );
}
