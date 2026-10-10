import { Section } from '@/components/layout/Section';
import { education } from '@/content/education';

import styles from './index.module.scss';

export function Education() {
  return (
    <Section id="education" index="05" title="Education">
      <ul className={styles.list}>
        {education.map((item) => (
          <li key={item.id} className={styles.item} data-reveal>
            <p className={styles.period}>{item.period}</p>
            <h3 className={styles.school}>{item.school}</h3>
            <p>{item.degree}</p>
            {item.note && <p className={styles.note}>{item.note}</p>}
          </li>
        ))}
      </ul>
    </Section>
  );
}
