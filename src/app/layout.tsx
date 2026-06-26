import type { Metadata } from 'next';
import { Geist, Geist_Mono, Playfair_Display, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ThemeProvider from '@/components/common/ThemeProvider';
import PageTransition from '@/components/common/PageTransition';
import SmoothScrollProvider from '@/components/common/SmoothScrollProvider';
import ScrollToTop from '@/components/ui/ScrollToTop';
import { SITE } from '@/constants/site';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['600', '700'],
});


export const metadata: Metadata = {
  title: {
    default: SITE.NAME,
    template: `%s | ${SITE.NAME}`,
  },
  description: SITE.DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${cormorantGaramond.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-(--background) text-(--foreground)">
        <ThemeProvider>
          <SmoothScrollProvider>
            <Header />
            <PageTransition>{children}</PageTransition>
            <Footer />
            <ScrollToTop />
          </SmoothScrollProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
