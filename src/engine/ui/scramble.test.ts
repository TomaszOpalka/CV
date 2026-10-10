import { describe, expect, it } from 'vitest';

import { glitchIndex, scrambleFrame, withDigitAt } from './scramble';

function seeded(): () => number {
  let s = 11;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('scrambleFrame', () => {
  it('starts as digits, ends as the text, and keeps spaces and length', () => {
    const rng = seeded();
    const start = scrambleFrame('Other CVs', 0, rng);
    expect(start).toMatch(/^\d{5} \d{3}$/);
    expect(scrambleFrame('Other CVs', 1, rng)).toBe('Other CVs');
  });

  it('reveals from the left', () => {
    const half = scrambleFrame('abcdefgh', 0.5, seeded());
    expect(half.slice(0, 4)).toBe('abcd');
    expect(half.slice(4)).toMatch(/^\d{4}$/);
  });

  it('leaves real digits and punctuation alone', () => {
    expect(scrambleFrame('2023 - now', 0, seeded())).toMatch(/^2023 - \d{3}$/);
  });

  it('handles Polish letters', () => {
    expect(scrambleFrame('Opałka', 0, seeded())).toMatch(/^\d{6}$/);
  });
});

describe('glitchIndex', () => {
  it('never picks a letter next to a digit', () => {
    const rng = seeded();
    for (let n = 0; n < 200; n++) {
      const text = 'ab1cd2ef';
      const i = glitchIndex(text, rng);
      expect(i).toBeGreaterThanOrEqual(0);
      const out = withDigitAt(text, i, rng);
      expect(out).not.toMatch(/\d\d/);
    }
  });

  it('returns -1 when no letter qualifies', () => {
    expect(glitchIndex('123', seeded())).toBe(-1);
    expect(glitchIndex('1a2', seeded())).toBe(-1);
    expect(glitchIndex('', seeded())).toBe(-1);
  });

  it('changes exactly one character', () => {
    const out = withDigitAt('Experience', 3, seeded());
    expect(out).toHaveLength('Experience'.length);
    expect(out.replace(/\d/, 'e')).toBe('Experience');
  });
});
