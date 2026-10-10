'use client';

import Image from 'next/image';
import { useRef, type CSSProperties } from 'react';

import { profile } from '@/content/profile';
import { useHeadingScramble } from '@/hooks/useHeadingScramble';
import { useIntro } from '@/hooks/useIntro';
import { useIntroFocus } from '@/hooks/useIntroFocus';

import styles from './index.module.scss';

function stagger(index: number): CSSProperties {
  return { '--i': index } as CSSProperties;
}

/**
 * Hero: a grid of digits that reacts to the pointer, explodes on click and re-assembles into
 * the author's portrait, which then turns into the real photo next to the "about me" text.
 * The heading and text are in the DOM (and the accessibility tree) from the first render;
 * only their opacity is animated. The canvas is decoration.
 */
export function Intro() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);

  const { portrait, name, role, about } = profile;
  const { state, press, skip } = useIntro({
    rootRef,
    canvasRef,
    frameRef,
    counterRef,
    imageSrc: portrait.src,
    focalY: portrait.focalY,
  });
  useHeadingScramble(nameRef, name, state);
  useIntroFocus(rootRef, titleRef, skipRef, state);

  const playing = state !== 'done';

  return (
    <section
      ref={rootRef}
      id="about"
      className={styles.root}
      data-state={state}
      data-section
      data-emoji="👋"
      aria-labelledby="hero-title"
    >
      {playing && (
        <button
          ref={skipRef}
          type="button"
          className={styles.skip}
          data-intro-ignore
          onClick={skip}
        >
          skip intro
        </button>
      )}

      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.text}>
          <p className={styles.eyebrow} style={stagger(0)}>
            {role}
          </p>
          <h1
            ref={titleRef}
            id="hero-title"
            className={styles.title}
            aria-label={name}
            tabIndex={-1}
            style={stagger(1)}
          >
            <span ref={nameRef}>{name}</span>
          </h1>
          {about.map((paragraph, index) => (
            <p key={paragraph} className={styles.about} style={stagger(index + 2)}>
              {paragraph}
            </p>
          ))}
        </div>

        <div ref={frameRef} className={styles.frame}>
          <Image
            className={styles.photo}
            src={portrait.src}
            alt={portrait.alt}
            width={portrait.width}
            height={portrait.height}
            style={{ objectPosition: `50% ${portrait.focalY * 100}%` }}
            priority
            unoptimized
          />
        </div>
      </div>

      <p className={styles.counter} aria-hidden="true">
        <span ref={counterRef}>000</span>
      </p>

      {state === 'idle' && (
        <button type="button" className={styles.prompt} onClick={press}>
          <span className={styles.promptMouse}>[ click ]</span>
          <span className={styles.promptTouch}>[ touch ]</span>
          <span className={styles.srOnly}> to turn on animation</span>
        </button>
      )}
    </section>
  );
}
