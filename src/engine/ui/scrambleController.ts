import { ticker } from '../core/Ticker';
import { glitchIndex, scrambleFrame, withDigitAt } from './scramble';

/** How long the text takes to decode from digits when it first scrolls into view. */
const LOAD_MS = 900;
/** The random digits change at this pace while decoding. */
const NOISE_MS = 55;
/** An idle letter turns into a digit for this long. */
const GLITCH_MS = 170;
/** A glitch happens somewhere on screen every GLITCH_GAP_MIN..MAX ms: rare, and only one at a time. */
const GLITCH_GAP_MIN = 2200;
const GLITCH_GAP_MAX = 5200;

interface Entry {
  el: HTMLElement;
  text: string;
  delay: number;
  loaded: boolean;
  loading: boolean;
  glitching: boolean;
  visible: boolean;
}

const entries = new Map<Element, Entry>();
let observer: IntersectionObserver | null = null;
let glitchTimer = 0;

function ensureObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (changes) => {
      for (const change of changes) {
        const entry = entries.get(change.target);
        if (!entry) continue;
        entry.visible = change.isIntersecting;
        if (change.isIntersecting && !entry.loaded && !entry.loading) load(entry);
      }
    },
    { threshold: 0.35 },
  );
  return observer;
}

/** Decode the text from digits, letter by letter, then keep it final. */
function load(entry: Entry): void {
  entry.loading = true;
  entry.el.textContent = scrambleFrame(entry.text, 0);
  let elapsed = -entry.delay;
  let lastNoise = -1;
  const stop = ticker.add((deltaMs) => {
    elapsed += deltaMs;
    if (elapsed < 0) return;
    const progress = Math.min(1, elapsed / LOAD_MS);
    const step = Math.floor(elapsed / NOISE_MS);
    if (step !== lastNoise || progress >= 1) {
      lastNoise = step;
      entry.el.textContent = scrambleFrame(entry.text, progress);
    }
    if (progress >= 1) {
      stop();
      entry.loading = false;
      entry.loaded = true;
      entry.el.textContent = entry.text;
    }
  });
}

function scheduleGlitch(): void {
  const gap = GLITCH_GAP_MIN + Math.random() * (GLITCH_GAP_MAX - GLITCH_GAP_MIN);
  glitchTimer = window.setTimeout(() => {
    glitchOnce();
    if (entries.size > 0) scheduleGlitch();
  }, gap);
}

/** One random visible, finished text turns one letter into a digit for a moment. */
function glitchOnce(): void {
  if (document.visibilityState !== 'visible') return;
  const ready = [...entries.values()].filter((e) => e.visible && e.loaded && !e.glitching);
  if (ready.length === 0) return;
  const entry = ready[Math.floor(Math.random() * ready.length)]!;
  const index = glitchIndex(entry.text);
  if (index < 0) return;
  entry.glitching = true;
  entry.el.textContent = withDigitAt(entry.text, index);
  window.setTimeout(() => {
    entry.glitching = false;
    entry.el.textContent = entry.text;
  }, GLITCH_MS);
}

/**
 * Registers an element whose text decodes from digits when it first scrolls into view and, now and then,
 * flips a single letter to a digit for a moment. `text` is the final text (the element shows it until then,
 * so nothing breaks without JavaScript). Off for `prefers-reduced-motion`. Returns the unregister function.
 */
export function registerScramble(el: HTMLElement, text: string, delay = 0): () => void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => undefined;
  const entry: Entry = {
    el,
    text,
    delay,
    loaded: false,
    loading: false,
    glitching: false,
    visible: false,
  };
  entries.set(el, entry);
  ensureObserver().observe(el);
  if (entries.size === 1) scheduleGlitch();

  return () => {
    entries.delete(el);
    observer?.unobserve(el);
    // Leave the final text in place when the element goes away mid-animation.
    el.textContent = text;
    if (entries.size === 0) {
      window.clearTimeout(glitchTimer);
      observer?.disconnect();
      observer = null;
    }
  };
}
