import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Orbitron, Sora, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { CreditsProvider } from "@/components/billing/credits-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { routing } from "@/i18n/routing";
import { Analytics } from "@vercel/analytics/next"

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AI In Action - Learn AI by Building",
    template: "%s | AI In Action",
  },
  description:
    "Master AI through hands-on challenge projects. Build real web apps, games, mobile apps, and AI tools.",
  metadataBase: new URL("https://aiinaction.top"),
  openGraph: {
    title: "AI In Action - Learn AI by Building",
    description:
      "Master AI through hands-on challenge projects. Build real web apps, games, mobile apps, and AI tools.",
    url: "https://aiinaction.top",
    siteName: "AI In Action",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI In Action - Learn AI by Building",
    description:
      "Master AI through hands-on challenge projects. Build real web apps, games, mobile apps, and AI tools.",
  },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "zh")) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <Script
          id="baidu-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?fe58d6be2c356ce20f83642cc93a50d1";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();`,
          }}
        />
      </head>
      <body
        className={`${orbitron.variable} ${sora.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <CreditsProvider>
              <ThemeProvider>
                <TooltipProvider>
                  <div className="flex min-h-svh flex-col">
                    <Header />
                    <main className="flex-1">{children}</main>
                    <Footer />
                  </div>
                </TooltipProvider>
              </ThemeProvider>
            </CreditsProvider>
          </SessionProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
