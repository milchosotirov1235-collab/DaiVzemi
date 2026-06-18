import Header from "@/components/Header";
import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black">Общи условия</h1>
          <p className="mt-4 text-blue-100">Условия за използване на платформата DaiVzemi.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-16 text-center shadow-sm ring-1 ring-slate-200">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-950 text-white shadow-lg">
            <FileText className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-2xl font-black text-slate-900">Очаквайте скоро</h2>
          <p className="mt-3 max-w-md text-base font-semibold text-slate-500">
            Тук скоро ще бъдат публикувани общите условия за използване на DaiVzemi.
          </p>
        </div>
      </section>
    </main>
  );
}
