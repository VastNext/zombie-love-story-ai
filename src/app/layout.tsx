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
  title: "Zombie Love Story AI – Match Cut Video Generator & Viral Prompts",
  description:
    "Recreate the viral AI zombie love story trend from 2 photos. Master the emotional match-cut transition, copy free Sora / Luma / Kling prompts, or get early access video passes for $6.99.",
  keywords: [
    "zombie love story ai",
    "ai zombie trend",
    "zombie match cut ai video",
    "ai zombie video generator",
    "zombie love story ai prompt",
    "zombie dog trend",
    "zombie pet ai video",
    "zombie apocalypse love story ai",
    "zombie love story reels editing"
  ],
  openGraph: {
    title: "Zombie Love Story AI – Match Cut Video Generator & Viral Prompts",
    description:
      "Transform two photos into an emotional zombie match-cut film: from post-apocalyptic terror to a golden meadow embrace.",
    type: "website",
    url: "https://zombie-love-story-ai.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zombie Love Story AI – Match Cut Video Generator",
    description: "Recreate the viral AI zombie love story trend from 2 photos. Free prompts & early access generator.",
  }
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
      <body className="min-h-full flex flex-col bg-[#010103] text-[#e8eaf0] font-sans selection:bg-rose-600/40 selection:text-white">
        {children}
      </body>
    </html>
  );
}
