"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { AISettings } from "@/lib/ai/settings";

// ---------------------------------------------------------------------------
// Feature toggle definitions
// ---------------------------------------------------------------------------

type FeatureKey = keyof Omit<AISettings, "ai_global_enabled">;

const FEATURES: { key: FeatureKey; label: string; description: string }[] = [
  {
    key: "ai_listing_assistant_enabled",
    label: "Подобряване на обявата",
    description: "✨ Показва предложение за по-ясно представяне след публикуване.",
  },
  {
    key: "ai_seller_tips_enabled",
    label: "Съвет за продавача",
    description: "✨ Персонализирани съвети за продавача — предстои.",
  },
  {
    key: "ai_search_assistant_enabled",
    label: "Помощ при търсене",
    description: "✨ Асистент за по-точно търсене — предстои.",
  },
  {
    key: "ai_moderator_assistant_enabled",
    label: "AI Модератор",
    description: "Вътрешен инструмент за автоматична проверка на обяви — само за администратори.",
  },
];

// ---------------------------------------------------------------------------
// Toggle component
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-blue-950 focus:ring-offset-2 ${
        checked && !disabled
          ? "bg-blue-950"
          : "bg-slate-200"
      } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminAISettings() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select(
          "ai_global_enabled, ai_listing_assistant_enabled, ai_seller_tips_enabled, ai_search_assistant_enabled, ai_moderator_assistant_enabled"
        )
        .eq("id", 1)
        .maybeSingle();

      if (data) {
        setSettings(data as AISettings);
      } else {
        // Row doesn't exist yet — use defaults
        setSettings({
          ai_global_enabled: false,
          ai_listing_assistant_enabled: false,
          ai_seller_tips_enabled: false,
          ai_search_assistant_enabled: false,
          ai_moderator_assistant_enabled: false,
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleToggle = (key: keyof AISettings, value: boolean) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;

    const { error: upsertError } = await supabase.from("site_settings").upsert(
      {
        id: 1,
        ...settings,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      setError("Грешка при записване. Опитайте отново.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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

  if (!settings) return null;

  const globalOn = settings.ai_global_enabled;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-black text-slate-900">AI Настройки</h2>
        <p className="mt-1 text-sm text-slate-500">
          Управлявайте AI функциите централно. Само администратори имат достъп до тази страница.
        </p>
      </div>

      {/* ── Global toggle ── */}
      <div className="rounded-[20px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-950 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-black text-slate-900">AI функции за сайта</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-500">
                Главен превключвател. При изключване всички AI функции спират незабавно, независимо от индивидуалните настройки.
              </p>
            </div>
          </div>
          <Toggle
            checked={globalOn}
            onChange={(v) => handleToggle("ai_global_enabled", v)}
          />
        </div>
      </div>

      {/* ── Individual feature toggles ── */}
      <div className="rounded-[20px] bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-sm font-black text-slate-900">Индивидуални функции</p>
          {!globalOn && (
            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              Включете главния превключвател, за да активирате индивидуални функции.
            </p>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {FEATURES.map(({ key, label, description }) => (
            <div
              key={key}
              className={`flex items-start justify-between gap-6 px-6 py-4 transition ${
                !globalOn ? "opacity-50" : ""
              }`}
            >
              <div>
                <p className="text-sm font-black text-slate-900">{label}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{description}</p>
              </div>
              <Toggle
                checked={settings[key]}
                onChange={(v) => handleToggle(key, v)}
                disabled={!globalOn}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Save bar ── */}
      <div className="flex items-center justify-between rounded-[20px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          {saved && <p className="text-sm font-semibold text-green-600">Настройките са запазени.</p>}
          {!error && !saved && (
            <p className="text-xs font-semibold text-slate-400">
              Промените влизат в сила след записване.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-900 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Запази
        </button>
      </div>

      {/* ── Info note ── */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
          Допълнителен контрол
        </p>
        <p className="text-xs font-semibold text-slate-500 leading-relaxed">
          Може да се добави <code className="rounded bg-slate-200 px-1 py-0.5 font-mono">AI_ENABLED=false</code> в <code className="rounded bg-slate-200 px-1 py-0.5 font-mono">.env.local</code> за аварийно изключване на всички AI функции, независимо от базата данни.
        </p>
      </div>
    </div>
  );
}
