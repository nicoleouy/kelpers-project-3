import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Fraunces } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"
import { StoreProvider } from "@/lib/store"
import { AppShell } from "@/components/app-shell"
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register"
import { InstallPrompt } from "@/components/pwa/install-prompt"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  applicationName: "kelpers",
  title: "kelpers — Community Environmental Reporting",
  description:
    "Report environmental issues, discover local incidents, and take action with your community. From a single litter photo to coordinated crisis response.",
  generator: "v0.app",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "kelpers",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
}

export const viewport: Viewport = {
  themeColor: "#4a7c59",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">
        <StoreProvider>
          <Suspense fallback={null}>
            <AppShell>{children}</AppShell>
          </Suspense>
          <InstallPrompt />
        </StoreProvider>
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  )
}
