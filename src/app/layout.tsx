import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { Cursor } from '@/components/layout/Cursor';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ScrollReveal } from '@/components/layout/ScrollReveal';
import { SectionTracker } from '@/components/layout/SectionTracker';
import { SmoothScroll } from '@/components/layout/SmoothScroll';
import { TouchEffects } from '@/components/layout/TouchEffects';
import { profile } from '@/content/profile';

import '@/styles/main.scss';

export const metadata: Metadata = {
  title: `${profile.name} | ${profile.role}`,
  description: profile.about[0],
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
