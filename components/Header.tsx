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
  Gamepad2,
  Gem,
  Hammer,
  Heart,
  HelpCircle,
  Home as HomeIcon,
  LayoutGrid,
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
import { BG_CITIES } from "@/lib/data/cities";

type UserProfile = {
  username: string | null;
  avatar_url: string | null;
  role: string | null;
};

const POPULAR_CITIES = [
  "София", "Пловдив", "Варна", "Бургас",
  "Стара Загора", "Русе", "Плевен", "Велико Търново",
];

// Cyrillic → Latin transliteration for search-by-latin-input
const CYR: Record<string, string> = {
  а:"a", б:"b", в:"v", г:"g", д:"d", е:"e", ж:"zh", з:"z", и:"i", й:"y",
  к:"k", л:"l", м:"m", н:"n", о:"o", п:"p", р:"r", с:"s", т:"t", у:"u",
  ф:"f", х:"h", ц:"ts", ч:"ch", ш:"sh", щ:"sht", ъ:"a", ь:"", ю:"yu", я:"ya",
};
function toLatin(s: string): string {
  return s.toLowerCase().split("").map((c) => CYR[c] ?? c).join("");
}
function cityMatches(city: string, q: string): boolean {
  if (!q) return true;
  const lq = q.toLowerCase();
  return city.toLowerCase().includes(lq) || toLatin(city).includes(lq);
}

const CATEGORY_NAV = [
  { icon: Smartphone, label: "Електроника" },
  { icon: Car,        label: "Автомобили" },
  { icon: HomeIcon,   label: "Имоти" },
  { icon: Shirt,      label: "Мода" },
  { icon: Wrench,     label: "Авточасти" },
  { icon: Baby,       label: "Детски стоки" },
  { icon: Trees,      label: "Дом и градина" },
  { icon: Trophy,     label: "Спорт и хоби" },
  { icon: Gamepad2,   label: "Гейминг" },
  { icon: Gem,        label: "Бижута и ценности" },
  { icon: Hammer,     label: "Услуги" },
  { icon: Briefcase,  label: "Работа" },
];

