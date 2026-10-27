import { EdgeBackdrop } from '@/components/layout/EdgeBackdrop';
import { Section } from '@/components/layout/Section';
import { contactLead, contactLinks } from '@/content/contact';

import styles from './index.module.scss';

const [email, ...others] = contactLinks;

/**
 * Contact section: for now just the e-mail address, big and one click away.
 */
export function Contact() {
  return (
    <Section id="contact" index="06" title="Contact">
      <EdgeBackdrop variant="contact" />
      <div className={styles.wrap}>
        <p className={styles.lead}>{contactLead}</p>
        {email && (
          <a
            className={styles.email}
            href={email.url}
            data-cursor="link"
            data-cursor-label="Write!"
          >
            {email.label}
          </a>
        )}
        <ul className={styles.others}>
          {others.map((link) => (
            <li key={link.url}>
              <a href={link.url} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
