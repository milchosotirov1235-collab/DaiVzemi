"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugFromName(fullName: string, emailPrefix: string): string {
  const base = fullName.trim()
    ? fullName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "")
    : emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
  return base.slice(0, 30) || "user";
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

      // Check whether a profile already exists
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
        const username = slugFromName(fullName, emailPrefix);

        await supabase.from("profiles").upsert({
          id: user.id,
          username,
          first_name: firstName || null,
          last_name: lastName || null,
          full_name: fullName || emailPrefix,
          avatar_url: user.user_metadata?.avatar_url ?? null,
          updated_at: new Date().toISOString(),
        });
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
