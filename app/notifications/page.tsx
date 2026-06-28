"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { Bell, CheckCheck, Loader2, MessageSquare, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Notification = {
  id: string;
  user_id: string;
  type: "new_message" | "listing_inquiry" | "listing_moderated";
  conversation_id: string | null;
  listing_id: number | null;
  message: string | null;
  body: string | null;
  read_at: string | null;
  read: boolean | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "Преди малко";
  if (diffMins < 60) return `Преди ${diffMins} мин.`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Преди ${diffHours} ч.`;

  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function typeLabel(type: Notification["type"]) {
  switch (type) {
    case "new_message":
      return "Ново съобщение";
    case "listing_inquiry":
      return "Запитване за обява";
    case "listing_moderated":
      return "Статус на обявата";
    default:
      return "Известие";
  }
}

function TypeIcon({ type }: { type: Notification["type"] }) {
  if (type === "new_message") return <MessageSquare className="h-5 w-5" />;
  if (type === "listing_inquiry") return <Search className="h-5 w-5" />;
  return <Bell className="h-5 w-5" />;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;

      if (!user) {
        router.push("/login?redirect=/notifications");
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, type, conversation_id, body, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotifications(data as Notification[]);
      }

      setLoading(false);

      // Realtime: prepend new notifications as they arrive
      channelRef.current = supabase
        .channel("notifications-page")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          }
        )
        .subscribe();
    };

    load();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [router]);

  const markOneRead = async (id: string) => {
    const now = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: now } : n))
    );
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setMarkingAll(true);
    const now = new Date().toISOString();

    await supabase
      .from("notifications")
      .update({ read_at: now })
      .in("id", unreadIds);

    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: now }))
    );
    setMarkingAll(false);
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // ── Render ────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="border-b border-slate-100 bg-white px-4 py-5 lg:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-slate-900">Известия</h1>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-950 px-1.5 text-[11px] font-black text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">Всички известия за вашия акаунт.</p>
        </div>
      </div>

      <section className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
        {loading ? (
          <div className="flex items-center justify-center rounded-3xl bg-white p-12 shadow-sm ring-1 ring-slate-200">
            <Loader2 className="h-6 w-6 animate-spin text-blue-950" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-16 text-center shadow-sm ring-1 ring-slate-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-950 text-white shadow-lg">
              <Bell className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-2xl font-black text-slate-900">Няма известия</h2>
            <p className="mt-3 max-w-sm text-base font-semibold text-slate-500">
              Тук ще се появяват вашите известия за съобщения и активност по обявите.
            </p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            {unreadCount > 0 && (
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={markingAll}
                  className="flex items-center gap-2 rounded-2xl border border-blue-950 px-4 py-2.5 text-sm font-black text-blue-950 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {markingAll ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  Маркирай всички като прочетено
                </button>
              </div>
            )}

            {/* List */}
            <div className="flex flex-col gap-3">
              {notifications.map((n) => {
                const isUnread = !n.read_at && !n.read;
                const href = n.conversation_id
                  ? `/messages/${n.conversation_id}`
                  : n.listing_id
                    ? `/listing/${n.listing_id}`
                    : null;
                const hrefLabel = n.conversation_id
                  ? "Виж разговора →"
                  : n.listing_id
                    ? "Виж обявата →"
                    : null;

                return (
                  <div
                    key={n.id}
                    className={`relative overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 transition ${
                      isUnread
                        ? "ring-blue-200 shadow-blue-100/50"
                        : "ring-slate-200"
                    }`}
                  >
                    {/* Unread indicator bar */}
                    {isUnread && (
                      <div className="absolute left-0 top-0 h-full w-1 rounded-l-[24px] bg-blue-950" />
                    )}

                    <div className="flex items-start gap-4 p-5 pl-6">
                      {/* Icon */}
                      <div
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          isUnread
                            ? "bg-blue-950 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <TypeIcon type={n.type} />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span
                            className={`text-xs font-black uppercase tracking-widest ${
                              isUnread ? "text-blue-950" : "text-slate-500"
                            }`}
                          >
                            {typeLabel(n.type)}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {formatDate(n.created_at)}
                          </span>
                        </div>

                        <p
                          className={`mt-1.5 text-sm leading-relaxed ${
                            isUnread
                              ? "font-bold text-slate-900"
                              : "font-semibold text-slate-500"
                          }`}
                        >
                          {n.message ?? n.body ?? "Ново известие."}
                        </p>

                        {/* Actions */}
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          {href && hrefLabel && (
                            <Link
                              href={href}
                              className="text-sm font-black text-blue-950 transition hover:text-blue-700"
                            >
                              {hrefLabel}
                            </Link>
                          )}

                          {isUnread && (
                            <button
                              type="button"
                              onClick={() => markOneRead(n.id)}
                              className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                            >
                              <CheckCheck className="h-3.5 w-3.5" />
                              Маркирай като прочетено
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
