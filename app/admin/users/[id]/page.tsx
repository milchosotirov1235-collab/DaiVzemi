"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { BadgeCheck, Phone } from "lucide-react";
import {
  clampScore,
  calcCompositeTrust,
  updateTrustScores,
  TRUST_MIN,
  TRUST_MAX,
  type TrustScores,
} from "@/lib/trust/trustScore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserDetail = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  role: string;
  suspended: boolean;
  created_at: string | null;
  avatar_url: string | null;
  phone: string | null;
} & TrustScores;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (v: string | null) => {
  if (!v) return "—";
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(v));
};

function ScoreBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color =
    pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ScoreField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">{label}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">{description}</p>
          <ScoreBar value={value} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            type="number"
            min={TRUST_MIN}
            max={TRUST_MAX}
            value={value}
            onChange={(e) => onChange(clampScore(Number(e.target.value)))}
            className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-black text-slate-900 outline-none focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
          />
          <span className="text-xs font-semibold text-slate-400">/ 100</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminUserDetail() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable score state
  const [sellerScore, setSellerScore] = useState(50);
  const [buyerScore, setBuyerScore] = useState(50);
  const [reporterScore, setReporterScore] = useState(50);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "id, username, first_name, last_name, city, role, suspended, created_at, avatar_url, phone, trust_score, seller_score, buyer_score, reporter_score"
        )
        .eq("id", userId)
        .maybeSingle();

      if (!data) {
        router.replace("/admin/users");
        return;
      }

      setUser(data as UserDetail);
      setSellerScore(data.seller_score ?? 50);
      setBuyerScore(data.buyer_score ?? 50);
      setReporterScore(data.reporter_score ?? 50);
      setLoading(false);
    };
    load();
  }, [userId, router]);

  const previewTrust = calcCompositeTrust({
    seller_score: sellerScore,
    buyer_score: buyerScore,
    reporter_score: reporterScore,
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const { error } = await updateTrustScores(user.id, {
      seller_score: sellerScore,
      buyer_score: buyerScore,
      reporter_score: reporterScore,
    });

    if (error) {
      setSaveError(error);
    } else {
      setUser((prev) =>
        prev
          ? {
              ...prev,
              seller_score: sellerScore,
              buyer_score: buyerScore,
              reporter_score: reporterScore,
              trust_score: previewTrust,
            }
          : prev
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-950" />
      </div>
    );
  }

  if (!user) return null;

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username ||
    "Потребител";

  return (
    <div className="space-y-6">
      {/* ── Back + title ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/users"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-xl font-black text-slate-900">{displayName}</h2>
          <p className="mt-0.5 font-mono text-xs text-slate-400">{user.id}</p>
        </div>
      </div>

      {/* ── User meta card ── */}
      <div className="rounded-[20px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Потребителско</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{user.username ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Град</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{user.city ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Роля</p>
            <p className="mt-1 text-sm font-bold text-slate-900 capitalize">{user.role}</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Статус</p>
            <p className={`mt-1 text-sm font-black ${user.suspended ? "text-red-600" : "text-green-700"}`}>
              {user.suspended ? "Спрян" : "Активен"}
            </p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Регистрация</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{formatDate(user.created_at)}</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Възраст на акаунта</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {user.created_at
                ? `${Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86_400_000)} дни`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Верификация</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-bold">
              {user.avatar_url
                ? <><BadgeCheck className="h-4 w-4 text-green-600" /><span className="text-green-700">Проверен (OAuth)</span></>
                : <span className="text-slate-400">Не е проверен</span>}
            </p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Телефон</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-bold text-slate-900">
              {user.phone
                ? <><Phone className="h-3.5 w-3.5 text-slate-400" />{user.phone}</>
                : <span className="text-slate-400">—</span>}
            </p>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Бързи действия</p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/user/${user.id}`} target="_blank"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-950 hover:text-blue-950">
              Публичен профил →
            </Link>
            <Link href={`/admin/reports?user=${user.id}`}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-950 hover:text-blue-950">
              Доклади за потребителя
            </Link>
          </div>
        </div>
      </div>

      {/* ── Trust panel ── */}
      <div className="rounded-[20px] bg-white shadow-sm ring-1 ring-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-black text-slate-900">Доверие</h3>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              Само за администратори — не е видимо за потребители
            </p>
          </div>
          {/* Composite preview */}
          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Обобщен резултат
            </p>
            <p
              className={`mt-0.5 text-2xl font-black tabular-nums ${
                previewTrust >= 70
                  ? "text-green-600"
                  : previewTrust >= 40
                  ? "text-amber-600"
                  : "text-red-600"
              }`}
            >
              {previewTrust}
            </p>
          </div>
        </div>

        {/* Score fields */}
        <div className="space-y-3 p-6">
          <ScoreField
            label="Резултат продавач"
            description="Качество на обявите, точност на описанията, липса на злоупотреби"
            value={sellerScore}
            onChange={setSellerScore}
          />
          <ScoreField
            label="Резултат купувач"
            description="Поведение при контакт, сериозност на запитванията"
            value={buyerScore}
            onChange={setBuyerScore}
          />
          <ScoreField
            label="Резултат докладчик"
            description="Точност на подадените сигнали — верни сигнали увеличават, неоснователни намаляват"
            value={reporterScore}
            onChange={setReporterScore}
          />
        </div>

        {/* Save bar */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <div>
            {saveError && (
              <p className="text-sm font-semibold text-red-600">{saveError}</p>
            )}
            {saveSuccess && (
              <p className="text-sm font-semibold text-green-600">Резултатите са запазени.</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-900 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Запази
          </button>
        </div>
      </div>
    </div>
  );
}
