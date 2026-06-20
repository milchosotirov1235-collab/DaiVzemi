"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "dv_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) setVisible(true);
    } catch {
      // localStorage unavailable (private mode, etc.) — don't show
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-4 py-4 shadow-2xl sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-blue-950" />
          <p className="text-sm font-semibold text-slate-700">
            Използваме бисквитки, за да осигурим нормалното функциониране на платформата.{" "}
            <Link
              href="/cookies"
              className="font-black text-blue-950 underline underline-offset-2 hover:text-blue-800"
            >
              Научи повече
            </Link>
          </p>
        </div>

        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded-2xl bg-blue-950 px-6 py-2.5 text-sm font-black text-white transition hover:bg-blue-900"
        >
          Приемам
        </button>
      </div>
    </div>
  );
}
