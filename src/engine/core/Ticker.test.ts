import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Ticker } from './Ticker';

describe('Ticker', () => {
  let frame: ((now: number) => void) | null = null;

  beforeEach(() => {
    frame = null;
    vi.stubGlobal('requestAnimationFrame', (cb: (now: number) => void) => {
      frame = cb;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {
      frame = null;
    });
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('calls subscribers with the elapsed time and stops when empty', () => {
    const ticker = new Ticker();
    const spy = vi.fn();
    const unsubscribe = ticker.add(spy);

    frame?.(16);
    expect(spy).toHaveBeenCalledWith(16, 16);

    unsubscribe();
    expect(ticker.size).toBe(0);
    expect(frame).toBeNull();
  });

  it('clamps very long frames', () => {
    const ticker = new Ticker();
    const spy = vi.fn();
    ticker.add(spy);

    frame?.(5000);
    expect(spy).toHaveBeenCalledWith(100, 5000);
  });
});
