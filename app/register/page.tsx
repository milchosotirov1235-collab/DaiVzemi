"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, ShieldCheck } from "lucide-react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";

const accountTypes = ["Частно лице", "Фирма"];

export default function RegisterPage() {
  const [accountType, setAccountType] = useState("Частно лице");
  const [isAccountTypeOpen, setIsAccountTypeOpen] = useState(false);

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{
    type: "error" | "success";
    title: string;
    message: string;
  } | null>(null);

  const showError = (title: string, message: string) => {
    setNotice({ type: "error", title, message });
  };

  const clean = (value: string) => value.trim();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    const cleanUsername = clean(username);
    const cleanFirstName = clean(firstName);
    const cleanLastName = clean(lastName);
    const cleanEmail = clean(email).toLowerCase();
    const cleanPhone = clean(phone);
    const cleanCity = clean(city);

    if (cleanUsername.length < 3) {
      showError("Почти готово", "Потребителското име трябва да съдържа поне 3 символа.");
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      showError("Невалидно потребителско име", "Използвайте само букви, цифри, точка, тире или долна черта.");
      return;
    }

    if (cleanFirstName.length < 2) {
      showError("Липсва име", "Името трябва да съдържа поне 2 букви.");
      return;
    }

    if (cleanLastName.length < 3) {
      showError("Липсва фамилия", "Фамилията трябва да съдържа поне 3 букви.");
      return;
    }

    if (!cleanEmail.includes("@") || cleanEmail.length < 6) {
      showError("Невалиден имейл", "Моля въведете валиден имейл адрес.");
      return;
    }

    if (cleanPhone && !/^[0-9+ ()-]{6,20}$/.test(cleanPhone)) {
      showError("Невалиден телефон", "Телефонът може да съдържа цифри, +, интервали, тирета и скоби.");
      return;
    }

    if (cleanCity && cleanCity.length < 2) {
      showError("Невалиден град", "Градът трябва да съдържа поне 2 символа.");
      return;
    }

    if (password.length < 8) {
      showError("Слаба парола", "Паролата трябва да съдържа поне 8 символа.");
      return;
    }

    if (password !== confirmPassword) {
      showError("Паролите не съвпадат", "Моля въведете една и съща парола в двете полета.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          accountType,
          username: cleanUsername,
          firstName: cleanFirstName,
          lastName: cleanLastName,
          phone: cleanPhone || null,
          city: cleanCity || null,
        },
      },
    });

    if (signUpError) {
      setLoading(false);

      if (signUpError.message.toLowerCase().includes("already")) {
        showError("Имейлът вече се използва", "Вече има акаунт с този имейл адрес.");
      } else {
        showError("Регистрацията не беше успешна", "Моля проверете данните и опитайте отново.");
      }

      return;
    }

    const userId = data.user?.id;

    if (userId) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        username: cleanUsername,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        full_name: `${cleanFirstName} ${cleanLastName}`,
        phone: cleanPhone || null,
        city: cleanCity || null,
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        setLoading(false);

        if (profileError.message.toLowerCase().includes("duplicate")) {
          showError("Потребителското име е заето", "Изберете друго потребителско име.");
        } else {
          showError("Профилът не беше създаден", "Акаунтът е създаден, но профилът не се записа коректно.");
        }

        return;
      }
    }

    setLoading(false);

    setNotice({
      type: "success",
      title: "Профилът е създаден",
      message: "Регистрацията е успешна. Проверете имейла си за потвърждение.",
    });

    setAccountType("Частно лице");
    setUsername("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setCity("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_32%)]" />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black md:text-6xl">Създай профил</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-blue-100">
            Регистрирай се и започни да публикуваш обяви в модерна българска платформа.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-[36px] bg-white p-8 shadow-2xl ring-1 ring-slate-200 md:p-12">
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-950 text-white shadow-lg">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-blue-950">Регистрация</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Имейлът е за вход. Публично ще се показва потребителското име.
                </p>
              </div>
            </div>

            {notice ? (
              <div
                className={`rounded-[28px] border p-5 shadow-sm ${
                  notice.type === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-blue-200 bg-blue-50 text-blue-950"
                }`}
              >
                <div className="flex gap-3">
                  {notice.type === "error" ? (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  )}
                  <div>
                    <p className="font-black">{notice.title}</p>
                    <p className="mt-1 text-sm font-semibold opacity-90">{notice.message}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <span className="block text-sm font-black text-blue-950">Тип акаунт</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAccountTypeOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:bg-slate-50 focus:border-blue-950 focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  <span className="text-base font-bold text-slate-900">{accountType}</span>
                  <ChevronDown className={`h-5 w-5 text-blue-950 transition ${isAccountTypeOpen ? "rotate-180" : ""}`} />
                </button>

                {isAccountTypeOpen ? (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                    {accountTypes.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setAccountType(option);
                          setIsAccountTypeOpen(false);
                        }}
                        className={`flex w-full items-center rounded-xl px-4 py-3 text-left text-sm font-bold transition hover:bg-slate-100 ${
                          option === accountType ? "bg-slate-100 text-blue-950" : "text-slate-700"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Потребителско име *</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  type="text"
                  placeholder="milcho123"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Email *</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="example@mail.com"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Име *</span>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  type="text"
                  placeholder="Милчо"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Фамилия *</span>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  type="text"
                  placeholder="Милчев"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Телефон</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  type="tel"
                  placeholder="+359..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Град</span>
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  type="text"
                  placeholder="София"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Парола *</span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Минимум 8 символа"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Потвърди паролата *</span>
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  placeholder="Повторете паролата"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-950 px-6 py-4 text-base font-black text-white shadow-lg transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Създаване на профил..." : "Регистрация"}
            </button>

            <p className="text-center text-sm font-semibold text-slate-600">
              Вече имаш акаунт?{" "}
              <Link href="/login" className="font-black text-blue-950 hover:text-blue-700">
                Вход
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}