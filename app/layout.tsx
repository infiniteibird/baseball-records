import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "베이스볼 레코드",
    template: "%s | 베이스볼 레코드",
  },
  description: "야구 경기와 기록을 한눈에 보는 기록 조회 프로토타입",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <Providers>
          <div className="min-h-full">
            <SiteHeader />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
