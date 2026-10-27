/**
 * The page scroller. SmoothScroll (Lenis) registers itself here; everything else asks this module,
 * so links and the menu keep working with native scrolling when Lenis is off (reduced motion, no JS yet).
 */
export interface Scroller {
  scrollTo(target: string | HTMLElement): void;
  /** Jumps to a scroll position without animation. */
  jump(y: number): void;
  stop(): void;
  start(): void;
}

let current: Scroller | null = null;

export function registerScroller(scroller: Scroller | null): void {
  current = scroller;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Scroll to a section id (without the #); the address bar is left alone. */
export function scrollToSection(id: string): void {
  const element = document.getElementById(id);
  if (!element) return;
  if (current) current.scrollTo(element);
  else
    element.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
}

/** Back to the very top, at once. */
export function jumpToTop(): void {
  if (current) current.jump(0);
  else window.scrollTo(0, 0);
}

export function stopScroll(): void {
  current?.stop();
}

export function startScroll(): void {
  current?.start();
}
