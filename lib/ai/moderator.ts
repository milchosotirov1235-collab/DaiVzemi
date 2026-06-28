// Rule-based AI moderation engine.
// No external AI provider — designed so a real LLM can replace runRules() later
// with minimal changes to callers.

export type AIRecommendation = "approve" | "manual_review" | "reject";

export interface ModerationResult {
  score: number;            // 0–100
  recommendation: AIRecommendation;
  reason: string;
}

// ---------------------------------------------------------------------------
// Suspicious keyword lists (Bulgarian + generic)
// ---------------------------------------------------------------------------

const CONTACT_LEAK_PATTERNS = [
  /viber/i, /whatsapp/i, /telegram/i, /\bwhat'?s\s*app\b/i,
  /\btel\.?\s*[:：]?\s*\d/i,
  /\b0[678]\d{7,8}\b/,                     // BG mobile numbers
  /\+359\s*\d/,
  /\b\d{3}[\s\-]?\d{3}[\s\-]?\d{3,4}\b/,  // generic phone-like
  /\.com\b/i, /\.bg\b/i, /\.net\b/i, /\.eu\b/i,
  /http[s]?:\/\//i, /www\./i,
];

const SCAM_KEYWORDS = [
  /изпрат[еи]/i,       // "send" (advance-fee scam)
  /предплат/i,         // prepay
  /банков превод/i,
  /western\s*union/i,
  /money\s*gram/i,
  /наложен платеж само/i,
  /без оглед/i,        // "without viewing"
  /внос[еи]т[еи] пари/i,
];

const SPAM_KEYWORDS = [
  /купи сега/i, /buy now/i,
  /100%\s*гарант/i,
  /само днес/i,
  /последн[аи] бройк[аа]/i,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasRepeatedChars(text: string): boolean {
  return /(.)\1{4,}/.test(text); // same char 5+ times in a row
}

function isAllCaps(text: string): boolean {
  const letters = text.replace(/[^а-яa-z]/gi, "");
  if (letters.length < 4) return false;
  return letters === letters.toUpperCase();
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

// ---------------------------------------------------------------------------
// Main engine
// ---------------------------------------------------------------------------

interface ListingInput {
  title: string;
  description: string | null;
  price: number | null;
  listing_type: string | null;
  image_url: string | null;
  image_urls: string[] | null;
}

export function runRules(listing: ListingInput): ModerationResult {
  let score = 0;
  const reasons: string[] = [];

  const title = (listing.title ?? "").trim();
  const desc  = (listing.description ?? "").trim();
  const combined = `${title} ${desc}`;
  const imageCount = listing.image_urls?.length ?? (listing.image_url ? 1 : 0);
  const isFree = listing.listing_type === "Подарявам";

  // ── Title checks ──────────────────────────────────────────────────────────
  if (title.length < 3) {
    score += 50;
    reasons.push("Заглавието е под 3 символа");
  } else if (title.length < 6) {
    score += 30;
    reasons.push("Много кратко заглавие");
  } else if (title.length < 10) {
    score += 10;
    reasons.push("Кратко заглавие");
  }

  if (isAllCaps(title)) {
    score += 10;
    reasons.push("Заглавие с главни букви");
  }

  if (hasRepeatedChars(title)) {
    score += 15;
    reasons.push("Повтарящи се символи в заглавието");
  }

  // ── Description checks ───────────────────────────────────────────────────
  if (desc.length < 10) {
    score += 25;
    reasons.push("Много кратко описание");
  } else if (desc.length < 30) {
    score += 10;
    reasons.push("Кратко описание");
  }

  if (hasRepeatedChars(desc)) {
    score += 10;
    reasons.push("Повтарящи се символи в описанието");
  }

  // ── Image checks ─────────────────────────────────────────────────────────
  if (imageCount === 0) {
    score += 15;
    reasons.push("Без снимки");
  }

  // ── Contact leak / external links ────────────────────────────────────────
  if (matchesAny(combined, CONTACT_LEAK_PATTERNS)) {
    score += 30;
    reasons.push("Открити контактни данни или външни връзки");
  }

  // ── Scam patterns ─────────────────────────────────────────────────────────
  if (matchesAny(combined, SCAM_KEYWORDS)) {
    score += 35;
    reasons.push("Потенциални измамни шаблони");
  }

  // ── Spam keywords ────────────────────────────────────────────────────────
  if (matchesAny(combined, SPAM_KEYWORDS)) {
    score += 20;
    reasons.push("Спам ключови думи");
  }

  // ── Price anomalies ───────────────────────────────────────────────────────
  if (!isFree) {
    if (listing.price === null || listing.price === 0) {
      score += 10;
      reasons.push("Цена 0 или липсваща (не е обява за подаряване)");
    } else if (listing.price > 500_000) {
      score += 10;
      reasons.push("Необичайно висока цена");
    }
  }

  // ── Clamp ────────────────────────────────────────────────────────────────
  score = Math.min(100, score);

  const recommendation: AIRecommendation =
    score >= 60 ? "reject" :
    score >= 25 ? "manual_review" :
    "approve";

  const reason =
    reasons.length > 0
      ? reasons.join("; ")
      : "Без проблеми";

  return { score, recommendation, reason };
}
