"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import UnverifiedBanner from "@/components/UnverifiedBanner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  Heart,
  LayoutList,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Shield,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { checkReportRateLimit } from "@/lib/security/rateLimit";
import { formatDualPrice } from "@/lib/formatPrice";

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
  view_count?: number | null;
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
  listing_type: string | null;
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
  negotiable: "Цена",
  urgent: "Спешност",

  // Автомобили
  vehicle_type: "Тип МПС",
  year: "Година",
  year_from: "Година от",
  year_to: "Година до",
  mileage: "Пробег (км)",
  mileage_from: "Пробег от",
  mileage_to: "Пробег до",
  fuel: "Гориво",
  transmission: "Скоростна кутия",
  engine: "Двигател",
  engine_size: "Обем (куб.см.)",
  engine_size_from: "Обем от",
  engine_size_to: "Обем до",
  power: "Мощност (к.с.)",
  power_from: "Мощност от",
  power_to: "Мощност до",
  euro_standard: "Евро стандарт",
  body_type: "Каросерия",
  drive_type: "Задвижване",
  car_color: "Цвят",
  car_condition: "Състояние",

  // Авточасти
  part_type: "Вид резервна част",
  car_make: "Марка автомобил",
  car_model: "Модел автомобил",

  // Имоти
  property_purpose: "Предназначение",
  property_type: "Тип имот",
  rooms: "Стаи",
  area: "Площ (кв.м)",
  sqm_min: "Площ от",
  sqm_max: "Площ до",
  floor: "Етаж",
  total_floors: "Брой етажи",
  construction_type: "Конструкция",
  furnishing: "Обзавеждане",
  furnished: "Обзавеждане",
  heating: "Отопление",
  property_condition: "Състояние на имота",
  elevator: "Асансьор",
  parking: "Паркинг",

  // Работа
  job_category: "Категория работа",
  employment_type: "Тип заетост",
  experience: "Опит",
  education: "Образование",
  salary: "Заплата",
  salary_from: "Заплата от",
  salary_to: "Заплата до",
  remote: "Дистанционно",

  // Услуги
  service_type: "Тип услуга",
  service_category: "Категория услуга",
  online_service: "Онлайн услуга",
  provider_type: "Тип изпълнител",

  // Електроника
  electronics_subcat: "Подкатегория",
  el_device_type: "Тип устройство",
  storage: "Памет",
  ram: "RAM",
  processor: "Процесор",

  // Компютри
  comp_type: "Тип компютър",
  comp_brand: "Марка",
  comp_condition: "Състояние",

  // Детски
  kids_item_type: "Тип артикул",
  kids_age_group: "Възрастова група",
  kids_gender: "Пол",
  kids_condition: "Състояние",

  // Дом и Градина
  home_subcategory: "Подкатегория",
  home_condition: "Състояние",

  // Мода
  fashion_type: "Тип облекло",
  fashion_gender: "Пол",
  fashion_size: "Размер",
  fashion_condition: "Състояние",

  // Спорт
  sport_category: "Вид спорт",
  sport_condition: "Състояние",

  // Книги
  author: "Автор",
  genre: "Жанр",
  book_genre: "Жанр",
  book_condition: "Състояние",
  book_language: "Език",
  language: "Език",

  // Животни
  animal_type: "Вид животно",
  breed: "Порода",
  age: "Възраст",
  vaccinated: "Ваксинирано",
  pedigree: "Родословие",

  // Misc
  size: "Размер",
  material: "Материал",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const DETAIL_SKIP = new Set(["negotiable", "urgent"]);

