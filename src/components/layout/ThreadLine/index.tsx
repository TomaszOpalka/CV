'use client';

import { useEffect, useRef } from 'react';

import type { ThreadLine as ThreadLineEngine } from '@/engine/thread/ThreadLine';
import { useIntroState } from '@/hooks/useIntroState';

import styles from './index.module.scss';

/**
 * PROOF OF CONCEPT: a thread of digits down the left margin that grows with the scroll and ends with an arrow at
 * the e-mail address (see engine/thread). Wide screens only, off for reduced motion, after the intro.
 *
 * To take it out: delete this folder, `src/engine/thread/` and the `<ThreadLine />` line in `app/layout.tsx`, and the
 * rule marked "thread" in `sections/Portfolio/index.module.scss`.
 */
export function ThreadLine() {
  const introState = useIntroState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enabled = introState === 'done';

  useEffect(() => {
    if (!enabled) return;
    const wide = window.matchMedia('(min-width: 1100px)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    if (!wide || reduced || !canvas) return;

    let disposed = false;
    let engine: ThreadLineEngine | null = null;
    void import('@/engine/thread/ThreadLine')
      .then(({ ThreadLine: Thread }) => {
        if (disposed) return;
        engine = new Thread(canvas);
        canvas.dataset.ready = 'true';
      })
      .catch(() => {
        // Decoration only: the page is complete without it.
      });

    return () => {
      disposed = true;
      engine?.destroy();
      delete canvas.dataset.ready;
    };
  }, [enabled]);

  return <canvas ref={canvasRef} className={styles.root} data-thread="" aria-hidden="true" />;
}
