import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { Cursor } from '@/components/layout/Cursor';
import { DriftIcon } from '@/components/layout/DriftIcon';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ScrollReveal } from '@/components/layout/ScrollReveal';
import { SectionTracker } from '@/components/layout/SectionTracker';
import { SmoothScroll } from '@/components/layout/SmoothScroll';
import { ThreadLine } from '@/components/layout/ThreadLine';
import { TouchEffects } from '@/components/layout/TouchEffects';
import { JsonLd } from '@/components/seo/JsonLd';
import { seo } from '@/content/seo';

import '@/styles/main.scss';

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  authors: [{ name: 'Tomasz Opałka' }],
  creator: 'Tomasz Opałka',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'profile',
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
        <DriftIcon />
        <ThreadLine />
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
