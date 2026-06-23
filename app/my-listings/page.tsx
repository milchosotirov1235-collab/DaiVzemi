"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ModerationStatus = "pending" | "approved" | "rejected" | null;

type Listing = {
  id: string;
  title: string;
  price: string | number | null;
  city: string | null;
  category: string | null;
  listing_type: string | null;
  created_at: string | null;
  expires_at: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  moderation_status: ModerationStatus;
};

const EXPIRY_DAYS = 60;

function isExpired(listing: Listing): boolean {
  if (!listing.expires_at) return false;
  return new Date(listing.expires_at) < new Date();
}

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

const formatDate = (value: string | null) => {
  if (!value) return "Няма дата";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Няма дата";

  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

export default function MyListingsPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);

  useEffect(() => {
    const loadUserAndListings = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoggedIn(false);
        setCurrentUserId(null);
        setLoading(false);
        router.push("/login");
        return;
      }

      setIsLoggedIn(true);
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("listings")
        .select("id, title, price, city, category, listing_type, created_at, expires_at, image_url, image_urls, moderation_status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setListings(data as Listing[]);
      } else {
        setListings([]);
      }

      setLoading(false);
    };

    loadUserAndListings();
  }, []);

  const openDeleteModal = (listingId: string) => {
    setListingToDelete(listingId);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setListingToDelete(null);
  };

  const handleDelete = async () => {
    if (!currentUserId || !listingToDelete) return;

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingToDelete)
      .eq("user_id", currentUserId);

    if (!error) {
      setListings((prev) => prev.filter((listing) => listing.id !== listingToDelete));
    }

    closeDeleteModal();
  };

  const handleRenew = async (listingId: string) => {
    if (!currentUserId) return;
    setRenewingId(listingId);

    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + EXPIRY_DAYS);

    const { error } = await supabase
      .from("listings")
      .update({ expires_at: newExpiry.toISOString() })
      .eq("id", listingId)
      .eq("user_id", currentUserId);

    if (!error) {
      setListings((prev) =>
        prev.map((l) =>
          l.id === listingId ? { ...l, expires_at: newExpiry.toISOString() } : l
        )
      );
    }

    setRenewingId(null);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">
            DaiVzemi
          </p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">Моите обяви</h1>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {loading ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="text-base font-semibold text-slate-600">Зареждане...</p>
          </div>
        ) : !isLoggedIn ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-xl font-black text-slate-900">
              Трябва да влезете в профила си, за да видите своите обяви.
            </p>
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-xl font-black text-slate-900">
              Все още нямате публикувани обяви.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Публикуването е безплатно и отнема под 2 минути.
            </p>
            <Link
              href="/publish"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-900"
            >
              Публикувай нова обява
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Link
                href="/publish"
                className="inline-flex items-center justify-center rounded-2xl bg-blue-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-900"
              >
                Публикувай нова обява
              </Link>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <article
                  key={listing.id}
                  className="group cursor-pointer overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <Link href={`/listing/${listing.id}`} className="block">
                    {(() => {
                      const cardImage = listing.image_urls?.find(Boolean) ?? listing.image_url;
                      return cardImage ? (
                        <img
                          src={cardImage}
                          alt={listing.title}
                          className="h-52 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-52 items-center justify-center bg-blue-950 text-5xl text-white transition duration-300 group-hover:bg-blue-900">
                          {listing.category ? fallbackImageByCategory[listing.category] ?? "📦" : "📦"}
                        </div>
                      );
                    })()}

                    <div className="space-y-4 p-6">
                      <div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-950">
                          {listing.listing_type ?? "Обява"}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-950">
                          {listing.title}
                        </h2>
                        <p className="mt-2 text-2xl font-black text-blue-950">
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

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-slate-500">
                          {formatDate(listing.created_at)}
                        </p>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {listing.moderation_status === "pending" && (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                              Очаква преглед
                            </span>
                          )}
                          {listing.moderation_status === "rejected" && (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600 ring-1 ring-red-200">
                              Отхвърлена
                            </span>
                          )}
                          {(listing.moderation_status === "approved" || listing.moderation_status === null) && (
                            isExpired(listing) ? (
                              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600 ring-1 ring-red-200">
                                Изтекла
                              </span>
                            ) : (
                              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">
                                Активна
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="space-y-3 px-6 pb-6">
                    <Link
                      href={`/listing/${listing.id}`}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-950 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-900"
                    >
                      Виж обявата
                    </Link>

                    {listing.moderation_status === "pending" && (
                      <p className="text-center text-xs font-semibold text-amber-700">
                        Обявата ще бъде видима след одобрение от екипа.
                      </p>
                    )}

                    {isExpired(listing) && (
                      <button
                        type="button"
                        onClick={() => handleRenew(listing.id)}
                        disabled={renewingId === listing.id}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-3 text-sm font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RefreshCw className={`h-4 w-4 ${renewingId === listing.id ? "animate-spin" : ""}`} />
                        {renewingId === listing.id ? "Подновяване..." : "Поднови обявата"}
                      </button>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Link
                        href={`/edit-listing/${listing.id}`}
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-blue-950 bg-white px-4 py-3 text-sm font-black text-blue-950 transition hover:bg-blue-50"
                      >
                        Редактирай
                      </Link>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(listing.id)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-950 bg-white px-4 py-3 text-sm font-black text-blue-950 transition hover:bg-blue-950 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                        Изтрий
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {deleteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl ring-1 ring-slate-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-950">Изтриване на обява</h3>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Сигурни ли сте, че искате да изтриете тази обява?
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Отказ
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Изтрий
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
