'use client';

import { useEffect, useRef } from 'react';

import type { CursorController } from '@/engine/cursor/CursorController';
import { useIntroState } from '@/hooks/useIntroState';

import styles from './index.module.scss';

/**
 * Pixel cursor (see engine/cursor). Desktop only, off for reduced motion. The system cursor is hidden only
 * while the controller runs (`html[data-cursor-ready]`). Renders one click-through canvas.
 */
export function Cursor() {
  const introState = useIntroState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enabled = introState === 'done';

  useEffect(() => {
    if (!enabled) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    if (!fine || reduced || !canvas) return;

    let disposed = false;
    let controller: CursorController | null = null;
    import('@/engine/cursor/CursorController')
      .then(({ CursorController: Controller }) => {
        if (disposed) return;
        controller = new Controller(canvas);
        controller.init();
      })
      .catch(() => {});

    return () => {
      disposed = true;
      controller?.destroy();
    };
  }, [enabled]);

  return <canvas ref={canvasRef} className={styles.root} aria-hidden="true" />;
}
