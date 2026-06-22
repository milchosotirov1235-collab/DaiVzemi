"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

type Props = {
  avatarUrl: string | null;
  phone: string;
  city: string;
  hasGoogleLogin: boolean;
};

type Tip = { key: string; text: string };

function buildTips({ avatarUrl, phone, city, hasGoogleLogin }: Props): Tip[] {
  const tips: Tip[] = [];

  if (!avatarUrl) {
    tips.push({
      key: "avatar",
      text: "Добавянето на профилна снимка може да помогне на купувачите да Ви разпознават по-лесно.",
    });
  }

  if (!phone.trim()) {
    tips.push({
      key: "phone",
      text: "Добавянете телефон, за да могат купувачите да Ви намират по-лесно.",
    });
  }

  if (!city.trim()) {
    tips.push({
      key: "city",
      text: "Добавянете град, за да се показват обявите Ви при търсене по местоположение.",
    });
  }

  if (!hasGoogleLogin) {
    tips.push({
      key: "google",
      text: "Можете да свържете профила си с Google за по-лесен вход.",
    });
  }

  return tips;
}

export default function SellerTips(props: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((s: { ai_global_enabled?: boolean; ai_seller_tips_enabled?: boolean }) => {
        setEnabled(!!s.ai_global_enabled && !!s.ai_seller_tips_enabled);
      })
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) return null;

  const tips = buildTips(props);
  if (tips.length === 0) return null;

  return (
    <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-950 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <p className="text-sm font-black text-blue-950">✨ Съвет</p>
      </div>

      <ul className="space-y-3">
        {tips.map((tip) => (
          <li key={tip.key} className="flex items-start gap-2 text-sm font-semibold text-slate-600 leading-relaxed">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-950" />
            {tip.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
