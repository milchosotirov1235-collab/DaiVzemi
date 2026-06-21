import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AISettings = {
  ai_global_enabled: boolean;
  ai_listing_assistant_enabled: boolean;
  ai_seller_tips_enabled: boolean;
  ai_search_assistant_enabled: boolean;
  ai_moderator_assistant_enabled: boolean;
};

// ---------------------------------------------------------------------------
// Defaults — everything off until explicitly enabled in DB
// ---------------------------------------------------------------------------

export const AI_DEFAULTS: AISettings = {
  ai_global_enabled: false,
  ai_listing_assistant_enabled: false,
  ai_seller_tips_enabled: false,
  ai_search_assistant_enabled: false,
  ai_moderator_assistant_enabled: false,
};

// ---------------------------------------------------------------------------
// Server-side fetch — used in Route Handlers
// ---------------------------------------------------------------------------

export async function fetchAISettings(): Promise<AISettings> {
  // Env killswitch: AI_ENABLED=false disables everything regardless of DB
  if (process.env.AI_ENABLED === "false") return AI_DEFAULTS;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return AI_DEFAULTS;

  try {
    const client = createClient(url, key);
    const { data, error } = await client
      .from("site_settings")
      .select(
        "ai_global_enabled, ai_listing_assistant_enabled, ai_seller_tips_enabled, ai_search_assistant_enabled, ai_moderator_assistant_enabled"
      )
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return AI_DEFAULTS;
    return data as AISettings;
  } catch {
    return AI_DEFAULTS;
  }
}

// ---------------------------------------------------------------------------
// Helper — check a specific feature is active (global AND feature both on)
// ---------------------------------------------------------------------------

export function isFeatureEnabled(
  settings: AISettings,
  feature: keyof Omit<AISettings, "ai_global_enabled">
): boolean {
  return settings.ai_global_enabled && settings[feature];
}
