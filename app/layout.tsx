import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PwaServiceWorkerRegistrar } from "@/components/PwaManager";
import { getSession } from "@/lib/session";

const brandFont = localFont({
  src: "../public/brand/fonts/BrandFont.woff2",
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Project QR",
  title: "Project QR | Mimar Models",
  description:
    "Mimar Models project identification, QR scanning, and field maintenance",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Project QR",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#5d7f9c",
};

const EARLY_PWA_PROMPT_SCRIPT = `
window.__pwaInstallPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  window.__pwaInstallPrompt = e;
  window.dispatchEvent(new Event('pwa-install-ready'));
});
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" className={`h-full bg-background ${brandFont.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{ __html: EARLY_PWA_PROMPT_SCRIPT }}
        />
      </head>
      <body className="min-h-dvh flex flex-col font-brand antialiased text-text bg-background overscroll-y-none">
        <PwaServiceWorkerRegistrar />
        <OfflineBanner />
        <Header />
        <main className="flex-1 max-w-7xl print:max-w-none w-full mx-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10 print:pb-0 px-3.5 sm:px-6 lg:px-8 print:px-0 pt-3.5 sm:pt-6 print:pt-0">
          {children}
        </main>
        <BottomNav isAdmin={session?.isAdmin} />
      </body>
    </html>
  );
}
