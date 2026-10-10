'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';

import { SECTIONS } from '@/content/sections';
import { profile } from '@/content/profile';
import { iconForSection } from '@/engine/cursor/pixelIcons';
import { useActiveSection } from '@/hooks/useActiveSection';
import { useIntroState } from '@/hooks/useIntroState';
import { scrollToSection } from '@/engine/ui/scroller';

import styles from './index.module.scss';

/**
 * Fixed navigation. Hidden until the intro is over. Highlights the section that crosses the middle
 * of the screen, shows scroll progress (CSS variable, no React state) and turns into a full-screen
 * menu on small screens.
 */
export function Header() {
  const introState = useIntroState();
  const active = useActiveSection();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const visible = introState === 'done';

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const update = (): void => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      root.style.setProperty('--progress', progress.toFixed(4));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // Escape closes the menu; the page behind it does not scroll while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.documentElement.setAttribute('data-menu-open', '');
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.removeAttribute('data-menu-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const go = (event: MouseEvent<HTMLAnchorElement>, id: string): void => {
    event.preventDefault();
    setMenuOpen(false);
    scrollToSection(id);
  };

  return (
    <header
      ref={rootRef}
      className={styles.root}
      data-visible={visible}
      data-open={menuOpen}
      // Hidden from keyboard and screen readers while the intro owns the page.
      inert={!visible}
    >
      <a className={styles.brand} href="#about" onClick={(event) => go(event, 'about')}>
        {profile.name}
      </a>

      <nav id="site-nav" className={styles.nav} aria-label="Main">
        <ul className={styles.list}>
          {SECTIONS.map(({ id, label, href }, index) => (
            <li key={id}>
              <a
                className={styles.link}
                href={href}
                aria-current={active === id ? 'true' : undefined}
                data-cursor="link"
                data-cursor-icon={iconForSection(id)}
                onClick={(event) => go(event, id)}
              >
                <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <a
        className={styles.hire}
        href="#contact"
        data-cursor="link"
        data-cursor-label="Say hi!"
        onClick={(event) => go(event, 'contact')}
      >
        Hire me
      </a>

      <button
        ref={toggleRef}
        type="button"
        className={styles.toggle}
        aria-expanded={menuOpen}
        aria-controls="site-nav"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className={styles.srOnly}>{menuOpen ? 'Close menu' : 'Open menu'}</span>
        <span className={styles.bars} aria-hidden="true" />
      </button>

      <span className={styles.progress} aria-hidden="true" />
    </header>
  );
}
