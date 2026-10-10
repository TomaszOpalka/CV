'use client';

import { useEffect, useRef } from 'react';

import { sectionById } from '@/content/sections';
import { useActiveSection } from '@/hooks/useActiveSection';
import { useIntroState } from '@/hooks/useIntroState';

import styles from './index.module.scss';

const RIPPLE_MS = 600;

/**
 * What the custom cursor is for mouse users, this is for touch: a ripple under every tap and the emoji of
 * the new section popping up when you scroll into it. Touch devices only (`hover: none`), off for reduced
 * motion. Ripples are short-lived DOM nodes removed when their CSS animation ends.
 */
export function TouchEffects() {
  const introState = useIntroState();
  const active = useActiveSection();
  const layerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const lastActive = useRef(active);
  const enabled = introState === 'done';

  useEffect(() => {
    if (!enabled) return;
    const touchOnly = window.matchMedia('(hover: none)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layer = layerRef.current;
    if (!touchOnly || reduced || !layer) return;

    const onDown = (event: PointerEvent): void => {
      if (event.pointerType === 'mouse' || !event.isPrimary) return;
      const ripple = document.createElement('span');
      ripple.className = styles.ripple!;
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      layer.appendChild(ripple);
      const remove = (): void => ripple.remove();
      ripple.addEventListener('animationend', remove, { once: true });
      // Safety net in case the animation never runs (tab hidden).
      window.setTimeout(remove, RIPPLE_MS * 2);
    };
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onDown);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || lastActive.current === active) return;
    lastActive.current = active;
    const pop = popRef.current;
    if (!pop || !window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    pop.textContent = sectionById(active).emoji;
    pop.classList.remove(styles.isPopping!);
    void pop.offsetWidth;
    pop.classList.add(styles.isPopping!);
  }, [active, enabled]);

  return (
    <div ref={layerRef} className={styles.layer} aria-hidden="true">
      <span ref={popRef} className={styles.pop} />
    </div>
  );
}
