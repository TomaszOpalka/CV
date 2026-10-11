'use client';

import { useSyncExternalStore } from 'react';

/**
 * Whether a media query matches, kept up to date. The server and the first client render say `false`
 * (mobile first), then the real value arrives without a hydration mismatch.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
