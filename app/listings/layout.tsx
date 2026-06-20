import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Всички обяви",
  description:
    "Разгледай хиляди обяви в България на ДайВземи — имоти, коли, електроника, работа и много повече. Купувай и продавай безплатно.",
  openGraph: {
    title: "Всички обяви | ДайВземи",
    description:
      "Разгледай хиляди обяви в България на ДайВземи — имоти, коли, електроника, работа и много повече.",
    url: "/listings",
    type: "website",
  },
};

export default function ListingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
