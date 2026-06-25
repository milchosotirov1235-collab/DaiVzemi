import Link from "next/link";
import Header from "@/components/Header";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-24 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">
            ДайВземи
          </p>
          <p className="mt-6 text-[6rem] font-black leading-none text-white/20">404</p>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">
            Страницата не е намерена
          </h1>
          <p className="mt-4 text-base text-blue-100">
            Тази страница не съществува или е преместена.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-7 py-3.5 text-sm font-black text-blue-950 shadow-lg transition hover:bg-blue-50"
            >
              Към начало
            </Link>
            <Link
              href="/listings"
              className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-black text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Разгледай обяви
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
