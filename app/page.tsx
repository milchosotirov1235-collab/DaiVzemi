import Image from "next/image";
import {
  Baby,
  BookOpen,
  Briefcase,
  Car,
  Hammer,
  Home as HomeIcon,
  Monitor,
  Shirt,
  Smartphone,
  Trophy,
  Trees,
  Wrench,
} from "lucide-react";

export default function Home() {
  const latestListings = [
    {
      title: "Просторен тристаен апартамент",
      price: "179 000 лв.",
      city: "София",
      type: "Продавам",
      category: "Имоти",
      image: "🏙️",
    },
    {
      title: "Нова ръчна машина за кафе",
      price: "120 лв.",
      city: "Пловдив",
      type: "Продавам",
      category: "Електроника",
      image: "☕",
    },
    {
      title: "Стилен офисен стол",
      price: "85 лв.",
      city: "Варна",
      type: "Продавам",
      category: "Дом и градина",
      image: "🪑",
    },
    {
      title: "Детски велосипед в перфектно състояние",
      price: "185 лв.",
      city: "Бургас",
      type: "Подарявам",
      category: "Детски стоки",
      image: "🚲",
    },
    {
      title: "Смарт телефон с 2 години гаранция",
      price: "650 лв.",
      city: "Русе",
      type: "Продавам",
      category: "Телефони",
      image: "📱",
    },
    {
      title: "Изгоден комплект за домашен фитнес",
      price: "145 лв.",
      city: "Стара Загора",
      type: "Продавам",
      category: "Спорт и хоби",
      image: "🏋️‍♂️",
    },
    {
      title: "Автомобилен акумулатор 12V",
      price: "95 лв.",
      city: "Плевен",
      type: "Продавам",
      category: "Авточасти",
      image: "🔋",
    },
    {
      title: "Услуга за ремонт на компютър",
      price: "По договаряне",
      city: "София",
      type: "Услуги",
      category: "Компютри",
      image: "💻",
    },
  ];

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

          <div className="hidden items-center gap-3 lg:flex mr-3">
            <a
              href="/login"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Вход
            </a>
            <a
              href="/register"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Регистрация
            </a>
          </div>

          <a href="/publish" className="ml-auto rounded-xl bg-white px-4 py-2.5 text-sm font-black text-blue-950 shadow-sm hover:bg-blue-50 lg:px-4 lg:py-2.5">
            Публикувай обява
          </a>
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

        <div className="grid gap-5 md:grid-cols-4">
          {[
            { icon: HomeIcon, label: "Имоти" },
            { icon: Car, label: "Автомобили" },
            { icon: Wrench, label: "Авточасти" },
            { icon: Smartphone, label: "Електроника" },
            { icon: Baby, label: "Детски стоки" },
            { icon: Trees, label: "Дом и градина" },
            { icon: Shirt, label: "Мода" },
            { icon: Trophy, label: "Спорт и хоби" },
            { icon: Hammer, label: "Услуги" },
            { icon: Briefcase, label: "Работа" },
            { icon: Monitor, label: "Компютри" },
            { icon: BookOpen, label: "Книги" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="group rounded-2xl bg-white p-7 text-center shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:ring-blue-300 hover:shadow-lg"
            >
              <Icon className="mx-auto h-9 w-9 text-blue-950" />
              <div className="mt-5 text-[20px] font-extrabold text-slate-950">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Latest Listings */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-4xl font-black text-blue-950">Последни обяви</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Прегледайте най-новите предложения в DaiVzemi, прегледани специално за вас.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {latestListings.map((listing) => (
            <article
              key={listing.title}
              className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative">
                <div className="flex h-56 items-center justify-center rounded-t-[28px] bg-blue-950 text-6xl text-white">
                  {listing.image}
                </div>
                <span className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-950 shadow-sm">
                  {listing.type}
                </span>
              </div>

              <div className="space-y-4 p-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-950">
                    {listing.title}
                  </h3>
                  <p className="text-lg font-extrabold text-blue-950">
                    {listing.price}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    {listing.city}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    {listing.category}
                  </span>
                </div>

                <button className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-blue-950 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-900">
                  Виж обявата
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}