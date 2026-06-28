import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import {
  Baby,
  BookOpen,
  Briefcase,
  Car,
  Gamepad2,
  Gem,
  Hammer,
  Home as HomeIcon,
  PawPrint,
  Shirt,
  Smartphone,
  Trophy,
  Trees,
  Wrench,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Всички категории — DaiVzemi",
  description:
    "Разгледайте всички категории в DaiVzemi — обяви за електроника, автомобили, имоти, мода и много повече.",
};

// ─── Data ────────────────────────────────────────────────────────────────────
// Adding a new category: insert an item in the appropriate group below.
// Adding a new group: append a new object to CATEGORY_GROUPS.

const CATEGORY_GROUPS = [
  {
    label: "Транспорт и имоти",
    items: [
      { icon: Car,      label: "Автомобили",      hints: "Леки коли · Джипове · Мотори" },
      { icon: Wrench,   label: "Авточасти",        hints: "Двигатели · Гуми · Джанти" },
      { icon: HomeIcon, label: "Имоти",            hints: "Апартаменти · Къщи · Офиси" },
    ],
  },
  {
    label: "Електроника и технологии",
    items: [
      { icon: Smartphone, label: "Електроника", hints: "Телефони · Лаптопи · ТВ" },
      { icon: Gamepad2,   label: "Гейминг",     hints: "Конзоли · Игри · Аксесоари" },
    ],
  },
  {
    label: "Мода и стил",
    items: [
      { icon: Shirt, label: "Мода",              hints: "Дрехи · Обувки · Аксесоари" },
      { icon: Gem,   label: "Бижута и ценности", hints: "Пръстени · Гривни · Часовници" },
    ],
  },
  {
    label: "Дом и семейство",
    items: [
      { icon: Trees,    label: "Дом и градина", hints: "Мебели · Декорация · Градина" },
      { icon: Baby,     label: "Детски стоки",  hints: "Играчки · Дрехи · Колички" },
      { icon: PawPrint, label: "Животни",       hints: "Кучета · Котки · Птици" },
    ],
  },
  {
    label: "Свободно време",
    items: [
      { icon: Trophy,   label: "Спорт и хоби", hints: "Фитнес · Колоездене · Риболов" },
      { icon: BookOpen, label: "Книги",         hints: "Художествена · Техническа · Детска" },
    ],
  },
  {
    label: "Услуги и работа",
    items: [
      { icon: Hammer,   label: "Услуги", hints: "Ремонти · Транспорт · Почистване" },
      { icon: Briefcase, label: "Работа", hints: "IT · Маркетинг · Строителство" },
    ],
  },
] as const;

const TOTAL = CATEGORY_GROUPS.reduce((n, g) => n + g.items.length, 0);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50">

        {/* Compact page title — no hero background */}
        <div className="mx-auto max-w-7xl px-4 pb-1 pt-6 lg:px-6 lg:pt-8">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-black text-slate-900">Всички категории</h1>
            <span className="text-xs font-semibold text-slate-400">{TOTAL} категории</span>
          </div>
        </div>

        {/* Category groups */}
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 lg:px-6 lg:py-8">
          {CATEGORY_GROUPS.map((group) => (
            <section key={group.label}>

              {/* Group label */}
              <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
                {group.label}
              </p>

              {/* Cards — identical design, grid adapts to viewport */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                {group.items.map(({ icon: Icon, label, hints }) => (
                  <Link
                    key={label}
                    href={`/listings?category=${encodeURIComponent(label)}`}
                    className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-5 text-center shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md hover:shadow-blue-100/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:py-6"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 transition-all duration-200 group-hover:bg-blue-50 group-hover:scale-105">
                      <Icon
                        className="h-6 w-6 text-blue-950 transition-transform duration-200 group-hover:scale-110"
                        strokeWidth={1.8}
                      />
                    </div>
                    <div className="w-full min-w-0">
                      <p className="text-[13px] font-black leading-tight text-slate-900 group-hover:text-blue-950">
                        {label}
                      </p>
                      <p className="mt-1 text-[10px] font-medium leading-snug text-slate-400 group-hover:text-blue-500/70">
                        {hints}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

            </section>
          ))}

          {/* Browse all CTA */}
          <div className="flex justify-center pt-2">
            <Link
              href="/listings"
              className="rounded-2xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-950"
            >
              Виж всички обяви →
            </Link>
          </div>
        </div>

      </main>
    </>
  );
}
