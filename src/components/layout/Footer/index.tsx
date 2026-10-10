import { profile } from '@/content/profile';

import styles from './index.module.scss';

export function Footer() {
  return (
    <footer className={styles.root}>
      <p>
        © {new Date().getFullYear()} {profile.name}
      </p>
      <p>Built with Next.js, TypeScript and a lot of digits.</p>
    </footer>
  );
}
