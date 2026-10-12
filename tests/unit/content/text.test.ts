import { describe, expect, it } from 'vitest';

import { afterFirstSentence, firstSentence } from '@/content/text';

describe('firstSentence', () => {
  it('returns the first sentence and the rest', () => {
    const text = 'A platform for 24/7 video surveillance. It streams live video. More.';
    expect(firstSentence(text)).toBe('A platform for 24/7 video surveillance.');
    expect(afterFirstSentence(text)).toBe('It streams live video. More.');
  });

  it('keeps abbreviations like "24/7" and "Node.js" together', () => {
    expect(firstSentence('Built with Node.js and React. Done.')).toBe(
      'Built with Node.js and React.',
    );
  });

  it('returns a single sentence unchanged and nothing after it', () => {
    expect(firstSentence('Just one sentence.')).toBe('Just one sentence.');
    expect(afterFirstSentence('Just one sentence.')).toBe('');
  });

  it('handles text without a full stop', () => {
    expect(firstSentence('No full stop')).toBe('No full stop');
    expect(afterFirstSentence('No full stop')).toBe('');
  });
});
