import { describe, expect, it } from 'vitest';

import { DEFAULT_EMOJI, resolveCursorTarget, sameTarget } from './cursorTarget';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

describe('resolveCursorTarget', () => {
  it('falls back to the default emoji with no element', () => {
    expect(resolveCursorTarget(null)).toEqual({ kind: 'default', emoji: DEFAULT_EMOJI, label: '' });
  });

  it('uses the emoji of the enclosing section', () => {
    const body = mount('<section data-emoji="💼"><p id="p">text</p></section>');
    expect(resolveCursorTarget(body.querySelector('#p'))).toEqual({
      kind: 'default',
      emoji: '💼',
      label: '',
    });
  });

  it('lets explicit attributes win, nearest ancestor first', () => {
    const body = mount(
      `<section data-emoji="💼">
         <div data-cursor="card" data-cursor-label="Details" data-cursor-emoji="🔍"><span id="s">x</span></div>
       </section>`,
    );
    expect(resolveCursorTarget(body.querySelector('#s'))).toEqual({
      kind: 'card',
      emoji: '🔍',
      label: 'Details',
    });
  });

  it('treats native links, buttons and fields sensibly', () => {
    const body = mount(
      '<section data-emoji="✉️"><a id="a" href="#x">a</a><button id="b">b</button><input id="i" /></section>',
    );
    expect(resolveCursorTarget(body.querySelector('#a')).kind).toBe('link');
    expect(resolveCursorTarget(body.querySelector('#b')).kind).toBe('link');
    expect(resolveCursorTarget(body.querySelector('#i')).kind).toBe('text');
  });

  it('ignores an unknown data-cursor value', () => {
    const body = mount('<p id="p" data-cursor="nonsense">x</p>');
    expect(resolveCursorTarget(body.querySelector('#p')).kind).toBe('default');
  });
});

describe('sameTarget', () => {
  it('compares kind, emoji and label', () => {
    const a = { kind: 'link', emoji: '💼', label: '' } as const;
    expect(sameTarget(a, { ...a })).toBe(true);
    expect(sameTarget(a, { ...a, label: 'x' })).toBe(false);
  });
});
