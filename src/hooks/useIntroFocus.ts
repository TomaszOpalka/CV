'use client';

import { useEffect, useRef, type RefObject } from 'react';

import type { IntroState } from '@/engine/intro/introMachine';
import { introStore } from '@/engine/intro/introStore';

/**
 * The prompt and skip buttons unmount on the very state change their own activation causes, which
 * would drop keyboard focus to <body>. Remember (before React commits) whether focus was inside
 * the section, and if it was lost, hand it on: to "Pomiń intro" while the intro plays, to the
 * heading once it is over.
 */
export function useIntroFocus(
  rootRef: RefObject<HTMLElement | null>,
  titleRef: RefObject<HTMLElement | null>,
  skipRef: RefObject<HTMLElement | null>,
  state: IntroState,
): void {
  const focusWasInside = useRef(false);

  useEffect(
    () =>
      introStore.subscribe(() => {
        const active = document.activeElement;
        const root = rootRef.current;
        focusWasInside.current = !!active && !!root && root !== active && root.contains(active);
      }),
    [rootRef],
  );

  useEffect(() => {
    if (!focusWasInside.current) return;
    focusWasInside.current = false;
    const active = document.activeElement;
    if (active && active !== document.body) return; // focus is still somewhere sensible
    const target = state === 'done' ? titleRef.current : skipRef.current;
    target?.focus({ preventScroll: true });
  }, [state, titleRef, skipRef]);
}
