'use client';

import { useEffect } from 'react';

import { useIntroState } from '@/hooks/useIntroState';
import { loadGsap } from '@/engine/ui/gsapLoader';
import { prefersReducedMotion, registerScroller } from '@/engine/ui/scroller';

/**
 * Lenis smooth scrolling driven by GSAP's ticker (one loop), kept in sync with ScrollTrigger.
 * Off for `prefers-reduced-motion`. Nothing is loaded or started until the intro is over, so the intro
 * (the heaviest animation on the page) does not compete with GSAP and Lenis for the main thread.
 * Renders nothing.
 */
export function SmoothScroll() {
  const ready = useIntroState() === 'done';

  useEffect(() => {
    if (!ready || prefersReducedMotion()) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    Promise.all([import('lenis'), loadGsap()])
      .then(([{ default: Lenis }, { gsap, ScrollTrigger }]) => {
        if (disposed) return;
        const lenis = new Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true });
        const unsubscribeScroll = lenis.on('scroll', ScrollTrigger.update);
        const tick = (time: number): void => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        registerScroller({
          scrollTo: (target) => lenis.scrollTo(target, { duration: 1.1 }),
          stop: () => lenis.stop(),
          start: () => lenis.start(),
        });

        cleanup = () => {
          unsubscribeScroll();
          registerScroller(null);
          gsap.ticker.remove(tick);
          lenis.destroy();
        };
      })
      .catch(() => {
        // Native scrolling keeps working if the libraries fail to load.
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [ready]);

  return null;
}
