import type { ReactNode } from 'react';

import { Scramble } from '@/components/ui/Scramble';

import styles from './index.module.scss';

interface SectionProps {
  /** One of the ids in `content/sections.ts`. */
  id: string;
  /** Position in the page, shown as "02". */
  index: string;
  title: string;
  /** Let the content run edge to edge (the heading keeps its padding). */
  bleed?: boolean;
  /** Extra class for the section element. */
  className?: string;
  children: ReactNode;
}

/** Shared frame of the home page sections: id, heading and spacing. */
export function Section({ id, index, title, className, bleed = false, children }: SectionProps) {
  return (
    <section
      id={id}
      className={`${styles.section} ${bleed ? styles.isBleed : ''} ${className ?? ''}`.trim()}
      data-section
      aria-labelledby={`${id}-title`}
    >
      <header className={styles.header} data-reveal>
        <p className={styles.index}>{index}</p>
        <h2 id={`${id}-title`} className={styles.title}>
          <Scramble text={title} />
        </h2>
      </header>
      {children}
    </section>
  );
}
