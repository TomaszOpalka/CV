'use client';

import { useEffect } from 'react';

import { prefersReducedMotion } from '@/engine/ui/scroller';

/**
 * Fades `[data-reveal]` elements in as they enter the screen (see base/_root.scss). The hidden state applies only
 * after `html[data-reveal-ready]` is set here, so without JavaScript or with reduced motion everything is visible.
 * Renders nothing.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
    const root = document.documentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-revealed', '');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
    root.setAttribute('data-reveal-ready', '');
    return () => {
      observer.disconnect();
      root.removeAttribute('data-reveal-ready');
    };
  }, []);

  return null;
}
