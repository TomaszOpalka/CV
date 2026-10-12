'use client';

import { useEffect, type RefObject } from 'react';

import type { IntroState } from '@/engine/intro/introMachine';

/**
 * While the intro reveals the page, the heading "decodes" from random digits into the name
 * (GSAP ScrambleText, loaded on demand). Any other state shows the plain text.
 */
export function useHeadingScramble(
  ref: RefObject<HTMLElement | null>,
  text: string,
  state: IntroState,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || state !== 'revealing') return;

    let cancelled = false;
    let kill: (() => void) | null = null;

    void Promise.all([import('gsap'), import('gsap/ScrambleTextPlugin')])
      .then(([{ gsap }, { ScrambleTextPlugin }]) => {
        if (cancelled) return;
        gsap.registerPlugin(ScrambleTextPlugin);
        const tween = gsap.to(el, {
          duration: 0.9,
          scrambleText: { text, chars: '0123456789', revealDelay: 0.1, speed: 0.6 },
          onComplete: () => {
            el.textContent = text;
          },
        });
        kill = () => tween.kill();
      })
      .catch(() => {
        el.textContent = text;
      });

    return () => {
      cancelled = true;
      kill?.();
      el.textContent = text;
    };
  }, [ref, text, state]);
}
