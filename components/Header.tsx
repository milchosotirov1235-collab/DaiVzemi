"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, LayoutList, LogOut, Menu, User, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();

      setCurrentUserEmail(data?.user?.email ?? null);

      if (data?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", data.user.id)
          .maybeSingle();

        setUsername(profile?.username ?? null);
      }
    };

    loadUser();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setCurrentUserEmail(session?.user?.email ?? null);

        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", session.user.id)
            .maybeSingle();

          setUsername(profile?.username ?? null);
        } else {
          setUsername(null);
        }
      }
    );

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUserEmail(null);
    setUsername(null);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const displayName = username ?? currentUserEmail ?? "";
  const avatarLetter = displayName.charAt(0).toUpperCase() || "?";

  const navLinks = [
    { href: "/listings", label: "Обяви" },
    { href: "#", label: "Имоти" },
    { href: "#", label: "Автомобили" },
    { href: "#", label: "Авточасти" },
    { href: "#", label: "Услуги" },
    { href: "#", label: "Подарявам" },
    { href: "#", label: "Разменям" },
    { href: "#", label: "Търся" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-blue-950 text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="DaiVzemi"
            width={320}
            height={90}
            priority
            className="h-auto w-[200px] md:w-[240px]"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 text-[0.9rem] font-semibold lg:flex xl:gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="opacity-90 transition hover:opacity-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right side */}
        <div className="hidden items-center gap-2 lg:flex">
          {currentUserEmail ? (
            <>
              {/* Favorites shortcut */}
              <Link
                href="/favorites"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <Heart className="h-4 w-4" />
                Любими
              </Link>

              {/* User avatar dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1.5 pl-2 pr-4 text-sm font-semibold text-white transition hover:bg-white/20"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-blue-950">
                    {avatarLetter}
                  </span>
                  <span className="max-w-[120px] truncate">{username ?? currentUserEmail}</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    {/* User info */}
                    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-950 text-sm font-black text-white">
                        {avatarLetter}
                      </span>
                      <div className="min-w-0">
                        {username && (
                          <p className="truncate text-sm font-black text-slate-900">
                            {username}
                          </p>
                        )}
                        <p className="truncate text-xs text-slate-500">
                          {currentUserEmail}
                        </p>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-2">
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <User className="h-4 w-4 shrink-0 text-blue-950" />
                        Моят профил
                      </Link>

                      <Link
                        href="/my-listings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <LayoutList className="h-4 w-4 shrink-0 text-blue-950" />
                        Моите обяви
                      </Link>

                      <Link
                        href="/favorites"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <Heart className="h-4 w-4 shrink-0 text-blue-950" />
                        Любими
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 p-2">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        Изход
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Вход
              </Link>

              <Link
                href="/register"
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Регистрация
              </Link>
            </>
          )}

          {/* CTA — always visible */}
          <Link
            href="/publish"
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-blue-950 shadow-sm transition hover:bg-blue-50"
          >
            Публикувай обява
          </Link>
        </div>

        {/* Mobile right side */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/publish"
            className="rounded-xl bg-white px-3 py-2 text-sm font-black text-blue-950 shadow-sm transition hover:bg-blue-50"
          >
            Публикувай
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Меню"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-blue-950 px-6 pb-6 pt-4 lg:hidden">
          {/* Nav links */}
          <nav className="grid grid-cols-2 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 border-t border-white/10 pt-4">
            {currentUserEmail ? (
              <div className="space-y-1">
                {/* User info row */}
                <div className="flex items-center gap-3 rounded-xl px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-blue-950">
                    {avatarLetter}
                  </span>
                  <div className="min-w-0">
                    {username && (
                      <p className="truncate text-sm font-black text-white">
                        {username}
                      </p>
                    )}
                    <p className="truncate text-xs text-blue-200">
                      {currentUserEmail}
                    </p>
                  </div>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  <User className="h-4 w-4 shrink-0" />
                  Моят профил
                </Link>

                <Link
                  href="/my-listings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  <LayoutList className="h-4 w-4 shrink-0" />
                  Моите обяви
                </Link>

                <Link
                  href="/favorites"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  <Heart className="h-4 w-4 shrink-0" />
                  Любими
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Изход
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Вход
                </Link>

                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
