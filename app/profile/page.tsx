"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import { AlertTriangle, Camera, CheckCircle2, Loader2, User } from "lucide-react";
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
  // Auth
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // Profile fields
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

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
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, first_name, last_name, phone, city, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setUsername(profile.username ?? "");
        setFirstName(profile.first_name ?? "");
        setLastName(profile.last_name ?? "");
        setPhone(profile.phone ?? "");
        setCity(profile.city ?? "");
        setAvatarUrl(profile.avatar_url ?? null);
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
  // Derived display values
  // -------------------------------------------------------------------------

  const displayedAvatar = avatarPreview ?? avatarUrl;
  const avatarLetter = (username || email || "?").charAt(0).toUpperCase();

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black">Моят профил</h1>
          <p className="mt-4 text-blue-100">
            Управлявайте вашата лична информация и публичен профил.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center rounded-3xl bg-white p-12 shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-blue-950" />
          </div>
        ) : !userId ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-xl font-black text-slate-900">
              Трябва да влезете в профила си.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">

            {/* ── Left: Avatar card ── */}
            <div className="flex flex-col gap-4">
              <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
                <p className="mb-6 text-sm font-black text-blue-950">Снимка на профила</p>

                {/* Avatar preview */}
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

                  {/* Camera button overlay */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-blue-950 text-white shadow-lg transition hover:bg-blue-800"
                    title="Смени снимката"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

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
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                      className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                    >
                      Отмени промяната
                    </button>
                  )}
                </div>

                <p className="mt-4 text-center text-xs text-slate-400">
                  JPG, PNG или WEBP · макс. 5 MB
                </p>

                {/* New preview badge */}
                {avatarPreview && (
                  <div className="mt-4 rounded-xl bg-blue-50 px-4 py-2.5 text-center text-xs font-bold text-blue-950">
                    Предварителен преглед — снимката не е запазена
                  </div>
                )}
              </div>

              {/* Email display (read-only) */}
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
            </div>

            {/* ── Right: Form ── */}
            <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
              <h2 className="mb-8 text-2xl font-black text-blue-950">Лична информация</h2>

              {/* Notice */}
              {notice && (
                <div
                  className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold ${
                    notice.type === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-800"
                  }`}
                >
                  {notice.type === "error" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  {notice.message}
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">

                {/* Username */}
                <label className="col-span-full space-y-2">
                  <span className="block text-sm font-black text-blue-950">
                    Потребителско име <span className="text-red-500">*</span>
                  </span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="milcho123"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                  />
                  <p className="text-xs text-slate-400">
                    Видимо публично. Само букви, цифри, _, . и -
                  </p>
                </label>

                {/* First name */}
                <label className="space-y-2">
                  <span className="block text-sm font-black text-blue-950">Име</span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Милчо"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                  />
                </label>

                {/* Last name */}
                <label className="space-y-2">
                  <span className="block text-sm font-black text-blue-950">Фамилия</span>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Милчев"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                  />
                </label>

                {/* Phone */}
                <label className="space-y-2">
                  <span className="block text-sm font-black text-blue-950">Телефон</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    placeholder="+359..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                  />
                </label>

                {/* City */}
                <label className="space-y-2">
                  <span className="block text-sm font-black text-blue-950">Град</span>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="София"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                  />
                </label>

              </div>

              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-950 px-6 py-4 font-black text-white shadow-lg transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Запазване..." : "Запази профила"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
