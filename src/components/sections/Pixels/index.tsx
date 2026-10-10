'use client';

import { useEffect, useRef, useState } from 'react';

import { Section } from '@/components/layout/Section';
import { portfolioLinks } from '@/content/portfolioLinks';
import type { PixelFieldController } from '@/engine/pixels/PixelFieldController';
import { prefersReducedMotion } from '@/engine/ui/scroller';

import styles from './index.module.scss';

type Mode = 'static' | 'armed' | 'exploding' | 'cleared';

/**
 * A field of pixels that reacts to the pointer and explodes on click, revealing links to the author's other
 * CVs and portfolios. Without JavaScript, with reduced motion or when canvas is missing the field is never
 * armed and the links are simply there. While armed, a real button ("Reveal links") starts the explosion
 * from the keyboard, and the hidden cards are `inert` so nobody tabs into something invisible.
 */
export function Pixels() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<PixelFieldController | null>(null);
  const [mode, setMode] = useState<Mode>('static');

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    let disposed = false;

    import('@/engine/pixels/PixelFieldController')
      .then(({ PixelFieldController: Controller }) => {
        if (disposed) return;
        const controller = new Controller({
          canvas,
          shakeTarget: stage,
          onExplode: () => setMode('exploding'),
          onCleared: () => setMode('cleared'),
        });
        controller.init();
        controllerRef.current = controller;
        setMode('armed');
      })
      .catch(() => setMode('static'));

    return () => {
      disposed = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);

  const hidden = mode === 'armed' || mode === 'exploding';
  const rebuild = (): void => {
    controllerRef.current?.reset();
    setMode('armed');
  };

  return (
    <Section id="pixels" index="02" title="Other CVs" className={styles.root} bleed>
      <p className={styles.lead}>
        {mode === 'static'
          ? 'More versions of this CV and a longer portfolio.'
          : 'Press and hold on the pixels and watch them heat up. Something is hiding behind them.'}
      </p>

      <div
        ref={stageRef}
        className={styles.stage}
        data-mode={mode}
        data-cursor-theme={mode === 'armed' || mode === 'exploding' ? 'heat' : undefined}
        data-cursor-label={mode === 'armed' ? 'Hold!' : undefined}
      >
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

        <div className={styles.content}>
          <ul className={styles.cards} inert={hidden}>
            {portfolioLinks.map((link) => (
              <li key={link.id}>
                <a
                  className={styles.card}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="link"
                >
                  <span className={styles.name}>{link.name}</span>
                  <span className={styles.description}>{link.description}</span>
                  <span className={styles.arrow} aria-hidden="true">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {mode === 'armed' && (
          <button
            type="button"
            className={styles.reveal}
            onClick={() => controllerRef.current?.explode()}
          >
            Reveal links
          </button>
        )}
      </div>

      {mode === 'cleared' && (
        <button type="button" className={styles.rebuild} onClick={rebuild}>
          Rebuild the pixels
        </button>
      )}
    </Section>
  );
}
