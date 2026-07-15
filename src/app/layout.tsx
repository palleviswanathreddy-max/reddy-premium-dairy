import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export const metadata: Metadata = {
  metadataBase: new URL("https://reddy-premium-dairy.vercel.app"),
  title: "Reddy Premium Dairy",
  description: "Pure • Fresh • Healthy premium dairy products delivered daily.",
  keywords: "Reddy Premium Dairy, Palle Viswanath Reddy, dairy shop online, buy milk Anantapur, A2 Cow Milk India, Malai Paneer, pure Cow Ghee online, Chiyyedu dairy, fresh butter, curd delivery, organic milk",
  authors: [{ name: "Palle Viswanath Reddy" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/icon-192.png",
    apple: "/apple-touch-icon.png"
  },
  alternates: {
    canonical: "https://reddy-premium-dairy.vercel.app"
  },
  robots: {
    index: true,
    follow: true
  },
  openGraph: {
    title: "Reddy Premium Dairy",
    description: "Pure • Fresh • Healthy premium dairy products delivered daily.",
    url: "https://reddy-premium-dairy.vercel.app",
    siteName: "Reddy Premium Dairy",
    images: [
      {
        url: "/images/screenshot-desktop.png",
        width: 1920,
        height: 1323,
        alt: "Reddy Premium Dairy"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Reddy Premium Dairy",
    description: "Pure • Fresh • Healthy premium dairy products delivered daily.",
    images: ["/images/screenshot-desktop.png"]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Reddy Dairy"
  }
};

export const viewport: Viewport = {
  themeColor: "#2E7D32",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col antialiased">
        <AppProvider>
          {children}
          <PWAInstallPrompt />
        </AppProvider>
      </body>
    </html>
  );
}
