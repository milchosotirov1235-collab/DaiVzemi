"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserEmail(data?.user?.email ?? null);
    };

    loadUser();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUserEmail(null);
  };

  return (
    <header className="sticky top-0 z-50 bg-blue-950 text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/logo.png"
            alt="DaiVzemi"
            width={320}
            height={90}
            priority
            className="h-auto w-[220px] md:w-[260px]"
          />
        </Link>

        <nav className="hidden items-center gap-3 text-[0.95rem] font-semibold lg:flex xl:gap-5">
          <a href="#">Обяви</a>
          <a href="#">Имоти</a>
          <a href="#">Автомобили</a>
          <a href="#">Авточасти</a>
          <a href="#">Услуги</a>
          <a href="#">Подарявам</a>
          <a href="#">Разменям</a>
          <a href="#">Търся</a>
        </nav>

        <div className="hidden items-center gap-3 lg:flex mr-3">
          {currentUserEmail ? (
            <>
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                {currentUserEmail}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Изход
              </button>
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
        </div>

        <Link
          href="/publish"
          className="ml-auto rounded-xl bg-white px-4 py-2.5 text-sm font-black text-blue-950 shadow-sm hover:bg-blue-50 lg:px-4 lg:py-2.5"
        >
          Публикувай обява
        </Link>
      </div>
    </header>
  );
}
