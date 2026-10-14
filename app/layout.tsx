import type { Metadata } from "next";
import "./globals.css";
import "./laboratory.css";

export const metadata: Metadata = {
  title: "Пётр Никитин — образовательная лаборатория",
  description: "Учебные симуляторы, исследовательские проекты и образовательная аналитика. Автор: Никитин Петр Владимирович, к.пед.н., доцент.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
