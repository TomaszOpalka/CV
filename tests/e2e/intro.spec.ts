import { expect, test, type Page } from '@playwright/test';

const SHOTS = 'test-results/shots';

async function openHome(page: Page): Promise<string[]> {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  await page.goto('/');
  return problems;
}

test('the heading and about text are in the server-rendered HTML', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('Tomasz Opalka');
  expect(html).toContain('To jest miejsce na krótki opis o mnie');
  expect(html).toContain('data-state="boot"');
});

test('boot -> idle -> click -> explosion -> portrait -> photo + text', async ({ page }, info) => {
  const problems = await openHome(page);
  const shot = (name: string) =>
    page.screenshot({ path: `${SHOTS}/${info.project.name}-${name}.png` });

  await expect(page.locator('section[data-state="boot"]')).toBeVisible();
  await expect(page.locator('section[data-state="idle"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await shot('1-idle');

  // Hover / drag so the digits are pushed away from the pointer.
  const box = (await page.locator('section[data-state]').boundingBox())!;
  const cx = box.x + box.width * 0.3;
  const cy = box.y + box.height * 0.65;
  await page.mouse.move(cx, cy, { steps: 4 });
  await page.mouse.move(cx + 60, cy + 10, { steps: 6 });
  await page.waitForTimeout(250);
  await shot('2-repel');

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('section[data-state="exploding"]')).toBeVisible({ timeout: 2_000 });
  await page.waitForTimeout(300);
  await shot('3-exploding');

  await expect(page.locator('section[data-state="morphing"]')).toBeVisible({ timeout: 3_000 });
  await page.waitForTimeout(1_200);
  await shot('4-morphing');

  await expect(page.locator('section[data-state="revealing"]')).toBeVisible({ timeout: 4_000 });
  await page.waitForTimeout(450);
  await shot('5-revealing');

  await expect(page.locator('section[data-state="done"]')).toBeVisible({ timeout: 5_000 });
  await page.waitForTimeout(900);
  await shot('6-done');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tomasz Opalka');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByAltText(/Portret autora/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pomiń intro' })).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('"Pomiń intro" jumps straight to the final view', async ({ page }) => {
  const problems = await openHome(page);
  await page.getByRole('button', { name: 'Pomiń intro' }).click();
  await expect(page.locator('section[data-state="done"]')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tomasz Opalka');
  expect(problems).toEqual([]);
});

test('prefers-reduced-motion shows the final view with no animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const problems = await openHome(page);
  await expect(page.locator('section[data-state="done"]')).toBeVisible({ timeout: 3_000 });
  await expect(page.getByAltText(/Portret autora/)).toBeVisible();
  expect(problems).toEqual([]);
});

test('the intro can be started from the keyboard', async ({ page }) => {
  await openHome(page);
  await expect(page.locator('section[data-state="idle"]')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Uruchom animację' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('section[data-state="exploding"]')).toBeVisible({ timeout: 2_000 });
  await expect(page.locator('section[data-state="done"]')).toBeVisible({ timeout: 8_000 });
});

test('frame pacing while the intro plays (informational)', async ({ page }, info) => {
  await openHome(page);
  await expect(page.locator('section[data-state="idle"]')).toBeVisible({ timeout: 10_000 });
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[] };
    w.__frames = [];
    let last = performance.now();
    const loop = (now: number) => {
      w.__frames.push(now - last);
      last = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  const box = (await page.locator('section[data-state]').boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 100);
  for (let i = 0; i < 30; i++)
    await page.mouse.move(box.x + 100 + i * 30, box.y + 300 + Math.sin(i / 3) * 120);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('section[data-state="done"]')).toBeVisible({ timeout: 8_000 });

  const frames = await page.evaluate(() =>
    (window as unknown as { __frames: number[] }).__frames.slice(5),
  );
  const sorted = [...frames].sort((a, b) => a - b);
  const avg = frames.reduce((s, f) => s + f, 0) / frames.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
  const worst = sorted[sorted.length - 1]!;
  const summary = `frames=${frames.length} avg=${avg.toFixed(1)}ms (~${(1000 / avg).toFixed(0)}fps) p95=${p95.toFixed(1)}ms worst=${worst.toFixed(1)}ms`;
  console.log(`[${info.project.name}] ${summary}`);
  info.annotations.push({ type: 'frame-pacing', description: summary });
  expect(frames.length).toBeGreaterThan(30);
});

test('touch: a swipe pushes digits without exploding, a tap explodes', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'touch input is only emulated in the mobile project');
  const problems = await openHome(page);
  await expect(page.locator('section[data-state="idle"]')).toBeVisible({ timeout: 10_000 });

  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
    });

  await touch('touchStart', 60, 300);
  for (let i = 1; i <= 12; i++) await touch('touchMove', 60 + i * 24, 300 + i * 8);
  await touch('touchEnd', 0, 0);
  await page.waitForTimeout(300);
  expect(await page.locator('section[data-state]').getAttribute('data-state')).toBe('idle');

  await page.touchscreen.tap(200, 420);
  await expect(page.locator('section[data-state="exploding"]')).toBeVisible({ timeout: 2_000 });
  await expect(page.locator('section[data-state="done"]')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByAltText(/Portret autora/)).toBeVisible();
  expect(problems).toEqual([]);
});
