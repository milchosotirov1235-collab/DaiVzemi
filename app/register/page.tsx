"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const [accountType, setAccountType] = useState("Частно лице");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Паролите не съвпадат.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp(
      {
        email,
        password,
      },
      {
        data: {
          accountType,
          name,
        },
      }
    );

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setSuccess("Регистрацията е успешна! Моля проверете имейла си за потвърждение.");
    setAccountType("Частно лице");
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black md:text-6xl">Създай профил</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-blue-100">
            Регистрирай се бързо и лесно, за да публикуваш първата си обява.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-200 md:p-12">
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div>
              <h2 className="text-3xl font-black text-blue-950">Създай профил</h2>
              <p className="mt-3 text-sm text-slate-600">Избери типа акаунт и попълни данните си.</p>
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
              <span className="text-sm font-semibold text-slate-700">Тип обява</span>
              <select
                value={accountType}
                onChange={(event) => setAccountType(event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option>Частно лице</option>
                <option>Фирма</option>
              </select>
            </label>

            <label className="space-y-3">
              <span className="text-sm font-semibold text-slate-700">Име</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                type="text"
                placeholder="Вашето име"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

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

            <div className="grid gap-6 lg:grid-cols-2">
              <label className="space-y-3">
                <span className="text-sm font-semibold text-slate-700">Парола</span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Минимум 8 символа"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-3">
                <span className="text-sm font-semibold text-slate-700">Потвърди паролата</span>
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  placeholder="Повторете паролата"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-3xl bg-blue-950 px-6 py-4 text-base font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Регистрация..." : "Регистрация"}
            </button>

            <p className="text-center text-sm text-slate-600">
              Вече имаш акаунт?{' '}
              <Link href="/login" className="font-semibold text-blue-950 hover:text-blue-700">
                Вход
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
