export type ThemeName = 'default' | 'edgerunner';

export interface ThemeOrigin {
  x: number;
  y: number;
}

type Listener = () => void;
/** Plays the switch (e.g. the lightning) and resolves once the new look is in place. */
type Transition = (next: ThemeName, origin: ThemeOrigin) => Promise<void>;

const listeners = new Set<Listener>();
let current: ThemeName = 'default';
let transition: Transition | null = null;
let busy = false;

export function getTheme(): ThemeName {
  return current;
}

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Applies a theme at once: marks `<html>` for the stylesheet and tells the subscribers. */
export function setTheme(next: ThemeName): void {
  if (next === current) return;
  current = next;
  if (next === 'default') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', next);
  for (const listener of listeners) listener();
}

/** The component that can play a transition registers itself here; without one the switch is instant. */
export function registerTransition(handler: Transition | null): void {
  transition = handler;
}

/** Switches theme, through the registered transition if there is one. Ignored while a switch is running. */
export async function requestTheme(next: ThemeName, origin: ThemeOrigin): Promise<void> {
  if (busy || next === current) return;
  busy = true;
  try {
    if (transition) await transition(next, origin);
    else setTheme(next);
  } finally {
    busy = false;
  }
}
