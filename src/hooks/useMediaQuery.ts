'use client';

import { useSyncExternalStore } from 'react';

/** Whether a media query matches. The server and the first client render say `false` to avoid a hydration mismatch. */
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
