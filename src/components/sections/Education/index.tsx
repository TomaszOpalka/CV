import { Section } from '@/components/layout/Section';
import { Scramble } from '@/components/ui/Scramble';
import { certificates, education, languages } from '@/content/education';

import styles from './index.module.scss';

export function Education() {
  return (
    <Section id="education" index="05" title="Education">
      <div className={styles.wrap}>
        <ul className={styles.list}>
          {education.map((item) => (
            <li key={item.id} className={styles.item} data-reveal>
              <p className={styles.period}>{item.period}</p>
              <h3 className={styles.school}>
                <Scramble text={item.school} />
              </h3>
              <p>{item.degree}</p>
              {item.note && <p className={styles.note}>{item.note}</p>}
            </li>
          ))}
        </ul>

        <div className={styles.columns}>
          <section aria-labelledby="certificates-title" data-reveal>
            <h3 id="certificates-title" className={styles.groupTitle}>
              <Scramble text="Certificates" />
            </h3>
            <ul className={styles.plain}>
              {certificates.map((item) => (
                <li key={item.id}>
                  <p>{item.name}</p>
                  <p className={styles.note}>
                    {item.issuer}, {item.year}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="languages-title" data-reveal>
            <h3 id="languages-title" className={styles.groupTitle}>
              <Scramble text="Languages" />
            </h3>
            <ul className={styles.plain}>
              {languages.map((item) => (
                <li key={item.id}>
                  <p>
                    {item.name} <span className={styles.note}>{item.level}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Section>
  );
}
