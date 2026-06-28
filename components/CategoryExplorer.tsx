"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";

// ── Subcategory maps ──────────────────────────────────────────────────────────
// label values MUST exactly match the options in lib/data/categoryData.ts
// (they are stored in listings.details JSONB and filtered client-side)

type SubItem = { label: string; emoji: string };
type SubData = { paramKey: string; items: SubItem[] };

const SUBCATEGORIES: Record<string, SubData> = {
  "Електроника": {
    paramKey: "elDeviceType",
    items: [
      { label: "Телефони",        emoji: "📱" },
      { label: "Таблети",         emoji: "📟" },
      { label: "Лаптопи",         emoji: "💻" },
      { label: "Компютри",        emoji: "🖥️" },
      { label: "Телевизори",      emoji: "📺" },
      { label: "Конзоли",         emoji: "🎮" },
      { label: "Фотоапарати",     emoji: "📷" },
      { label: "Монитори",        emoji: "🖥️" },
      { label: "Смарт часовници", emoji: "⌚" },
      { label: "Аксесоари",       emoji: "🔌" },
    ],
  },
  "Имоти": {
    paramKey: "propertyType",
    items: [
      { label: "Апартамент",   emoji: "🏢" },
      { label: "Къща",         emoji: "🏠" },
      { label: "Етаж от къща", emoji: "🏘️" },
      { label: "Парцел",       emoji: "🗺️" },
      { label: "Офис",         emoji: "💼" },
      { label: "Магазин",      emoji: "🏪" },
      { label: "Гараж",        emoji: "🚗" },
      { label: "Склад",        emoji: "📦" },
    ],
  },
  "Автомобили": {
    paramKey: "vehicleType",
    items: [
      { label: "Леки автомобили", emoji: "🚗" },
      { label: "Джипове",         emoji: "🚙" },
      { label: "Ванове",          emoji: "🚐" },
      { label: "Микробуси",       emoji: "🚌" },
      { label: "Камиони",         emoji: "🚛" },
      { label: "Мотоциклети",     emoji: "🏍️" },
    ],
  },
  "Авточасти": {
    paramKey: "partType",
    items: [
      { label: "Двигател",        emoji: "⚙️" },
      { label: "Скоростна кутия", emoji: "🔄" },
      { label: "Окачване",        emoji: "🔧" },
      { label: "Купе",            emoji: "🚗" },
      { label: "Интериор",        emoji: "💺" },
      { label: "Джанти",          emoji: "⭕" },
      { label: "Гуми",            emoji: "🔘" },
      { label: "Акумулатори",     emoji: "🔋" },
      { label: "Аксесоари",       emoji: "🛒" },
    ],
  },
  "Услуги": {
    paramKey: "serviceCategory",
    items: [
      { label: "Ремонти",             emoji: "🔧" },
      { label: "Строителни услуги",   emoji: "🏗️" },
      { label: "Транспорт",           emoji: "🚛" },
      { label: "Почистване",          emoji: "🧹" },
      { label: "Компютърни услуги",   emoji: "💻" },
      { label: "Красота и козметика", emoji: "💄" },
      { label: "Обучение",            emoji: "📚" },
      { label: "Частни уроци",        emoji: "📝" },
    ],
  },
  "Работа": {
    paramKey: "jobCategory",
    items: [
      { label: "IT",                   emoji: "💻" },
      { label: "Продажби",             emoji: "📊" },
      { label: "Маркетинг",            emoji: "📣" },
      { label: "Администрация",        emoji: "🗂️" },
      { label: "Финанси",              emoji: "💰" },
      { label: "Ресторанти и хотели",  emoji: "🍽️" },
      { label: "Шофьори и куриери",    emoji: "🚗" },
      { label: "Строителство",         emoji: "🏗️" },
      { label: "Работа от вкъщи",      emoji: "🏠" },
    ],
  },
  "Компютри": {
    paramKey: "compType",
    items: [
      { label: "Лаптоп",             emoji: "💻" },
      { label: "Настолен компютър",  emoji: "🖥️" },
      { label: "All-in-One",         emoji: "🖥️" },
      { label: "Мини PC",            emoji: "💾" },
      { label: "Части за компютър",  emoji: "⚙️" },
    ],
  },
  "Детски стоки": {
    paramKey: "kidsItemType",
    items: [
      { label: "Дрехи",            emoji: "👕" },
      { label: "Обувки",           emoji: "👟" },
      { label: "Играчки",          emoji: "🧸" },
      { label: "Колички",          emoji: "🛒" },
      { label: "Детска стая",      emoji: "🛏️" },
      { label: "Учебни материали", emoji: "📚" },
    ],
  },
  "Дом и градина": {
    paramKey: "homeSubcategory",
    items: [
      { label: "Мебели",       emoji: "🛋️" },
      { label: "Декорация",    emoji: "🖼️" },
      { label: "Кухня",        emoji: "🍳" },
      { label: "Баня",         emoji: "🚿" },
      { label: "Осветление",   emoji: "💡" },
      { label: "Градина",      emoji: "🌱" },
      { label: "Инструменти",  emoji: "🔨" },
      { label: "Строителство", emoji: "🏗️" },
    ],
  },
  "Мода": {
    paramKey: "fashionType",
    items: [
      { label: "Горнища",         emoji: "👕" },
      { label: "Долнища",         emoji: "👖" },
      { label: "Рокли",           emoji: "👗" },
      { label: "Якета и палта",   emoji: "🧥" },
      { label: "Обувки",          emoji: "👟" },
      { label: "Аксесоари",       emoji: "👒" },
      { label: "Чанти",           emoji: "👜" },
      { label: "Спортно облекло", emoji: "🏃" },
    ],
  },
  "Спорт и хоби": {
    paramKey: "sportCategory",
    items: [
      { label: "Фитнес",          emoji: "💪" },
      { label: "Колоездене",      emoji: "🚴" },
      { label: "Футбол",          emoji: "⚽" },
      { label: "Тенис",           emoji: "🎾" },
      { label: "Зимни спортове",  emoji: "⛷️" },
      { label: "Риболов",         emoji: "🎣" },
      { label: "Музика",          emoji: "🎵" },
      { label: "Колекционерство", emoji: "🏺" },
    ],
  },
  "Книги": {
    paramKey: "bookGenre",
    items: [
      { label: "Художествена литература", emoji: "📖" },
      { label: "Детска литература",       emoji: "🧸" },
      { label: "Научна фантастика",       emoji: "🚀" },
      { label: "Технически",              emoji: "🔧" },
      { label: "Образователни",           emoji: "🎓" },
      { label: "История",                 emoji: "🏛️" },
      { label: "Бизнес",                  emoji: "💼" },
      { label: "Комикси",                 emoji: "💬" },
    ],
  },
  "Животни": {
    paramKey: "animalType",
    items: [
      { label: "Куче",             emoji: "🐕" },
      { label: "Котка",            emoji: "🐈" },
      { label: "Птица",            emoji: "🦜" },
      { label: "Зайче",            emoji: "🐇" },
      { label: "Хамстер / Гризач", emoji: "🐹" },
      { label: "Риба / Аквариум",  emoji: "🐟" },
      { label: "Кон",              emoji: "🐴" },
      { label: "Друго",            emoji: "🐾" },
    ],
  },
};

// Export for use in listings page to check if a category has subcategories
export const SUBCAT_PARAM: Record<string, string> = Object.fromEntries(
  Object.entries(SUBCATEGORIES).map(([cat, data]) => [cat, data.paramKey]),
);

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  category: string;
  onDismiss: () => void;
};

export default function CategoryExplorer({ category, onDismiss }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const data = SUBCATEGORIES[category];
  if (!data) return null;

  const navigate = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(data.paramKey, value);
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <div className="border-b border-slate-100 bg-white px-4 py-5 lg:px-6 lg:py-7">
      <div className="mx-auto max-w-7xl">
        {/* Header row */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 lg:text-xs">
            Какво търсите в&nbsp;
            <span className="text-blue-950">{category}</span>?
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="flex items-center gap-0.5 text-xs font-bold text-blue-950 transition hover:underline"
          >
            Всички обяви
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Subcategory grid */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data.items.map(({ label, emoji }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(label)}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-4 text-center shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md hover:shadow-blue-100/50 active:scale-[0.97] lg:px-3"
            >
              <span className="text-2xl leading-none transition-transform duration-150 group-hover:scale-110">
                {emoji}
              </span>
              <span className="text-[11px] font-bold leading-tight text-slate-800 lg:text-xs">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
