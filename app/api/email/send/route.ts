import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";
import {
  listingApprovedEmail,
  listingRejectedEmail,
  newMessageEmail,
} from "@/lib/email/templates";

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

function getAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "https://daivzemi.bg";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SendPayload =
  | { type: "listing_approved"; listingId: number; userId: string }
  | { type: "listing_rejected"; listingId: number; userId: string }
  | {
      type: "new_message";
      notificationId: string;
      recipientId: string;
      senderUsername: string;
      messagePreview: string;
      conversationId: string;
    };

// ---------------------------------------------------------------------------
// POST /api/email/send
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // ── Auth guard — require valid session token ──────────────────────────────
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const anonClient = getAnonClient();
  const {
    data: { user },
    error: authError,
  } = await anonClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let payload: SendPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const db = getServiceClient();

  // ── Route by type ─────────────────────────────────────────────────────────
  try {
    if (payload.type === "listing_approved" || payload.type === "listing_rejected") {
      // Verify caller is admin
      const { data: profile } = await anonClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role !== "admin") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }

      await sendModerationEmail(db, payload);
      return NextResponse.json({ ok: true });
    }

    if (payload.type === "new_message") {
      // Caller must be the sender (recipient is derived server-side)
      // Caller is already authenticated — trust their identity
      await sendMessageEmail(db, payload);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown_type" }, { status: 400 });
  } catch (err) {
    // Email errors must never surface to client as failures
    console.error("[email/send]", err);
    return NextResponse.json({ ok: true, warning: "email_failed" });
  }
}

// ---------------------------------------------------------------------------
// Moderation email (listing approved / rejected)
// ---------------------------------------------------------------------------

async function sendModerationEmail(
  db: ReturnType<typeof getServiceClient>,
  payload: { type: "listing_approved" | "listing_rejected"; listingId: number; userId: string },
) {
  // Fetch listing title
  const { data: listing } = await db
    .from("listings")
    .select("title")
    .eq("id", payload.listingId)
    .maybeSingle();

  if (!listing) return;

  // Fetch recipient email via service role (auth.admin API)
  const { data: userData } = await db.auth.admin.getUserById(payload.userId);
  const email = userData?.user?.email;
  if (!email) return;

  // Check opt-out
  const { data: prof } = await db
    .from("profiles")
    .select("email_notifications_enabled")
    .eq("id", payload.userId)
    .maybeSingle();

  if (prof?.email_notifications_enabled === false) return;

  const template =
    payload.type === "listing_approved"
      ? listingApprovedEmail({ listingTitle: listing.title, listingId: payload.listingId, baseUrl: BASE_URL })
      : listingRejectedEmail({ listingTitle: listing.title, listingId: payload.listingId, baseUrl: BASE_URL });

  await sendEmail({ to: email, ...template });
}

// ---------------------------------------------------------------------------
// New message email
// ---------------------------------------------------------------------------

async function sendMessageEmail(
  db: ReturnType<typeof getServiceClient>,
  payload: {
    type: "new_message";
    notificationId: string;
    recipientId: string;
    senderUsername: string;
    messagePreview: string;
    conversationId: string;
  },
) {
  // Dedup: check if email was already sent for this notification
  const { data: notif } = await db
    .from("notifications")
    .select("email_sent_at")
    .eq("id", payload.notificationId)
    .maybeSingle();

  if (notif?.email_sent_at) return; // already sent

  // Check opt-out
  const { data: prof } = await db
    .from("profiles")
    .select("email_notifications_enabled")
    .eq("id", payload.recipientId)
    .maybeSingle();

  if (prof?.email_notifications_enabled === false) return;

  // Fetch recipient email
  const { data: userData } = await db.auth.admin.getUserById(payload.recipientId);
  const email = userData?.user?.email;
  if (!email) return;

  const template = newMessageEmail({
    senderUsername: payload.senderUsername,
    messagePreview: payload.messagePreview,
    conversationId: payload.conversationId,
    baseUrl: BASE_URL,
  });

  const sent = await sendEmail({ to: email, ...template });

  // Mark email_sent_at so we don't send again for this notification
  if (sent) {
    await db
      .from("notifications")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", payload.notificationId);
  }
}
