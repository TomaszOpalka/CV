'use client';

import { useEffect, useRef, useState } from 'react';

import { Section } from '@/components/layout/Section';
import { portfolioLinks } from '@/content/portfolioLinks';
import type { PixelFieldController } from '@/engine/pixels/PixelFieldController';
import { prefersReducedMotion } from '@/engine/ui/scroller';

import styles from './index.module.scss';

type Mode = 'static' | 'armed' | 'exploding' | 'cleared';

/**
 * A field of pixels that reacts to the pointer and explodes on click, revealing a carousel of the
 * author's projects. Without JavaScript, with reduced motion or when canvas is missing the field is never
 * armed and the links are simply there. While armed, a real button ("Reveal links") starts the explosion
 * from the keyboard, and the hidden cards are `inert` so nobody tabs into something invisible.
 */
export function Portfolio() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<PixelFieldController | null>(null);
  const trackRef = useRef<HTMLUListElement>(null);
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
  /** Scroll the carousel by one card (the first card's width plus the gap). */
  const slide = (direction: 1 | -1): void => {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null | undefined;
    if (!track || !first) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({
      left: direction * (first.offsetWidth + gap),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };
  const rebuild = (): void => {
    controllerRef.current?.reset();
    setMode('armed');
  };

  return (
    <Section id="portfolio" index="02" title="Portfolio" className={styles.root} bleed>
      <p className={styles.lead}>
        {mode === 'static' || mode === 'cleared'
          ? 'Live sites and code I have built.'
          : 'Press and hold on the pixels and watch them heat up. My projects are hiding behind them.'}
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
          <div className={styles.carousel} data-carousel inert={hidden}>
            <ul ref={trackRef} className={styles.track} aria-label="Projects">
              {portfolioLinks.map((link) => (
                <li key={link.id} className={styles.slide}>
                  <a
                    className={styles.card}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="link"
                  >
                    <span className={styles.name}>{link.name}</span>
                    <span className={styles.description}>{link.description}</span>
                    {link.tech && (
                      <span className={styles.tags}>
                        {link.tech.map((name) => (
                          <span key={name}>{name}</span>
                        ))}
                      </span>
                    )}
                    <span className={styles.arrow} aria-hidden="true">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <div className={styles.controls}>
              <button type="button" onClick={() => slide(-1)} aria-label="Previous projects">
                ←
              </button>
              <button type="button" onClick={() => slide(1)} aria-label="Next projects">
                →
              </button>
            </div>
          </div>
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
