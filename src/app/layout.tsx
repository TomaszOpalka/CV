import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

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
      <body>{children}</body>
    </html>
  );
}
