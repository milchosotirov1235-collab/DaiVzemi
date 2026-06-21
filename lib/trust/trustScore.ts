import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrustScores = {
  trust_score: number;
  seller_score: number;
  buyer_score: number;
  reporter_score: number;
};

export type TrustDelta = Partial<TrustScores>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TRUST_DEFAULT = 50;
export const TRUST_MIN = 0;
export const TRUST_MAX = 100;

/**
 * Future signal weights for composite trust_score calculation.
 * Adjust these when wiring in AI moderation or reputation signals.
 */
export const TRUST_WEIGHTS = {
  seller: 0.35,
  buyer: 0.25,
  reporter: 0.20,
  base: 0.20, // account age, email verified, etc.
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a score to [TRUST_MIN, TRUST_MAX]. */
export function clampScore(value: number): number {
  return Math.max(TRUST_MIN, Math.min(TRUST_MAX, Math.round(value)));
}

/**
 * Recalculate composite trust_score from component scores.
 * Formula is intentionally simple now; swap it out when signals mature.
 */
export function calcCompositeTrust(scores: Omit<TrustScores, "trust_score">): number {
  const { seller_score, buyer_score, reporter_score } = scores;
  const weighted =
    seller_score * TRUST_WEIGHTS.seller +
    buyer_score * TRUST_WEIGHTS.buyer +
    reporter_score * TRUST_WEIGHTS.reporter +
    TRUST_DEFAULT * TRUST_WEIGHTS.base;
  return clampScore(weighted);
}

/**
 * Apply a delta to an existing score, clamping the result.
 * Example: applyDelta(50, +10) → 60, applyDelta(5, -10) → 0
 */
export function applyDelta(current: number, delta: number): number {
  return clampScore(current + delta);
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/** Fetch trust scores for a single user. Returns null if not found. */
export async function fetchTrustScores(userId: string): Promise<TrustScores | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("trust_score, seller_score, buyer_score, reporter_score")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as TrustScores;
}

/**
 * Write a partial trust score update for a user.
 * Automatically recalculates composite trust_score when any component changes.
 *
 * Usage:
 *   await updateTrustScores(userId, { seller_score: 65 });
 */
export async function updateTrustScores(
  userId: string,
  delta: TrustDelta
): Promise<{ error: string | null }> {
  // Fetch current scores first
  const current = await fetchTrustScores(userId);
  if (!current) return { error: "Потребителят не е намерен." };

  const merged = {
    seller_score: clampScore(delta.seller_score ?? current.seller_score),
    buyer_score: clampScore(delta.buyer_score ?? current.buyer_score),
    reporter_score: clampScore(delta.reporter_score ?? current.reporter_score),
  };

  const trust_score = delta.trust_score !== undefined
    ? clampScore(delta.trust_score)
    : calcCompositeTrust(merged);

  const { error } = await supabase
    .from("profiles")
    .update({ ...merged, trust_score })
    .eq("id", userId);

  return { error: error?.message ?? null };
}

// ---------------------------------------------------------------------------
// Future integration stubs
// ---------------------------------------------------------------------------

/**
 * FUTURE — AI Moderator hook.
 * Call after a listing is flagged by the AI scanner.
 * Penalty magnitude should reflect confidence score from the AI.
 */
export async function onAIModerationFlag(
  _userId: string,
  _penalty: number
): Promise<void> {
  // TODO: updateTrustScores(_userId, { seller_score: applyDelta(current.seller_score, -_penalty) })
}

/**
 * FUTURE — Fair Report System hook.
 * Call after a report is resolved as valid or dismissed as false.
 * Valid reports boost reporter_score; false reports reduce it.
 */
export async function onReportResolved(
  _reporterUserId: string,
  _outcome: "valid" | "false"
): Promise<void> {
  // TODO: updateTrustScores(_reporterUserId, { reporter_score: applyDelta(...) })
}

/**
 * FUTURE — Reputation System hook.
 * Call after a successful transaction or completed listing interaction.
 */
export async function onTransactionComplete(
  _sellerId: string,
  _buyerId: string
): Promise<void> {
  // TODO: boost seller_score and buyer_score for both parties
}
