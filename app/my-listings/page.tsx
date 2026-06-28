"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { CheckCircle2, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { formatDualPrice } from "@/lib/formatPrice";

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
  details: Record<string, string> | null;
};

const EXPIRY_DAYS = 60;

function isExpired(listing: Listing): boolean {
  if (!listing.expires_at) return false;
  return new Date(listing.expires_at) < new Date();
}

function daysUntilExpiry(listing: Listing): number | null {
  if (!listing.expires_at) return null;
  const ms = new Date(listing.expires_at).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function isExpiringSoon(listing: Listing): boolean {
  const days = daysUntilExpiry(listing);
  return days !== null && days > 0 && days <= 7;
}

function canRenewEarly(listing: Listing): boolean {
  const days = daysUntilExpiry(listing);
  // Allow renewal from 14 days before expiry, or after expiry
  return days !== null && days <= 14;
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
  const [soldId, setSoldId] = useState<string | null>(null);

  useEffect(() => {
    const loadUserAndListings = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoggedIn(false);
        setCurrentUserId(null);
        setLoading(false);
        router.push("/login?redirect=/my-listings");
        return;
      }

      setIsLoggedIn(true);
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("listings")
        .select("id, title, price, city, category, listing_type, created_at, expires_at, image_url, image_urls, moderation_status, details")
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

  const handleMarkSold = async (listingId: string, currentDetails: Record<string, string> | null) => {
    if (!currentUserId) return;
    setSoldId(listingId);
    const updatedDetails = { ...(currentDetails ?? {}), sold: "yes" };
    const { error } = await supabase
      .from("listings")
      .update({ details: updatedDetails, hidden: true })
      .eq("id", listingId)
      .eq("user_id", currentUserId);
    if (!error) {
      setListings((prev) =>
        prev.map((l) =>
          l.id === listingId ? { ...l, details: updatedDetails, hidden: true } : l
        ) as Listing[]
      );
    }
    setSoldId(null);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="border-b border-slate-100 bg-white px-4 py-5 lg:px-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-xl font-black text-slate-900">Моите обяви</h1>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
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
                          {formatDualPrice(listing.price)}
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

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-slate-500">
                            Публикувана: {formatDate(listing.created_at)}
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
                            {listing.details?.sold === "yes" ? (
                              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-white">
                                Продадено
                              </span>
                            ) : (listing.moderation_status === "approved" || listing.moderation_status === null) && (
                              isExpired(listing) ? (
                                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600 ring-1 ring-red-200">
                                  Изтекла
                                </span>
                              ) : isExpiringSoon(listing) ? (
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                                  Изтича скоро
                                </span>
                              ) : listing.moderation_status === "approved" ? (
                                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">
                                  Активна
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                                  Публикувана
                                </span>
                              )
                            )}
                          </div>
                        </div>
                        {listing.expires_at && (
                          <p className="text-xs font-semibold text-slate-500">
                            {isExpired(listing)
                              ? `Изтекла на: ${formatDate(listing.expires_at)}`
                              : `Активна до: ${formatDate(listing.expires_at)}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="space-y-3 px-6 pb-6">
                    {listing.moderation_status !== "rejected" && (
                      <Link
                        href={`/listing/${listing.id}`}
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-950 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-900"
                      >
                        Виж обявата
                      </Link>
                    )}

                    {listing.moderation_status === "pending" && (
                      <p className="text-center text-xs font-semibold text-amber-700">
                        Обявата ще бъде видима след одобрение от екипа.
                      </p>
                    )}

                    {listing.moderation_status === "rejected" && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-xs font-black text-red-700">Обявата е отхвърлена</p>
                        <p className="mt-1 text-xs font-semibold text-red-600">
                          Не се показва публично. Редактирайте я и я изпратете отново за преглед.
                        </p>
                        <Link
                          href={`/edit-listing/${listing.id}`}
                          className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-red-700"
                        >
                          Редактирай и подай отново
                        </Link>
                      </div>
                    )}

                    {canRenewEarly(listing) && (
                      <button
                        type="button"
                        onClick={() => handleRenew(listing.id)}
                        disabled={renewingId === listing.id}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-3 text-sm font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RefreshCw className={`h-4 w-4 ${renewingId === listing.id ? "animate-spin" : ""}`} />
                        {renewingId === listing.id
                          ? "Подновяване..."
                          : isExpired(listing)
                            ? "Поднови обявата"
                            : "Поднови за още 60 дни"}
                      </button>
                    )}

                    {listing.details?.sold !== "yes" && (
                      <button
                        type="button"
                        onClick={() => handleMarkSold(listing.id, listing.details)}
                        disabled={soldId === listing.id}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-700 hover:bg-slate-700 hover:text-white disabled:opacity-60"
                      >
                        {soldId === listing.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {soldId === listing.id ? "Запазване…" : "Маркирай като продадено"}
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
