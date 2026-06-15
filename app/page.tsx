import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-blue-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <a href="/" className="flex items-center shrink-0">
            <Image
              src="/logo.png"
              alt="DaiVzemi"
              width={320}
              height={90}
              priority
              className="h-auto w-[220px] md:w-[260px]"
            />
          </a>

          <nav className="hidden items-center gap-3 text-[0.95rem] font-semibold lg:flex xl:gap-5">
            <a href="#">Обяви</a>
            <a href="#">Имоти</a>
            <a href="#">Автомобили</a>
            <a href="#">Авточасти</a>
            <a href="#">Услуги</a>
            <a href="#">Подарявам</a>
            <a href="#">Разменям</a>
            <a href="#">Търся</a>
          </nav>

          <button className="ml-auto rounded-xl bg-white px-4 py-2.5 text-sm font-black text-blue-950 shadow-sm hover:bg-blue-50 lg:px-4 lg:py-2.5">
            Публикувай обява
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 py-24 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h1 className="text-6xl font-black md:text-7xl">
            Дай. Вземи. Продай.
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-xl text-blue-100">
            Безплатни обяви за цяла България.
            Продавай, подарявай, разменяй и търси на едно място.
          </p>

          <div className="mx-auto mt-10 flex max-w-4xl flex-col gap-3 rounded-3xl bg-white p-3 shadow-2xl md:flex-row">
            <input
              type="text"
              placeholder="Какво търсите?"
              className="flex-1 rounded-2xl px-5 py-4 text-lg font-bold text-slate-900 outline-none"
            />

            <input
              type="text"
              placeholder="Град"
              className="rounded-2xl px-5 py-4 text-lg font-bold text-slate-900 outline-none md:w-60"
            />

            <button className="rounded-2xl bg-blue-950 px-8 py-4 text-lg font-black text-white">
              Търси
            </button>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            ["💰", "Продавам"],
            ["🎁", "Подарявам"],
            ["🔄", "Разменям"],
            ["🙏", "Търся"],
          ].map(([icon, title]) => (
            <div
              key={title}
              className="rounded-3xl bg-white p-8 text-center shadow-md transition hover:shadow-xl"
            >
              <div className="text-5xl">{icon}</div>
              <h3 className="mt-4 text-2xl font-black text-blue-950">
                {title}
              </h3>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <h2 className="mb-8 text-4xl font-black text-blue-950">
          Категории
        </h2>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            "🏠 Имоти",
            "🚗 Автомобили",
            "🔧 Авточасти",
            "📱 Електроника",
            "👶 Детски стоки",
            "🏡 Дом и градина",
            "👕 Мода",
            "⚽ Спорт и хоби",
            "🛠️ Услуги",
            "💼 Работа",
            "💻 Компютри",
            "📚 Книги",
          ].map((category) => (
            <div
              key={category}
              className="rounded-2xl bg-white p-5 text-[1.05rem] font-extrabold text-slate-900 shadow-sm"
            >
              {category}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}