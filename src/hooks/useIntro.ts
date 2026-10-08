'use client';

import { useEffect, useRef, useSyncExternalStore, type RefObject } from 'react';

import type { IntroController } from '@/engine/intro/IntroController';
import type { IntroState } from '@/engine/intro/introMachine';
import { introStore } from '@/engine/intro/introStore';

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

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      introStore.set('done');
      return;
    }

    let cancelled = false;
    let controller: IntroController | null = null;

    import('@/engine/intro/IntroController')
      .then(({ IntroController: Controller }) => {
        const root = rootRef.current;
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
          onState: (next) => introStore.set(next),
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
      controller?.destroy();
      controllerRef.current = null;
    };
  }, [rootRef, canvasRef, frameRef, counterRef, imageSrc, focalY]);

  return {
    state,
    press: () => controllerRef.current?.press(),
    skip: () => {
      introStore.set('done');
      controllerRef.current?.skip();
    },
  };
}
