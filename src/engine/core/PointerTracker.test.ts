import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PointerTracker } from './PointerTracker';

function pointerEvent(
  type: string,
  init: {
    pointerType: string;
    clientX: number;
    clientY: number;
    buttons?: number;
    button?: number;
    isPrimary?: boolean;
  },
  target: Element,
  timeStamp = 0,
): PointerEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: init.clientX,
    clientY: init.clientY,
    buttons: init.buttons ?? 0,
  });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType });
  Object.defineProperty(event, 'isPrimary', { value: init.isPrimary ?? true });
  Object.defineProperty(event, 'button', { value: init.button ?? 0 });
  Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  target.dispatchEvent(event);
  return event as PointerEvent;
}

describe('PointerTracker', () => {
  let root: HTMLDivElement;
  let skip: HTMLButtonElement;
  let onPress: ReturnType<typeof vi.fn<(x: number, y: number) => void>>;
  let tracker: PointerTracker;

  beforeEach(() => {
    root = document.createElement('div');
    skip = document.createElement('button');
    skip.setAttribute('data-intro-ignore', '');
    root.append(skip);
    document.body.append(root);
    onPress = vi.fn<(x: number, y: number) => void>();
    tracker = new PointerTracker(root, { mouseRadius: 110, touchRadius: 80, onPress });
    tracker.attach();
  });

  afterEach(() => {
    tracker.detach();
    root.remove();
  });

  it('a mouse presses immediately on pointer down and hovers without a button', () => {
    pointerEvent('pointermove', { pointerType: 'mouse', clientX: 40, clientY: 50 }, root);
    expect(tracker.state).toMatchObject({ x: 40, y: 50, active: true, radius: 110 });
    pointerEvent(
      'pointerdown',
      { pointerType: 'mouse', clientX: 40, clientY: 50, buttons: 1 },
      root,
    );
    expect(onPress).toHaveBeenCalledWith(40, 50);
  });

  it('a finger only presses on a short, nearly stationary tap', () => {
    pointerEvent(
      'pointerdown',
      { pointerType: 'touch', clientX: 100, clientY: 100, buttons: 1 },
      root,
      0,
    );
    expect(onPress).not.toHaveBeenCalled();
    pointerEvent('pointerup', { pointerType: 'touch', clientX: 102, clientY: 101 }, root, 120);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(tracker.state.active).toBe(false);
  });

  it('a swipe pushes digits (active while down) but does not press', () => {
    pointerEvent(
      'pointerdown',
      { pointerType: 'touch', clientX: 100, clientY: 100, buttons: 1 },
      root,
      0,
    );
    pointerEvent(
      'pointermove',
      { pointerType: 'touch', clientX: 160, clientY: 120, buttons: 1 },
      root,
      50,
    );
    expect(tracker.state).toMatchObject({ active: true, radius: 80 });
    pointerEvent('pointerup', { pointerType: 'touch', clientX: 200, clientY: 130 }, root, 200);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('a long press is not a tap', () => {
    pointerEvent(
      'pointerdown',
      { pointerType: 'touch', clientX: 10, clientY: 10, buttons: 1 },
      root,
      0,
    );
    pointerEvent('pointerup', { pointerType: 'touch', clientX: 10, clientY: 10 }, root, 900);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('ignores right and middle mouse buttons', () => {
    pointerEvent(
      'pointerdown',
      { pointerType: 'mouse', clientX: 9, clientY: 9, buttons: 2, button: 2 },
      root,
    );
    pointerEvent(
      'pointerdown',
      { pointerType: 'mouse', clientX: 9, clientY: 9, buttons: 4, button: 1 },
      root,
    );
    expect(onPress).not.toHaveBeenCalled();
  });

  it('ignores a second finger', () => {
    pointerEvent(
      'pointerdown',
      { pointerType: 'touch', clientX: 10, clientY: 10, buttons: 1, isPrimary: false },
      root,
      0,
    );
    pointerEvent(
      'pointerup',
      { pointerType: 'touch', clientX: 10, clientY: 10, isPrimary: false },
      root,
      50,
    );
    expect(onPress).not.toHaveBeenCalled();
  });

  it('never presses from elements marked data-intro-ignore (the skip button)', () => {
    pointerEvent('pointerdown', { pointerType: 'mouse', clientX: 5, clientY: 5, buttons: 1 }, skip);
    pointerEvent(
      'pointerdown',
      { pointerType: 'touch', clientX: 5, clientY: 5, buttons: 1 },
      skip,
      0,
    );
    pointerEvent('pointerup', { pointerType: 'touch', clientX: 5, clientY: 5 }, skip, 50);
    expect(onPress).not.toHaveBeenCalled();
  });
});
