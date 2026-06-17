"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

export default function ListingPage() {
  const params = useParams();
  const id = params?.id as string;

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const galleryImages = (listing?.image_urls ?? []).filter(Boolean) as string[];
  const hasGallery = galleryImages.length > 0;
  const mainImage = selectedImage ?? listing?.image_url ?? null;

  const goToPreviousImage = () => {
    if (!galleryImages.length) return;
    const currentIndex = galleryImages.findIndex((image) => image === mainImage);
    const previousIndex =
      currentIndex <= 0 ? galleryImages.length - 1 : currentIndex - 1;
    setSelectedImage(galleryImages[previousIndex]);
  };

  const goToNextImage = () => {
    if (!galleryImages.length) return;
    const currentIndex = galleryImages.findIndex((image) => image === mainImage);
    const nextIndex =
      currentIndex === -1 || currentIndex === galleryImages.length - 1
        ? 0
        : currentIndex + 1;
    setSelectedImage(galleryImages[nextIndex]);
  };

  useEffect(() => {
    const loadListing = async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, price, category, city, listing_type, description, created_at, image_url, image_urls"
        )
        .eq("id", id)
        .single<Listing>();

      if (!error && data) {
        setListing(data);
        const firstImage = (data.image_urls ?? []).filter(Boolean)[0] ?? data.image_url;
        setSelectedImage(firstImage ?? null);
      } else {
        setListing(null);
        setSelectedImage(null);
      }

      setLoading(false);
    };

    if (id) {
      loadListing();
    }
  }, [id]);

  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPreviousImage();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, goToPreviousImage, goToNextImage]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
          <div className="rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-slate-200">
            <p className="text-base font-semibold text-slate-600">Зареждане...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
          <div className="w-full rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-slate-200">
            <p className="text-2xl font-black text-slate-900">Обявата не е намерена</p>
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
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-16 text-white">
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
              {mainImage ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="block w-full"
                  >
                    <img
                      src={mainImage}
                      alt={listing.title}
                      className="h-[420px] w-full max-w-full object-cover"
                    />
                  </button>

                  {hasGallery ? (
                    <>
                      <button
                        type="button"
                        onClick={goToPreviousImage}
                        className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/45 text-white shadow-lg backdrop-blur transition hover:bg-slate-950/65"
                        aria-label="Предишна снимка"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={goToNextImage}
                        className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/45 text-white shadow-lg backdrop-blur transition hover:bg-slate-950/65"
                        aria-label="Следваща снимка"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
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

            {hasGallery ? (
              <div className="grid grid-cols-4 gap-3 p-4 sm:grid-cols-6">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={`overflow-hidden rounded-2xl border ${mainImage === image ? "border-blue-950" : "border-slate-200"}`}
                  >
                    <img src={image} alt={`${listing.title} ${index + 1}`} className="h-20 w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="space-y-6 p-6 sm:p-10">
              <div className="space-y-3">
                <h1 className="text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
                  {listing.title}
                </h1>
                <p className="text-4xl font-black text-blue-950 sm:text-5xl">
                  {formatPrice(listing.price)}
                </p>
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
            </div>
          </div>
        </div>
      </section>

      {isModalOpen && mainImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl transition-transform duration-300"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-full bg-slate-900/70 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-900"
            >
              ✕
            </button>

            {galleryImages.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goToPreviousImage();
                  }}
                  className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/55 text-white shadow-lg backdrop-blur transition hover:bg-slate-950/75"
                  aria-label="Предишна снимка"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goToNextImage();
                  }}
                  className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/55 text-white shadow-lg backdrop-blur transition hover:bg-slate-950/75"
                  aria-label="Следваща снимка"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}

            <img
              src={mainImage}
              alt={listing.title}
              className="max-h-[90vh] w-full object-contain transition-all duration-300"
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
