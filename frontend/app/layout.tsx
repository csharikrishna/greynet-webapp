import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GrayNet — A 24.7K-parameter brain tumor classifier",
  description:
    "GrayNet is a frequency-aware CNN for brain tumor MRI classification, compressed from 813K to 24.7K parameters via a single width multiplier, with under 1% accuracy loss. Explore the architecture and run the models live.",
  manifest: "/manifest.json",
  applicationName: "GrayNet Lab",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GrayNet Lab",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0C0E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body bg-ink text-paper antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
