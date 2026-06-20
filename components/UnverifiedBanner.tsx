"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function UnverifiedBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm font-semibold text-amber-800">
          Имейлът ви не е потвърден. Някои функции са ограничени.{" "}
          <Link
            href="/verify-email"
            className="font-black underline underline-offset-2 hover:text-amber-900"
          >
            Потвърди имейла →
          </Link>
        </p>
      </div>
    </div>
  );
}
