import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getTheme,
  registerTransition,
  requestTheme,
  setTheme,
  subscribeTheme,
} from '@/engine/edgerunner/themeStore';

afterEach(() => {
  registerTransition(null);
  setTheme('default');
});

describe('themeStore', () => {
  it('marks <html> and notifies subscribers', () => {
    const listener = vi.fn();
    const off = subscribeTheme(listener);
    setTheme('edgerunner');
    expect(document.documentElement.getAttribute('data-theme')).toBe('edgerunner');
    expect(getTheme()).toBe('edgerunner');
    setTheme('default');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    setTheme('edgerunner');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('switches at once when there is no transition', async () => {
    await requestTheme('edgerunner', { x: 0, y: 0 });
    expect(getTheme()).toBe('edgerunner');
  });

  it('runs the registered transition and ignores requests while it plays', async () => {
    let finish: () => void = () => undefined;
    const handler = vi.fn(
      (next: 'default' | 'edgerunner') =>
        new Promise<void>((resolve) => {
          finish = () => {
            setTheme(next);
            resolve();
          };
        }),
    );
    registerTransition(handler);
    const first = requestTheme('edgerunner', { x: 5, y: 6 });
    await requestTheme('default', { x: 0, y: 0 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('edgerunner', { x: 5, y: 6 });
    finish();
    await first;
    expect(getTheme()).toBe('edgerunner');
  });
});
