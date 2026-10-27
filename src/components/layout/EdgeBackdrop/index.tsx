'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

import { edgerunnerAssets } from '@/content/edgerunner';
import type { InterferenceCanvas } from '@/engine/edgerunner/InterferenceCanvas';
import { jaggedPolygon, makeJaggedEdge } from '@/engine/edgerunner/jagged';
import { mulberry32 } from '@/engine/edgerunner/lightning';
import { prefersReducedMotion } from '@/engine/ui/scroller';
import { useTheme } from '@/hooks/useTheme';

import styles from './index.module.scss';

interface EdgeBackdropProps {
  /**
   * "experience" and "stack": line art drawn by `scripts/edgerunner-art.py`; "education": a picture behind the
   * section; "contact": the red band with ragged edges and interference.
   */
  variant: 'experience' | 'stack' | 'education' | 'contact';
}

/** Ragged top and bottom of the contact band, fixed seeds so the shape is the same on every visit. */
const CONTACT_CLIP = jaggedPolygon(
  makeJaggedEdge(mulberry32(31), 20),
  makeJaggedEdge(mulberry32(77), 20),
);

/**
 * Background of a section in the Edgerunner look (see EdgerunnerFx). Renders nothing in the normal look, so the
 * pictures are not even downloaded. Must sit inside a `position: relative` section.
 */
export function EdgeBackdrop({ variant }: EdgeBackdropProps) {
  const edge = useTheme() === 'edgerunner';
  const noiseRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = noiseRef.current;
    if (!edge || variant !== 'contact' || !canvas) return;
    let disposed = false;
    let noise: InterferenceCanvas | null = null;
    import('@/engine/edgerunner/InterferenceCanvas')
      .then(({ InterferenceCanvas: Interference }) => {
        if (disposed) return;
        noise = new Interference(canvas, !prefersReducedMotion());
        noise.init();
      })
      .catch(() => {});
    return () => {
      disposed = true;
      noise?.destroy();
    };
  }, [edge, variant]);

  if (!edge) return null;

  return (
    <div
      className={styles.root}
      data-variant={variant}
      style={variant === 'contact' ? { clipPath: CONTACT_CLIP } : undefined}
      aria-hidden="true"
    >
      <Image
        className={styles.image}
        src={edgerunnerAssets[variant]}
        alt=""
        fill
        sizes="100vw"
        loading="lazy"
        unoptimized
      />
      {variant === 'contact' && <canvas ref={noiseRef} className={styles.noise} />}
    </div>
  );
}
