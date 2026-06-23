"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, ShieldCheck } from "lucide-react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

const accountTypes = ["Частно лице", "Фирма"];

type FieldErrors = Partial<{
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  password: string;
  confirmPassword: string;
  terms: string;
}>;

function inputClass(hasError: boolean) {
  return `w-full rounded-2xl border bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none transition focus:ring-2 ${
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-950 focus:ring-blue-100"
  }`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
      <AlertTriangle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

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
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverNotice, setServerNotice] = useState<{
    type: "error" | "success";
    title: string;
    message: string;
  } | null>(null);

  // Refs for focus-on-error
  const usernameRef = useRef<HTMLInputElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const clearField = (field: keyof FieldErrors) =>
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setServerNotice(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setServerNotice({ type: "error", title: "Грешка", message: "Грешка при регистрация с Google. Опитайте отново." });
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerNotice(null);

    const clean = (v: string) => v.trim();
    const cleanUsername = clean(username);
    const cleanFirstName = clean(firstName);
    const cleanLastName = clean(lastName);
    const cleanEmail = clean(email).toLowerCase();
    const cleanPhone = clean(phone);
    const cleanCity = clean(city);

    const errors: FieldErrors = {};

    // Username
    if (cleanUsername.length < 4) {
      errors.username = "Потребителското име трябва да съдържа поне 4 символа.";
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      errors.username = "Използвайте само букви, цифри, точка, тире или долна черта.";
    }

    // First name
    if (cleanFirstName.length < 3) {
      errors.firstName = "Името трябва да съдържа поне 3 букви.";
    } else if (/[0-9!@#$%^&*()+={}\[\];':"\\|,.<>/?]/.test(cleanFirstName)) {
      errors.firstName = "Името не трябва да съдържа цифри или специални символи.";
    }

    // Last name
    if (cleanLastName.length < 3) {
      errors.lastName = "Фамилията трябва да съдържа поне 3 букви.";
    } else if (/[0-9!@#$%^&*()+={}\[\];':"\\|,.<>/?]/.test(cleanLastName)) {
      errors.lastName = "Фамилията не трябва да съдържа цифри или специални символи.";
    }

    // Email
    if (!cleanEmail.includes("@") || cleanEmail.length < 6) {
      errors.email = "Моля въведете валиден имейл адрес.";
    }

    // Phone (optional)
    if (cleanPhone && !/^[0-9+ ()-]{6,20}$/.test(cleanPhone)) {
      errors.phone = "Телефонът може да съдържа цифри, +, интервали, тирета и скоби.";
    }

    // City (optional)
    if (cleanCity && cleanCity.length < 2) {
      errors.city = "Градът трябва да съдържа поне 2 символа.";
    }

    // Password
    if (password.length < 8) {
      errors.password = "Паролата трябва да съдържа поне 8 символа.";
    }

    // Confirm password
    if (!errors.password && password !== confirmPassword) {
      errors.confirmPassword = "Паролите не съвпадат.";
    }

    // Terms
    if (!termsAccepted) {
      errors.terms = "Трябва да приемете общите условия, за да се регистрирате.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Focus and scroll to first invalid field
      const firstRef =
        errors.username ? usernameRef :
        errors.firstName ? firstNameRef :
        errors.lastName ? lastNameRef :
        errors.email ? emailRef :
        errors.phone ? phoneRef :
        errors.city ? cityRef :
        errors.password ? passwordRef :
        errors.confirmPassword ? confirmPasswordRef :
        errors.terms ? termsRef : null;

      if (firstRef?.current) {
        firstRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        firstRef.current.focus();
      }
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
        setFieldErrors({ email: "Вече има акаунт с този имейл адрес." });
        emailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        emailRef.current?.focus();
      } else {
        setServerNotice({ type: "error", title: "Регистрацията не беше успешна", message: "Моля проверете данните и опитайте отново." });
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
          setFieldErrors({ username: "Това потребителско име вече е заето. Изберете друго." });
          usernameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          usernameRef.current?.focus();
        } else {
          setServerNotice({ type: "error", title: "Профилът не беше създаден", message: "Акаунтът е създаден, но профилът не се записа коректно." });
        }
        return;
      }
    }

    setLoading(false);
    setServerNotice({
      type: "success",
      title: "Профилът е създаден",
      message: "Изпратихме линк за потвърждение на имейла ви. Трябва да потвърдите имейла, преди да публикувате обяви или да изпращате съобщения.",
    });

    setAccountType("Частно лице");
    setUsername(""); setFirstName(""); setLastName("");
    setEmail(""); setPhone(""); setCity("");
    setPassword(""); setConfirmPassword("");
    setTermsAccepted(false);
    setFieldErrors({});
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
          <form className="space-y-8" onSubmit={handleSubmit} noValidate>
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

            {/* Server-level notice (success or non-field error) */}
            {serverNotice && (
              <div
                className={`rounded-[28px] border p-5 shadow-sm ${
                  serverNotice.type === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-blue-200 bg-blue-50 text-blue-950"
                }`}
              >
                <div className="flex gap-3">
                  {serverNotice.type === "error" ? (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  )}
                  <div>
                    <p className="font-black">{serverNotice.title}</p>
                    <p className="mt-1 text-sm font-semibold opacity-90">{serverNotice.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Account type */}
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
                {isAccountTypeOpen && (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                    {accountTypes.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => { setAccountType(option); setIsAccountTypeOpen(false); }}
                        className={`flex w-full items-center rounded-xl px-4 py-3 text-left text-sm font-bold transition hover:bg-slate-100 ${
                          option === accountType ? "bg-slate-100 text-blue-950" : "text-slate-700"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Fields grid */}
            <div className="grid gap-5 md:grid-cols-2">

              {/* Username */}
              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Потребителско име *</span>
                <input
                  ref={usernameRef}
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); clearField("username"); }}
                  type="text"
                  placeholder="milcho123"
                  className={inputClass(!!fieldErrors.username)}
                />
                <FieldError message={fieldErrors.username} />
              </label>

              {/* Email */}
              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Email *</span>
                <input
                  ref={emailRef}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearField("email"); }}
                  type="email"
                  placeholder="example@mail.com"
                  className={inputClass(!!fieldErrors.email)}
                />
                <FieldError message={fieldErrors.email} />
              </label>

              {/* First name */}
              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Име *</span>
                <input
                  ref={firstNameRef}
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); clearField("firstName"); }}
                  type="text"
                  placeholder="Милчо"
                  className={inputClass(!!fieldErrors.firstName)}
                />
                <FieldError message={fieldErrors.firstName} />
              </label>

              {/* Last name */}
              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Фамилия *</span>
                <input
                  ref={lastNameRef}
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); clearField("lastName"); }}
                  type="text"
                  placeholder="Милчев"
                  className={inputClass(!!fieldErrors.lastName)}
                />
                <FieldError message={fieldErrors.lastName} />
              </label>

              {/* Phone */}
              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Телефон</span>
                <input
                  ref={phoneRef}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); clearField("phone"); }}
                  type="tel"
                  placeholder="+359..."
                  className={inputClass(!!fieldErrors.phone)}
                />
                <FieldError message={fieldErrors.phone} />
              </label>

              {/* City */}
              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Град</span>
                <input
                  ref={cityRef}
                  value={city}
                  onChange={(e) => { setCity(e.target.value); clearField("city"); }}
                  type="text"
                  placeholder="София"
                  className={inputClass(!!fieldErrors.city)}
                />
                <FieldError message={fieldErrors.city} />
              </label>

              {/* Password */}
              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Парола *</span>
                <input
                  ref={passwordRef}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearField("password"); clearField("confirmPassword"); }}
                  type="password"
                  placeholder="Минимум 8 символа"
                  className={inputClass(!!fieldErrors.password)}
                />
                <FieldError message={fieldErrors.password} />
              </label>

              {/* Confirm password */}
              <label className="space-y-2">
                <span className="text-sm font-black text-blue-950">Потвърди паролата *</span>
                <input
                  ref={confirmPasswordRef}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearField("confirmPassword"); }}
                  type="password"
                  placeholder="Повторете паролата"
                  className={inputClass(!!fieldErrors.confirmPassword)}
                />
                <FieldError message={fieldErrors.confirmPassword} />
              </label>
            </div>

            {/* Terms checkbox */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <input
                  ref={termsRef}
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => { setTermsAccepted(e.target.checked); clearField("terms"); }}
                  className={`mt-0.5 h-4 w-4 cursor-pointer rounded accent-blue-950 ${
                    fieldErrors.terms ? "outline outline-2 outline-red-400" : ""
                  }`}
                />
                <label htmlFor="terms" className="cursor-pointer text-sm font-semibold text-slate-800">
                  Прочетох и приемам{" "}
                  <Link href="/terms" className="font-black text-blue-950 underline underline-offset-2 hover:text-blue-700">
                    Общите условия
                  </Link>{" "}
                  и{" "}
                  <Link href="/privacy" className="font-black text-blue-950 underline underline-offset-2 hover:text-blue-700">
                    Политиката за поверителност
                  </Link>
                  .
                </label>
              </div>
              <FieldError message={fieldErrors.terms} />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full rounded-2xl bg-blue-950 px-6 py-4 text-base font-black text-white shadow-lg transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Създаване на профил..." : "Регистрация"}
            </button>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold text-slate-400">или</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={loading || googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon />
              {googleLoading ? "Пренасочване..." : "Регистрация с Google"}
            </button>

            <p className="text-center text-sm font-semibold text-slate-700">
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
