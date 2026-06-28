import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchAISettings, isFeatureEnabled } from "@/lib/ai/settings";
import { runRules } from "@/lib/ai/moderator";

function getAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Service-role client — only used for the final write after auth is confirmed.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth guard ────────────────────────────────────────────────────────────
    // Require a valid session token. Caller must be the listing's own author
    // OR an admin. This prevents anonymous/third-party manipulation of AI scores.
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const anonClient = getAnonClient();
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Check if caller is admin
    const { data: profile } = await anonClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const isAdmin = profile?.role === "admin";

    // ── Feature flag ──────────────────────────────────────────────────────────
    const aiSettings = await fetchAISettings();
    if (!isFeatureEnabled(aiSettings, "ai_moderator_assistant_enabled")) {
      return NextResponse.json({ skipped: true, reason: "moderator disabled" });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    const listingId = body?.listingId;
    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    // ── Fetch listing ─────────────────────────────────────────────────────────
    const db = getServiceClient();
    const { data: listing, error: fetchError } = await db
      .from("listings")
      .select("id, user_id, title, description, price, listing_type, image_url, image_urls")
      .eq("id", listingId)
      .maybeSingle();

    if (fetchError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Caller must be admin or the listing's own author
    if (!isAdmin && listing.user_id !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // ── Run rule engine ───────────────────────────────────────────────────────
    const result = runRules(listing);

    // ── Write AI columns only — never touches moderation_status or hidden ─────
    const { error: updateError } = await db
      .from("listings")
      .update({
        ai_risk_score:     result.score,
        ai_recommendation: result.recommendation,
        ai_reason:         result.reason,
        ai_checked_at:     new Date().toISOString(),
      })
      .eq("id", listingId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
