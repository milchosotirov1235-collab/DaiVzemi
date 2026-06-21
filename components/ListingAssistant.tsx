"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AssistantState =
  | { phase: "checking" }
  | { phase: "disabled" }
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "comparison"; suggestedTitle: string; suggestedDescription: string }
  | { phase: "error" };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  listingId: number;
  title: string;
  description: string;
  category: string;
  details: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ListingAssistant({
  listingId,
  title,
  description,
  category,
  details,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState<AssistantState>({ phase: "checking" });
  const [applying, setApplying] = useState(false);

  // Check whether the feature is enabled before showing the offer
  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((s: { ai_global_enabled?: boolean; ai_listing_assistant_enabled?: boolean }) => {
        if (s.ai_global_enabled && s.ai_listing_assistant_enabled) {
          setState({ phase: "idle" });
        } else {
          setState({ phase: "disabled" });
        }
      })
      .catch(() => setState({ phase: "disabled" }));
  }, []);

  const handlePreview = async () => {
    setState({ phase: "loading" });
    try {
      const res = await fetch("/api/ai/improve-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, details }),
      });

      if (!res.ok) throw new Error("request_failed");

      const data = (await res.json()) as {
        title?: string;
        description?: string;
        error?: string;
      };

      if (!data.title || !data.description) throw new Error("parse_failed");

      setState({
        phase: "comparison",
        suggestedTitle: data.title,
        suggestedDescription: data.description,
      });
    } catch {
      setState({ phase: "error" });
    }
  };

  const handleKeepMine = () => {
    router.push("/my-listings");
  };

  const handleUseSuggestion = async () => {
    if (state.phase !== "comparison") return;
    setApplying(true);
    await supabase
      .from("listings")
      .update({ title: state.suggestedTitle, description: state.suggestedDescription })
      .eq("id", listingId);
    setApplying(false);
    router.push("/my-listings");
  };

  // Shared navigation buttons used in error + idle states
  const NavButtons = () => (
    <div className="flex flex-wrap gap-3 mt-4">
      <button
        type="button"
        onClick={() => router.push("/my-listings")}
        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-950 hover:text-blue-950"
      >
        Към моите обяви
      </button>
      <button
        type="button"
        onClick={() => router.push(`/listing/${listingId}`)}
        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-950 hover:text-blue-950"
      >
        Виж обявата
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Success notice (always visible) ── */}
      <div className="rounded-[28px] border border-green-200 bg-green-50 p-5">
        <p className="font-black text-green-800">Обявата е публикувана</p>
        <p className="mt-1 text-sm font-semibold text-green-700">
          Вашата обява беше изпратена за преглед.
        </p>
      </div>

      {/* ── Checking / disabled states — show nav only, no AI offer ── */}
      {(state.phase === "checking" || state.phase === "disabled") && (
        <NavButtons />
      )}

      {/* ── Error state ── */}
      {state.phase === "error" && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="font-black text-slate-900">Предложението не е налично в момента.</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Обявата Ви е публикувана успешно.
          </p>
          <NavButtons />
        </div>
      )}

      {/* ── Idle state ── */}
      {state.phase === "idle" && (
        <div className="rounded-[28px] border border-blue-100 bg-blue-50/50 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-950 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-black text-blue-950">✨ Подобряване на обявата</p>
              <p className="mt-2 text-sm font-semibold text-slate-600 leading-relaxed">
                Подготвихме предложение за по-ясно представяне на Вашата обява.
                Разгледайте го и използвайте само ако Ви хареса.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handlePreview}
                  className="rounded-2xl bg-blue-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-900"
                >
                  Прегледай предложението
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/my-listings")}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-950 hover:text-blue-950"
                >
                  Към моите обяви
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading state ── */}
      {state.phase === "loading" && (
        <div className="rounded-[28px] border border-blue-100 bg-blue-50/50 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-950 shrink-0" />
            <p className="text-sm font-black text-blue-950">Подготвяме предложение…</p>
          </div>
        </div>
      )}

      {/* ── Comparison state ── */}
      {state.phase === "comparison" && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="font-black text-blue-950 text-lg mb-5">
            Ето как ще изглежда обявата Ви
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Current */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                Вашата версия
              </p>
              <p className="font-black text-slate-900 text-sm mb-2">{title}</p>
              <p className="text-sm font-semibold text-slate-600 leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            </div>

            {/* Suggested */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-wider text-blue-600">
                Предложение
              </p>
              <p className="font-black text-slate-900 text-sm mb-2">
                {state.suggestedTitle}
              </p>
              <p className="text-sm font-semibold text-slate-600 leading-relaxed whitespace-pre-wrap">
                {state.suggestedDescription}
              </p>
            </div>
          </div>

          {/* Equal-weight action buttons */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleKeepMine}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-950 hover:text-blue-950"
            >
              Запази моята версия
            </button>
            <button
              type="button"
              onClick={handleUseSuggestion}
              disabled={applying}
              className="rounded-2xl border border-blue-950 bg-blue-950 px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-60"
            >
              {applying ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Прилагане…
                </span>
              ) : (
                "Използвай предложението"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
