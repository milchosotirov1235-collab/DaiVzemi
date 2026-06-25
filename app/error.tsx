"use client";

import Link from "next/link";
import { useEffect } from "react";
import Header from "@/components/Header";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-24 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">
            ДайВземи
          </p>
          <div className="mt-6 flex justify-center">
            <AlertTriangle className="h-16 w-16 text-white/30" />
          </div>
          <h1 className="mt-4 text-3xl font-black md:text-4xl">
            Нещо се обърка
          </h1>
          <p className="mt-4 text-base text-blue-100">
            Възникна неочаквана грешка. Моля опитайте отново.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-7 py-3.5 text-sm font-black text-blue-950 shadow-lg transition hover:bg-blue-50"
            >
              Опитай отново
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-black text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Към начало
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
