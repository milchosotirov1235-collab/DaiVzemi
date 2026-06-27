"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import UnverifiedBanner from "@/components/UnverifiedBanner";
import { Flag, Loader2, MapPin, MessageCircle, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { checkReportRateLimit } from "@/lib/security/rateLimit";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PublicProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  created_at: string | null;
};

type Listing = {
  id: string;
  title: string;
  price: string | number | null;
  city: string | null;
  category: string | null;
  listing_type: string | null;
  created_at: string | null;
  image_url: string | null;
  image_urls: string[] | null;
};

// ---------------------------------------------------------------------------
// Constants
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

const formatJoinDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric" }).format(date);
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params?.id as string;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [contactingLoading, setContactingLoading] = useState(false);

  // Report state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const isSelf = currentUserId === profileId;

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!profileId) return;

    const load = async () => {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      setCurrentUserId(authData?.user?.id ?? null);
      setIsEmailVerified(authData?.user ? !!authData.user.email_confirmed_at : null);

      const [profileRes, listingsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, avatar_url, city, created_at")
          .eq("id", profileId)
          .maybeSingle<PublicProfile>(),
        supabase
          .from("listings")
          .select("id, title, price, city, category, listing_type, created_at, image_url, image_urls")
          .eq("user_id", profileId)
          .or("hidden.is.null,hidden.eq.false")
          .or("moderation_status.is.null,moderation_status.eq.approved")
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order("created_at", { ascending: false }),
      ]);

      if (!profileRes.data) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(profileRes.data);
      setListings((listingsRes.data as Listing[]) ?? []);
      setLoading(false);
    };

    load();
  }, [profileId]);

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------

  const handleMessage = async () => {
    if (!currentUserId) {
      setNoticeMessage("Влезте в профила си, за да изпратите съобщение.");
      return;
    }

    if (!isEmailVerified) {
      setNoticeMessage("Трябва да потвърдите имейла си, преди да изпращате съобщения.");
      return;
    }

    if (isSelf) {
      setNoticeMessage("Не можете да изпратите съобщение до себе си.");
      return;
    }

    setContactingLoading(true);

    // Open or create a general conversation with this user
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .is("listing_id", null)
      .eq("buyer_id", currentUserId)
      .eq("seller_id", profileId)
      .maybeSingle();

    if (existing) {
      router.push(`/messages/${existing.id}`);
      return;
    }

    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ listing_id: null, buyer_id: currentUserId, seller_id: profileId })
      .select("id")
      .single();

    setContactingLoading(false);

    if (error || !created) {
      setNoticeMessage("Грешка при свързване. Опитайте отново.");
      return;
    }

    router.push(`/messages/${created.id}`);
  };

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------

  const openReport = () => {
    if (!currentUserId) {
      setNoticeMessage("Влезте в профила си, за да докладвате.");
      return;
    }
    if (!isEmailVerified) {
      setNoticeMessage("Трябва да потвърдите имейла си, преди да докладвате.");
      return;
    }
    setReportReason("");
    setReportDescription("");
    setReportError(null);
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!reportReason || !currentUserId) return;
    setReportSubmitting(true);
    setReportError(null);

    const rateResult = await checkReportRateLimit(currentUserId);
    if (!rateResult.allowed) {
      setReportError(rateResult.reason);
      setReportSubmitting(false);
      return;
    }

    const { error } = await supabase.from("reports").insert({
      reporter_user_id: currentUserId,
      reported_user_id: profileId,
      reason: reportReason,
      description: reportDescription.trim() || null,
      status: "open",
    });

    setReportSubmitting(false);
    if (error) {
      setReportError("Грешка при изпращане. Опитайте отново.");
    } else {
      setReportDone(true);
      setReportOpen(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-950" />
        </main>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6">
          <p className="text-2xl font-black text-slate-900">Потребителят не е намерен.</p>
          <Link href="/listings" className="rounded-xl bg-blue-950 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-900">
            Към обявите
          </Link>
        </main>
      </>
    );
  }

  const avatarLetter = (profile.username ?? "П").charAt(0).toUpperCase();

  return (
    <>
      <Header />
      {isEmailVerified === false && <UnverifiedBanner />}

      <main className="min-h-screen bg-slate-50">
        {/* ── Profile hero ── */}
        <section className="bg-white shadow-sm ring-1 ring-slate-100">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex flex-wrap items-start gap-6">
              {/* Avatar */}
              <div className="shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username ?? "Потребител"}
                    className="h-24 w-24 rounded-full object-cover ring-4 ring-slate-100"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-950 text-3xl font-black text-white ring-4 ring-slate-100">
                    {avatarLetter}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-black text-slate-900">
                  {profile.username ?? "Без потребителско име"}
                  {isSelf && (
                    <span className="ml-3 text-base font-normal text-slate-400">(Вие)</span>
                  )}
                </h1>

                <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                  {profile.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {profile.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4 shrink-0" />
                    Член от {formatJoinDate(profile.created_at)}
                  </span>
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {listings.length} активни{" "}
                  {listings.length === 1 ? "обява" : "обяви"}
                </p>
              </div>

              {/* Actions — hidden for own profile */}
              {!isSelf && (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleMessage}
                    disabled={contactingLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-900 disabled:opacity-60"
                  >
                    {contactingLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    Изпрати съобщение
                  </button>

                  {!reportDone ? (
                    <button
                      type="button"
                      onClick={openReport}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-red-300 hover:text-red-700"
                    >
                      <Flag className="h-4 w-4" />
                      Докладвай потребител
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-5 py-2.5 text-sm font-bold text-green-700">
                      ✓ Докладът е изпратен
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Notice */}
            {noticeMessage && (
              <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                {noticeMessage}
              </div>
            )}

            {/* Report form */}
            {reportOpen && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="mb-3 text-sm font-black text-slate-900">Докладвай потребател</p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    {REPORT_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReportReason(r)}
                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${
                          reportReason === r
                            ? "bg-blue-950 text-white"
                            : "bg-white text-slate-700 ring-1 ring-slate-200 active:bg-slate-50"
                        }`}
                      >
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          reportReason === r ? "border-white" : "border-slate-300"
                        }`}>
                          {reportReason === r && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                        {r}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Допълнително описание (по избор)"
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                  />

                  {reportError && (
                    <p className="text-sm font-semibold text-red-600">{reportError}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={submitReport}
                      disabled={!reportReason || reportSubmitting}
                      className="rounded-xl bg-blue-950 px-5 py-2 text-sm font-black text-white transition hover:bg-blue-900 disabled:opacity-50"
                    >
                      {reportSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Изпрати"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportOpen(false)}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Отказ
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Listings ── */}
        <section className="mx-auto max-w-7xl px-6 py-10">
          <h2 className="mb-6 text-xl font-black text-slate-900">
            Обяви на {profile.username ?? "потребителя"}
          </h2>

          {listings.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
              <p className="text-lg font-black text-slate-900">Няма активни обяви.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => {
                const cardImage = listing.image_urls?.find(Boolean) ?? listing.image_url;
                return (
                  <article
                    key={listing.id}
                    className="group cursor-pointer overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <Link href={`/listing/${listing.id}`} className="block">
                      {cardImage ? (
                        <img
                          src={cardImage}
                          alt={listing.title}
                          className="h-52 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-52 items-center justify-center bg-blue-950 text-5xl text-white transition duration-300 group-hover:bg-blue-900">
                          {listing.category ? (fallbackImageByCategory[listing.category] ?? "📦") : "📦"}
                        </div>
                      )}

                      <div className="space-y-4 p-6">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-950">
                          {listing.listing_type ?? "Обява"}
                        </span>

                        <div>
                          <h3 className="text-2xl font-black text-slate-950">{listing.title}</h3>
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

                        <p className="text-sm text-slate-500">{formatDate(listing.created_at)}</p>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
