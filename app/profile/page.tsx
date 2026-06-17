"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        .select("id, username, full_name, phone, avatar_url")
        .eq("id", user.id)
        .maybeSingle<Profile>();

      if (profile) {
        setUsername(profile.username ?? "");
        setFullName(profile.full_name ?? "");
        setPhone(profile.phone ?? "");
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  const saveProfile = async () => {
    setError(null);
    setMessage(null);

    if (!userId) {
      setError("Трябва да сте влезли в профила си.");
      return;
    }

    const cleanUsername = username.trim();
    const cleanFullName = fullName.trim();
    const cleanPhone = phone.trim();

    if (cleanUsername.length < 3) {
      setError("Потребителското име трябва да е поне 3 символа.");
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setError("Потребителското име може да съдържа само букви, цифри, _, . и -");
      return;
    }

    if (cleanPhone && !/^[0-9+ ()-]{6,20}$/.test(cleanPhone)) {
      setError("Моля въведете валиден телефонен номер.");
      return;
    }

    setSaving(true);

    const { error: saveError } = await supabase.from("profiles").upsert({
      id: userId,
      username: cleanUsername,
      full_name: cleanFullName || null,
      phone: cleanPhone || null,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);

    if (saveError) {
      if (saveError.message.includes("duplicate")) {
        setError("Това потребителско име вече е заето.");
      } else {
        setError(saveError.message);
      }
      return;
    }

    setMessage("Профилът е запазен успешно.");
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-5xl font-black">Моят профил</h1>
          <p className="mt-4 text-blue-100">
            Управлявайте потребителското си име и публичната информация.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        {loading ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            Зареждане...
          </div>
        ) : !userId ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-xl font-black text-slate-900">
              Трябва да влезете в профила си.
            </p>
          </div>
        ) : (
          <div className="rounded-[32px] bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-950 text-2xl font-black text-white">
                {(username || email || "U").charAt(0).toUpperCase()}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-500">Login email</p>
                <p className="font-black text-slate-950">{email}</p>
              </div>
            </div>

            <div className="grid gap-5">
              <label className="block">
                <span className="text-sm font-black text-blue-950">
                  Потребителско име
                </span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="milcho"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold text-slate-950 outline-none focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-blue-950">
                  Име
                </span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Милчо Милчев"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold text-slate-950 outline-none focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-blue-950">
                  Телефон
                </span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+359..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold text-slate-950 outline-none focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
                />
              </label>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-950">
                {message}
              </div>
            ) : null}

            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="mt-8 w-full rounded-2xl bg-blue-950 px-6 py-4 font-black text-white transition hover:bg-blue-900 disabled:opacity-60"
            >
              {saving ? "Запазване..." : "Запази профила"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}