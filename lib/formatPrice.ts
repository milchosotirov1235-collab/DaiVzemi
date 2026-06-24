export const EUR_TO_BGN = 1.95583;

// Parses a raw stored price value to a number, or null for "По договаряне".
const parseNumeric = (value: string | number | null): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).replace(",", ".").replace(/[^\d.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Single-currency display — kept for contexts that don't need the dual line
// (e.g. sort/filter helpers that call this internally).
export const formatPrice = (value: string | number | null): string => {
  if (value === null || value === undefined || value === "") return "По договаряне";
  const formatted = String(value).trim();
  if (/€|EUR|\$|USD|лв|BGN/i.test(formatted)) return formatted;
  return `${formatted} €`;
};

// Dual-currency display: "230 € · 450 лв"
// Falls back to "По договаряне" when no numeric price can be parsed.
export const formatDualPrice = (value: string | number | null): string => {
  const n = parseNumeric(value);
  if (n === null) return "По договаряне";
  const bgn = Math.round(n * EUR_TO_BGN);
  return `${n.toLocaleString("bg-BG")} € · ${bgn.toLocaleString("bg-BG")} лв`;
};
