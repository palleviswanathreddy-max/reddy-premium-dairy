import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export const metadata: Metadata = {
  title: "REDDY PREMIUM DAIRY | Pure • Fresh • Healthy | Chiyyedu, Anantapur",
  description: "Buy premium, farm-fresh dairy online. Sourced from grass-fed cows at our high-tech Chiyyedu farm, Anantapur. Enjoy A2 cow milk, rich buffalo milk, thick curd, fresh malai paneer, vedic ghee, and mozzarella cheese with same-day delivery.",
  keywords: "Reddy Premium Dairy, Palle Viswanath Reddy, dairy shop online, buy milk Anantapur, A2 Cow Milk India, Malai Paneer, pure Cow Ghee online, Chiyyedu dairy, fresh butter, curd delivery, organic milk",
  authors: [{ name: "Palle Viswanath Reddy" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-512.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Reddy Dairy"
  }
};

export const viewport: Viewport = {
  themeColor: "#0B2545",
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
