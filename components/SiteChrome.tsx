"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function SiteChrome() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <Footer />
      {/* Spacer so the last page content isn't hidden behind the bottom nav */}
      <div className="h-20 lg:hidden" />
      <CookieBanner />
      <MobileBottomNav />
    </>
  );
}
