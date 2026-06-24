"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";

const FAB_HIDDEN_PATHS = ["/publish", "/edit-listing", "/login", "/register"];

export default function SiteChrome() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  const showFab = !FAB_HIDDEN_PATHS.some((p) => pathname.startsWith(p));

  return (
    <>
      <Footer />
      <CookieBanner />
      {showFab && (
        <Link
          href="/publish"
          aria-label="Публикувай обява"
          className="fixed bottom-6 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-950 text-white shadow-xl transition hover:bg-blue-900 active:scale-95 lg:hidden"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </Link>
      )}
    </>
  );
}
