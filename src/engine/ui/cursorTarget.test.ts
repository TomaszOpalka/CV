import { describe, expect, it } from 'vitest';

import { resolveCursorTarget, sameTarget } from './cursorTarget';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

describe('resolveCursorTarget', () => {
  it('falls back to a heart in the negative theme with no element', () => {
    expect(resolveCursorTarget(null)).toEqual({
      kind: 'default',
      icon: 'heart',
      theme: 'negative',
      label: '',
    });
  });

  it('uses the icon of the enclosing section', () => {
    const body = mount('<section id="experience" data-section><p id="p">text</p></section>');
    expect(resolveCursorTarget(body.querySelector('#p')).icon).toBe('case');
  });

  it('lets explicit attributes win, nearest ancestor first', () => {
    const body = mount(
      `<section id="experience" data-section>
         <div data-cursor="card" data-cursor-label="Details" data-cursor-icon="burst"><span id="s">x</span></div>
       </section>`,
    );
    expect(resolveCursorTarget(body.querySelector('#s'))).toEqual({
      kind: 'card',
      icon: 'burst',
      theme: 'negative',
      label: 'Details',
    });
  });

  it('treats native links, buttons and fields sensibly', () => {
    const body = mount(
      '<section id="contact" data-section><a id="a" href="#x">a</a><button id="b">b</button><input id="i" /></section>',
    );
    expect(resolveCursorTarget(body.querySelector('#a'))).toMatchObject({
      kind: 'link',
      icon: 'arrow',
    });
    expect(resolveCursorTarget(body.querySelector('#b')).kind).toBe('link');
    expect(resolveCursorTarget(body.querySelector('#i'))).toMatchObject({
      kind: 'text',
      icon: 'beam',
    });
  });

  it('switches to the heat theme inside a themed area', () => {
    const body = mount('<div data-cursor-theme="heat"><canvas id="c"></canvas></div>');
    expect(resolveCursorTarget(body.querySelector('#c')).theme).toBe('heat');
  });

  it('ignores unknown attribute values', () => {
    const body = mount('<p id="p" data-cursor="nonsense" data-cursor-icon="nope">x</p>');
    expect(resolveCursorTarget(body.querySelector('#p'))).toMatchObject({
      kind: 'default',
      icon: 'heart',
    });
  });
});

describe('sameTarget', () => {
  it('compares every field', () => {
    const a = { kind: 'link', icon: 'arrow', theme: 'negative', label: '' } as const;
    expect(sameTarget(a, { ...a })).toBe(true);
    expect(sameTarget(a, { ...a, label: 'x' })).toBe(false);
    expect(sameTarget(a, { ...a, theme: 'heat' })).toBe(false);
  });
});
