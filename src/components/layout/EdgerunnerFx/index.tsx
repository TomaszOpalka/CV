'use client';

import { useEffect, useRef } from 'react';

import type { LaserCursor } from '@/engine/edgerunner/LaserCursor';
import type { LightningTransition } from '@/engine/edgerunner/LightningTransition';
import { registerTransition, setTheme } from '@/engine/edgerunner/themeStore';
import { jumpToTop, prefersReducedMotion } from '@/engine/ui/scroller';
import { useTheme } from '@/hooks/useTheme';

import styles from './index.module.scss';

/**
 * The effects of the "Edgerunner" look: the lightning that plays while the look is switched, and the laser-dot
 * cursor while it is on (see engine/edgerunner). Renders two click-through canvases.
 *
 * To take the whole look out: delete this folder, `EdgerunnerButton`, `engine/edgerunner/`, `content/edgerunner.ts`,
 * `styles/base/_edgerunner.scss`, `public/assets/edgerunner/` and the `edge` parts of Header, Intro and Cursor.
 */
export function EdgerunnerFx() {
  const theme = useTheme();
  const lightningRef = useRef<HTMLCanvasElement>(null);
  const laserRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = lightningRef.current;
    if (!canvas) return;
    let engine: LightningTransition | null = null;
    let disposed = false;

    registerTransition(async (next, origin) => {
      if (prefersReducedMotion()) {
        setTheme(next);
        jumpToTop();
        return;
      }
      try {
        const { LightningTransition: Transition } =
          await import('@/engine/edgerunner/LightningTransition');
        if (disposed) return;
        engine ??= new Transition(canvas);
        await engine.play(origin, () => {
          setTheme(next);
          jumpToTop();
        });
      } catch {
        setTheme(next);
        jumpToTop();
      }
    });

    return () => {
      disposed = true;
      registerTransition(null);
      engine?.destroy();
    };
  }, []);

  useEffect(() => {
    if (theme !== 'edgerunner') return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const canvas = laserRef.current;
    if (!fine || prefersReducedMotion() || !canvas) return;

    let disposed = false;
    let cursor: LaserCursor | null = null;
    import('@/engine/edgerunner/LaserCursor')
      .then(({ LaserCursor: Laser }) => {
        if (disposed) return;
        cursor = new Laser(canvas);
        cursor.init();
      })
      .catch(() => {});

    return () => {
      disposed = true;
      cursor?.destroy();
    };
  }, [theme]);

  return (
    <>
      <canvas ref={laserRef} className={styles.laser} aria-hidden="true" />
      <canvas ref={lightningRef} className={styles.lightning} aria-hidden="true" />
    </>
  );
}
