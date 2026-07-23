import type { Metadata } from "next";

import { AppShell } from "../components/layout/app-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: "주택구매 금융 컨설팅",
  description: "금융데이터를 바탕으로 주택구매 전략을 비교합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
