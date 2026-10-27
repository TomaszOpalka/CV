'use client';

import { useEffect, useRef } from 'react';

import { registerScramble } from '@/engine/ui/scrambleController';

import styles from './index.module.scss';

interface ScrambleProps {
  text: string;
  /** Wait this many ms before the text starts to decode (for staggering a row of links). */
  delay?: number;
}

/**
 * Text that decodes from digits the first time it scrolls into view and now and then flips a letter to a digit.
 * The visible copy is hidden from assistive technology and cannot be selected; a visually hidden copy carries the real
 * text, so screen readers, search engines and copy and paste get it once and never see the digits.
 */
export function Scramble({ text, delay = 0 }: ScrambleProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return registerScramble(el, text, delay);
  }, [text, delay]);

  return (
    <>
      <span key={text} ref={ref} className={styles.visible} aria-hidden="true">
        {text}
      </span>
      <span className={styles.srOnly}>{text}</span>
    </>
  );
}
