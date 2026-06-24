import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-blue-950 px-6 pb-8 pt-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-lg font-black text-white">ДайВземи</p>
            <p className="mt-1 max-w-xs text-sm font-semibold text-blue-200">
              Купувай и продавай безплатно в България.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-3">
            <Link
              href="/terms"
              className="text-sm font-semibold text-blue-100 transition hover:text-white"
            >
              Общи условия
            </Link>
            <Link
              href="/privacy"
              className="text-sm font-semibold text-blue-100 transition hover:text-white"
            >
              Поверителност
            </Link>
            <Link
              href="/cookies"
              className="text-sm font-semibold text-blue-100 transition hover:text-white"
            >
              Бисквитки
            </Link>
            <Link
              href="/help"
              className="text-sm font-semibold text-blue-100 transition hover:text-white"
            >
              Помощ
            </Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-blue-800/60" />
        <p className="mt-6 text-xs font-semibold text-blue-300">
          © {year} ДайВземи. Всички права запазени.
        </p>
      </div>
    </footer>
  );
}
