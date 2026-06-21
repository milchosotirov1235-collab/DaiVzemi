import { NextResponse } from "next/server";
import { fetchAISettings } from "@/lib/ai/settings";

// Public endpoint — returns current AI feature flags for client components.
// No auth required; contains no sensitive data.
export async function GET() {
  const settings = await fetchAISettings();
  return NextResponse.json(settings, {
    headers: {
      // Short cache so toggles propagate quickly
      "Cache-Control": "no-store",
    },
  });
}
