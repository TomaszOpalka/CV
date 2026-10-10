'use client';

import { useEffect, useRef } from 'react';

import { iconForSection } from '@/engine/cursor/pixelIcons';
import type { IconPop } from '@/engine/ui/iconPop';
import { useActiveSection } from '@/hooks/useActiveSection';
import { useIntroState } from '@/hooks/useIntroState';

import styles from './index.module.scss';

const RIPPLE_MS = 600;

/**
 * What the custom cursor is for mouse users, this is for touch: a ripple under every tap and the icon of the
 * section you scroll into, drawn in digits, popping up just below the header. Touch devices only
 * (`hover: none`), off for reduced motion. Ripples are short-lived DOM nodes removed when their CSS animation ends.
 */
export function TouchEffects() {
  const introState = useIntroState();
  const active = useActiveSection();
  const layerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLCanvasElement>(null);
  const iconPopRef = useRef<IconPop | null>(null);
  const lastActive = useRef(active);
  const enabled = introState === 'done';

  useEffect(() => {
    if (!enabled) return;
    const touchOnly = window.matchMedia('(hover: none)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layer = layerRef.current;
    const pop = popRef.current;
    if (!touchOnly || reduced || !layer || !pop) return;

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

    let disposed = false;
    void import('@/engine/ui/iconPop')
      .then(({ IconPop: Pop }) => {
        if (!disposed) iconPopRef.current = new Pop(pop);
      })
      .catch(() => {
        // No pop-up icon without the module; ripples still work.
      });

    return () => {
      disposed = true;
      window.removeEventListener('pointerdown', onDown);
      iconPopRef.current?.destroy();
      iconPopRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || lastActive.current === active) return;
    lastActive.current = active;
    const pop = popRef.current;
    const iconPop = iconPopRef.current;
    if (!pop || !iconPop) return;
    iconPop.show(iconForSection(active));
    pop.classList.remove(styles.isPopping!);
    void pop.offsetWidth;
    pop.classList.add(styles.isPopping!);
  }, [active, enabled]);

  return (
    <div ref={layerRef} className={styles.layer} aria-hidden="true">
      <canvas ref={popRef} className={styles.pop} />
    </div>
  );
}
