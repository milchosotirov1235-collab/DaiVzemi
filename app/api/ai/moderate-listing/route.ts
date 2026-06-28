import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchAISettings, isFeatureEnabled } from "@/lib/ai/settings";
import { runRules } from "@/lib/ai/moderator";

// Uses service-role key so it can write back to the listings row.
// If service key is absent (local dev without it), falls back to anon key —
// update will silently fail RLS but the route won't crash.
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const { listingId } = await req.json();
    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    // Respect the AI feature flag
    const aiSettings = await fetchAISettings();
    if (!isFeatureEnabled(aiSettings, "ai_moderator_assistant_enabled")) {
      return NextResponse.json({ skipped: true, reason: "moderator disabled" });
    }

    const db = getAdminClient();

    // Fetch the listing
    const { data: listing, error: fetchError } = await db
      .from("listings")
      .select("id, title, description, price, listing_type, image_url, image_urls")
      .eq("id", listingId)
      .maybeSingle();

    if (fetchError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Run the rule engine
    const result = runRules(listing);

    // Write results back — NEVER changes moderation_status, hidden, or any
    // public-facing field. Only the four AI columns are touched.
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
