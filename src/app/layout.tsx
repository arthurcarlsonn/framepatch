import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist_Mono, Outfit } from "next/font/google";

import { PlatformProvider } from "@/components/platform-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { JsonLd } from "@/components/json-ld";
import { organizationLd, SITE_NAME, SITE_TAGLINE, SITE_URL, websiteLd } from "@/lib/seo";

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

const DESCRIPTION =
  "Instant frame rate performance verification for PS5, Xbox Series X|S and Nintendo Switch libraries.";
const TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

export const metadata: Metadata = {
  // Without this, every relative canonical and Open Graph URL stays relative and social
  // cards resolve against nothing.
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  // The catalogue and every word of copy on it are English, and the audience is the
  // international console market rather than any single country. Declaring `en` alongside
  // `x-default` says so explicitly instead of leaving a crawler to infer a locale from
  // whichever market happens to link first.
  // No `canonical` here on purpose. Metadata `alternates` are inherited by every child
  // segment, so a canonical set on the root layout makes each page that does not override it
  // declare itself a duplicate of the homepage — which de-indexes it. The homepage sets its
  // own canonical in app/page.tsx; every other route sets its own too.
  alternates: {
    languages: { en: "/", "x-default": "/" },
    types: { "application/rss+xml": [{ url: "/feed.xml", title: "FramePatch Live" }] },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Rich results need the full snippet and a large image; the defaults truncate both.
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
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
              <JsonLd data={[organizationLd(), websiteLd()]} />
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
              <Toaster position="bottom-right" />
            <Analytics />
            <SpeedInsights />
            </PlatformProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
