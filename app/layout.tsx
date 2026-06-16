import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import dynamic from "next/dynamic";

const OfflineBanner = dynamic(() => import("@/components/ui/OfflineBanner"), { ssr: false });

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YKA Editor — Distraction-free writing",
  description: "A clean, minimal writing tool for WordPress blogs.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "YKA Editor",
    startupImage: "/apple-touch-icon.png",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full bg-white antialiased">
        <Providers>{children}</Providers>
        <OfflineBanner />
      </body>
    </html>
  );
}
