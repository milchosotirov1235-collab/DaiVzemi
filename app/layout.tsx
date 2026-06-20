import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://daivzemi.bg";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ДайВземи — Безплатни обяви в България",
    template: "%s | ДайВземи",
  },
  description:
    "Купувай и продавай безплатно в България. Обяви за имоти, автомобили, електроника, работа и още на ДайВземи.",
  openGraph: {
    siteName: "ДайВземи",
    locale: "bg_BG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bg"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <SiteChrome />
      </body>
    </html>
  );
}
