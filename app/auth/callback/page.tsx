"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Produce a slug from a display name or email prefix, max 30 chars. */
function baseSlug(fullName: string, emailPrefix: string): string {
  const src = fullName.trim() || emailPrefix;
  return src
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30) || "user";
}

/**
 * Find a username that is not taken by any other user.
 * Tries base → base_2 → base_3 … up to base_99.
 * Returns null if all candidates are exhausted (extremely unlikely).
 */
async function findAvailableUsername(
  base: string,
  ownUserId: string
): Promise<string | null> {
  // Truncate base so "base_99" never exceeds 30 chars (keep room for "_99" = 3 chars)
  const safeBase = base.slice(0, 27);

  const candidates = [safeBase, ...Array.from({ length: 98 }, (_, i) => `${safeBase}_${i + 2}`)];

  for (const candidate of candidates) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();

    // Available if no row found, or the row belongs to this user (re-login)
    if (!data || data.id === ownUserId) {
      return candidate;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Page — handles Supabase OAuth PKCE code exchange and profile creation
// ---------------------------------------------------------------------------

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = async () => {
      // Exchange the PKCE code for a session
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError("Грешка при влизане с Google. Опитайте отново.");
          return;
        }
      }

      // Get the now-active session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const user = session.user;

      // Check whether a profile already exists for this user
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existing) {
        // Build profile fields from OAuth metadata
        const fullName: string = user.user_metadata?.full_name ?? user.user_metadata?.name ?? "";
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] ?? "";
        const lastName = nameParts.slice(1).join(" ");
        const emailPrefix = (user.email ?? "user").split("@")[0];

        const slug = baseSlug(fullName, emailPrefix);
        const username = await findAvailableUsername(slug, user.id);

        if (!username) {
          setError("Не успяхме да създадем потребителско име. Свържете се с поддръжката.");
          return;
        }

        const { error: upsertError } = await supabase.from("profiles").upsert({
          id: user.id,
          username,
          first_name: firstName || null,
          last_name: lastName || null,
          full_name: fullName || emailPrefix,
          avatar_url: user.user_metadata?.avatar_url ?? null,
          updated_at: new Date().toISOString(),
        });

        if (upsertError) {
          setError("Профилът не можа да бъде създаден. Опитайте отново или се свържете с поддръжката.");
          return;
        }
      }

      router.replace("/");
    };

    handle();
  }, [router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm rounded-[28px] bg-white p-8 text-center shadow-xl ring-1 ring-slate-200">
          <p className="text-base font-black text-red-600">{error}</p>
          <a
            href="/login"
            className="mt-5 inline-block rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900"
          >
            Назад към вход
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-950" />
        <p className="text-sm font-semibold text-slate-500">Влизане…</p>
      </div>
    </main>
  );
}
