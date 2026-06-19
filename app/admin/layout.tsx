"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Flag, LayoutDashboard, List, Loader2, Users } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Nav links
// ---------------------------------------------------------------------------

const NAV = [
  { href: "/admin",          label: "Табло",       icon: LayoutDashboard },
  { href: "/admin/listings", label: "Обяви",       icon: List },
  { href: "/admin/users",    label: "Потребители", icon: Users },
  { href: "/admin/reports",  label: "Доклади",     icon: Flag },
];

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;

      if (!user) { router.replace("/"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role !== "admin") { router.replace("/"); return; }

      setChecking(false);
    };

    check();
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-blue-950" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* ── Sidebar ── */}
      <aside className="flex w-16 shrink-0 flex-col bg-blue-950 md:w-56">
        {/* Brand */}
        <div className="flex h-16 items-center justify-center border-b border-white/10 px-4 md:justify-start">
          <span className="hidden text-base font-black text-white md:block">
            DaiVzemi <span className="font-normal text-blue-300">Admin</span>
          </span>
          <span className="text-lg font-black text-white md:hidden">DV</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 p-2 pt-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-blue-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="hidden md:block">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-blue-300 transition hover:text-white md:justify-start"
          >
            ← Публичен сайт
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 items-center border-b border-slate-200 bg-white px-6">
          <h1 className="text-sm font-black text-slate-900">
            {NAV.find((n) =>
              n.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(n.href)
            )?.label ?? "Admin"}
          </h1>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
