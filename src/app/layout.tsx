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
  category: "business",
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "en_PH",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#c35000",
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
