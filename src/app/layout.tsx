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
  title: "Zombie Love Story AI – Recreate the Viral Match-Cut AI Video Trend",
  description:
    "Turn two photos into a 25-second cinematic 720P zombie love story with emotional match-cut transition. Early access & prompt library.",
  openGraph: {
    title: "Zombie Love Story AI – Viral Video Trend Generator",
    description:
      "Transform two photos into an emotional zombie match-cut film: from post-apocalyptic fear to a golden meadow embrace.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-[#07090e] text-[#e2e8f0] font-sans selection:bg-rose-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
