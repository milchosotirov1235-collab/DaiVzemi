"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import UnverifiedBanner from "@/components/UnverifiedBanner";
import {

  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { checkReportRateLimit } from "@/lib/security/rateLimit";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ModerationStatus = "pending" | "approved" | "rejected" | null;

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
  moderation_status: ModerationStatus;
  details: Record<string, unknown> | null;
};

type SellerProfile = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  city: string | null;
  created_at: string | null;
  phone: string | null;
};

type SimilarListing = {
  id: string;
  title: string;
  price: string | number | null;
  city: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  category: string | null;
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

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

const DETAIL_LABELS: Record<string, string> = {
  // Shared
  brand: "Марка",
  model: "Модел",
  condition: "Състояние",
  color: "Цвят",
  // Автомобили
  year: "Година",
  mileage: "Пробег",
  fuel: "Гориво",
  transmission: "Скоростна кутия",
  engine: "Двигател",
  power: "Мощност (к.с.)",
  // Имоти
  property_type: "Тип имот",
  rooms: "Стаи",
  area: "Площ (кв.м)",
  floor: "Етаж",
  total_floors: "Брой етажи",
  construction_type: "Конструкция",
  furnishing: "Обзавеждане",
  heating: "Отопление",
  // Работа
  employment_type: "Тип заетост",
  experience: "Опит",
  education: "Образование",
  salary: "Заплата",
  // Услуги
  service_type: "Тип услуга",
  // Електроника / Компютри
  storage: "Памет",
  ram: "RAM",
  processor: "Процесор",
  // Авточасти
  part_type: "Вид резервна част",
  // Книги
  author: "Автор",
  genre: "Жанр",
  // Misc
  size: "Размер",
  material: "Материал",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatPrice = (value: string | number | null) => {
  if (value === null || value === undefined || value === "") return "По договаряне";
  const formatted = String(value).trim();
  if (/€|EUR|\$|USD|лв|BGN/i.test(formatted)) return formatted;
  return `${formatted} €`;
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("bg-BG", { day: "2-digit", month: "long", year: "numeric" }).format(date);
};

const formatMonthYear = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric" }).format(date);
};

function getDetailEntries(details: Record<string, unknown> | null): [string, string][] {
  if (!details) return [];
  return Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => [DETAIL_LABELS[k] ?? k, String(v)]);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SimilarCard({ listing }: { listing: SimilarListing }) {
  const thumb = listing.image_urls?.[0] ?? listing.image_url ?? null;
  const emoji = listing.category ? (fallbackImageByCategory[listing.category] ?? "📦") : "📦";
  return (
    <Link
      href={`/listing/${listing.id}`}
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {thumb ? (
        <img src={thumb} alt={listing.title} className="h-36 w-full object-cover" />
      ) : (
        <div className="flex h-36 items-center justify-center bg-gradient-to-br from-blue-950 to-slate-800 text-4xl">
          {emoji}
        </div>
      )}
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-bold text-slate-900 group-hover:text-blue-950">
          {listing.title}
        </p>
        <p className="mt-1 text-sm font-black text-blue-950">{formatPrice(listing.price)}</p>
        {listing.city && (
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{listing.city}</p>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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

  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [similar, setSimilar] = useState<SimilarListing[]>([]);

  // Report state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<"listing" | "user">("listing");
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // ── Derived ─────────────────────────────────────────────────────────────

  const images = listing
    ? Array.from(
        new Set([...(listing.image_urls ?? []), listing.image_url].filter(Boolean) as string[])
      )
    : [];

  const mainImage = images[selectedImageIndex] ?? null;
  const hasImages = images.length > 0;
  const hasMultipleImages = images.length > 1;

  const goToPreviousImage = () => {
    if (!hasMultipleImages) return;
    setSelectedImageIndex((c) => (c === 0 ? images.length - 1 : c - 1));
  };

  const goToNextImage = () => {
    if (!hasMultipleImages) return;
    setSelectedImageIndex((c) => (c === images.length - 1 ? 0 : c + 1));
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const toggleFavorite = async () => {
    if (!userId) { setNoticeMessage("Влезте в профила си, за да добавяте любими."); return; }
    if (isFavorite) {
      await supabase.from("favorites").delete().eq("user_id", userId).eq("listing_id", Number(id));
      setIsFavorite(false);
    } else {
      await supabase.from("favorites").insert({ user_id: userId, listing_id: Number(id) });
      setIsFavorite(true);
    }
  };

  const handleContactSeller = async () => {
    if (listing?.expires_at && new Date(listing.expires_at) < new Date()) {
      setNoticeMessage("Обявата е изтекла и не може да бъде контактувана.");
      return;
    }
    if (!userId) { setNoticeMessage("Влезте в профила си, за да изпратите съобщение."); return; }
    if (!isEmailVerified) { setNoticeMessage("Трябва да потвърдите имейла си, преди да изпращате съобщения."); return; }
    if (!listing?.user_id) return;
    if (listing.user_id === userId) { setNoticeMessage("Не можете да изпратите съобщение до себе си."); return; }

    setContactingLoading(true);

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", id)
      .eq("buyer_id", userId)
      .maybeSingle();

    if (existing) { router.push(`/messages/${existing.id}`); return; }

    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ listing_id: Number(id), buyer_id: userId, seller_id: listing.user_id })
      .select("id")
      .single();

    setContactingLoading(false);
    if (error || !created) { setNoticeMessage("Грешка при свързване с продавача. Опитайте отново."); return; }

    await supabase.from("notifications").insert({
      user_id: listing.user_id,
      type: "listing_inquiry",
      conversation_id: created.id,
      body: `Нов интерес към обявата ви: ${listing.title}`,
    });

    router.push(`/messages/${created.id}`);
  };

  const openReport = (target: "listing" | "user") => {
    if (!userId) { setNoticeMessage("Влезте в профила си, за да докладвате."); return; }
    if (!isEmailVerified) { setNoticeMessage("Трябва да потвърдите имейла си, преди да докладвате."); return; }
    setReportTarget(target);
    setReportReason("");
    setReportDescription("");
    setReportError(null);
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!reportReason) return;
    if (!userId) { setReportError("Влезте в профила си, за да докладвате."); return; }
    setReportSubmitting(true);
    setReportError(null);

    const rateResult = await checkReportRateLimit(userId);
    if (!rateResult.allowed) { setReportError(rateResult.reason); setReportSubmitting(false); return; }

    const payload: Record<string, unknown> = {
      reporter_user_id: userId,
      reason: reportReason,
      description: reportDescription.trim() || null,
      status: "open",
    };
    if (reportTarget === "listing") payload.reported_listing_id = Number(id);
    else payload.reported_user_id = listing?.user_id ?? null;

    const { error } = await supabase.from("reports").insert(payload);
    setReportSubmitting(false);
    if (error) setReportError("Грешка при изпращане. Опитайте отново.");
    else { setReportDone(true); setReportOpen(false); }
  };

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      // Auth (non-blocking for listing render)
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;
      if (user) {
        setUserId(user.id);
        setIsEmailVerified(!!user.email_confirmed_at);
      }

      // Listing
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, price, category, city, listing_type, description, created_at, expires_at, image_url, image_urls, user_id, moderation_status, details"
        )
        .eq("id", id)
        .single<Listing>();

      if (error || !data) { setListing(null); setLoading(false); return; }

      setListing(data);
      setSelectedImageIndex(0);
      setLoading(false);

      // Parallel: seller + favorites + similar
      const parallelTasks: Promise<void>[] = [];

      if (data.user_id) {
        parallelTasks.push(
          Promise.resolve(
            supabase
              .from("profiles")
              .select("id, username, first_name, last_name, avatar_url, city, created_at, phone")
              .eq("id", data.user_id)
              .maybeSingle()
          ).then(({ data: profile }) => { if (profile) setSeller(profile as SellerProfile); })
        );
      }

      if (user) {
        parallelTasks.push(
          Promise.resolve(
            supabase
              .from("favorites")
              .select("id")
              .eq("user_id", user.id)
              .eq("listing_id", Number(id))
              .maybeSingle()
          ).then(({ data: fav }) => setIsFavorite(!!fav))
        );
      }

      if (data.category) {
        parallelTasks.push(
          Promise.resolve(
            supabase
              .from("listings")
              .select("id, title, price, city, image_url, image_urls, category")
              .eq("category", data.category)
              .eq("hidden", false)
              .neq("id", id)
              .or("moderation_status.is.null,moderation_status.eq.approved")
              .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
              .limit(4)
          ).then(({ data: sim }) => setSimilar((sim as SimilarListing[]) ?? []))
        );
      }

      await Promise.all(parallelTasks);
    };

    load();
  }, [id]);

  // ── Lightbox keyboard ────────────────────────────────────────────────────

  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
      if (e.key === "ArrowLeft") goToPreviousImage();
      if (e.key === "ArrowRight") goToNextImage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, hasMultipleImages, images.length]);

  // ── Guard screens ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-950" />
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-6 py-16">
          <div className="w-full rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-slate-200">
            <p className="text-2xl font-black text-slate-900">Обявата не е намерена</p>
            <Link href="/listings" className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-900">
              Разгледай обяви
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (listing.moderation_status === "rejected") {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-6 py-16">
          <div className="w-full rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-slate-200">
            <p className="text-2xl font-black text-slate-900">Обявата не е достъпна</p>
            <p className="mt-3 text-sm font-semibold text-slate-500">Тази обява е премахната от нашия екип.</p>
            <Link href="/listings" className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-900">
              Разгледай обяви
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (listing.moderation_status === "pending" && listing.user_id !== userId) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-6 py-16">
          <div className="w-full rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-slate-200">
            <p className="text-2xl font-black text-slate-900">Обявата очаква преглед</p>
            <p className="mt-3 text-sm font-semibold text-slate-500">Тази обява все още не е одобрена и не е видима за другите потребители.</p>
            <Link href="/listings" className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-900">
              Разгледай обяви
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────

  const placeholderEmoji = fallbackImageByCategory[listing.category ?? ""] ?? "📦";
  const isExpired = !!(listing.expires_at && new Date(listing.expires_at) < new Date());
  const isOwner = listing.user_id === userId;
  const detailEntries = getDetailEntries(listing.details);

  const sellerDisplayName =
    [seller?.first_name, seller?.last_name].filter(Boolean).join(" ") ||
    seller?.username ||
    "Продавач";
  const sellerAvatarLetter = sellerDisplayName.charAt(0).toUpperCase();
  // Google OAuth sets avatar_url; use as proxy for verified status

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50 pb-20 lg:pb-0">
      <Header />
      {isEmailVerified === false && <UnverifiedBanner />}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Link href="/listings" className="hover:text-blue-950">Обяви</Link>
          {listing.category && (
            <>
              <span>›</span>
              <Link
                href={`/listings?category=${encodeURIComponent(listing.category)}`}
                className="hover:text-blue-950"
              >
                {listing.category}
              </Link>
            </>
          )}
          <span>›</span>
          <span className="max-w-[200px] truncate text-slate-800">{listing.title}</span>
        </nav>

        {/* Status banners */}
        {listing.moderation_status === "pending" && isOwner && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-black text-amber-800">
              Обявата ви очаква преглед и не е видима за другите потребители.
            </p>
          </div>
        )}
        {isExpired && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm font-black text-red-700">Обявата е изтекла.</p>
          </div>
        )}

        {/* Notice toast */}
        {noticeMessage && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-semibold text-amber-800">{noticeMessage}</p>
            <button type="button" onClick={() => setNoticeMessage(null)} className="shrink-0 text-amber-600 hover:text-amber-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Two-column grid ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">

          {/* ── LEFT ── */}
          <div className="space-y-5">

            {/* GALLERY */}
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900">
                {hasImages && mainImage ? (
                  <>
                    <button type="button" onClick={() => setIsModalOpen(true)} className="block w-full">
                      <img
                        src={mainImage}
                        alt={listing.title}
                        className="h-[400px] w-full object-cover sm:h-[500px]"
                      />
                    </button>
                    {hasMultipleImages && (
                      <>
                        <button
                          type="button"
                          onClick={goToPreviousImage}
                          className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/50 text-white backdrop-blur transition hover:bg-slate-950/75"
                          aria-label="Предишна снимка"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={goToNextImage}
                          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/50 text-white backdrop-blur transition hover:bg-slate-950/75"
                          aria-label="Следваща снимка"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-3 right-3 rounded-full bg-slate-950/60 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                          {selectedImageIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="relative flex h-[400px] items-center justify-center text-8xl sm:h-[500px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent)]" />
                    <span className="relative z-10">{placeholderEmoji}</span>
                  </div>
                )}
              </div>

              {/* Thumbnail strip */}
              {hasImages && images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3 sm:grid sm:grid-cols-8 sm:overflow-visible">
                  {images.map((img, idx) => (
                    <button
                      key={`${img}-${idx}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`shrink-0 overflow-hidden rounded-xl border-2 transition sm:shrink ${
                        selectedImageIndex === idx
                          ? "border-blue-950 ring-2 ring-blue-950/20"
                          : "border-transparent hover:border-slate-300"
                      }`}
                    >
                      <img src={img} alt="" className="h-14 w-14 object-cover sm:h-12 sm:w-full" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* TITLE + PRICE */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              {/* Type / category chips */}
              <div className="mb-4 flex flex-wrap gap-2">
                {listing.listing_type && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                    {listing.listing_type}
                  </span>
                )}
                {listing.category && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {listing.category}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
                {listing.title}
              </h1>

              <p className="mt-4 text-3xl font-black text-blue-950 sm:text-4xl">
                {formatPrice(listing.price)}
              </p>

              <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                {listing.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {listing.city}
                  </span>
                )}
                {listing.created_at && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(listing.created_at)}
                  </span>
                )}
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-base font-black text-slate-900">Описание</h2>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {listing.description || "Продавачът не е добавил описание."}
              </p>
            </div>

            {/* DETAILS — JSONB */}
            {detailEntries.length > 0 && (
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-5 text-base font-black text-slate-900">Характеристики</h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  {detailEntries.map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
                      <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* REPORT — subtle */}
            {!isOwner && listing.user_id && (
              <div className="pb-2 text-center">
                {reportDone ? (
                  <p className="text-xs font-semibold text-green-700">
                    ✓ Докладът е изпратен. Ще го разгледаме скоро.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-slate-500">
                      Забелязахте проблем?{" "}
                      <button
                        type="button"
                        onClick={() => openReport("listing")}
                        className="font-semibold text-slate-500 underline underline-offset-2 hover:text-red-600"
                      >
                        Докладвай обявата
                      </button>
                      {" · "}
                      <button
                        type="button"
                        onClick={() => openReport("user")}
                        className="font-semibold text-slate-500 underline underline-offset-2 hover:text-red-600"
                      >
                        Докладвай потребителя
                      </button>
                    </p>

                    {reportOpen && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-sm font-black text-slate-900">
                            {reportTarget === "listing" ? "Докладвай обявата" : "Докладвай потребителя"}
                          </p>
                          <button type="button" onClick={() => setReportOpen(false)} className="rounded-lg p-1 text-slate-500 hover:text-slate-700">
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
                            {REPORT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <textarea
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                            rows={3}
                            placeholder="Допълнително описание (по желание)"
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                          />
                          {reportError && <p className="text-xs font-semibold text-red-600">{reportError}</p>}
                          <button
                            type="button"
                            onClick={submitReport}
                            disabled={reportSubmitting || !reportReason}
                            className="flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
                          >
                            {reportSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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

          {/* ── RIGHT — STICKY SIDEBAR ── */}
          <div className="space-y-4 lg:sticky lg:top-24">

            {/* SELLER CARD */}
            {seller && (
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                {/* Avatar + name */}
                <div className="flex items-center gap-4">
                  {seller.avatar_url ? (
                    <img
                      src={seller.avatar_url}
                      alt={sellerDisplayName}
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-100"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-950 text-xl font-black text-white">
                      {sellerAvatarLetter}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-slate-900">{sellerDisplayName}</p>
                    {seller.username && (
                      <p className="text-xs font-semibold text-slate-500">@{seller.username}</p>
                    )}
                  </div>
                </div>

                {/* Seller info signals */}
                <div className="mt-4 space-y-2">
                  {seller.city && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {seller.city}
                    </div>
                  )}
                  {seller.created_at && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      Активен от {formatMonthYear(seller.created_at)}
                    </div>
                  )}
                </div>

                <div className="my-5 border-t border-slate-100" />

                {/* Contact actions */}
                {!isOwner ? (
                  isExpired ? (
                    <p className="text-center text-xs font-semibold text-slate-600">
                      Обявата е изтекла.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={handleContactSeller}
                        disabled={contactingLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-900 disabled:opacity-60"
                      >
                        {contactingLoading
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <MessageCircle className="h-4 w-4" />}
                        Изпрати съобщение
                      </button>

                      {/* Phone reveal */}
                      {phoneRevealed ? (
                        seller.phone ? (
                          <a
                            href={`tel:${seller.phone}`}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-950 bg-white px-5 py-3.5 text-sm font-black text-blue-950 transition hover:bg-blue-50"
                          >
                            <Phone className="h-4 w-4" />
                            {seller.phone}
                          </a>
                        ) : (
                          <p className="text-center text-xs font-semibold text-slate-600">
                            Продавачът не е посочил телефон.
                          </p>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!userId) { setNoticeMessage("Влезте в профила си, за да видите телефона."); return; }
                            setPhoneRevealed(true);
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-slate-700 transition hover:border-blue-950 hover:text-blue-950"
                        >
                          <Phone className="h-4 w-4" />
                          Покажи телефона
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  <p className="text-center text-xs font-semibold text-slate-600">
                    Това е вашата обява.
                  </p>
                )}

                {/* Seller profile link */}
                {!isOwner && (
                  <div className="mt-5 text-center">
                    <Link
                      href={`/user/${seller.id}`}
                      className="text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-blue-950"
                    >
                      Виж профила на продавача →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* FAVORITE */}
            <button
              type="button"
              onClick={toggleFavorite}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-black transition ${
                isFavorite
                  ? "border-blue-950 bg-blue-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-950 hover:text-blue-950"
              }`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
              {isFavorite ? "В любими" : "Добави в любими"}
            </button>

            <div className="text-center">
              <Link
                href="/listings"
                className="text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-blue-950"
              >
                ← Назад към обявите
              </Link>
            </div>
          </div>
        </div>

        {/* SIMILAR LISTINGS */}
        {similar.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-5 text-lg font-black text-slate-900">Подобни обяви</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {similar.map((s) => <SimilarCard key={s.id} listing={s} />)}
            </div>
          </section>
        )}
      </div>

      {/* MOBILE STICKY CONTACT BAR */}
      {!isOwner && seller && !isExpired && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex max-w-lg gap-3">
            <button
              type="button"
              onClick={handleContactSeller}
              disabled={contactingLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-950 px-4 py-3.5 text-sm font-black text-white transition hover:bg-blue-900 disabled:opacity-60"
            >
              {contactingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              Изпрати съобщение
            </button>
            {phoneRevealed ? (
              seller.phone ? (
                <a
                  href={`tel:${seller.phone}`}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-blue-950 bg-white px-4 py-3.5 text-sm font-black text-blue-950 transition hover:bg-blue-50"
                >
                  <Phone className="h-4 w-4" />
                  <span className="max-w-[130px] truncate">{seller.phone}</span>
                </a>
              ) : null
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!userId) {
                    setNoticeMessage("Влезте в профила си, за да видите телефона.");
                    return;
                  }
                  setPhoneRevealed(true);
                }}
                className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 transition hover:border-blue-950 hover:text-blue-950"
              >
                <Phone className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {isModalOpen && mainImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-6xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-3 top-3 z-20 rounded-full bg-slate-900/75 p-2 text-white transition hover:bg-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="absolute left-3 top-3 z-20 rounded-full bg-slate-900/75 px-3 py-1.5 text-sm font-bold text-white">
              {selectedImageIndex + 1} / {images.length}
            </div>
            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={goToPreviousImage}
                  className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/60 text-white backdrop-blur transition hover:bg-slate-950/80"
                  aria-label="Предишна снимка"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={goToNextImage}
                  className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/60 text-white backdrop-blur transition hover:bg-slate-950/80"
                  aria-label="Следваща снимка"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <img
              src={mainImage}
              alt={listing.title}
              className="max-h-[92vh] max-w-full rounded-3xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </main>
  );
}
