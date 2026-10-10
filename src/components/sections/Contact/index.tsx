import { Section } from '@/components/layout/Section';
import { contactLinks } from '@/content/contact';

import styles from './index.module.scss';

/** The contact form arrives in phase 4 (UI) and phase 5 (sending); until then the direct links. */
export function Contact() {
  return (
    <Section id="contact" index="06" title="Contact">
      <div className={styles.wrap}>
        <p className={styles.text}>
          The contact form is coming soon. Until then, write to me directly:
        </p>
        <ul className={styles.links}>
          {contactLinks.map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                {...(link.url.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
