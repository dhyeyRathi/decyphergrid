import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DECYPHERGRID - Tactical Tabletop Word Deduction Game",
    template: "%s | DECYPHERGRID",
  },
  description:
    "A tactical tabletop word deduction game for teams who think alike. Give clues, find your team's words, and avoid the hidden Assassin.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "DECYPHERGRID - Tactical Tabletop Word Deduction Game",
    description: "A tactical tabletop word deduction game for teams who think alike.",
    type: "website",
    siteName: "DECYPHERGRID",
  },
  twitter: {
    card: "summary_large_image",
    title: "DECYPHERGRID — Tactical Tabletop Word Deduction Game",
    description: "A tactical tabletop word deduction game for teams who think alike.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#111318] text-[#F1F0EC]">
        {children}
      </body>
    </html>
  );
}
