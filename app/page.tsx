"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
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
import { supabase } from "@/lib/supabaseClient";

type Listing = {
  id: string;
  title: string;
  price: string | number | null;
  city: string | null;
  category: string | null;
  listing_type: string | null;
  image_url: string | null;
  image_urls: string[] | null;
};

const fallbackImageByCategory: Record<string, string> = {
  Имоти: "🏙️",
  Автомобили: "🚗",
  Авточасти: "🔧",
  Електроника: "📺",
  "Детски стоки": "🧸",
  "Дом и градина": "🏡",
  Мода: "👗",
  "Спорт и хоби": "🏀",
  Услуги: "🛠️",
  Работа: "💼",
  Компютри: "💻",
  Книги: "📚",
};

export default function Home() {
  const [latestListings, setLatestListings] = useState<Listing[]>([]);

  useEffect(() => {
    const loadLatestListings = async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, price, city, category, listing_type, image_url, image_urls")
        .order("created_at", { ascending: false })
        .limit(8);

      if (!error && data) {
        setLatestListings(data as Listing[]);
      } else {
        setLatestListings([]);
      }
    };

    loadLatestListings();
  }, []);

  const formatPrice = (value: string | number | null) => {
    if (value === null || value === undefined || value === "") {
      return "По договаряне";
    }

    const formatted = String(value).trim();
    if (/€|EUR|\$|USD|лв|BGN/i.test(formatted)) {
      return formatted;
    }

    return `${formatted} €`;
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

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
              className="flex-1 rounded-2xl bg-white px-5 py-4 text-lg font-bold text-slate-950 caret-blue-950 outline-none placeholder:text-slate-400"
            />

            <input
              type="text"
              placeholder="Град"
              className="rounded-2xl bg-white px-5 py-4 text-lg font-bold text-slate-950 caret-blue-950 outline-none placeholder:text-slate-400 md:w-60"
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

        {latestListings.length === 0 ? (
          <div className="mt-10 rounded-[28px] border border-dashed border-slate-300 bg-white px-8 py-16 text-center shadow-sm">
            <p className="text-2xl font-black text-slate-900">Все още няма обяви</p>
            <p className="mt-2 text-sm text-slate-600">
              Първата публикация ще се появи тук скоро.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {latestListings.map((listing, index) => (
              <article
                key={listing.id ?? `${listing.title}-${index}`}
                className="group cursor-pointer overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <Link href={`/listing/${listing.id}`} className="block">
                  <div className="relative">
                    {(() => {
                      const cardImage = listing.image_urls?.find(Boolean) ?? listing.image_url;
                      return cardImage ? (
                        <img
                          src={cardImage}
                          alt={listing.title}
                          className="h-56 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-56 items-center justify-center rounded-t-[28px] bg-blue-950 text-6xl text-white transition duration-300 group-hover:bg-blue-900">
                          {listing.category ? fallbackImageByCategory[listing.category] ?? "📦" : "📦"}
                        </div>
                      );
                    })()}
                    <span className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-950 shadow-sm">
                      {listing.listing_type ?? "Обява"}
                    </span>
                  </div>

                  <div className="space-y-4 p-6">
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-950">
                        {listing.title}
                      </h3>
                      <p className="text-lg font-extrabold text-blue-950">
                        {formatPrice(listing.price)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {listing.city ?? "Без град"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {listing.category ?? "Без категория"}
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="px-6 pb-6">
                  <Link
                    href={`/listing/${listing.id}`}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-950 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-900"
                  >
                    Виж обявата
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}