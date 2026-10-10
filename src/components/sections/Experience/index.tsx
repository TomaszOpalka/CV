import { Section } from '@/components/layout/Section';
import { experience } from '@/content/experience';

import styles from './index.module.scss';

export function Experience() {
  return (
    <Section id="experience" index="03" title="Experience" className={styles.root}>
      <ol className={styles.track}>
        {experience.map((item) => (
          <li key={item.id} className={styles.card} data-cursor="card" data-cursor-label="Details">
            <p className={styles.period}>{item.period}</p>
            <h3 className={styles.company}>{item.company}</h3>
            <p className={styles.role}>{item.role}</p>
            <p className={styles.summary}>{item.summary}</p>
            <ul className={styles.achievements}>
              {item.achievements.map((achievement) => (
                <li key={achievement}>{achievement}</li>
              ))}
            </ul>
            <ul className={styles.tags} aria-label="Technologies">
              {item.tech.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Section>
  );
}
