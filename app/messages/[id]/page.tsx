"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import UnverifiedBanner from "@/components/UnverifiedBanner";
import { ArrowLeft, CheckCheck, Loader2, Paperclip, Send } from "lucide-react";
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
  const [myUsername, setMyUsername] = useState<string | null>(null);
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

      // Parallel: other user profile + my profile + listing title + messages
      const [profileRes, myProfileRes, listingRes, messagesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", otherId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
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
      setMyUsername(myProfileRes.data?.username ?? null);
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

    const { data: notifData } = await supabase
      .from("notifications")
      .insert({
        user_id: recipientId,
        type: "new_message",
        conversation_id: conversation.id,
        body: text.length > 80 ? `${text.slice(0, 80)}…` : text,
      })
      .select("id")
      .single();

    // Fire-and-forget email notification — never blocks sending
    if (notifData?.id) {
      supabase.auth.getSession().then(({ data: sessionData }) => {
        const token = sessionData?.session?.access_token;
        if (!token) return;
        fetch("/api/email/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: "new_message",
            notificationId: notifData.id,
            recipientId,
            senderUsername: myUsername ?? "Потребител",
            messagePreview: text.length > 120 ? `${text.slice(0, 120)}…` : text,
            conversationId: conversation.id,
          }),
        }).catch(() => { /* silent */ });
      });
    }

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
      <main className="flex h-[100dvh] flex-col bg-white lg:min-h-screen lg:bg-slate-50">
        <div className="hidden shrink-0 lg:block">
          <Header />
        </div>
        <div className="shrink-0 bg-blue-950 px-4 py-3.5 lg:sticky lg:top-[72px] lg:z-10 lg:border-b lg:border-slate-200 lg:bg-white lg:py-3 lg:shadow-sm">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <Link
              href="/messages"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 lg:text-slate-600 lg:hover:bg-slate-100"
              aria-label="Назад"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/20 lg:bg-slate-200" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-24 animate-pulse rounded-full bg-white/20 lg:bg-slate-200" />
              <div className="h-3 w-32 animate-pulse rounded-full bg-white/10 lg:bg-slate-100" />
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-950" />
        </div>
      </main>
    );
  }

  const groups = groupByDate(messages);
  const avatarLetter = (otherUser?.username ?? "?").charAt(0).toUpperCase();

  return (
    <main className="flex h-[100dvh] flex-col bg-white lg:min-h-screen lg:bg-slate-50">

      {/* Site header + unverified banner — desktop only */}
      <div className="hidden shrink-0 lg:block">
        <Header />
        {isEmailVerified === false && <UnverifiedBanner />}
      </div>

      {/* Chat header — blue on mobile, white on desktop */}
      <div className="shrink-0 bg-blue-950 px-4 py-3.5 lg:sticky lg:top-[72px] lg:z-10 lg:border-b lg:border-slate-200 lg:bg-white lg:py-3 lg:shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            href="/messages"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 transition active:bg-white/20 hover:bg-white/10 lg:text-slate-600 lg:hover:bg-slate-100"
            aria-label="Назад"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {otherUser?.avatar_url ? (
            <img
              src={otherUser.avatar_url}
              alt={otherUser.username ?? ""}
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/30 lg:h-10 lg:w-10 lg:ring-slate-200"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-black text-white lg:h-10 lg:w-10 lg:bg-blue-950">
              {avatarLetter}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white lg:text-slate-900">
              {otherUser?.username ?? "Потребител"}
            </p>
            {listingTitle && (
              <p className="truncate text-xs font-semibold text-blue-200 lg:text-blue-950">
                {listingTitle}
              </p>
            )}
          </div>

          {conversation?.listing_id && (
            <Link
              href={`/listing/${conversation.listing_id}`}
              className="hidden shrink-0 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 lg:flex"
            >
              Виж обявата →
            </Link>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50">
        <div className="mx-auto max-w-3xl space-y-1 px-3 py-5 lg:px-4 lg:py-6">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-950/8 text-3xl">
                💬
              </div>
              <p className="text-sm font-black text-slate-700">Разговорът е празен</p>
              <p className="text-xs text-slate-400">Изпратете първото съобщение.</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.date}>
                {/* Date divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500">
                    {group.date}
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="space-y-1">
                  {group.messages.map((msg) => {
                    const isOwn = msg.sender_id === userId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[78%] shadow-sm lg:max-w-[72%] ${
                            isOwn
                              ? "rounded-[18px] rounded-br-[5px] bg-blue-950 text-white"
                              : "rounded-[18px] rounded-bl-[5px] bg-white text-slate-900 ring-1 ring-slate-100"
                          }`}
                        >
                          <p className="whitespace-pre-wrap px-4 pb-1 pt-2.5 text-[15px] leading-snug lg:text-sm lg:leading-relaxed">
                            {msg.content}
                          </p>
                          <div
                            className={`flex items-center gap-1 px-4 pb-2.5 text-[11px] ${
                              isOwn ? "justify-end text-blue-200/70" : "text-slate-400"
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

      {/* Input bar */}
      <div
        className="shrink-0 border-t border-slate-100 bg-white"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {isEmailVerified === false ? (
          <div className="px-4 py-3 text-center">
            <p className="text-sm font-semibold text-amber-700">
              Потвърдете имейла си, за да изпращате съобщения.{" "}
              <a
                href="/verify-email"
                className="font-black underline underline-offset-2 hover:text-amber-900"
              >
                Потвърди →
              </a>
            </p>
          </div>
        ) : (
          <div>
            {sendError && (
              <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-center text-xs font-semibold text-red-700">
                {sendError}
              </p>
            )}
            <div className="mx-auto flex max-w-3xl items-end gap-2 px-3 py-2.5">
              {/* Attachment — visual placeholder, ready for image sending */}
              <button
                type="button"
                aria-label="Прикачи снимка"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-300 transition active:bg-slate-50 lg:hidden"
              >
                <Paperclip className="h-5 w-5" />
              </button>

              {/* Textarea in styled pill */}
              <div className="flex flex-1 items-end rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-2.5 transition focus-within:border-blue-950 focus-within:ring-2 focus-within:ring-blue-950/10">
                <textarea
                  ref={inputRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Съобщение..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400 lg:text-sm"
                  style={{ maxHeight: "100px" }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
                  }}
                />
              </div>

              {/* Send */}
              <button
                type="button"
                onClick={sendMessage}
                disabled={!messageText.trim() || sending}
                aria-label="Изпрати"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
                  messageText.trim() && !sending
                    ? "bg-blue-950 text-white shadow-md active:bg-blue-900 hover:bg-blue-900"
                    : "bg-slate-100 text-slate-400"
                } disabled:cursor-not-allowed`}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="hidden pb-1.5 text-center text-[11px] text-slate-400 lg:block">
              Shift + Enter за нов ред
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
