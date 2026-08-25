import type { Metadata } from "next";
import { Geist_Mono, Outfit } from "next/font/google";

import { PlatformProvider } from "@/components/platform-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FrameCheck — Console frame rate verification",
    template: "%s · FrameCheck",
  },
  description:
    "Instant frame rate performance verification for PS5, Xbox Series X|S and Nintendo Switch libraries.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <TooltipProvider delayDuration={200}>
            <PlatformProvider>
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
              <Toaster position="bottom-right" />
            </PlatformProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
