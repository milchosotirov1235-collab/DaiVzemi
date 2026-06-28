import Header from "@/components/Header";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const FAQ: { section: string; items: { q: string; a: string }[] }[] = [
  {
    section: "Публикуване на обяви",
    items: [
      {
        q: "Безплатно ли е публикуването?",
        a: "Да, публикуването на обяви в ДайВземи е напълно безплатно. Не се изискват такси или абонамент.",
      },
      {
        q: "Как да публикувам обява?",
        a: "Влезте в профила си и натиснете бутона Публикувай обява. Попълнете заглавие, категория, цена, град и описание. Можете да добавите до 10 снимки. Обявата ще бъде прегледана и публикувана в рамките на кратко време.",
      },
      {
        q: "Защо обявата ми е в статус Изчаква одобрение?",
        a: "Всяка нова обява минава през кратка проверка от нашия екип, за да се гарантира качеството на платформата. Обикновено процесът отнема до няколко часа.",
      },
      {
        q: "Колко обяви мога да публикувам?",
        a: "Можете да публикувате до 5 обяви на час и до 20 обяви за 24 часа. Ограничението е въведено за предотвратяване на спам.",
      },
      {
        q: "Мога ли да редактирам обява след публикуване?",
        a: "Да. Влезте в Моите обяви, намерете обявата и натиснете Редактирай. Промените влизат в сила след повторно одобрение.",
      },
      {
        q: "Как да маркирам обява като продадена?",
        a: "В Моите обяви натиснете Маркирай като продадено до желаната обява. Обявата ще бъде скрита от търсенето.",
      },
    ],
  },
  {
    section: "Снимки",
    items: [
      {
        q: "Какви снимки мога да качвам?",
        a: "Приемат се файлове във формат JPG, JPEG, PNG и WEBP с размер до 5MB на снимка. Броят на снимките зависи от категорията — до 10 за повечето категории.",
      },
      {
        q: "Мога ли да добавям снимки на части?",
        a: "Да. Натиснете Избери снимки няколко пъти — всяко ново избиране добавя към вече избраните снимки, вместо да ги замества.",
      },
    ],
  },
  {
    section: "Комуникация и безопасност",
    items: [
      {
        q: "Как да се свържа с продавач?",
        a: "Отворете желаната обява и натиснете Изпрати съобщение. Ще бъде създаден частен разговор между вас и продавача.",
      },
      {
        q: "Как да докладвам нередност?",
        a: "На страницата на всяка обява има бутон Докладвай. Можете да докладвате нарушения на правилата или некоректно съдържание. Нашият екип ще разгледа доклада.",
      },
      {
        q: "Как да се предпазя от измами?",
        a: "Никога не изпращайте пари предварително без да сте видели стоката. Предпочитайте лична среща на обществено място. Не споделяйте лични данни като ЕГН или банкови данни в съобщения.",
      },
    ],
  },
  {
    section: "Акаунт",
    items: [
      {
        q: "Защо трябва да потвърдя имейла си?",
        a: "Потвърждението на имейл гарантира сигурността на акаунта ви и позволява да получавате известия. Без потвърден имейл не можете да публикувате обяви.",
      },
      {
        q: "Как да изтрия акаунта си?",
        a: "В настройките на профила си превъртете до секцията Изтриване на акаунт. Изтриването е необратимо — всички ваши обяви и съобщения ще бъдат премахнати.",
      },
      {
        q: "Мога ли да вляза с Google?",
        a: "Да. На страницата за вход натиснете Вход с Google и следвайте инструкциите.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="border-b border-slate-100 bg-white px-4 py-5 lg:px-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-black text-slate-900">Помощен център</h1>
          <p className="mt-0.5 text-sm text-slate-500">Отговори на най-честите въпроси.</p>
        </div>
      </div>

      <section className="mx-auto max-w-4xl space-y-12 px-4 py-8 lg:px-6 lg:py-12">
        {FAQ.map((group) => (
          <div key={group.section}>
            <h2 className="mb-6 text-2xl font-black text-blue-950">{group.section}</h2>
            <div className="space-y-3">
              {group.items.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-slate-200 bg-white shadow-sm open:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-black text-slate-900 select-none">
                    {item.q}
                    <ChevronRight className="h-5 w-5 shrink-0 text-blue-950 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="border-t border-slate-100 px-6 py-5 text-sm font-semibold leading-relaxed text-slate-600">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-[28px] bg-blue-950 px-8 py-10 text-center text-white">
          <p className="text-xl font-black">Не намерихте отговор?</p>
          <p className="mt-2 text-sm text-blue-200">
            Свържете се с нас на{" "}
            <a
              href="mailto:support@daivzemi.bg"
              className="font-black underline underline-offset-2 hover:text-white"
            >
              support@daivzemi.bg
            </a>
          </p>
          <Link
            href="/listings"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-black text-blue-950 transition hover:bg-blue-50"
          >
            Разгледай обяви
          </Link>
        </div>
      </section>
    </main>
  );
}
