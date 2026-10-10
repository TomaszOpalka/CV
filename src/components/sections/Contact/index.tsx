import { Section } from '@/components/layout/Section';

import styles from './index.module.scss';

/** Placeholder: the contact form arrives in phase 4 (UI) and phase 5 (sending). */
export function Contact() {
  return (
    <Section id="contact" index="06" title="Contact">
      <p className={styles.text}>The contact form is coming soon.</p>
    </Section>
  );
}
