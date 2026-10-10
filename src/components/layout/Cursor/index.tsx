'use client';

import { useEffect, useRef } from 'react';

import { ticker } from '@/engine/core/Ticker';
import { resolveCursorTarget, sameTarget, type CursorTarget } from '@/engine/ui/cursorTarget';
import { useIntroState } from '@/hooks/useIntroState';

import styles from './index.module.scss';

/** Frame-rate independent smoothing: how quickly the emoji catches up with the pointer (1/s). */
const FOLLOW_RATE = 22;

/**
 * Custom cursor: an emoji (per section) that follows the pointer, grows over links and shows a label over
 * cards. Desktop only (fine pointer + hover), off for reduced motion, and the system cursor is hidden only
 * while this one is running (`html[data-cursor-ready]`), so a failed script never leaves you without a cursor.
 * Positions are written straight to the DOM; React renders nothing per frame.
 */
export function Cursor() {
  const introState = useIntroState();
  const rootRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const enabled = introState === 'done';

  useEffect(() => {
    if (!enabled) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = rootRef.current;
    const emoji = emojiRef.current;
    const label = labelRef.current;
    if (!fine || reduced || !root || !emoji || !label) return;

    let targetX = -100;
    let targetY = -100;
    let x = -100;
    let y = -100;
    let seen = false;
    let current: CursorTarget = { kind: 'default', emoji: '', label: '' };

    const apply = (next: CursorTarget): void => {
      if (sameTarget(current, next)) return;
      if (next.emoji !== current.emoji) {
        emoji.textContent = next.emoji;
        // Restart the swap animation.
        emoji.classList.remove(styles.isSwapping!);
        void emoji.offsetWidth;
        emoji.classList.add(styles.isSwapping!);
      }
      label.textContent = next.label;
      root.dataset.kind = next.kind;
      root.dataset.labelled = String(next.label !== '');
      current = next;
    };

    const onMove = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') return;
      targetX = event.clientX;
      targetY = event.clientY;
      if (!seen) {
        seen = true;
        x = targetX;
        y = targetY;
        root.dataset.visible = 'true';
      }
      apply(resolveCursorTarget(event.target instanceof Element ? event.target : null));
    };
    const onLeave = (): void => {
      root.dataset.visible = 'false';
      seen = false;
    };
    const onDown = (): void => {
      root.dataset.pressed = 'true';
    };
    const onUp = (): void => {
      root.dataset.pressed = 'false';
    };

    const unsubscribe = ticker.add((deltaMs) => {
      const k = 1 - Math.exp((-FOLLOW_RATE * deltaMs) / 1000);
      x += (targetX - x) * k;
      y += (targetY - y) * k;
      root.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });

    document.documentElement.setAttribute('data-cursor-ready', '');
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      unsubscribe();
      document.documentElement.removeAttribute('data-cursor-ready');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled]);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-kind="default"
      data-visible="false"
      aria-hidden="true"
    >
      <span className={styles.body}>
        <span ref={emojiRef} className={styles.emoji} />
        <span ref={labelRef} className={styles.label} />
      </span>
    </div>
  );
}
