'use client';

import Image from 'next/image';
import { useRef } from 'react';

import { edgerunnerAssets } from '@/content/edgerunner';
import { preloadEdgerunner } from '@/engine/edgerunner/preload';
import { requestTheme } from '@/engine/edgerunner/themeStore';
import { useTheme } from '@/hooks/useTheme';

import styles from './index.module.scss';

/** The header button that switches the whole look of the site to "Edgerunner" and back. */
export function EdgerunnerButton() {
  const theme = useTheme();
  const ref = useRef<HTMLButtonElement>(null);
  const on = theme === 'edgerunner';
  const { logo } = edgerunnerAssets;

  const toggle = (): void => {
    const box = ref.current?.getBoundingClientRect();
    const origin = box
      ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
      : { x: window.innerWidth / 2, y: 40 };
    void requestTheme(on ? 'default' : 'edgerunner', origin);
  };

  return (
    <button
      ref={ref}
      type="button"
      className={styles.root}
      aria-pressed={on}
      aria-label={
        on ? 'Edgerunner look on, switch back to the classic look' : 'Switch to the Edgerunner look'
      }
      data-cursor="link"
      onPointerEnter={preloadEdgerunner}
      onFocus={preloadEdgerunner}
      onTouchStart={preloadEdgerunner}
      onClick={toggle}
    >
      <Image
        className={styles.logo}
        src={logo.src}
        alt=""
        width={logo.width}
        height={logo.height}
        unoptimized
      />
    </button>
  );
}
