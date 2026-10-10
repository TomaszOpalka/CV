'use client';

import { useEffect } from 'react';

import { sectionStore } from '@/engine/ui/sectionStore';

/**
 * Watches every `[data-section]` and tells the store which one crosses the middle of the screen
 * (a thin band, so exactly one section is "active" at a time). Renders nothing.
 */
export function SectionTracker() {
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('[data-section]');
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) sectionStore.set(entry.target.id);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return null;
}
