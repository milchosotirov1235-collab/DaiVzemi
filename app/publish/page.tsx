"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PublishPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("Имоти");
  const [listingType, setListingType] = useState("Продавам");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;
    if (!user) {
      setError("Трябва да влезете в профила си, за да публикувате обява.");
      return;
    }

    setLoading(true);

    const { error: insertError } = await supabase.from("listings").insert([
      {
        title,
        description,
        price,
        city,
        category,
        listing_type: listingType,
        user_id: user.id,
      },
    ]);

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess("Обявата е публикувана успешно.");
    setTitle("");
    setDescription("");
    setPrice("");
    setCity("");
    setCategory("Имоти");
    setListingType("Продавам");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black md:text-6xl">Публикувай обява</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-blue-100">
            Създай своята обява безплатно за няколко минути.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-200 md:p-12">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-blue-950">Форма за публикуване</h2>
            <p className="mt-3 max-w-2xl text-base text-slate-600">
              Попълнете полетата, за да публикувате бързо и лесно обявата си.
            </p>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
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

            <div className="grid gap-6 lg:grid-cols-2">
              <label className="space-y-3">
                <span className="text-sm font-semibold text-slate-700">Заглавие</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  type="text"
                  placeholder="Например: Модерен апартамент в центъра"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-3">
                <span className="text-sm font-semibold text-slate-700">Тип обява</span>
                <select
                  value={listingType}
                  onChange={(e) => setListingType(e.target.value)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option>Продавам</option>
                  <option>Подарявам</option>
                  <option>Разменям</option>
                  <option>Търся</option>
                </select>
              </label>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <label className="space-y-3">
                <span className="text-sm font-semibold text-slate-700">Категория</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option>Имоти</option>
                  <option>Автомобили</option>
                  <option>Авточасти</option>
                  <option>Електроника</option>
                  <option>Детски стоки</option>
                  <option>Дом и градина</option>
                  <option>Мода</option>
                  <option>Спорт и хоби</option>
                  <option>Услуги</option>
                  <option>Работа</option>
                  <option>Компютри</option>
                  <option>Книги</option>
                </select>
              </label>

              <label className="space-y-3">
                <span className="text-sm font-semibold text-slate-700">Цена</span>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  type="text"
                  placeholder="Например: 500 лв."
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <label className="space-y-3">
              <span className="text-sm font-semibold text-slate-700">Град</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                type="text"
                placeholder="Например: София"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-3">
              <span className="text-sm font-semibold text-slate-700">Описание</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Опишете детайлно състоянието, характеристики и допълнителни условия."
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-base font-semibold text-slate-700">Снимки upload placeholder</p>
              <p className="mt-3 text-sm text-slate-500">Добавете до 5 снимки, за да направите обявата по-привлекателна.</p>
              <div className="mt-6 inline-flex rounded-2xl border border-blue-950 bg-blue-950 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-900">
                Избери файлове
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-3xl bg-blue-950 px-6 py-4 text-base font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Публикуване..." : "Публикувай"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