function getDetailEntries(details: Record<string, unknown> | null): [string, string][] {
  if (!details) return [];
  return Object.entries(details)
    .filter(([k, v]) => !DETAIL_SKIP.has(k) && v !== null && v !== undefined && v !== "")
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
        {listing.listing_type && (
          <span className="mb-1.5 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-blue-950">
            {listing.listing_type}
          </span>
        )}
        <p className="line-clamp-2 text-sm font-bold text-slate-900 group-hover:text-blue-950">
          {listing.title}
        </p>
        <p className="mt-1 text-sm font-black text-blue-950">{formatDualPrice(listing.price)}</p>
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

export default function ListingPageClient({ id }: { id: string }) {
  const router = useRouter();

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
  const [sellerListingCount, setSellerListingCount] = useState<number | null>(null);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [similar, setSimilar] = useState<SimilarListing[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [descExpanded, setDescExpanded] = useState(false);

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
      let { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, price, category, city, listing_type, description, created_at, expires_at, image_url, image_urls, user_id, moderation_status, details, view_count"
        )
        .eq("id", id)
        .single<Listing>();

      // If view_count column doesn't exist yet, retry without it
      if (error?.message?.includes("view_count")) {
        const retry = await supabase
          .from("listings")
          .select("id, title, price, category, city, listing_type, description, created_at, expires_at, image_url, image_urls, user_id, moderation_status, details")
          .eq("id", id)
          .single<Listing>();
        data = retry.data;
        error = retry.error;
      }

      if (error || !data) { setListing(null); setLoading(false); return; }

      setListing(data);
      setSelectedImageIndex(0);
      setLoading(false);

      // Increment view counter (only for non-owners; fire-and-forget)
      if (user?.id !== data.user_id) {
        supabase.rpc("increment_view_count", { p_listing_id: Number(id) }).then(() => {});
      }

      // Track recently viewed in localStorage (max 6 entries, FIFO)
      try {
        const key = "dv_recently_viewed";
        const entry = {
          id: data.id,
          title: data.title,
          price: data.price,
          category: data.category,
          city: data.city,
          image_url: (data.image_urls?.find(Boolean) ?? data.image_url) || null,
        };
        const existing: typeof entry[] = JSON.parse(localStorage.getItem(key) ?? "[]");
        const filtered = existing.filter((e) => String(e.id) !== String(data.id));
        localStorage.setItem(key, JSON.stringify([entry, ...filtered].slice(0, 6)));
      } catch { /* localStorage unavailable — ignore */ }

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

        const nowIso = new Date().toISOString();
        parallelTasks.push(
          Promise.resolve(
            supabase
              .from("listings")
              .select("id", { count: "exact", head: true })
              .eq("user_id", data.user_id)
              .or("hidden.is.null,hidden.eq.false")
              .or("moderation_status.is.null,moderation_status.eq.approved")
              .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
          ).then(({ count }) => { if (count !== null) setSellerListingCount(count); })
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
          (async () => {
            const base = supabase
              .from("listings")
              .select("id, title, price, city, image_url, image_urls, category, listing_type")
              .eq("category", data.category)
              .or("hidden.is.null,hidden.eq.false")
              .neq("id", id)
              .or("moderation_status.is.null,moderation_status.eq.approved")
              .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

            // Prefer same city — fetch city-scoped first
            let results: SimilarListing[] = [];
            if (data.city) {
              const { data: cityMatches } = await base
                .ilike("city", `%${data.city}%`)
                .limit(6);
              results = (cityMatches as SimilarListing[]) ?? [];
            }

            // Backfill with other cities if fewer than 3 local matches
            if (results.length < 3) {
              const seenIds = new Set([id, ...results.map((r) => String(r.id))]);
              const { data: otherMatches } = await supabase
                .from("listings")
                .select("id, title, price, city, image_url, image_urls, category, listing_type")
                .eq("category", data.category)
                .or("hidden.is.null,hidden.eq.false")
                .neq("id", id)
                .or("moderation_status.is.null,moderation_status.eq.approved")
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
                .limit(6);
              for (const l of (otherMatches as SimilarListing[]) ?? []) {
                if (!seenIds.has(String(l.id))) results.push(l);
                if (results.length >= 6) break;
              }
            }

            setSimilar(results.slice(0, 6));
          })()
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
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              <div className="-mx-4 overflow-hidden sm:-mx-6 lg:mx-0 lg:rounded-3xl lg:shadow-sm lg:ring-1 lg:ring-slate-200">
                <div className="h-[300px] w-full animate-pulse bg-slate-200 lg:h-[420px]" />
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
                <div className="h-5 w-1/4 animate-pulse rounded-full bg-slate-200" />
                <div className="h-9 w-3/4 animate-pulse rounded-full bg-slate-200" />
                <div className="h-8 w-2/5 animate-pulse rounded-full bg-slate-200" />
                <div className="flex gap-3 pt-2">
                  <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                </div>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-3">
                <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
                <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
                <div className="h-4 w-4/5 animate-pulse rounded-full bg-slate-200" />
              </div>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 animate-pulse rounded-full bg-slate-200 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-3/4 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-200" />
                </div>
              </div>
              <div className="h-12 w-full animate-pulse rounded-2xl bg-slate-200" />
              <div className="h-12 w-full animate-pulse rounded-2xl bg-slate-200" />
            </div>
          </div>
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
    <main className="min-h-screen bg-slate-50 pb-28 lg:pb-0">
      <Header />
      {isEmailVerified === false && <UnverifiedBanner />}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">

        {/* Breadcrumb — desktop only; mobile uses floating back button in gallery */}
        <nav className="mb-6 hidden items-center gap-2 text-sm font-semibold text-slate-500 lg:flex">
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

            {/* GALLERY — full-bleed on mobile, card on desktop */}
            <div className="-mx-4 overflow-hidden sm:-mx-6 lg:mx-0 lg:rounded-3xl lg:bg-white lg:shadow-sm lg:ring-1 lg:ring-slate-200">
              <div className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900">

                {/* Mobile: floating back + share + heart — sits above the image */}
                <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3 lg:hidden">
                  <Link
                    href="/listings"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition active:scale-95"
                    aria-label="Назад"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Link>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const url = window.location.href;
                        if (navigator.share) {
                          try { await navigator.share({ title: listing.title, text: `${listing.title} — DaiVzemi`, url }); return; } catch {}
                        }
                        setShareOpen((o) => !o);
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition active:scale-95"
                      aria-label="Сподели"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={toggleFavorite}
                      className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition active:scale-95 ${
                        isFavorite ? "bg-red-500 text-white" : "bg-black/40 text-white"
                      }`}
                      aria-label={isFavorite ? "Премахни от любими" : "Добави в любими"}
                    >
                      <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                    </button>
                  </div>
                </div>

                {hasImages && mainImage ? (
                  <>
                    <button type="button" onClick={() => setIsModalOpen(true)} className="block w-full">
                      <img
                        src={mainImage}
                        alt={listing.title}
                        className="h-[300px] w-full object-cover sm:h-[420px] lg:h-[500px]"
                      />
                    </button>
                    {hasMultipleImages && (
                      <>
                        <button
                          type="button"
                          onClick={goToPreviousImage}
                          className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition active:scale-95 hover:bg-black/60"
                          aria-label="Предишна снимка"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={goToNextImage}
                          className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition active:scale-95 hover:bg-black/60"
                          aria-label="Следваща снимка"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        {/* Mobile: dot indicators */}
                        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 lg:hidden">
                          {images.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSelectedImageIndex(i)}
                              className={`h-1.5 rounded-full transition-all ${
                                i === selectedImageIndex ? "w-5 bg-white" : "w-1.5 bg-white/50"
                              }`}
                            />
                          ))}
                        </div>
                        {/* Desktop: text counter */}
                        <div className="absolute bottom-3 right-3 hidden rounded-full bg-slate-950/60 px-3 py-1 text-xs font-bold text-white backdrop-blur lg:block">
                          {selectedImageIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="relative flex h-[300px] items-center justify-center text-8xl sm:h-[420px] lg:h-[500px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent)]" />
                    <span className="relative z-10">{placeholderEmoji}</span>
                  </div>
                )}
              </div>

              {/* Thumbnail strip */}
              {hasImages && images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto bg-white p-3 lg:grid lg:grid-cols-8 lg:overflow-visible" style={{ scrollbarWidth: "none" }}>
                  {images.map((img, idx) => (
                    <button
                      key={`${img}-${idx}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`shrink-0 overflow-hidden rounded-xl border-2 transition lg:shrink ${
                        selectedImageIndex === idx
                          ? "border-blue-950 ring-2 ring-blue-950/20"
                          : "border-transparent hover:border-slate-300"
                      }`}
                    >
                      <img src={img} alt="" className="h-14 w-14 object-cover lg:h-12 lg:w-full" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile compact seller trust row — shows right after gallery */}
            {seller && (
              <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-100 lg:hidden">
                {seller.avatar_url ? (
                  <img
                    src={seller.avatar_url}
                    alt={sellerDisplayName}
                    className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-950 text-sm font-black text-white">
                    {sellerAvatarLetter}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/user/${seller.id}`} className="truncate text-sm font-black text-slate-900 hover:text-blue-950">
                    {sellerDisplayName}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {[seller.city, seller.created_at ? `Активен от ${formatMonthYear(seller.created_at)}` : null]
                      .filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {seller.phone && (
                    <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 ring-1 ring-green-200">
                      <Check className="h-2.5 w-2.5" />
                      Тел.
                    </span>
                  )}
                  {seller.avatar_url && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-blue-200">
                      <Check className="h-2.5 w-2.5" />
                      Google
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* TITLE + PRICE */}
            <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100 lg:rounded-3xl lg:p-6 lg:ring-slate-200">
              {/* Type / category chips + share */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 lg:mb-4">
                <div className="flex flex-wrap gap-2">
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

                {/* Share button — desktop only (mobile uses gallery overlay) */}
                <div className="relative hidden lg:block">
                  <button
                    type="button"
                    onClick={async () => {
                      const url = window.location.href;
                      if (navigator.share) {
                        try {
                          await navigator.share({ title: listing.title, text: `${listing.title} — DaiVzemi`, url });
                          return;
                        } catch {}
                      }
                      setShareOpen((o) => !o);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Сподели
                  </button>

                  {shareOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShareOpen(false)}
                      />
                      {/* Panel */}
                      <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            setCopied(true);
                            setTimeout(() => { setCopied(false); setShareOpen(false); }, 1800);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4 text-slate-400" />}
                          {copied ? "Копирано!" : "Копирай връзка"}
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(listing.title + " — " + (typeof window !== "undefined" ? window.location.href : ""))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setShareOpen(false)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <span className="text-base">💬</span>
                          WhatsApp
                        </a>
                        <a
                          href={`viber://forward?text=${encodeURIComponent(listing.title + " — " + (typeof window !== "undefined" ? window.location.href : ""))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setShareOpen(false)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <span className="text-base">📲</span>
                          Viber
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <h1 className="text-xl font-black leading-tight text-slate-900 sm:text-2xl lg:text-3xl">
                {listing.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-baseline gap-3 lg:mt-4">
                <p className="text-2xl font-black text-blue-950 sm:text-3xl lg:text-4xl">
                  {formatDualPrice(listing.price)}
                </p>
                {(listing.details as Record<string, string> | null)?.negotiable === "yes" && (
                  <span className="text-sm font-semibold text-slate-400">· по договаряне</span>
                )}
              </div>
              {(() => {
                if (listing.category !== "Имоти") return null;
                const area = Number((listing.details as Record<string, string> | null)?.area);
                const price = Number(String(listing.price ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
                if (!area || area <= 0 || !price || price <= 0) return null;
                return (
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {Math.round(price / area).toLocaleString("bg-BG")} € / кв.м.
                  </p>
                );
              })()}

              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-500 lg:mt-4 lg:gap-4">
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
                {listing.view_count != null && listing.view_count > 0 && (
                  <span className="flex items-center gap-1.5">
                    👁 {listing.view_count} {listing.view_count === 1 ? "преглед" : "прегледа"}
                  </span>
                )}
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100 lg:rounded-3xl lg:p-6 lg:ring-slate-200">
              <h2 className="mb-3 text-sm font-black text-slate-900 lg:text-base">Описание</h2>
              {(() => {
                const text = listing.description || "";
                const LIMIT = 500;
                const isLong = text.length > LIMIT;
                return (
                  <>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                      {isLong && !descExpanded ? text.slice(0, LIMIT) + "…" : (text || "Продавачът не е добавил описание.")}
                    </p>
                    {isLong && (
                      <button
                        type="button"
                        onClick={() => setDescExpanded((v) => !v)}
                        className="mt-3 text-sm font-black text-blue-950 hover:underline"
                      >
                        {descExpanded ? "Скрий ↑" : "Виж повече ↓"}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            {/* DETAILS — JSONB */}
            {detailEntries.length > 0 && (
              <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100 lg:rounded-3xl lg:p-6 lg:ring-slate-200">
                <h2 className="mb-4 text-sm font-black text-slate-900 lg:mb-5 lg:text-base">Характеристики</h2>
                <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:gap-x-6 lg:gap-y-4">
                  {detailEntries.map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5 lg:px-4 lg:py-3">
                      <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</dt>
                      <dd className="mt-0.5 text-sm font-bold text-slate-900">{value}</dd>
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

          {/* ── RIGHT — STICKY SIDEBAR (desktop only) ── */}
          <div className="hidden space-y-4 lg:block lg:sticky lg:top-24">

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
                  {sellerListingCount !== null && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <LayoutList className="h-4 w-4 shrink-0" />
                      {sellerListingCount} активни обяви
                    </div>
                  )}
                </div>

                {/* Trust badges */}
                {(seller.phone || seller.avatar_url) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {seller.phone && (
                      <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 ring-1 ring-green-200">
                        <Check className="h-3 w-3" />
                        Добавен телефон
                      </span>
                    )}
                    {seller.avatar_url && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                        <Check className="h-3 w-3" />
                        Google вход
                      </span>
                    )}
                  </div>
                )}

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
                          <>
                            <a
                              href={`tel:${seller.phone}`}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-950 bg-white px-5 py-3.5 text-sm font-black text-blue-950 transition hover:bg-blue-50"
                            >
                              <Phone className="h-4 w-4" />
                              {seller.phone}
                            </a>
                            <a
                              href={`viber://contact?number=${encodeURIComponent(seller.phone.replace(/\s/g, ""))}`}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3.5 text-sm font-black text-violet-700 transition hover:bg-violet-100"
                            >
                              <span className="text-base leading-none">📲</span>
                              Viber
                            </a>
                          </>
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
          <section className="mt-8 lg:mt-14">
            <div className="mb-4 flex items-center justify-between gap-4 lg:mb-5">
              <h2 className="text-base font-black text-slate-900 lg:text-lg">Подобни обяви</h2>
              {listing.category && (
                <Link
                  href={`/listings?category=${encodeURIComponent(listing.category)}`}
                  className="text-sm font-bold text-blue-950 hover:underline"
                >
                  Виж всички →
                </Link>
              )}
            </div>
            {/* Mobile: horizontal scroll */}
            <div
              className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden"
              style={{ scrollbarWidth: "none" }}
            >
              {similar.map((s) => (
                <div key={s.id} className="w-40 shrink-0">
                  <SimilarCard listing={s} />
                </div>
              ))}
            </div>
            {/* Desktop: grid */}
            <div className="hidden grid-cols-3 gap-4 lg:grid">
              {similar.map((s) => <SimilarCard key={s.id} listing={s} />)}
            </div>
          </section>
        )}

        {/* SAFETY TIPS */}
        <section className="mt-6 lg:mt-10">
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 lg:rounded-[28px] lg:p-6">
            <div className="mb-3 flex items-center gap-2 lg:mb-4 lg:gap-3">
              <Shield className="h-4 w-4 shrink-0 text-amber-600 lg:h-5 lg:w-5" />
              <h2 className="text-xs font-black text-amber-800 lg:text-sm">Съвети за безопасна сделка</h2>
            </div>
            <ul className="space-y-1.5 text-xs font-semibold text-amber-700 lg:space-y-2 lg:text-sm">
              <li>• Никога не плащайте предварително, без да сте видели стоката.</li>
              <li>• Срещайте се на обществено и оживено място.</li>
              <li>• Проверете стоката внимателно преди плащане.</li>
              <li>• Внимавайте за прекалено ниски или нереални цени.</li>
              <li>• Не споделяйте лични данни или банкова информация.</li>
              <li>• При съмнение — докладвайте обявата.</li>
            </ul>
          </div>
        </section>
      </div>

      {/* MOBILE STICKY CONTACT BAR */}
      {!isOwner && seller && !isExpired && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/96 px-4 pt-3 shadow-2xl backdrop-blur-md lg:hidden"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-lg items-center gap-2.5">

            {/* Message — primary, always flex-1 */}
            <button
              type="button"
              onClick={handleContactSeller}
              disabled={contactingLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-950 py-4 text-sm font-black text-white transition active:bg-blue-900 disabled:opacity-60"
            >
              {contactingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-[18px] w-[18px]" />
              )}
              Съобщение
            </button>

            {/* Phone section */}
            {phoneRevealed ? (
              seller.phone ? (
                <>
                  <a
                    href={`tel:${seller.phone}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-4 text-sm font-black text-slate-800 transition active:bg-slate-50"
                  >
                    <Phone className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="max-w-[90px] truncate">{seller.phone}</span>
                  </a>
                  <a
                    href={`viber://contact?number=${encodeURIComponent(seller.phone.replace(/\s/g, ""))}`}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-xl text-violet-700 transition active:bg-violet-100"
                  >
                    📲
                  </a>
                </>
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
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition active:bg-slate-50"
                aria-label="Покажи телефона"
              >
                <Phone className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {isModalOpen && mainImage && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Top bar */}
          <div className="flex shrink-0 items-center justify-between px-4 py-3">
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white">
              {selectedImageIndex + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main image area */}
          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={goToPreviousImage}
                  className="absolute left-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                  aria-label="Предишна снимка"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={goToNextImage}
                  className="absolute right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                  aria-label="Следваща снимка"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <img
              src={mainImage}
              alt={listing.title}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {/* Thumbnail strip */}
          {hasMultipleImages && (
            <div
              className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-4 pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, idx) => (
                <button
                  key={`lb-${img}-${idx}`}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`shrink-0 overflow-hidden rounded-xl transition ${
                    selectedImageIndex === idx
                      ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950"
                      : "opacity-50 hover:opacity-80"
                  }`}
                >
                  <img src={img} alt="" className="h-14 w-14 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
