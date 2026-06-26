"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MessageCircle, Plus, Search, User } from "lucide-react";

const HIDDEN_PATHS = ["/publish", "/edit-listing", "/login", "/register", "/admin", "/listing/", "/messages/"];

type NavItem = {
  label: string | null;
  href: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  primary?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Търси",   href: "/listings",  Icon: Search },
  { label: "Любими", href: "/favorites", Icon: Heart },
  { label: null,      href: "/publish",   Icon: Plus,  primary: true },
  { label: "Чат",    href: "/messages",  Icon: MessageCircle },
  { label: "Профил", href: "/profile",   Icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-blue-800/50 bg-blue-950/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center">
        {NAV_ITEMS.map(({ label, href, Icon, primary }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-opacity active:opacity-70"
            >
              {primary ? (
                /* Publish button — white circle, inverted, pops against dark nav */
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg shadow-black/30 transition active:scale-95">
                  <Icon className="h-[22px] w-[22px] text-blue-950" strokeWidth={2.5} />
                </span>
              ) : (
                <>
                  <Icon
                    className={`h-[22px] w-[22px] transition-colors ${active ? "text-white" : "text-blue-400"}`}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                  <span
                    className={`text-[10px] font-semibold leading-none tracking-wide transition-colors ${
                      active ? "text-white" : "text-blue-400"
                    }`}
                  >
                    {label}
                  </span>
                  {/* Active indicator dot */}
                  {active && (
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-white opacity-80" />
                  )}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
