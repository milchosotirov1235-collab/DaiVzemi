"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MessageCircle, Plus, Search, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const HIDDEN_PATHS = ["/publish", "/edit-listing", "/login", "/register", "/admin", "/listing/", "/messages/"];

type NavItem = {
  label: string | null;
  href: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  primary?: boolean;
  badgeKey?: "messages" | "notifications";
};

const NAV_ITEMS: NavItem[] = [
  { label: "Търси",   href: "/listings",  Icon: Search },
  { label: "Любими", href: "/favorites", Icon: Heart },
  { label: null,      href: "/publish",   Icon: Plus,  primary: true },
  { label: "Чат",    href: "/messages",  Icon: MessageCircle, badgeKey: "messages" },
  { label: "Профил", href: "/profile",   Icon: User,          badgeKey: "notifications" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const msgChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const notifChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let userId: string | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      userId = session.user.id;

      // Initial counts
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("read", false)
        .then(({ count }) => setUnreadMessages(count ?? 0));

      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false)
        .then(({ count }) => setUnreadNotifications(count ?? 0));

      // Realtime: messages
      msgChannelRef.current = supabase
        .channel("mobile-nav-messages")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` },
          () => {
            supabase
              .from("messages")
              .select("id", { count: "exact", head: true })
              .eq("recipient_id", userId!)
              .eq("read", false)
              .then(({ count }) => setUnreadMessages(count ?? 0));
          },
        )
        .subscribe();

      // Realtime: notifications
      notifChannelRef.current = supabase
        .channel("mobile-nav-notifications")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          () => {
            supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId!)
              .eq("read", false)
              .then(({ count }) => setUnreadNotifications(count ?? 0));
          },
        )
        .subscribe();
    });

    return () => {
      msgChannelRef.current?.unsubscribe();
      notifChannelRef.current?.unsubscribe();
    };
  }, []);

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const badgeCounts: Record<string, number> = {
    messages: unreadMessages,
    notifications: unreadNotifications,
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-blue-800/50 bg-blue-950/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center">
        {NAV_ITEMS.map(({ label, href, Icon, primary, badgeKey }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const badge = badgeKey ? (badgeCounts[badgeKey] ?? 0) : 0;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-opacity active:opacity-70"
            >
              {primary ? (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg shadow-black/30 transition active:scale-95">
                  <Icon className="h-[22px] w-[22px] text-blue-950" strokeWidth={2.5} />
                </span>
              ) : (
                <>
                  <span className="relative">
                    <Icon
                      className={`h-[22px] w-[22px] transition-colors ${active ? "text-white" : "text-blue-400"}`}
                      strokeWidth={active ? 2.5 : 1.8}
                    />
                    {badge > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-semibold leading-none tracking-wide transition-colors ${
                      active ? "text-white" : "text-blue-400"
                    }`}
                  >
                    {label}
                  </span>
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
