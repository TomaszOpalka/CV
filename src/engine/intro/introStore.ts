import type { IntroState } from './introMachine';

type Listener = () => void;

let current: IntroState = 'boot';
const listeners = new Set<Listener>();

/**
 * Tiny external store holding the intro state, read in React via `useSyncExternalStore`.
 * Module scope means a client-side navigation back to the home page finds the intro already
 * `done` and renders the final view at once, while a full page reload starts from `boot` again.
 */
export const introStore = {
  get(): IntroState {
    return current;
  },
  /** Server render and hydration always start from `boot`. */
  getServer(): IntroState {
    return 'boot';
  },
  set(next: IntroState): void {
    if (next === current) return;
    current = next;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
