import type { Metadata } from "next";
import "@fontsource-variable/manrope/index.css";

import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./workflow.css";
import "./fund.css";
import "./urban.css";
import { Shell } from "@/components/shell";
export const metadata: Metadata = {
  title: "Green Qyzylorda AI — Экологический мониторинг",
  description:
    "Демонстрационная платформа экологического мониторинга Кызылорды",
};
import { demoRole } from "@/lib/role";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Shell role={await demoRole()}>{children}</Shell>
      </body>
    </html>
  );
}
