"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";

// Inline Google "G" icon SVG
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [redirectPath, setRedirectPath] = useState("/");
  const router = useRouter();

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("redirect") ?? "/";
    // Reject external URLs — only allow internal paths.
    const safe = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
    setRedirectPath(safe);
  }, []);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    if (redirectPath !== "/") {
      sessionStorage.setItem("loginRedirect", redirectPath);
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setError("Грешка при вход с Google. Опитайте отново.");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setSuccess("Входът е успешен! Пренасочване...");
    router.push(redirectPath);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black md:text-6xl">Вход</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-blue-100">
            Влез в профила си и започни да публикуваш обяви лесно.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-200 md:p-12">
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div>
              <h2 className="text-3xl font-black text-blue-950">Вход</h2>
              <p className="mt-3 text-sm text-slate-600">Въведете вашите данни, за да влезете в системата.</p>
            </div>

            {error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-3xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
                {success}
              </div>
            ) : null}

            <label className="space-y-3">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="example@mail.com"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Парола</span>
                <Link href="/forgot-password" className="text-xs font-semibold text-blue-950 hover:text-blue-700">
                  Забравена парола?
                </Link>
              </div>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="Вашата парола"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="mt-4 w-full rounded-3xl bg-blue-950 px-6 py-4 text-base font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Влизане..." : "Влез"}
            </button>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold text-slate-500">или</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-4 text-base font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon />
              {googleLoading ? "Пренасочване..." : "Вход с Google"}
            </button>

            <p className="text-center text-sm text-slate-600">
              Нямате профил?{' '}
              <Link href="/register" className="font-semibold text-blue-950 hover:text-blue-700">
                Регистрация
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
