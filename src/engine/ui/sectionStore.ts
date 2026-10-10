type Listener = () => void;

let active = 'about';
const listeners = new Set<Listener>();

/**
 * The section that currently crosses the middle of the screen. One observer (SectionTracker) writes it;
 * the header, the cursor and the touch effects read it.
 */
export const sectionStore = {
  get(): string {
    return active;
  },
  getServer(): string {
    return 'about';
  },
  set(next: string): void {
    if (next === active) return;
    active = next;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