// All categories — shown in the "Още" panel (primary nav + overflow)
const ALL_CATEGORIES = [
  { icon: Smartphone, label: "Електроника" },
  { icon: Car,        label: "Автомобили" },
  { icon: HomeIcon,   label: "Имоти" },
  { icon: Shirt,      label: "Мода" },
  { icon: Wrench,     label: "Авточасти" },
  { icon: Baby,       label: "Детски стоки" },
  { icon: Trees,      label: "Дом и градина" },
  { icon: Trophy,     label: "Спорт и хоби" },
  { icon: Gamepad2,   label: "Гейминг" },
  { icon: Gem,        label: "Бижута и ценности" },
  { icon: Hammer,     label: "Услуги" },
  { icon: Briefcase,  label: "Работа" },
  { icon: PawPrint,   label: "Животни" },
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
  const [citySearch, setCitySearch] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [showCategoryBrowser, setShowCategoryBrowser] = useState(false);

  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const citySearchRef = useRef<HTMLInputElement>(null);
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
        setCitySearch("");
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setShowLocationMenu(false); setCitySearch(""); }
    };
    if (showLocationMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      // autofocus search input after paint
      requestAnimationFrame(() => citySearchRef.current?.focus());
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowCategoryBrowser(false); };
    if (showCategoryBrowser) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showCategoryBrowser]);

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

        {/* Search bar — desktop only.
            Outer div is `relative` so the city dropdown can escape the
            overflow-hidden pill and render below without being clipped. */}
        <div className="relative hidden flex-1 lg:flex" ref={locationMenuRef}>

          {/* Visual pill — overflow-hidden gives the rounded capsule shape */}
          <div className="flex w-full items-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/20 transition focus-within:bg-white/15 focus-within:ring-white/40">
            <Search className="ml-3 h-4 w-4 shrink-0 text-white/50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder="Какво търсите?"
              className="flex-1 bg-transparent px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:font-normal placeholder:text-white/40"
            />

            {/* City selector trigger — visually part of the pill */}
            <button
              type="button"
              onClick={() => { setShowLocationMenu((v) => !v); setCitySearch(""); }}
              className="flex shrink-0 items-center gap-1.5 border-l border-white/20 px-3 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-white/50" />
              <span className="max-w-[120px] truncate">{locationCity || "Цяла България"}</span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-white/50 transition-transform duration-200 ${showLocationMenu ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* City dropdown — sibling of the pill, outside overflow-hidden */}
          {showLocationMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setShowLocationMenu(false); setCitySearch(""); }} />
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 flex w-64 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/80">

                {/* City search input */}
                <div className="border-b border-slate-100 p-2">
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 focus-within:ring-blue-400 transition">
                    <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <input
                      ref={citySearchRef}
                      type="text"
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      placeholder="Търси град... / Search city..."
                      className="flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                    />
                    {citySearch && (
                      <button type="button" onClick={() => setCitySearch("")} className="shrink-0 text-slate-400 hover:text-slate-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* City list */}
                <div className="max-h-72 overflow-y-auto overscroll-contain p-1.5">
                  {!citySearch && (
                    <button
                      type="button"
                      onClick={() => { setLocationCity(""); setShowLocationMenu(false); setCitySearch(""); }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-slate-50 ${
                        locationCity === "" ? "font-black text-blue-950" : "font-semibold text-slate-600"
                      }`}
                    >
                      <span className="flex items-center gap-2"><span className="text-base">🇧🇬</span>Цяла България</span>
                      {locationCity === "" && <Check className="h-4 w-4 shrink-0 text-blue-950" />}
                    </button>
                  )}

                  {!citySearch && (
                    <>
                      <p className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Популярни</p>
                      {POPULAR_CITIES.map((c) => (
                        <button key={`pop-${c}`} type="button"
                          onClick={() => { setLocationCity(c); setShowLocationMenu(false); setCitySearch(""); }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-slate-50 ${
                            locationCity === c ? "font-black text-blue-950" : "font-semibold text-slate-700"
                          }`}
                        >
                          {c}
                          {locationCity === c && <Check className="h-4 w-4 shrink-0 text-blue-950" />}
                        </button>
                      ))}
                      <div className="mx-2 my-1.5 border-t border-slate-100" />
                      <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Всички градове</p>
                    </>
                  )}

                  {BG_CITIES.filter((c) => cityMatches(c, citySearch)).map((c) => (
                    <button key={c} type="button"
                      onClick={() => { setLocationCity(c); setShowLocationMenu(false); setCitySearch(""); }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-slate-50 ${
                        locationCity === c ? "font-black text-blue-950" : "font-semibold text-slate-700"
                      }`}
                    >
                      {c}
                      {locationCity === c && <Check className="h-4 w-4 shrink-0 text-blue-950" />}
                    </button>
                  ))}

                  {citySearch && BG_CITIES.filter((c) => cityMatches(c, citySearch)).length === 0 && (
                    <p className="px-3 py-5 text-center text-sm text-slate-400">Няма намерени градове</p>
                  )}
                </div>
              </div>
            </>
          )}
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
              onClick={() => setShowCategoryBrowser(false)}
              className="flex shrink-0 flex-col items-center gap-1 px-3.5 py-2.5 text-center text-[13px] font-bold text-white/70 transition hover:bg-white/10 hover:text-white xl:px-5"
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          ))}

          {/* ── Още ▾ ── */}
          <button
            type="button"
            onClick={() => setShowCategoryBrowser((v) => !v)}
            className={`flex shrink-0 flex-col items-center gap-1 px-3.5 py-2.5 text-center text-[13px] font-bold transition xl:px-5 ${
              showCategoryBrowser
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <LayoutGrid className="h-5 w-5" strokeWidth={1.8} />
            <span className="flex items-center gap-0.5 whitespace-nowrap">
              Още
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showCategoryBrowser ? "rotate-180" : ""}`} />
            </span>
          </button>
        </div>
      </nav>

      {/* ── Category browser panel ────────────────────────────────────────── */}
      {showCategoryBrowser && (
        <>
          {/* Click-outside backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowCategoryBrowser(false)}
          />
          {/* Panel */}
          <div className="absolute inset-x-0 top-full z-50 border-t border-slate-200/60 bg-white shadow-2xl shadow-slate-900/10">
            <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">

              {/* Header row */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Всички категории</h2>
                  <p className="mt-0.5 text-[11px] text-slate-400">Изберете категория за разглеждане</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategoryBrowser(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Затвори"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Category grid — 7 per row on desktop = 2 clean rows for all 14 */}
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-7">
                {ALL_CATEGORIES.map(({ icon: Icon, label }) => (
                  <Link
                    key={label}
                    href={`/listings?category=${encodeURIComponent(label)}`}
                    onClick={() => setShowCategoryBrowser(false)}
                    className="group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-100 p-3 text-center transition-all duration-150 hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 transition duration-150 group-hover:bg-white group-hover:shadow-sm">
                      <Icon className="h-[18px] w-[18px] text-blue-950 transition-transform duration-150 group-hover:scale-110" strokeWidth={1.8} />
                    </div>
                    <span className="text-[11px] font-bold leading-tight text-slate-600 transition-colors group-hover:text-blue-950">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>

            </div>
          </div>
        </>
      )}

      {/* ── Mobile menu ──────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-blue-950 px-6 pb-6 pt-4 lg:hidden">

          {/* Category grid — mobile */}
          <div className="mb-4 border-b border-white/10 pb-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-white/40">Категории</p>
            <div className="grid grid-cols-4 gap-2">
              {ALL_CATEGORIES.map(({ icon: Icon, label }) => (
                <Link
                  key={label}
                  href={`/listings?category=${encodeURIComponent(label)}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="group flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-2.5 text-center transition hover:border-white/30 hover:bg-white/15"
                >
                  <Icon className="h-5 w-5 text-white/70 transition group-hover:text-white" strokeWidth={1.8} />
                  <span className="text-[10px] font-bold leading-tight text-white/60 group-hover:text-white">{label}</span>
                </Link>
              ))}
            </div>
          </div>

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
