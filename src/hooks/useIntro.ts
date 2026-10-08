'use client';

import { useEffect, useRef, useSyncExternalStore, type RefObject } from 'react';

import type { IntroController } from '@/engine/intro/IntroController';
import type { IntroState } from '@/engine/intro/introMachine';
import { introStore } from '@/engine/intro/introStore';

/** If the engine has not started after this long (blocked chunk, very slow network), show the page as is. */
const ENGINE_TIMEOUT_MS = 6000;
/** Keep the canvas this long after `done` so the DOM photo can cross-fade in over its last frame. */
const CANVAS_RELEASE_DELAY_MS = 450;

interface UseIntroOptions {
  rootRef: RefObject<HTMLElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  frameRef: RefObject<HTMLElement | null>;
  counterRef: RefObject<HTMLElement | null>;
  imageSrc: string;
  focalY: number;
}

export interface UseIntroResult {
  state: IntroState;
  /** Start the explosion from the keyboard (Enter / Space on the prompt button). */
  press: () => void;
  skip: () => void;
}

/**
 * Wires the imperative IntroController to React. The engine is loaded lazily, so the
 * first paint never waits for it; React only re-renders on the few coarse state changes.
 *
 * The section carries `data-armed` once this effect runs. The stylesheet hides the content only
 * for armed sections (plus a CSS failsafe that reveals it if the script never starts).
 */
export function useIntro({
  rootRef,
  canvasRef,
  frameRef,
  counterRef,
  imageSrc,
  focalY,
}: UseIntroOptions): UseIntroResult {
  const state = useSyncExternalStore(introStore.subscribe, introStore.get, introStore.getServer);
  const controllerRef = useRef<IntroController | null>(null);

  useEffect(() => {
    // Already played during this page session (client-side navigation back to the home page).
    if (introStore.get() === 'done') return;
    // A remount in the middle of an intro (Fast Refresh, navigation) starts the intro over.
    introStore.set('boot');

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      introStore.set('done');
      return;
    }

    const root = rootRef.current;
    root?.setAttribute('data-armed', '');

    let cancelled = false;
    let controller: IntroController | null = null;
    const timeout = window.setTimeout(() => {
      if (!controller) introStore.set('done');
    }, ENGINE_TIMEOUT_MS);

    import('@/engine/intro/IntroController')
      .then(({ IntroController: Controller }) => {
        const canvas = canvasRef.current;
        const frame = frameRef.current;
        // The user may have pressed "skip" (or the component unmounted) while the chunk was loading.
        if (cancelled || introStore.get() === 'done' || !root || !canvas || !frame) return;

        controller = new Controller({
          root,
          canvas,
          photoFrame: frame,
          imageSrc,
          focalY,
          onState: (next) => {
            introStore.set(next);
            if (next === 'done') {
              // The scene is no longer needed: let go of it so its buffers can be collected.
              controller?.destroy();
              controller = null;
              controllerRef.current = null;
            }
          },
          onProgress: (percent) => {
            if (counterRef.current)
              counterRef.current.textContent = String(percent).padStart(3, '0');
          },
        });
        controllerRef.current = controller;
        if (!controller.init()) introStore.set('done'); // no 2D canvas: show the final view
      })
      .catch(() => introStore.set('done'));

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller?.destroy();
      controllerRef.current = null;
      root?.removeAttribute('data-armed');
    };
  }, [rootRef, canvasRef, frameRef, counterRef, imageSrc, focalY]);

  // After the intro, free the canvas backing store (up to ~30 MB on a large high-DPI screen).
  useEffect(() => {
    if (state !== 'done') return;
    const timer = window.setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    }, CANVAS_RELEASE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state, canvasRef]);

  return {
    state,
    press: () => controllerRef.current?.press(),
    skip: () => {
      introStore.set('done');
      controllerRef.current?.skip();
    },
  };
}
