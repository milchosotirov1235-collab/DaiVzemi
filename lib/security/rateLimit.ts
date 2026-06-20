import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string };

// ---------------------------------------------------------------------------
// Listings — max 5 per hour, max 20 per 24 hours
// Duplicate — same title+description within 10 minutes
// ---------------------------------------------------------------------------

export async function checkListingRateLimit(userId: string): Promise<RateLimitResult> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [hourRes, dayRes] = await Promise.all([
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneDayAgo),
  ]);

  if ((hourRes.count ?? 0) >= 5) {
    return { allowed: false, reason: "Достигнахте лимита от 5 обяви за час. Опитайте по-късно." };
  }
  if ((dayRes.count ?? 0) >= 20) {
    return { allowed: false, reason: "Достигнахте лимита от 20 обяви за 24 часа." };
  }
  return { allowed: true };
}

export async function checkDuplicateListing(
  userId: string,
  title: string,
  description: string
): Promise<RateLimitResult> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("listings")
    .select("title, description")
    .eq("user_id", userId)
    .gte("created_at", tenMinutesAgo)
    .limit(10);

  const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const t = normalise(title);
  const d = normalise(description);

  const isDuplicate = (data ?? []).some(
    (l) => normalise(l.title ?? "") === t && normalise(l.description ?? "") === d
  );

  if (isDuplicate) {
    return { allowed: false, reason: "Идентична обява вече съществува. Изчакайте преди да публикувате отново." };
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Messages — max 30 per 10 minutes per conversation
// Duplicate — same content twice in a row within 1 minute
// ---------------------------------------------------------------------------

export async function checkMessageRateLimit(
  userId: string,
  conversationId: string
): Promise<RateLimitResult> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", userId)
    .eq("conversation_id", conversationId)
    .gte("created_at", tenMinutesAgo);

  if ((count ?? 0) >= 30) {
    return { allowed: false, reason: "Изпращате съобщения твърде бързо. Изчакайте малко." };
  }
  return { allowed: true };
}

export async function checkDuplicateMessage(
  userId: string,
  conversationId: string,
  content: string
): Promise<RateLimitResult> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

  const { data } = await supabase
    .from("messages")
    .select("content")
    .eq("sender_id", userId)
    .eq("conversation_id", conversationId)
    .gte("created_at", oneMinuteAgo)
    .order("created_at", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const last = (data[0].content ?? "").trim().toLowerCase();
    if (last === content.trim().toLowerCase()) {
      return { allowed: false, reason: "Не можете да изпратите едно и също съобщение два пъти подред." };
    }
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Reports — max 10 per 24 hours
// ---------------------------------------------------------------------------

export async function checkReportRateLimit(userId: string): Promise<RateLimitResult> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_user_id", userId)
    .gte("created_at", oneDayAgo);

  if ((count ?? 0) >= 10) {
    return { allowed: false, reason: "Достигнахте лимита от 10 доклада за 24 часа." };
  }
  return { allowed: true };
}
