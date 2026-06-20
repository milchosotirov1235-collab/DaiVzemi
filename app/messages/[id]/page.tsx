"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import UnverifiedBanner from "@/components/UnverifiedBanner";
import { ArrowLeft, CheckCheck, Loader2, Send } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { checkMessageRateLimit, checkDuplicateMessage } from "@/lib/security/rateLimit";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

type Conversation = {
  id: string;
  listing_id: number;
  buyer_id: string;
  seller_id: string;
};

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" });
  }

  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = "";

  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString("bg-BG", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ date, messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [listingTitle, setListingTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Auto-scroll to bottom ────────────────────────────────
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── Load conversation ─────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setIsEmailVerified(!!user.email_confirmed_at);

      // Conversation
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .select("id, listing_id, buyer_id, seller_id")
        .eq("id", conversationId)
        .single();

      if (convError || !conv) {
        router.push("/messages");
        return;
      }

      // Access guard
      if (conv.buyer_id !== user.id && conv.seller_id !== user.id) {
        router.push("/messages");
        return;
      }

      setConversation(conv);

      const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;

      // Parallel: other user profile + listing title + messages
      const [profileRes, listingRes, messagesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", otherId)
          .maybeSingle(),
        supabase
          .from("listings")
          .select("title")
          .eq("id", conv.listing_id)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("id, conversation_id, sender_id, content, read_at, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),
      ]);

      setOtherUser(profileRes.data ?? null);
      setListingTitle(listingRes.data?.title ?? null);
      setMessages(messagesRes.data ?? []);

      // Mark unread messages from the other user as read
      const unreadIds = (messagesRes.data ?? [])
        .filter((m) => m.sender_id !== user.id && m.read_at === null)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds);
      }

      setLoading(false);
    };

    load();
  }, [conversationId, router]);

  // ── Realtime subscription ─────────────────────────────────
  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates (optimistic insert already added it)
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // If the new message is from the other person, mark it read immediately
          if (newMsg.sender_id !== userId) {
            await supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  // ── Send message ──────────────────────────────────────────
  const sendMessage = async () => {
    const text = messageText.trim();
    if (!text || !userId || !conversation || sending) return;
    if (!isEmailVerified) return;

    const [rateResult, dupResult] = await Promise.all([
      checkMessageRateLimit(userId, conversation.id),
      checkDuplicateMessage(userId, conversation.id, text),
    ]);
    if (!rateResult.allowed) {
      setSendError(rateResult.reason);
      setTimeout(() => setSendError(null), 4000);
      return;
    }
    if (!dupResult.allowed) {
      setSendError(dupResult.reason);
      setTimeout(() => setSendError(null), 4000);
      return;
    }
    setSendError(null);

    setSending(true);
    setMessageText("");

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: Message = {
      id: optimisticId,
      conversation_id: conversation.id,
      sender_id: userId,
      content: text,
      read_at: null,
      created_at: new Date().toISOString(),
    };

    // Optimistic insert
    setMessages((prev) => [...prev, optimistic]);

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: userId,
        content: text,
      })
      .select("id, conversation_id, sender_id, content, read_at, created_at")
      .single();

    if (error) {
      // Rollback optimistic
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setSending(false);
      return;
    }

    // Replace optimistic with real message
    setMessages((prev) =>
      prev.map((m) => (m.id === optimisticId ? (inserted as Message) : m))
    );

    // Create notification for the other participant
    const recipientId =
      conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id;

    await supabase.from("notifications").insert({
      user_id: recipientId,
      type: "new_message",
      conversation_id: conversation.id,
      body: text.length > 80 ? `${text.slice(0, 80)}…` : text,
    });

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-950" />
        </div>
      </main>
    );
  }

  const groups = groupByDate(messages);
  const avatarLetter = (otherUser?.username ?? "?").charAt(0).toUpperCase();

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      {isEmailVerified === false && <UnverifiedBanner />}

      {/* ── Chat header ── */}
      <div className="sticky top-[var(--header-height,72px)] z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            href="/messages"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {otherUser?.avatar_url ? (
            <img
              src={otherUser.avatar_url}
              alt={otherUser.username ?? ""}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-950 text-sm font-black text-white">
              {avatarLetter}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">
              {otherUser?.username ?? "Потребител"}
            </p>
            {listingTitle && (
              <p className="truncate text-xs font-semibold text-blue-950">
                {listingTitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
          {groups.length === 0 ? (
            <p className="text-center text-sm font-semibold text-slate-400">
              Напишете първото съобщение по-долу.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.date}>
                {/* Date divider */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-semibold text-slate-400">
                    {group.date}
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="space-y-2">
                  {group.messages.map((msg) => {
                    const isOwn = msg.sender_id === userId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[72%] rounded-[20px] px-4 py-3 shadow-sm ${
                            isOwn
                              ? "rounded-br-md bg-blue-950 text-white"
                              : "rounded-bl-md bg-white ring-1 ring-slate-200 text-slate-900"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {msg.content}
                          </p>
                          <div
                            className={`mt-1 flex items-center gap-1 text-[11px] ${
                              isOwn ? "justify-end text-blue-200" : "text-slate-400"
                            }`}
                          >
                            <span>{formatTime(msg.created_at)}</span>
                            {isOwn && msg.read_at && (
                              <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input ── */}
      <div className="border-t border-slate-200 bg-white px-4 py-4">
        {isEmailVerified === false ? (
          <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-800">
            Потвърдете имейла си, за да изпращате съобщения.{" "}
            <a href="/verify-email" className="font-black underline underline-offset-2 hover:text-amber-900">
              Потвърди →
            </a>
          </div>
        ) : (
          <>
            {sendError && (
              <p className="mx-auto mb-2 max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-700">
                {sendError}
              </p>
            )}
            <div className="mx-auto flex max-w-3xl items-end gap-3">
              <textarea
                ref={inputRef}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Напишете съобщение… (Enter за изпращане)"
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                style={{ maxHeight: "140px" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
                }}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!messageText.trim() || sending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-950 text-white shadow-md transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Изпрати"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Shift + Enter за нов ред
            </p>
          </>
        )}
      </div>
    </main>
  );
}
