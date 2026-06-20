import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm font-semibold text-slate-500">
          © {year} ДайВземи. Всички права запазени.
        </p>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link
            href="/terms"
            className="text-sm font-semibold text-slate-500 transition hover:text-blue-950"
          >
            Общи условия
          </Link>
          <Link
            href="/privacy"
            className="text-sm font-semibold text-slate-500 transition hover:text-blue-950"
          >
            Политика за поверителност
          </Link>
          <Link
            href="/cookies"
            className="text-sm font-semibold text-slate-500 transition hover:text-blue-950"
          >
            Бисквитки
          </Link>
          <Link
            href="/help"
            className="text-sm font-semibold text-slate-500 transition hover:text-blue-950"
          >
            Помощ
          </Link>
        </nav>
      </div>
    </footer>
  );
}
