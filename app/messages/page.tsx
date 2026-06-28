"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Conversation = {
  id: string;
  listing_id: number;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type ListingMeta = {
  id: number;
  title: string;
};

type ConversationRow = {
  conversation: Conversation;
  listing: ListingMeta | null;
  otherUser: Profile | null;
  lastMessage: Message | null;
  unreadCount: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Сега";
  if (mins < 60) return `Преди ${mins} мин.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Преди ${hours} ч.`;
  const days = Math.floor(hours / 24);
  return `Преди ${days} д.`;
}

function avatarLetter(profile: Profile | null) {
  return (profile?.username ?? "?").charAt(0).toUpperCase();
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MessagesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;

      if (!user) {
        router.push("/login?redirect=/messages");
        return;
      }

      setUserId(user.id);

      // 1. Conversations
      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select("id, listing_id, buyer_id, seller_id, updated_at")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (convError || !conversations || conversations.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const convIds = conversations.map((c) => c.id);
      const listingIds = [...new Set(conversations.map((c) => c.listing_id))];
      const participantIds = [
        ...new Set(conversations.flatMap((c) => [c.buyer_id, c.seller_id])),
      ];

      // 2. Listings, profiles, messages — parallel
      const [listingsRes, profilesRes, messagesRes] = await Promise.all([
        supabase
          .from("listings")
          .select("id, title")
          .in("id", listingIds),
        supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", participantIds),
        supabase
          .from("messages")
          .select("id, conversation_id, sender_id, content, read_at, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false }),
      ]);

      const listingsMap = new Map<number, ListingMeta>(
        (listingsRes.data ?? []).map((l) => [l.id, l])
      );
      const profilesMap = new Map<string, Profile>(
        (profilesRes.data ?? []).map((p) => [p.id, p])
      );

      // Group messages by conversation
      const messagesByConv = new Map<string, Message[]>();
      for (const msg of messagesRes.data ?? []) {
        if (!messagesByConv.has(msg.conversation_id)) {
          messagesByConv.set(msg.conversation_id, []);
        }
        messagesByConv.get(msg.conversation_id)!.push(msg);
      }

      const result: ConversationRow[] = conversations.map((conv) => {
        const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
        const msgs = messagesByConv.get(conv.id) ?? [];
        const unreadCount = msgs.filter(
          (m) => m.sender_id !== user.id && m.read_at === null
        ).length;

        return {
          conversation: conv,
          listing: listingsMap.get(conv.listing_id) ?? null,
          otherUser: profilesMap.get(otherId) ?? null,
          lastMessage: msgs[0] ?? null,
          unreadCount,
        };
      });

      setRows(result);
      setLoading(false);

      // ── Realtime: keep the conversation list live ──────────────────────────
      const uid = Math.random().toString(36).slice(2);
      channel = supabase
        .channel(`messages-list-${user.id}-${uid}`)
        // New message → update last preview + unread count, bubble to top
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const newMsg = payload.new as Message;
            setRows((prev) => {
              const idx = prev.findIndex(
                (r) => r.conversation.id === newMsg.conversation_id
              );
              if (idx === -1) return prev; // not one of our conversations

              const updated: ConversationRow = {
                ...prev[idx],
                lastMessage: newMsg,
                unreadCount:
                  newMsg.sender_id !== user.id
                    ? prev[idx].unreadCount + 1
                    : prev[idx].unreadCount,
              };

              // Move to top so most-recent is first
              const next = [...prev];
              next.splice(idx, 1);
              return [updated, ...next];
            });
          }
        )
        // Message marked read → decrement unread count
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages" },
          (payload) => {
            const updatedMsg = payload.new as Message;
            if (!updatedMsg.read_at) return;
            setRows((prev) => {
              const idx = prev.findIndex(
                (r) => r.conversation.id === updatedMsg.conversation_id
              );
              if (idx === -1) return prev;
              const next = [...prev];
              next[idx] = {
                ...next[idx],
                unreadCount: Math.max(0, next[idx].unreadCount - 1),
              };
              return next;
            });
          }
        )
        .subscribe();
    };

    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  const totalUnread = rows.reduce((sum, r) => sum + r.unreadCount, 0);

  return (
    <main className="min-h-screen bg-white lg:bg-slate-50">
      <Header />

      {/* Compact page header — shared desktop + mobile */}
      <div className="border-b border-slate-100 bg-white px-4 py-5 lg:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-slate-900">Съобщения</h1>
          {totalUnread > 0 && (
            <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-blue-950 px-2 text-[11px] font-black text-white">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-slate-500">Разговори с купувачи и продавачи</p>
      </div>

      <section className="mx-auto max-w-4xl px-0 py-2 lg:px-6 lg:py-10">
        {loading ? (
          <div className="divide-y divide-slate-100 lg:flex lg:flex-col lg:gap-3 lg:divide-y-0">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-4 lg:rounded-[24px] lg:bg-white lg:p-5 lg:shadow-sm lg:ring-1 lg:ring-slate-200"
              >
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-slate-200 lg:h-14 lg:w-14" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="h-3.5 w-28 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-3 w-10 animate-pulse rounded-full bg-slate-200" />
                  </div>
                  <div className="h-3 w-36 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-3 w-48 animate-pulse rounded-full bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="mx-4 mt-4 rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100 lg:mx-0 lg:p-12 lg:ring-slate-200">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-950/8 text-3xl">
              💬
            </div>
            <p className="text-base font-black text-slate-900">Нямате съобщения</p>
            <p className="mt-2 text-sm text-slate-500">
              Отворете обява и натиснете „Изпрати съобщение", за да започнете разговор.
            </p>
            <Link
              href="/listings"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white transition active:bg-blue-900 hover:bg-blue-900"
            >
              Разгледай обяви
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 lg:flex lg:flex-col lg:gap-3 lg:divide-y-0">
            {rows.map(({ conversation, listing, otherUser, lastMessage, unreadCount }) => (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition active:bg-slate-50 lg:rounded-[24px] lg:bg-white lg:p-5 lg:shadow-sm lg:ring-1 lg:ring-slate-200 lg:hover:-translate-y-0.5 lg:hover:shadow-md"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {otherUser?.avatar_url ? (
                    <img
                      src={otherUser.avatar_url}
                      alt={otherUser.username ?? ""}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-white lg:h-14 lg:w-14"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-950 text-lg font-black text-white lg:h-14 lg:w-14 lg:text-xl">
                      {avatarLetter(otherUser)}
                    </div>
                  )}
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-950 px-1 text-[10px] font-black text-white ring-2 ring-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`truncate text-[15px] ${
                        unreadCount > 0
                          ? "font-black text-slate-900"
                          : "font-bold text-slate-800"
                      }`}
                    >
                      {otherUser?.username ?? "Потребител"}
                    </p>
                    {lastMessage && (
                      <span
                        className={`shrink-0 text-xs ${
                          unreadCount > 0 ? "font-bold text-blue-950" : "text-slate-400"
                        }`}
                      >
                        {timeAgo(lastMessage.created_at)}
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 truncate text-xs font-semibold text-blue-950/60 lg:text-blue-950">
                    {listing?.title ?? "Изтрита обява"}
                  </p>

                  <p
                    className={`mt-0.5 truncate text-sm ${
                      unreadCount > 0 ? "font-bold text-slate-900" : "text-slate-500"
                    }`}
                  >
                    {lastMessage
                      ? (lastMessage.sender_id === userId ? "Вие: " : "") +
                        lastMessage.content
                      : "Няма съобщения"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
