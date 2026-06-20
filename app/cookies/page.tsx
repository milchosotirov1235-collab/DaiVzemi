import type { Metadata } from "next";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Политика за бисквитките",
  description: "Научете как ДайВземи използва бисквитки и как можете да управлявате предпочитанията си.",
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black">Политика за бисквитките</h1>
          <p className="mt-4 text-blue-100">Последна актуализация: юни 2025 г.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="prose-slate prose prose-lg max-w-none rounded-3xl bg-white px-8 py-12 shadow-sm ring-1 ring-slate-200 md:px-16">
          <h2>1. Какво са бисквитките</h2>
          <p>
            Бисквитките (cookies) са малки текстови файлове, съхранявани в браузъра ви при посещение на уебсайт.
            Те помагат на сайта да запомни вашите предпочитания и да функционира правилно.
          </p>

          <h2>2. Бисквитки, които използваме</h2>

          <h3>Задължителни бисквитки</h3>
          <p>
            Тези бисквитки са необходими за функционирането на платформата и не могат да бъдат изключени.
          </p>
          <table>
            <thead>
              <tr>
                <th>Бисквитка</th>
                <th>Цел</th>
                <th>Срок</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>sb-*</code></td>
                <td>Суpabase автентикация — поддържа активната сесия</td>
                <td>Сесия / 7 дни</td>
              </tr>
              <tr>
                <td><code>dv_cookie_consent</code></td>
                <td>Запомня вашия избор за бисквитки</td>
                <td>1 година</td>
              </tr>
            </tbody>
          </table>

          <h3>Функционални бисквитки (localStorage)</h3>
          <p>
            Използваме localStorage (локално хранилище) за запомняне на предпочитания като избрани любими обяви.
            Тези данни не се изпращат към наши сървъри и остават само в браузъра ви.
          </p>

          <h2>3. Бисквитки на трети страни</h2>
          <p>
            При вход чрез Google OAuth, Google може да зададе свои бисквитки. Тяхното използване се регулира от{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-950 underline">
              Политиката за поверителност на Google
            </a>.
          </p>
          <p>
            Платформата се хоства на Vercel. Vercel може да събира технически данни (IP, браузър) с цел доставяне
            на съдържанието. Вижте{" "}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-950 underline">
              Политиката за поверителност на Vercel
            </a>.
          </p>

          <h2>4. Управление на бисквитките</h2>
          <p>
            При първото ви посещение ще видите банер, с който можете да приемете използването на бисквитките.
            Изборът ви се запомня в localStorage под ключа <code>dv_cookie_consent</code>.
          </p>
          <p>
            Можете да изтриете бисквитките по всяко време чрез настройките на браузъра си. Имайте предвид, че
            изтриването на задължителните бисквитки ще прекрати активната ви сесия.
          </p>
          <p>Инструкции за управление на бисквитки в популярни браузъри:</p>
          <ul>
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-950 underline">Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-950 underline">Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-950 underline">Apple Safari</a></li>
          </ul>

          <h2>5. Промени в политиката</h2>
          <p>
            Можем да актуализираме тази политика. Актуалната версия винаги е достъпна на тази страница.
          </p>

          <h2>6. Контакт</h2>
          <p>
            При въпроси: <strong>privacy@daivzemi.bg</strong>
          </p>
        </div>
      </section>

    </main>
  );
}
