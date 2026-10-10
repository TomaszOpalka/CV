import { Section } from '@/components/layout/Section';
import { skillGroups } from '@/content/skills';

import styles from './index.module.scss';

export function Stack() {
  return (
    <Section id="stack" index="04" title="Stack" className={styles.root}>
      <div className={styles.groups}>
        {skillGroups.map((group) => (
          <section key={group.id} aria-labelledby={`stack-${group.id}`} data-reveal>
            <h3 id={`stack-${group.id}`} className={styles.groupTitle}>
              {group.title}
            </h3>
            <ul className={styles.tiles}>
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className={styles.tile}
                  data-cursor="card"
                  data-cursor-label={`since ${item.since}`}
                >
                  <span className={styles.name}>{item.name}</span>
                  <span className={styles.usedAt}>{item.usedAt}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Section>
  );
}
