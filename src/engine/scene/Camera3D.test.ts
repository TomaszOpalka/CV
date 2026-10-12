import { describe, expect, it } from 'vitest';

import { Camera3D } from './Camera3D';

function camera(): Camera3D {
  const cam = new Camera3D();
  cam.zoom = 100;
  cam.dist = 10;
  cam.cx = 400;
  cam.cy = 300;
  cam.update();
  return cam;
}

const out = new Float64Array(3);

describe('Camera3D', () => {
  it('puts the target in the middle of the screen and shows +x to the right, +z up (side view)', () => {
    const cam = camera();
    expect(cam.project(0, 0, 0, out)).toBe(true);
    expect([out[0], out[1]]).toEqual([400, 300]);
    cam.project(1, 0, 0, out);
    expect(out[0]).toBeCloseTo(500);
    expect(out[1]).toBeCloseTo(300);
    cam.project(0, 0, 1, out);
    expect(out[0]).toBeCloseTo(400);
    expect(out[1]).toBeCloseTo(200);
  });

  it('things farther away look smaller', () => {
    const cam = camera();
    cam.project(1, 0, 0, out);
    const near = out[0]! - 400;
    cam.project(1, 10, 0, out); // 10 units further from the camera
    const far = out[0]! - 400;
    expect(far).toBeLessThan(near);
    expect(far).toBeCloseTo(50);
  });

  it('from straight above, +y points up the screen; a quarter roll turns +x up', () => {
    const cam = camera();
    cam.pitch = 90;
    cam.update();
    cam.project(0, 1, 0, out);
    expect(out[1]).toBeCloseTo(200);
    expect(out[0]).toBeCloseTo(400);
    cam.roll = 90;
    cam.update();
    cam.project(1, 0, 0, out);
    expect(out[0]).toBeCloseTo(400);
    expect(out[1]).toBeCloseTo(200);
  });

  it('refuses points behind the camera', () => {
    const cam = camera();
    expect(cam.project(0, -50, 0, out)).toBe(false);
  });

  it('a head-on view (yaw 90) looks along -x', () => {
    const cam = camera();
    cam.yaw = 90;
    cam.update();
    cam.project(0, 1, 0, out);
    expect(out[0]).toBeCloseTo(500); // +y is to the right when looking at the car's nose
    expect(cam.depth(5, 0, 0)).toBeLessThan(cam.depth(-5, 0, 0)); // +x is nearer
  });
});
