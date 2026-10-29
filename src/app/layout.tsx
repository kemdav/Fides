import type { Metadata, Viewport } from "next";
import { Mulish, Ovo } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { ToastListener } from "@/components/ui/toast";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const mulish = Mulish({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mulish",
  display: "swap",
});

const ovo = Ovo({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-ovo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/apple-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${mulish.variable} ${ovo.variable} scroll-smooth`}>
      <body className="min-h-dvh bg-white font-sans text-neutral-900 antialiased">
        {children}
        <Suspense fallback={null}>
          <ToastListener />
        </Suspense>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
