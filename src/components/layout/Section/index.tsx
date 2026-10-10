import type { ReactNode } from 'react';

import { sectionById } from '@/content/sections';

import styles from './index.module.scss';

interface SectionProps {
  /** One of the ids in `content/sections.ts`. */
  id: string;
  /** Position in the page, shown as "02". */
  index: string;
  title: string;
  /** Extra class for the section element. */
  className?: string;
  children: ReactNode;
}

/** Shared frame of the home page sections: id, cursor emoji, heading and spacing. */
export function Section({ id, index, title, className, children }: SectionProps) {
  const { emoji } = sectionById(id);
  return (
    <section
      id={id}
      className={`${styles.section} ${className ?? ''}`.trim()}
      data-section
      data-emoji={emoji}
      aria-labelledby={`${id}-title`}
    >
      <header className={styles.header} data-reveal>
        <p className={styles.index}>{index}</p>
        <h2 id={`${id}-title`} className={styles.title}>
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}
