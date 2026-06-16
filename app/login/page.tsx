import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
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
          <form className="space-y-8">
            <div>
              <h2 className="text-3xl font-black text-blue-950">Вход</h2>
              <p className="mt-3 text-sm text-slate-600">Въведете вашите данни, за да влезете в системата.</p>
            </div>

            <label className="space-y-3">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <input
                type="email"
                placeholder="example@mail.com"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-3">
              <span className="text-sm font-semibold text-slate-700">Парола</span>
              <input
                type="password"
                placeholder="Вашата парола"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-3xl bg-blue-950 px-6 py-4 text-base font-black text-white transition hover:bg-blue-900"
            >
              Влез
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
