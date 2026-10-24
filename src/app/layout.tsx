import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { Cursor } from '@/components/layout/Cursor';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ScrollReveal } from '@/components/layout/ScrollReveal';
import { SectionTracker } from '@/components/layout/SectionTracker';
import { SmoothScroll } from '@/components/layout/SmoothScroll';
import { TouchEffects } from '@/components/layout/TouchEffects';
import { JsonLd } from '@/components/seo/JsonLd';
import { seo, siteUrl } from '@/content/seo';

import '@/styles/main.scss';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: seo.title,
  description: seo.description,
  authors: [{ name: 'Tomasz Opałka' }],
  creator: 'Tomasz Opałka',
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'profile',
    url: '/',
    title: seo.title,
    description: seo.description,
    locale: 'en_US',
    firstName: 'Tomasz',
    lastName: 'Opałka',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0b0b',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <JsonLd />
        <Header />
        {children}
        <Footer />
        <SmoothScroll />
        <SectionTracker />
        <ScrollReveal />
        <Cursor />
        <TouchEffects />
      </body>
    </html>
  );
}
