import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/Header";
import { PwaRegister } from "@/components/PwaRegister";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600"],
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "HifzDeen",
  description:
    "An immersive memorization and recitation coach built with Quran.Foundation APIs.",
  metadataBase: new URL("https://quranic-practice.local"),
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "HifzDeen",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "HifzDeen",
    description:
      "Adaptive memorization journeys powered by Quran.Foundation data.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HifzDeen",
    description:
      "Interactive memorization and reflection journeys for the Quran.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f0e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <PwaRegister />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('hifzdeen-theme');var a=localStorage.getItem('hifzdeen-accent');var r=t==='light'?'light':'dark';document.documentElement.setAttribute('data-theme',r);document.documentElement.setAttribute('data-accent',a||'green');})();`,
          }}
        />
        <ThemeProvider>
          <div className="relative min-h-screen">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[-1] h-64 bg-gradient-to-b from-brand/20 to-transparent" />
            <Header />
            <div className="pt-14 sm:pt-16">{children}</div>
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
