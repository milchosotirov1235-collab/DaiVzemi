"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import SellerTips from "@/components/SellerTips";
import { AlertTriangle, Building2, Camera, CheckCircle2, Loader2, Lock, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Notice = {
  type: "error" | "success";
  message: string;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const router = useRouter();

  // Auth
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // Profile fields
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  // Business profile
  const [isBusiness, setIsBusiness] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [website, setWebsite] = useState("");

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);

  // Google identity
  const [hasGoogleLogin, setHasGoogleLogin] = useState(false);
  const [hasEmailLogin, setHasEmailLogin] = useState(false);

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice | null>(null);

  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Load profile on mount
  // -------------------------------------------------------------------------

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        router.push("/login?redirect=/profile");
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? null);
      setHasGoogleLogin(
        Array.isArray(user.identities) &&
          user.identities.some((i: { provider: string }) => i.provider === "google")
      );
      setHasEmailLogin(
        Array.isArray(user.identities) &&
          user.identities.some((i: { provider: string }) => i.provider === "email")
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, first_name, last_name, phone, city, avatar_url, is_business, business_name, business_description, website")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setUsername(profile.username ?? "");
        setFirstName(profile.first_name ?? "");
        setLastName(profile.last_name ?? "");
        setPhone(profile.phone ?? "");
        setCity(profile.city ?? "");
        setAvatarUrl(profile.avatar_url ?? null);
        setIsBusiness(profile.is_business ?? false);
        setBusinessName(profile.business_name ?? "");
        setBusinessDescription(profile.business_description ?? "");
        setWebsite(profile.website ?? "");
      } else {
        // No profile row — try to recover from auth metadata (set during signUp).
        setProfileMissing(true);
        const meta = user.user_metadata ?? {};
        if (meta.username) setUsername(String(meta.username));
        if (meta.firstName) setFirstName(String(meta.firstName));
        if (meta.lastName) setLastName(String(meta.lastName));
        if (meta.phone) setPhone(String(meta.phone));
        if (meta.city) setCity(String(meta.city));
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  // Revoke preview object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // -------------------------------------------------------------------------
  // Avatar file selection
  // -------------------------------------------------------------------------

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setNotice({ type: "error", message: "Позволени формати: JPG, JPEG, PNG, WEBP." });
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setNotice({ type: "error", message: "Снимката не може да е по-голяма от 5 MB." });
      return;
    }

    setNotice(null);
    setAvatarFile(file);

    // Revoke previous preview before creating a new one
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(URL.createObjectURL(file));
  };

  // -------------------------------------------------------------------------
  // Upload avatar to Supabase Storage
  // -------------------------------------------------------------------------

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!userId) return null;

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setNotice({ type: "error", message: "Грешка при качване на снимката. Опитайте отново." });
      return null;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // Append cache-busting timestamp so the browser fetches the new image
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  // -------------------------------------------------------------------------
  // Save profile
  // -------------------------------------------------------------------------

  const saveProfile = async () => {
    setNotice(null);

    if (!userId) {
      setNotice({ type: "error", message: "Трябва да сте влезли в профила си." });
      return;
    }

    const cleanUsername = username.trim();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanPhone = phone.trim();
    const cleanCity = city.trim();
    const cleanBusinessName = businessName.trim();
    const cleanBusinessDescription = businessDescription.trim();
    const cleanWebsite = website.trim();

    // Validation
    if (cleanUsername.length < 3) {
      setNotice({ type: "error", message: "Потребителското име трябва да е поне 3 символа." });
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setNotice({ type: "error", message: "Потребителското име може да съдържа само букви, цифри, _, . и -" });
      return;
    }

    if (cleanPhone && !/^[0-9+ ()-]{6,20}$/.test(cleanPhone)) {
      setNotice({ type: "error", message: "Моля въведете валиден телефонен номер." });
      return;
    }

    if (isBusiness && !cleanBusinessName) {
      setNotice({ type: "error", message: "Въведете име на фирмата." });
      return;
    }

    if (cleanWebsite && !/^https?:\/\/.+/.test(cleanWebsite)) {
      setNotice({ type: "error", message: "Уебсайтът трябва да започва с http:// или https://" });
      return;
    }

    setSaving(true);

    // Upload avatar if a new file was selected
    let newAvatarUrl = avatarUrl;
    if (avatarFile) {
      const uploaded = await uploadAvatar(avatarFile);
      if (!uploaded) {
        setSaving(false);
        return;
      }
      newAvatarUrl = uploaded;
    }

    const { error: saveError } = await supabase.from("profiles").upsert({
      id: userId,
      username: cleanUsername,
      first_name: cleanFirstName || null,
      last_name: cleanLastName || null,
      full_name: cleanFirstName && cleanLastName ? `${cleanFirstName} ${cleanLastName}` : null,
      phone: cleanPhone || null,
      city: cleanCity || null,
      avatar_url: newAvatarUrl,
      is_business: isBusiness,
      business_name: isBusiness ? cleanBusinessName || null : null,
      business_description: isBusiness ? cleanBusinessDescription || null : null,
      website: isBusiness ? cleanWebsite || null : null,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);

    if (saveError) {
      if (saveError.message.includes("duplicate")) {
        setNotice({ type: "error", message: "Това потребителско име вече е заето." });
      } else {
        setNotice({ type: "error", message: saveError.message });
      }
      return;
    }

    setAvatarUrl(newAvatarUrl);
    setAvatarFile(null);
    setAvatarPreview(null);
    setNotice({ type: "success", message: "Профилът е запазен успешно." });
  };

  // -------------------------------------------------------------------------
  // Change password
  // -------------------------------------------------------------------------

  const changePassword = async () => {
    setPasswordNotice(null);

    if (!currentPassword) {
      setPasswordNotice({ type: "error", message: "Въведете текущата парола." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordNotice({ type: "error", message: "Новата парола трябва да е поне 8 символа." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: "error", message: "Новата парола и потвърждението не съвпадат." });
      return;
    }

    setSavingPassword(true);

    // Re-authenticate with current password to verify it's correct
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email ?? "",
      password: currentPassword,
    });

    if (signInError) {
      setSavingPassword(false);
      setPasswordNotice({ type: "error", message: "Текущата парола е грешна." });
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    setSavingPassword(false);

    if (updateError) {
      setPasswordNotice({ type: "error", message: "Грешка при смяна на паролата. Опитайте отново." });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordNotice({ type: "success", message: "Паролата беше сменена успешно." });
  };

  // -------------------------------------------------------------------------
  // Account deletion
  // -------------------------------------------------------------------------

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      // Delete the profile row first (cascade handles related rows)
      if (userId) {
        await supabase.from("profiles").delete().eq("id", userId);
      }
      // Sign out then let Supabase cascade delete auth.users via the trigger
      // (the trigger must exist: after delete on profiles → delete from auth.users)
      await supabase.auth.signOut();
      router.push("/?deleted=1");
    } catch {
      setDeleteError("Грешка при изтриване. Моля, опитайте отново.");
      setDeletingAccount(false);
    }
  };

  // -------------------------------------------------------------------------
  // Sign out
  // -------------------------------------------------------------------------

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // -------------------------------------------------------------------------
  // Derived display values
  // -------------------------------------------------------------------------

  const displayedAvatar = avatarPreview ?? avatarUrl;
  const avatarLetter = (username || email || "?").charAt(0).toUpperCase();

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-white pb-24 lg:bg-slate-50 lg:pb-0">
      <Header />

      {/* Desktop hero */}
      <section className="hidden bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-16 text-white lg:block">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black">Моят профил</h1>
          <p className="mt-4 text-blue-100">Управлявайте вашата лична информация и публичен профил.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-0 py-0 lg:px-6 lg:py-12">

        {/* Hidden file input — always in DOM so the mobile camera button can trigger it */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {loading ? (
          <div className="flex items-center justify-center bg-white p-16 lg:rounded-3xl lg:shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-blue-950" />
          </div>
        ) : !userId ? (
          <div className="mx-4 mt-6 rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200 lg:mx-0 lg:mt-0">
            <p className="text-xl font-black text-slate-900">Трябва да влезете в профила си.</p>
          </div>
        ) : (
          <>
            {/* ── Mobile: profile header ── */}
            <div className="bg-gradient-to-b from-blue-950 to-blue-900 px-4 pb-8 pt-8 text-white lg:hidden">
              {/* Avatar with camera overlay */}
              <div className="relative mx-auto w-fit">
                <div className="h-24 w-24 overflow-hidden rounded-full bg-white/15 ring-4 ring-white/20">
                  {displayedAvatar ? (
                    <img
                      src={displayedAvatar}
                      alt="Снимка на профила"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-black text-white">
                      {avatarLetter}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0.5 right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-950 shadow-lg transition active:scale-95"
                  aria-label="Смени снимката"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              {/* Name + handle + email */}
              <div className="mt-4 text-center">
                <p className="text-xl font-black leading-tight">
                  {firstName && lastName
                    ? `${firstName} ${lastName}`
                    : username || "Потребител"}
                </p>
                {(firstName || lastName) && username && (
                  <p className="text-sm text-blue-200">@{username}</p>
                )}
                <p className="mt-0.5 text-xs text-blue-300">{email}</p>
              </div>

              {/* Trust badge pills */}
              {(hasGoogleLogin || phone || city) && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {hasGoogleLogin && (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white">
                      ✓ Google
                    </span>
                  )}
                  {phone && (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white">
                      ✓ Телефон
                    </span>
                  )}
                  {city && (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white">
                      📍 {city}
                    </span>
                  )}
                </div>
              )}

              {/* Avatar preview notice */}
              {avatarPreview && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <span className="text-[11px] text-blue-200">Предварителен преглед · не е запазено</span>
                  <button
                    type="button"
                    onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                    className="text-[11px] font-bold text-white underline underline-offset-2"
                  >
                    Отмени
                  </button>
                </div>
              )}
            </div>

            {/* ── Mobile: quick links ── */}
            <div className="grid grid-cols-3 gap-3 px-4 py-4 lg:hidden">
              <Link
                href={`/listings?seller=${userId}`}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-white px-2 py-4 text-center shadow-sm ring-1 ring-slate-100 transition active:bg-slate-50"
              >
                <span className="text-2xl leading-none">📋</span>
                <span className="text-xs font-bold text-slate-700">Обяви</span>
              </Link>
              <Link
                href="/favorites"
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-white px-2 py-4 text-center shadow-sm ring-1 ring-slate-100 transition active:bg-slate-50"
              >
                <span className="text-2xl leading-none">❤️</span>
                <span className="text-xs font-bold text-slate-700">Любими</span>
              </Link>
              <Link
                href={`/user/${userId}`}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-white px-2 py-4 text-center shadow-sm ring-1 ring-slate-100 transition active:bg-slate-50"
              >
                <span className="text-2xl leading-none">👤</span>
                <span className="text-xs font-bold text-slate-700">Публичен</span>
              </Link>
            </div>

            {/* Profile missing banner */}
            {profileMissing && (
              <div className="mx-4 mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 lg:mx-0 lg:mb-8">
                <p className="text-sm font-black text-amber-800">Профилът ви не е завършен</p>
                <p className="mt-1 text-sm font-semibold text-amber-700">
                  Попълнете данните по-долу и натиснете „Запази", за да активирате профила си напълно.
                  Ако имате проблем, свържете се с нас на{" "}
                  <a href="mailto:support@daivzemi.bg" className="underline underline-offset-2">
                    support@daivzemi.bg
                  </a>
                  .
                </p>
              </div>
            )}

            {/* Desktop / content grid */}
            <div className="grid gap-4 lg:gap-8 lg:grid-cols-[280px_1fr]">

              {/* ── Left sidebar — desktop only ── */}
              <div className="hidden flex-col gap-4 lg:flex">
                <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
                  <p className="mb-6 text-sm font-black text-blue-950">Снимка на профила</p>

                  <div className="relative mx-auto w-fit">
                    <div className="h-32 w-32 overflow-hidden rounded-full bg-blue-950 ring-4 ring-slate-100">
                      {displayedAvatar ? (
                        <img
                          src={displayedAvatar}
                          alt="Снимка на профила"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-5xl font-black text-white">
                          {avatarLetter}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-blue-950 text-white shadow-lg transition hover:bg-blue-800"
                      title="Смени снимката"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-6 space-y-2 text-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-2xl border border-blue-950 px-4 py-2.5 text-sm font-black text-blue-950 transition hover:bg-blue-50"
                    >
                      {displayedAvatar ? "Смени снимката" : "Качи снимка"}
                    </button>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                        className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                      >
                        Отмени промяната
                      </button>
                    )}
                  </div>

                  <p className="mt-4 text-center text-xs text-slate-600">JPG, PNG или WEBP · макс. 5 MB</p>

                  {avatarPreview && (
                    <div className="mt-4 rounded-xl bg-blue-50 px-4 py-2.5 text-center text-xs font-bold text-blue-950">
                      Предварителен преглед — снимката не е запазена
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <User className="h-5 w-5 text-blue-950" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500">Имейл за вход</p>
                      <p className="truncate text-sm font-black text-slate-900">{email}</p>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/user/${userId}`}
                  className="flex items-center justify-center gap-2 rounded-[28px] bg-white px-6 py-4 text-sm font-black text-blue-950 shadow-sm ring-1 ring-slate-200 transition hover:bg-blue-50"
                >
                  Виж публичния профил →
                </Link>

                <SellerTips avatarUrl={avatarUrl} phone={phone} city={city} hasGoogleLogin={hasGoogleLogin} />
              </div>

              {/* ── Personal info form ── */}
              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200 mx-4 lg:mx-0 lg:p-10">
                <h2 className="mb-6 text-xl font-black text-blue-950 lg:mb-8 lg:text-2xl">Лична информация</h2>

                {notice && (
                  <div className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold ${
                    notice.type === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-800"
                  }`}>
                    {notice.type === "error" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    {notice.message}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
                  <label className="col-span-full space-y-2">
                    <span className="block text-sm font-black text-blue-950">
                      Потребителско име <span className="text-red-500">*</span>
                    </span>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="milcho123"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10 lg:px-5 lg:py-4"
                    />
                    <p className="text-xs text-slate-500">Видимо публично. Само букви, цифри, _, . и -</p>
                  </label>

                  <label className="space-y-2">
                    <span className="block text-sm font-black text-blue-950">Име</span>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Милчо"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10 lg:px-5 lg:py-4"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="block text-sm font-black text-blue-950">Фамилия</span>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Милчев"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10 lg:px-5 lg:py-4"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="block text-sm font-black text-blue-950">Телефон</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      type="tel"
                      placeholder="+359..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10 lg:px-5 lg:py-4"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="block text-sm font-black text-blue-950">Град</span>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="София"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10 lg:px-5 lg:py-4"
                    />
                  </label>
                </div>

                {/* ── Business profile ── */}
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:mt-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-950 text-white">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">Бизнес профил</p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                          Активирайте, за да се показвате като фирма или магазин.
                        </p>
                      </div>
                    </div>
                    {/* Toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isBusiness}
                      onClick={() => setIsBusiness((v) => !v)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-blue-950 focus:ring-offset-2 ${isBusiness ? "bg-blue-950" : "bg-slate-200"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${isBusiness ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>

                  {isBusiness && (
                    <div className="mt-4 grid gap-4">
                      <label className="space-y-2">
                        <span className="block text-sm font-black text-blue-950">
                          Име на фирмата <span className="text-red-500">*</span>
                        </span>
                        <input
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="ООД Примерна Фирма"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="block text-sm font-black text-blue-950">Кратко описание</span>
                        <textarea
                          value={businessDescription}
                          onChange={(e) => setBusinessDescription(e.target.value)}
                          placeholder="Какво предлага вашата фирма..."
                          rows={3}
                          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="block text-sm font-black text-blue-950">Уебсайт</span>
                        <input
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="https://www.example.bg"
                          type="url"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-950 px-6 py-4 font-black text-white shadow-lg transition active:bg-blue-900 hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60 lg:mt-8"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Запазване..." : "Запази профила"}
                </button>
              </div>

              {/* ── Change password ── */}
              {hasGoogleLogin && !hasEmailLogin ? (
                <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200 mx-4 lg:col-span-2 lg:mx-0 lg:p-10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <Lock className="h-5 w-5 text-blue-950" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-blue-950 lg:text-2xl">Смяна на парола</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Влизате чрез Google. Смяна на парола не е необходима за този профил.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); changePassword(); }}
                  className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200 mx-4 lg:col-span-2 lg:mx-0 lg:p-10"
                >
                  <div className="mb-6 flex items-center gap-3 lg:mb-8">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <Lock className="h-5 w-5 text-blue-950" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-blue-950 lg:text-2xl">Смяна на парола</h2>
                      <p className="text-sm text-slate-500">Минимум 8 символа за новата парола.</p>
                    </div>
                  </div>

                  {passwordNotice && (
                    <div className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold ${
                      passwordNotice.type === "error"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-green-200 bg-green-50 text-green-800"
                    }`}>
                      {passwordNotice.type === "error" ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      {passwordNotice.message}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-3 lg:gap-5">
                    <label className="space-y-2">
                      <span className="block text-sm font-black text-blue-950">Текуща парола</span>
                      <input
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        type="password"
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10 lg:px-5 lg:py-4"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="block text-sm font-black text-blue-950">Нова парола</span>
                      <input
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        type="password"
                        placeholder="Минимум 8 символа"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10 lg:px-5 lg:py-4"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="block text-sm font-black text-blue-950">Потвърди новата парола</span>
                      <input
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        type="password"
                        placeholder="Повтори паролата"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10 lg:px-5 lg:py-4"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-blue-950 px-8 py-4 font-black text-white shadow-lg transition active:bg-blue-900 hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                    {savingPassword ? "Запазване..." : "Смени паролата"}
                  </button>
                </form>
              )}
            </div>

            {/* ── Mobile: sign out ── */}
            <div className="mt-4 px-4 lg:hidden">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white py-4 text-sm font-black text-slate-600 transition active:bg-slate-50 hover:bg-slate-50"
              >
                Изход от профила
              </button>
            </div>
          </>
        )}

        {/* Danger zone */}
        {userId && (
          <div className="mx-4 mt-4 lg:mx-auto lg:mt-12 lg:max-w-2xl">
            <div className="rounded-[28px] border border-red-100 bg-red-50/50 p-6">
              <h2 className="text-base font-black text-red-700">Изтриване на акаунт</h2>
              <p className="mt-2 text-sm font-semibold text-red-600">
                Всички ваши обяви, съобщения и данни ще бъдат изтрити без възможност за възстановяване.
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mt-4 rounded-2xl border border-red-300 bg-white px-5 py-3 text-sm font-black text-red-600 transition hover:bg-red-600 hover:text-white"
                >
                  Изтрий акаунта ми
                </button>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-black text-red-700">Сигурни ли сте? Това действие е необратимо.</p>
                  {deleteError && <p className="text-sm font-semibold text-red-600">{deleteError}</p>}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deletingAccount}
                      className="flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                      {deletingAccount && <Loader2 className="h-4 w-4 animate-spin" />}
                      {deletingAccount ? "Изтриване..." : "Да, изтрий завинаги"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:border-slate-400"
                    >
                      Отказ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
