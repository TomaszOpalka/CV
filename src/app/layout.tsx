import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import '@/styles/main.scss';

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Interactive portfolio. Work in progress.',
};

export const viewport: Viewport = {
  themeColor: '#0b0b0b',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
