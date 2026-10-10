import type { CSSProperties } from 'react';

import { Section } from '@/components/layout/Section';
import { Scramble } from '@/components/ui/Scramble';
import { experience } from '@/content/experience';

import styles from './index.module.scss';

export function Experience() {
  return (
    <Section id="experience" index="03" title="Experience" className={styles.root}>
      <div className={styles.jobs}>
        {experience.map((job) => (
          <article
            key={job.id}
            className={styles.job}
            aria-labelledby={`job-${job.id}`}
            data-reveal
          >
            <header className={styles.jobHeader}>
              <h3 id={`job-${job.id}`} className={styles.company}>
                <Scramble text={job.company} />
              </h3>
              <p className={styles.role}>{job.role}</p>
              {job.period && <p className={styles.period}>{job.period}</p>}
            </header>
            <p className={styles.summary}>{job.summary}</p>

            {job.projects.length > 0 && (
              <ul className={styles.projects}>
                {job.projects.map((project, index) => (
                  <li
                    key={project.id}
                    className={styles.card}
                    data-reveal
                    style={{ '--reveal-index': index } as CSSProperties}
                    data-cursor="card"
                  >
                    <h4 className={styles.projectName}>{project.name}</h4>
                    {project.summary && <p className={styles.summary}>{project.summary}</p>}
                    {project.achievements.length > 0 && (
                      <ul className={styles.achievements}>
                        {project.achievements.map((achievement) => (
                          <li key={achievement}>{achievement}</li>
                        ))}
                      </ul>
                    )}
                    {project.tech.length > 0 && (
                      <ul className={styles.tags} aria-label="Technologies">
                        {project.tech.map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    )}
                    {project.links && (
                      <ul className={styles.links}>
                        {project.links.map((link) => (
                          <li key={link.url}>
                            <a href={link.url} target="_blank" rel="noreferrer">
                              {link.label} <span aria-hidden="true">↗</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </Section>
  );
}
