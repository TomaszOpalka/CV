'use client';

import { useEffect, useRef } from 'react';

import { iconForSection } from '@/engine/cursor/pixelIcons';
import type { DriftIcon as DriftIconEngine } from '@/engine/ui/driftIcon';
import { useActiveSection } from '@/hooks/useActiveSection';
import { useIntroState } from '@/hooks/useIntroState';

import styles from './index.module.scss';

/**
 * A dim icon of digits (the icon of the section you are in) that drifts from the top-left to the bottom-right
 * of the screen as you scroll. Wide screens only, off for reduced motion, and only after the intro.
 * It sits behind the content and never takes the pointer.
 */
export function DriftIcon() {
  const introState = useIntroState();
  const active = useActiveSection();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DriftIconEngine | null>(null);
  const enabled = introState === 'done';

  useEffect(() => {
    if (!enabled) return;
    const wide = window.matchMedia('(min-width: 900px)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    if (!wide || reduced || !canvas) return;

    let disposed = false;
    void import('@/engine/ui/driftIcon')
      .then(({ DriftIcon: Engine }) => {
        if (disposed) return;
        engineRef.current = new Engine(canvas);
        engineRef.current.setIcon(iconForSection(active));
        canvas.dataset.ready = 'true';
      })
      .catch(() => {
        // Decoration only: without it the page is complete.
      });

    return () => {
      disposed = true;
      engineRef.current?.destroy();
      engineRef.current = null;
      delete canvas.dataset.ready;
    };
    // `active` is applied by the effect below; the engine is created once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    engineRef.current?.setIcon(iconForSection(active));
  }, [active]);

  return <canvas ref={canvasRef} className={styles.root} aria-hidden="true" />;
}
