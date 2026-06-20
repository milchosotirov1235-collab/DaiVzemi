"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import UnverifiedBanner from "@/components/UnverifiedBanner";
import { ChevronLeft, ChevronRight, Heart, Loader2, MessageCircle, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Listing = {
  id: string;
  title: string;
  price: string | number | null;
  category: string | null;
  city: string | null;
  listing_type: string | null;
  description: string | null;
  created_at: string | null;
  expires_at: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  user_id: string | null;
};

const REPORT_REASONS = [
  "Измама",
  "Спам",
  "Неподходящо съдържание",
  "Невярна информация",
  "Друго",
];

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

  if (Number.isNaN(date.getTime())) {
    return "Няма дата";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

export default function ListingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [contactingLoading, setContactingLoading] = useState(false);

  // Report state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<"listing" | "user">("listing");
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const images = listing
    ? Array.from(
        new Set(
          [
            ...(listing.image_urls ?? []),
            listing.image_url,
          ].filter(Boolean) as string[]
        )
      )
    : [];

  const mainImage = images[selectedImageIndex] ?? null;
  const hasImages = images.length > 0;
  const hasMultipleImages = images.length > 1;

  const goToPreviousImage = () => {
    if (!hasMultipleImages) return;

    setSelectedImageIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
  };

  const goToNextImage = () => {
    if (!hasMultipleImages) return;

    setSelectedImageIndex((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
  };


const toggleFavorite = async () => {
  if (!userId) {
setNoticeMessage("Влезте в профила си, за да добавяте любими.");
    return;
  }

  if (isFavorite) {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("listing_id", Number(id));

    setIsFavorite(false);
  } else {
    await supabase.from("favorites").insert({
      user_id: userId,
      listing_id: Number(id),
    });

    setIsFavorite(true);
  }
};

  const handleContactSeller = async () => {
    if (listing?.expires_at && new Date(listing.expires_at) < new Date()) {
      setNoticeMessage("Обявата е изтекла и не може да бъде контактувана.");
      return;
    }

    if (!userId) {
      setNoticeMessage("Влезте в профила си, за да изпратите съобщение.");
      return;
    }

    if (!isEmailVerified) {
      setNoticeMessage("Трябва да потвърдите имейла си, преди да изпращате съобщения.");
      return;
    }

    if (!listing?.user_id) return;

    if (listing.user_id === userId) {
      setNoticeMessage("Не можете да изпратите съобщение до себе си.");
      return;
    }

    setContactingLoading(true);

    // Find existing conversation or create a new one
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", id)
      .eq("buyer_id", userId)
      .maybeSingle();

    if (existing) {
      router.push(`/messages/${existing.id}`);
      return;
    }

    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        listing_id: Number(id),
        buyer_id: userId,
        seller_id: listing.user_id,
      })
      .select("id")
      .single();

    setContactingLoading(false);

    if (error || !created) {
      setNoticeMessage("Грешка при свързване с продавача. Опитайте отново.");
      return;
    }

    // Create listing inquiry notification for the seller
    await supabase.from("notifications").insert({
      user_id: listing.user_id,
      type: "listing_inquiry",
      conversation_id: created.id,
      body: `Нов интерес към обявата ви: ${listing.title}`,
    });

    router.push(`/messages/${created.id}`);
  };

  const submitReport = async () => {
    if (!reportReason) return;
    if (!userId) {
      setReportError("Влезте в профила си, за да докладвате.");
      return;
    }
    setReportSubmitting(true);
    setReportError(null);

    const payload: Record<string, unknown> = {
      reporter_user_id: userId,
      reason: reportReason,
      description: reportDescription.trim() || null,
      status: "open",
    };
    if (reportTarget === "listing") {
      payload.reported_listing_id = Number(id);
    } else {
      payload.reported_user_id = listing?.user_id ?? null;
    }

    const { error } = await supabase.from("reports").insert(payload);
    setReportSubmitting(false);

    if (error) {
      setReportError("Грешка при изпращане. Опитайте отново.");
    } else {
      setReportDone(true);
      setReportOpen(false);
    }
  };

  const openReport = (target: "listing" | "user") => {
    if (!userId) {
      setNoticeMessage("Влезте в профила си, за да докладвате.");
      return;
    }
    if (!isEmailVerified) {
      setNoticeMessage("Трябва да потвърдите имейла си, преди да докладвате.");
      return;
    }
    setReportTarget(target);
    setReportReason("");
    setReportDescription("");
    setReportError(null);
    setReportOpen(true);
  };

  useEffect(() => {
    const loadListing = async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, price, category, city, listing_type, description, created_at, expires_at, image_url, image_urls, user_id"
        )
        .eq("id", id)
        .single<Listing>();

      if (!error && data) {
        setListing(data);
        setSelectedImageIndex(0);
      } else {
        setListing(null);
      }

      setLoading(false);
    };

if (id) {
  loadListing();

  supabase.auth.getUser().then(({ data }) => {
    if (data.user) {
      setUserId(data.user.id);
      setIsEmailVerified(!!data.user.email_confirmed_at);
    }
  });
}
  }, [id]);

  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }

      if (event.key === "ArrowLeft") {
        goToPreviousImage();
      }

      if (event.key === "ArrowRight") {
        goToNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, hasMultipleImages, images.length]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-6 py-16">
          <div className="rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-slate-200">
            <p className="text-base font-semibold text-slate-600">
              Зареждане...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-6 py-16">
          <div className="w-full rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-slate-200">
            <p className="text-2xl font-black text-slate-900">
              Обявата не е намерена
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-900"
            >
              Назад към началото
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const placeholderEmoji = listing.category
    ? fallbackImageByCategory[listing.category] ?? "📦"
    : "📦";

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      {isEmailVerified === false && <UnverifiedBanner />}

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-14 text-white">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
          >
            ← Назад към началото
          </Link>
        </div>
      </section>

      <section className="px-6 pb-16 pt-6">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900">
              {hasImages && mainImage ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="block w-full"
                  >
                    <img
                      src={mainImage}
                      alt={listing.title}
                      className="h-[420px] w-full object-cover"
                    />
                  </button>

                  {hasMultipleImages ? (
                    <>
                      <button
                        type="button"
                        onClick={goToPreviousImage}
                        className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/45 text-white shadow-lg backdrop-blur transition hover:bg-slate-950/70"
                        aria-label="Предишна снимка"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      <button
                        type="button"
                        onClick={goToNextImage}
                        className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/45 text-white shadow-lg backdrop-blur transition hover:bg-slate-950/70"
                        aria-label="Следваща снимка"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>

                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/60 px-4 py-2 text-sm font-bold text-white backdrop-blur">
                        {selectedImageIndex + 1} / {images.length}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="flex h-[420px] items-center justify-center overflow-hidden text-7xl text-white">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_18%)]" />
                  <span className="relative z-10">{placeholderEmoji}</span>
                </div>
              )}

              <div className="absolute left-4 top-4 flex flex-wrap gap-2 sm:left-6 sm:top-6">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-950 shadow-sm">
                  {listing.listing_type ?? "Обява"}
                </span>

                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-950 shadow-sm">
                  {listing.category ?? "Без категория"}
                </span>
              </div>
            </div>

            {hasImages ? (
              <div className="grid grid-cols-4 gap-3 p-4 sm:grid-cols-6">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`overflow-hidden rounded-2xl border transition ${
                      selectedImageIndex === index
                        ? "border-blue-950 ring-2 ring-blue-950/20"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${listing.title} ${index + 1}`}
                      className="h-20 w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="space-y-6 p-6 sm:p-10">
              <div className="space-y-3">
                <h1 className="text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
                  {listing.title}
                </h1>


{listing.expires_at && new Date(listing.expires_at) < new Date() && (
  <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
    <span className="text-sm font-black text-red-700">Обявата е изтекла</span>
  </div>
)}

<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <p className="text-4xl font-black text-blue-950 sm:text-5xl">
    {formatPrice(listing.price)}
  </p>

  <div className="flex flex-wrap gap-3">
    {listing.user_id !== userId && !(listing.expires_at && new Date(listing.expires_at) < new Date()) && (
      <button
        type="button"
        onClick={handleContactSeller}
        disabled={contactingLoading}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <MessageCircle className="h-5 w-5" />
        {contactingLoading ? "Зареждане..." : "Изпрати съобщение"}
      </button>
    )}

    <button
      type="button"
      onClick={toggleFavorite}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black transition ${
        isFavorite
          ? "border-blue-950 bg-blue-950 text-white"
          : "border-blue-950 bg-white text-blue-950 hover:bg-blue-50"
      }`}
    >
      <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
      {isFavorite ? "В любими" : "Добави в любими"}
    </button>
  </div>
</div>

{listing.user_id && listing.user_id !== userId && (
  <div className="mt-1">
    <Link
      href={`/user/${listing.user_id}`}
      className="text-xs font-semibold text-slate-500 underline underline-offset-2 transition hover:text-blue-950"
    >
      Виж профила на продавача →
    </Link>
  </div>
)}

{noticeMessage && (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
    {noticeMessage}
  </div>
)}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Град
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {listing.city ?? "Без град"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Категория
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {listing.category ?? "Без категория"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Публикувана
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {formatDate(listing.created_at)}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Описание
                </p>

                <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-slate-700">
                  {listing.description || "Няма описание."}
                </p>
              </div>

              <div className="flex justify-start">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-900"
                >
                  Назад към началото
                </Link>
              </div>

              {/* ── Report section ── */}
              {listing.user_id !== userId && (
                <div className="border-t border-slate-100 pt-5">
                  {reportDone ? (
                    <p className="text-xs font-semibold text-green-700">
                      ✓ Докладът е изпратен. Ще го разгледаме скоро.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-slate-400">
                        Забелязахте проблем?{" "}
                        <button
                          type="button"
                          onClick={() => openReport("listing")}
                          className="font-semibold text-slate-500 underline underline-offset-2 transition hover:text-red-600"
                        >
                          Докладвай обявата
                        </button>
                        {listing.user_id && (
                          <>
                            {" · "}
                            <button
                              type="button"
                              onClick={() => openReport("user")}
                              className="font-semibold text-slate-500 underline underline-offset-2 transition hover:text-red-600"
                            >
                              Докладвай потребителя
                            </button>
                          </>
                        )}
                      </p>

                      {reportOpen && (
                        <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-5">
                          <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm font-black text-slate-900">
                              {reportTarget === "listing"
                                ? "Докладвай обявата"
                                : "Докладвай потребителя"}
                            </p>
                            <button
                              type="button"
                              onClick={() => setReportOpen(false)}
                              className="rounded-lg p-1 text-slate-400 transition hover:text-slate-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <select
                              value={reportReason}
                              onChange={(e) => setReportReason(e.target.value)}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                            >
                              <option value="">Изберете причина</option>
                              {REPORT_REASONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>

                            <textarea
                              value={reportDescription}
                              onChange={(e) => setReportDescription(e.target.value)}
                              rows={3}
                              placeholder="Допълнително описание (по желание)"
                              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                            />

                            {reportError && (
                              <p className="text-xs font-semibold text-red-600">{reportError}</p>
                            )}

                            <button
                              type="button"
                              onClick={submitReport}
                              disabled={reportSubmitting || !reportReason}
                              className="flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {reportSubmitting && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              )}
                              Изпрати доклада
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {isModalOpen && mainImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-6xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-3 top-3 z-20 rounded-full bg-slate-900/75 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-900"
            >
              ✕
            </button>

            <div className="absolute left-3 top-3 z-20 rounded-full bg-slate-900/75 px-3 py-1.5 text-sm font-semibold text-white">
              {selectedImageIndex + 1} / {images.length}
            </div>

            {hasMultipleImages ? (
              <>
                <button
                  type="button"
                  onClick={goToPreviousImage}
                  className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/60 text-white shadow-lg backdrop-blur transition hover:bg-slate-950/80"
                  aria-label="Предишна снимка"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  type="button"
                  onClick={goToNextImage}
                  className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/60 text-white shadow-lg backdrop-blur transition hover:bg-slate-950/80"
                  aria-label="Следваща снимка"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}

            <img
              src={mainImage}
              alt={listing.title}
              className="max-h-[92vh] max-w-full rounded-3xl object-contain shadow-2xl"
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}