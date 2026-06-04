import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/shared/components/theme-provider";
import { AuthProvider } from "@/shared/lib/auth";
import { getDeviceType } from "@/shared/lib/device";
import { orbitron, spaceGrotesk } from "@/shared/lib/fonts";
import dynamic from "next/dynamic";

const DesktopLayout = dynamic(() => import("@/desktop/layouts/DesktopLayout").then(mod => mod.DesktopLayout));
const MobileLayout = dynamic(() => import("@/mobile/layouts/MobileLayout").then(mod => mod.MobileLayout));

export const metadata: Metadata = {
  title: "WhatsApp Automations | SaaS Dashboard",
  description: "Modern WhatsApp Order Confirmation Automation for Shopify",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isMobile } = await getDeviceType();

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${orbitron.variable} ${spaceGrotesk.variable} antialiased min-h-screen bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {isMobile ? (
              <MobileLayout>{children}</MobileLayout>
            ) : (
              <DesktopLayout>{children}</DesktopLayout>
            )}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
