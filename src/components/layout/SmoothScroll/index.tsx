'use client';

import { useEffect } from 'react';

import { introStore } from '@/engine/intro/introStore';
import { loadGsap } from '@/engine/ui/gsapLoader';
import { prefersReducedMotion, registerScroller } from '@/engine/ui/scroller';

/**
 * Lenis smooth scrolling driven by GSAP's ticker (one loop), kept in sync with ScrollTrigger.
 * Off for `prefers-reduced-motion`. Scrolling is held back until the intro is over.
 * Renders nothing.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
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

        const syncWithIntro = (): void => {
          if (introStore.get() === 'done') lenis.start();
          else lenis.stop();
        };
        syncWithIntro();
        const unsubscribeIntro = introStore.subscribe(syncWithIntro);

        registerScroller({
          scrollTo: (target) => lenis.scrollTo(target, { duration: 1.1 }),
          stop: () => lenis.stop(),
          start: () => lenis.start(),
        });

        cleanup = () => {
          unsubscribeIntro();
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
  }, []);

  return null;
}
