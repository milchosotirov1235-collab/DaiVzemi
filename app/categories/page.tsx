import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import {
  Baby,
  BookOpen,
  Briefcase,
  Building2,
  Car,
  Gamepad2,
  Gem,
  Hammer,
  Home as HomeIcon,
  Landmark,
  PawPrint,
  Shirt,
  Smartphone,
  Sprout,
  Tractor,
  Trophy,
  Trees,
  Wheat,
  Wrench,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Всички категории — DaiVzemi",
  description:
    "Разгледайте всички категории в DaiVzemi — обяви за електроника, автомобили, имоти, мода и много повече.",
};

const CATEGORIES = [
  { icon: Smartphone, label: "Електроника",      hints: "Телефони · Лаптопи · ТВ" },
  { icon: Car,        label: "Автомобили",        hints: "Леки коли · Джипове · Мотори" },
  { icon: HomeIcon,   label: "Имоти",             hints: "Апартаменти · Къщи · Офиси" },
  { icon: Shirt,      label: "Мода",              hints: "Дрехи · Обувки · Аксесоари" },
  { icon: Wrench,     label: "Авточасти",         hints: "Двигатели · Гуми · Джанти" },
  { icon: Baby,       label: "Детски стоки",      hints: "Играчки · Дрехи · Колички" },
  { icon: Trees,      label: "Дом и градина",     hints: "Мебели · Декорация · Градина" },
  { icon: Trophy,     label: "Спорт и хоби",      hints: "Фитнес · Колоездене · Риболов" },
  { icon: Gamepad2,   label: "Гейминг",           hints: "Конзоли · Игри · Аксесоари" },
  { icon: Gem,        label: "Бижута и ценности", hints: "Пръстени · Гривни · Часовници" },
  { icon: Hammer,     label: "Услуги",            hints: "Ремонти · Транспорт · Почистване" },
  { icon: Briefcase,  label: "Работа",            hints: "IT · Маркетинг · Строителство" },
  { icon: PawPrint,   label: "Животни",                   hints: "Кучета · Котки · Птици" },
  { icon: BookOpen,   label: "Книги",                     hints: "Художествена · Техническа · Детска" },
  { icon: Landmark,   label: "Антики и колекции",         hints: "Монети · Картини · Военни предмети" },
  { icon: Wheat,      label: "Храни и местни продукти",   hints: "Мед · Сладка · Подправки · Ядки" },
  { icon: Sprout,     label: "Земеделие",                 hints: "Семена · Разсад · Фиданки · Торове" },
  { icon: Tractor,    label: "Селскостопанска техника",   hints: "Трактори · Косачки · Машини" },
  { icon: Building2,  label: "Бизнес оборудване",         hints: "Офис · Кафе · Хладилни витрини" },
] as const;

export default function CategoriesPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50">

        {/* Compact page title */}
        <div className="mx-auto max-w-7xl px-4 pb-1 pt-6 lg:px-6 lg:pt-8">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-black text-slate-900">Всички категории</h1>
            <span className="text-xs font-semibold text-slate-400">{CATEGORIES.length} категории</span>
          </div>
        </div>

        {/* Unified category grid */}
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {CATEGORIES.map(({ icon: Icon, label, hints }) => (
              <Link
                key={label}
                href={`/listings?category=${encodeURIComponent(label)}`}
                className="group flex flex-col items-center gap-3.5 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:py-7"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-50 transition-all duration-200 group-hover:bg-blue-50 group-hover:scale-105">
                  <Icon
                    className="h-[26px] w-[26px] text-blue-950 transition-transform duration-200 group-hover:scale-110"
                    strokeWidth={1.8}
                  />
                </div>
                <div className="w-full min-w-0">
                  <p className="text-sm font-black leading-tight text-slate-900 group-hover:text-blue-950">
                    {label}
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-snug text-slate-400 group-hover:text-blue-500/70">
                    {hints}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Browse all CTA */}
          <div className="mt-10 flex justify-center">
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
