"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  BookMarked,
  ChevronDown,
  FileText,
  Heart,
  HelpCircle,
  LayoutList,
  LogOut,
  Menu,
  MessageSquare,
  Phone,
  Settings,
  Shield,
  User,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type UserProfile = {
  username: string | null;
  avatar_url: string | null;
};

function DropdownLink({
  href,
  icon,
  label,
  badge,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
    >
      <span className="shrink-0 text-blue-950">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-950 px-1.5 text-[11px] font-black text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-0.5 px-3 pt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
      {label}
    </p>
  );
}

function Avatar({
  avatarUrl,
  letter,
  size = "sm",
}: {
  avatarUrl: string | null;
  letter: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-11 w-11 text-base",
  }[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="avatar"
        className={`${sizeClass} rounded-full object-cover ring-2 ring-white/30`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-white font-black text-blue-950`}
    >
      {letter}
    </span>
  );
}

export default function Header() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({ username: null, avatar_url: null });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const userMenuRef = useRef<HTMLDivElement>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .maybeSingle<UserProfile>();

    setProfile({
      username: data?.username ?? null,
      avatar_url: data?.avatar_url ?? null,
    });
  };

  const fetchUnreadCounts = async (userId: string) => {
    const [notifRes, convsRes] = await Promise.all([
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null),
      supabase
        .from("conversations")
        .select("id")
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),
    ]);

    setUnreadNotifications(notifRes.count ?? 0);

    if (convsRes.data && convsRes.data.length > 0) {
      const convIds = convsRes.data.map((c) => c.id);
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .neq("sender_id", userId)
        .is("read_at", null);
      setUnreadMessages(count ?? 0);
    } else {
      setUnreadMessages(0);
    }
  };

  useEffect(() => {
    let notifChannel: ReturnType<typeof supabase.channel> | null = null;
    let msgChannel: ReturnType<typeof supabase.channel> | null = null;

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserEmail(data?.user?.email ?? null);
      if (data?.user) {
        await fetchProfile(data.user.id);
        await fetchUnreadCounts(data.user.id);

        // Realtime: notifications
        notifChannel = supabase
          .channel("header-notifications")
          .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${data.user.id}` },
            () => fetchUnreadCounts(data.user.id))
          .subscribe();

        // Realtime: messages
        msgChannel = supabase
          .channel("header-messages")
          .on("postgres_changes", { event: "*", schema: "public", table: "messages" },
            () => fetchUnreadCounts(data.user.id))
          .subscribe();
      }
    };

    loadUser();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setCurrentUserEmail(session?.user?.email ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
          await fetchUnreadCounts(session.user.id);
        } else {
          setProfile({ username: null, avatar_url: null });
          setUnreadNotifications(0);
          setUnreadMessages(0);
        }
      }
    );

    return () => {
      subscription?.subscription.unsubscribe();
      if (notifChannel) supabase.removeChannel(notifChannel);
      if (msgChannel) supabase.removeChannel(msgChannel);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) setMobileMenuOpen(false); };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUserEmail(null);
    setProfile({ username: null, avatar_url: null });
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const isLoggedIn = Boolean(currentUserEmail);
  const avatarLetter = (profile.username ?? currentUserEmail ?? "P").charAt(0).toUpperCase();
  const triggerLabel = profile.username ?? "Профил";

  const navLinks = [
    { href: "/listings", label: "Обяви" },
    { href: "/listings?category=Имоти", label: "Имоти" },
    { href: "/listings?category=Автомобили", label: "Автомобили" },
    { href: "/listings?category=Авточасти", label: "Авточасти" },
    { href: "/listings?category=Услуги", label: "Услуги" },
    { href: "/listings?type=Подарявам", label: "Подарявам" },
    { href: "/listings?type=Разменям", label: "Разменям" },
    { href: "/listings?type=Търся", label: "Търся" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-blue-950 text-white shadow-xl shadow-blue-950/40 ring-1 ring-white/5">
      <div className="mx-auto flex max-w-7xl items-center gap-6 py-5 pl-4 pr-8" style={{ marginLeft: "calc(50% - 640px - 135px)", marginRight: "auto" }}>

        {/* Logo */}
        <Link href="/" className="mr-6 flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="DaiVzemi"
            width={320}
            height={90}
            priority
            className="h-auto w-[230px] md:w-[260px] lg:w-[290px]"
          />
        </Link>

        {/* Navigation */}
        <nav className="hidden flex-1 items-center justify-center gap-0 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-lg px-2.5 py-2 text-[1rem] font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex shrink-0 items-center">

          {/* Desktop */}
          <div className="hidden items-center gap-3 lg:flex">
            {isLoggedIn ? (
              <>
                <Link
                  href="/favorites"
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <Heart className="h-4 w-4 shrink-0" />
                  <span className="hidden xl:inline">Любими</span>
                </Link>

                <Link
                  href="/publish"
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-black text-blue-950 shadow-sm transition hover:bg-blue-50"
                >
                  Публикувай обява
                </Link>

                <div className="relative ml-8" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                    className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    <Avatar avatarUrl={profile.avatar_url} letter={avatarLetter} size="sm" />
                    <span className="max-w-[130px] truncate">{triggerLabel}</span>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5">
                      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
                        <Avatar avatarUrl={profile.avatar_url} letter={avatarLetter} size="lg" />
                        <div className="min-w-0">
                          {profile.username && <p className="truncate text-sm font-black text-slate-900">{profile.username}</p>}
                          <p className="truncate text-xs text-slate-500">{currentUserEmail}</p>
                        </div>
                      </div>

                      <div className="p-2">
                        <SectionLabel label="Профил" />
                        <DropdownLink href="/profile" icon={<User className="h-4 w-4" />} label="Моят профил" onClick={() => setUserMenuOpen(false)} />
                        <DropdownLink href="/my-listings" icon={<LayoutList className="h-4 w-4" />} label="Моите обяви" onClick={() => setUserMenuOpen(false)} />
                        <DropdownLink href="/favorites" icon={<Heart className="h-4 w-4" />} label="Любими" onClick={() => setUserMenuOpen(false)} />
                        <DropdownLink href="/saved-searches" icon={<BookMarked className="h-4 w-4" />} label="Запазени търсения" onClick={() => setUserMenuOpen(false)} />

                        <div className="my-2 border-t border-slate-100" />
                        <SectionLabel label="Комуникация" />
                        <DropdownLink href="/messages" icon={<MessageSquare className="h-4 w-4" />} label="Съобщения" badge={unreadMessages} onClick={() => setUserMenuOpen(false)} />
                        <DropdownLink href="/notifications" icon={<Bell className="h-4 w-4" />} label="Известия" badge={unreadNotifications} onClick={() => setUserMenuOpen(false)} />

                        <div className="my-2 border-t border-slate-100" />
                        <SectionLabel label="Настройки" />
                        <DropdownLink href="/profile" icon={<Settings className="h-4 w-4" />} label="Настройки на акаунта" onClick={() => setUserMenuOpen(false)} />
                        <DropdownLink href="/profile" icon={<Shield className="h-4 w-4" />} label="Настройки за поверителност" onClick={() => setUserMenuOpen(false)} />

                        <div className="my-2 border-t border-slate-100" />
                        <SectionLabel label="Поддръжка" />
                        <DropdownLink href="/help" icon={<HelpCircle className="h-4 w-4" />} label="Помощен център" onClick={() => setUserMenuOpen(false)} />
                        <DropdownLink href="/listings" icon={<Phone className="h-4 w-4" />} label="Свържете се с нас" onClick={() => setUserMenuOpen(false)} />
                        <DropdownLink href="/terms" icon={<FileText className="h-4 w-4" />} label="Общи условия" onClick={() => setUserMenuOpen(false)} />

                        <div className="my-2 border-t border-slate-100" />
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
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
                <Link href="/login" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
                  Вход
                </Link>
                <Link href="/register" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
                  Регистрация
                </Link>
                <Link href="/publish" className="rounded-xl bg-white px-5 py-2.5 text-sm font-black text-blue-950 shadow-sm transition hover:bg-blue-50">
                  Публикувай обява
                </Link>
              </>
            )}
          </div>

          {/* Mobile */}
          <div className="flex items-center gap-3 lg:hidden">
            <Link href="/publish" className="rounded-xl bg-white px-3 py-2 text-sm font-black text-blue-950 shadow-sm transition hover:bg-blue-50">
              Публикувай
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Меню"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-blue-950 px-6 pb-6 pt-4 lg:hidden">
          <nav className="grid grid-cols-2 gap-1">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 border-t border-white/10 pt-4">
            {isLoggedIn ? (
              <div className="space-y-0.5">
                <div className="flex items-center gap-3 rounded-xl px-4 py-3">
                  <Avatar avatarUrl={profile.avatar_url} letter={avatarLetter} size="md" />
                  <div className="min-w-0">
                    {profile.username && <p className="truncate text-sm font-black text-white">{profile.username}</p>}
                    <p className="truncate text-xs text-blue-200">{currentUserEmail}</p>
                  </div>
                </div>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"><User className="h-4 w-4 shrink-0" /> Моят профил</Link>
                <Link href="/my-listings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"><LayoutList className="h-4 w-4 shrink-0" /> Моите обяви</Link>
                <Link href="/favorites" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"><Heart className="h-4 w-4 shrink-0" /> Любими</Link>
                <Link href="/messages" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"><MessageSquare className="h-4 w-4 shrink-0" /> Съобщения</Link>
                <Link href="/notifications" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"><Bell className="h-4 w-4 shrink-0" /> Известия</Link>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"><Settings className="h-4 w-4 shrink-0" /> Настройки</Link>
                <div className="pt-1">
                  <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-white/10">
                    <LogOut className="h-4 w-4 shrink-0" /> Изход
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/20">Вход</Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/20">Регистрация</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
