'use client';

import { useId, useState, type CSSProperties } from 'react';

import { Section } from '@/components/layout/Section';
import { Scramble } from '@/components/ui/Scramble';
import { skillGroups } from '@/content/skills';
import { useMediaQuery } from '@/hooks/useMediaQuery';

import styles from './index.module.scss';

/**
 * The stack as tabs on wide screens and an accordion on phones (same markup). One group is open at a time.
 */
export function Stack() {
  const baseId = useId();
  const wide = useMediaQuery('(min-width: 768px)');
  const [openId, setOpenId] = useState<string | null>(skillGroups[0]?.id ?? null);

  const toggle = (id: string): void => {
    // Only the phone accordion can close the open group.
    setOpenId((current) => (current === id && !wide ? null : id));
  };

  return (
    <Section id="stack" index="04" title="Stack" className={styles.root}>
      <div
        className={styles.stack}
        style={{ '--rows': skillGroups.length } as CSSProperties}
        data-reveal
      >
        {skillGroups.map((group) => {
          const open = openId === group.id;
          const buttonId = `${baseId}-tab-${group.id}`;
          const panelId = `${baseId}-panel-${group.id}`;
          return (
            <div key={group.id} className={styles.item} data-open={open}>
              <button
                id={buttonId}
                type="button"
                className={styles.tab}
                aria-expanded={open}
                aria-controls={panelId}
                data-cursor="link"
                onClick={() => toggle(group.id)}
              >
                <span className={styles.tabTitle}>
                  <Scramble text={group.title} />
                </span>
                <span className={styles.count} aria-hidden="true">
                  {group.items.length}
                </span>
                <span className={styles.chevron} aria-hidden="true" />
              </button>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={styles.panel}
                hidden={!open}
              >
                <ul className={styles.list}>
                  {group.items.map((item) => (
                    <li key={item.id} className={item.core ? styles.core : styles.rest}>
                      <span className={styles.name}>
                        {item.core && <span className={styles.srOnly}>Core: </span>}
                        {item.name}
                      </span>
                      {item.usedAt && <span className={styles.usedAt}>{item.usedAt}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
