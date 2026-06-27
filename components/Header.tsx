"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Baby,
  Bell,
  BookMarked,
  BookOpen,
  Briefcase,
  Car,
  Check,
  ChevronDown,
  FileText,
  Hammer,
  Heart,
  HelpCircle,
  Home as HomeIcon,
  LayoutList,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  PawPrint,
  Plus,
  Search,
  Shield,
  Shirt,
  Smartphone,
  Trophy,
  Trees,
  User,
  Wrench,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type UserProfile = {
  username: string | null;
  avatar_url: string | null;
  role: string | null;
};

const POPULAR_CITIES = [
  "София", "Пловдив", "Варна", "Бургас",
  "Стара Загора", "Русе", "Плевен", "Велико Търново",
];

const CATEGORY_NAV = [
  { icon: HomeIcon,   label: "Имоти" },
  { icon: Car,        label: "Автомобили" },
  { icon: Wrench,     label: "Авточасти" },
  { icon: Smartphone, label: "Електроника" },
  { icon: Baby,       label: "Детски стоки" },
  { icon: Trees,      label: "Дом и градина" },
  { icon: Shirt,      label: "Мода" },
  { icon: Trophy,     label: "Спорт и хоби" },
  { icon: PawPrint,   label: "Животни" },
  { icon: Hammer,     label: "Услуги" },
  { icon: Briefcase,  label: "Работа" },
  { icon: BookOpen,   label: "Книги" },
];

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
  const [profile, setProfile] = useState<UserProfile>({ username: null, avatar_url: null, role: null });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const notifChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const msgChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url, role")
      .eq("id", userId)
      .maybeSingle<UserProfile>();

    setProfile({
      username: data?.username ?? null,
      avatar_url: data?.avatar_url ?? null,
      role: data?.role ?? null,
    });
  };

  const fetchUnreadCounts = async (userId: string) => {
    const [notifRes, msgRes] = await Promise.all([
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null),
      supabase
        .from("messages")
        .select("id, conversations!inner(buyer_id, seller_id)", { count: "exact", head: true })
        .neq("sender_id", userId)
        .is("read_at", null)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`, { foreignTable: "conversations" }),
    ]);

    setUnreadNotifications(notifRes.count ?? 0);
    setUnreadMessages(msgRes.count ?? 0);
  };

  const teardownChannels = () => {
    if (notifChannelRef.current) {
      supabase.removeChannel(notifChannelRef.current);
      notifChannelRef.current = null;
    }
    if (msgChannelRef.current) {
      supabase.removeChannel(msgChannelRef.current);
      msgChannelRef.current = null;
    }
  };

  const setupChannels = (userId: string) => {
    teardownChannels();
    const uid = Math.random().toString(36).slice(2);

    notifChannelRef.current = supabase
      .channel(`header-notif-${userId}-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => fetchUnreadCounts(userId)
      )
      .subscribe();

    msgChannelRef.current = supabase
      .channel(`header-msg-${userId}-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => fetchUnreadCounts(userId)
      )
      .subscribe();
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user ?? null;

      setCurrentUserEmail(user?.email ?? null);

      if (!user) return;

      await fetchProfile(user.id);
      await fetchUnreadCounts(user.id);
      setupChannels(user.id);
    };

    loadUser();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setCurrentUserEmail(session?.user?.email ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
          await fetchUnreadCounts(session.user.id);
          setupChannels(session.user.id);
        } else {
          teardownChannels();
          setProfile({ username: null, avatar_url: null, role: null });
          setUnreadNotifications(0);
          setUnreadMessages(0);
        }
      }
    );

    return () => {
      subscription?.subscription.unsubscribe();
      teardownChannels();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const handleClickOutside = (e: MouseEvent) => {
      if (locationMenuRef.current && !locationMenuRef.current.contains(e.target as Node)) {
        setShowLocationMenu(false);
      }
    };
    if (showLocationMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLocationMenu]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUserEmail(null);
    setProfile({ username: null, avatar_url: null, role: null });
    setUnreadNotifications(0);
    setUnreadMessages(0);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    router.push("/");
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (locationCity.trim()) params.set("city", locationCity.trim());
    router.push(`/listings${params.toString() ? `?${params}` : ""}`);
  };

  const isLoggedIn = Boolean(currentUserEmail);
  const isAdmin = profile.role === "admin";
  const avatarLetter = (profile.username ?? currentUserEmail ?? "П").charAt(0).toUpperCase();
  const triggerLabel = profile.username ?? "Профил";

  return (
    <header className={`sticky top-0 z-50 text-white ring-1 ring-white/5 transition-all duration-300 ${
      scrolled
        ? "bg-blue-950/90 shadow-lg shadow-blue-950/30 backdrop-blur-md"
        : "bg-blue-950 shadow-xl shadow-blue-950/40"
    }`}>

      {/* ── Main row ─────────────────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 lg:gap-3 lg:px-6 lg:py-3">

        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image
            src="/logo.png"
            alt="DaiVzemi"
            width={320}
            height={90}
            priority
            className="h-auto w-[140px] sm:w-[175px] lg:w-[210px]"
          />
        </Link>

        {/* Search bar — desktop only */}
        <div className="hidden flex-1 items-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/20 transition focus-within:bg-white/15 focus-within:ring-white/40 lg:flex">
          <Search className="ml-3 h-4 w-4 shrink-0 text-white/50" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="Какво търсите?"
            className="flex-1 bg-transparent px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:font-normal placeholder:text-white/40"
          />

          {/* Location selector */}
          <div className="relative shrink-0 border-l border-white/20" ref={locationMenuRef}>
            <button
              type="button"
              onClick={() => setShowLocationMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-white/80 transition hover:text-white"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-white/50" />
              <span className="max-w-[120px] truncate">{locationCity || "Цяла България"}</span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-white/50 transition-transform ${showLocationMenu ? "rotate-180" : ""}`} />
            </button>

            {showLocationMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowLocationMenu(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => { setLocationCity(""); setShowLocationMenu(false); }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition hover:bg-slate-50 ${
                        locationCity === "" ? "font-black text-blue-950" : "font-semibold text-slate-700"
                      }`}
                    >
                      🇧🇬 Цяла България
                      {locationCity === "" && <Check className="h-4 w-4 text-blue-950" />}
                    </button>
                    <p className="px-3 pb-1.5 pt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Популярни градове
                    </p>
                    {POPULAR_CITIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setLocationCity(c); setShowLocationMenu(false); }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-slate-50 ${
                          locationCity === c ? "font-black text-blue-950" : "font-semibold text-slate-700"
                        }`}
                      >
                        {c}
                        {locationCity === c && <Check className="h-4 w-4 text-blue-950" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Търси button — desktop only */}
        <button
          type="button"
          onClick={handleSearch}
          className="hidden shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-500 lg:block"
        >
          Търси
        </button>

        {/* Desktop right actions */}
        <div className="hidden items-center gap-1 lg:flex">
          <Link
            href="/publish"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/30 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
          >
            <Plus className="h-4 w-4 shrink-0" />
            Публикувай
          </Link>

          {isLoggedIn ? (
            <>
              <Link
                href="/favorites"
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-white/10"
                aria-label="Любими"
              >
                <Heart className="h-5 w-5" />
              </Link>

              <Link
                href="/messages"
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-white/10"
                aria-label="Съобщения"
              >
                <MessageSquare className="h-5 w-5" />
                {unreadMessages > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>

              <Link
                href="/notifications"
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-white/10"
                aria-label="Известия"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1.5 pl-1.5 pr-3 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <Avatar avatarUrl={profile.avatar_url} letter={avatarLetter} size="sm" />
                  <span className="max-w-[100px] truncate">{triggerLabel}</span>
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
                      {isAdmin && (
                        <>
                          <SectionLabel label="Администрация" />
                          <DropdownLink href="/admin" icon={<Shield className="h-4 w-4" />} label="Админ панел" onClick={() => setUserMenuOpen(false)} />
                          <div className="my-2 border-t border-slate-100" />
                        </>
                      )}
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
                      <SectionLabel label="Поддръжка" />
                      <DropdownLink href="/help" icon={<HelpCircle className="h-4 w-4" />} label="Помощен център" onClick={() => setUserMenuOpen(false)} />
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
              <Link href="/login" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
                Вход
              </Link>
              <Link href="/register" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
                Регистрация
              </Link>
            </>
          )}
        </div>

        {/* Mobile actions */}
        <div className="ml-auto flex shrink-0 items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Назад"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Link href="/publish" className="rounded-xl bg-white px-3 py-2.5 text-sm font-black text-blue-950 shadow-sm transition hover:bg-blue-50">
            Публикувай
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Меню"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Category nav — desktop only ─────────────────────────────────── */}
      <nav className="hidden border-t border-white/10 lg:block" aria-label="Категории">
        <div className="mx-auto flex max-w-7xl items-center overflow-x-auto px-4 xl:px-6">
          {CATEGORY_NAV.map(({ icon: Icon, label }) => (
            <Link
              key={label}
              href={`/listings?category=${encodeURIComponent(label)}`}
              className="flex shrink-0 flex-col items-center gap-0.5 px-3 py-2 text-center text-[11px] font-bold text-white/65 transition hover:bg-white/10 hover:text-white xl:px-4"
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Mobile menu ──────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-blue-950 px-6 pb-6 pt-4 lg:hidden">
          <div className="mt-0">
            {isLoggedIn ? (
              <div className="space-y-0.5">
                <div className="flex items-center gap-3 rounded-xl px-4 py-3">
                  <Avatar avatarUrl={profile.avatar_url} letter={avatarLetter} size="md" />
                  <div className="min-w-0">
                    {profile.username && <p className="truncate text-sm font-black text-white">{profile.username}</p>}
                    <p className="truncate text-xs text-blue-200">{currentUserEmail}</p>
                  </div>
                </div>

                {isAdmin && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10">
                    <Shield className="h-4 w-4 shrink-0" /> Админ панел
                  </Link>
                )}
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10">
                  <User className="h-4 w-4 shrink-0" /> Моят профил
                </Link>
                <Link href="/my-listings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10">
                  <LayoutList className="h-4 w-4 shrink-0" /> Моите обяви
                </Link>
                <Link href="/favorites" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10">
                  <Heart className="h-4 w-4 shrink-0" /> Любими
                </Link>
                <Link href="/saved-searches" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10">
                  <BookMarked className="h-4 w-4 shrink-0" /> Запазени търсения
                </Link>

                <Link href="/messages" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="flex-1">Съобщения</span>
                  {unreadMessages > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-black text-blue-950">
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  )}
                </Link>
                <Link href="/notifications" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10">
                  <Bell className="h-4 w-4 shrink-0" />
                  <span className="flex-1">Известия</span>
                  {unreadNotifications > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-black text-blue-950">
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </span>
                  )}
                </Link>

                <Link href="/help" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10">
                  <HelpCircle className="h-4 w-4 shrink-0" /> Помощен център
                </Link>
                <Link href="/terms" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10">
                  <FileText className="h-4 w-4 shrink-0" /> Общи условия
                </Link>

                <div className="pt-1">
                  <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-white/10">
                    <LogOut className="h-4 w-4 shrink-0" /> Изход
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/20">
                  Вход
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/20">
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
