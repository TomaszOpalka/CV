import { expect, test, type Page } from '@playwright/test';

async function openPixels(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'skip intro' }).click({ timeout: 10_000 });
  await expect(page.locator('section[data-state="done"]')).toBeVisible();
  await page.locator('#portfolio').scrollIntoViewIfNeeded();
  await expect(page.locator('#portfolio [data-mode="armed"]')).toBeVisible({ timeout: 10_000 });
}

test('before the explosion the links are hidden, holding the pointer reveals them', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openPixels(page);

  const links = page.locator('#portfolio a[href^="https://"]');
  const cards = page.locator('#portfolio ul');
  await expect(cards).toHaveCSS('opacity', '0');
  await expect(cards).toHaveAttribute('inert', '');
  const canvas = page.locator('#portfolio canvas');
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.mouse.down();

  await expect(page.locator('#portfolio [data-mode="cleared"]')).toBeVisible({ timeout: 12_000 });
  await page.mouse.up();
  await expect(cards).toHaveCSS('opacity', '1');
  await expect(cards).not.toHaveAttribute('inert', '');
  await expect(links).toHaveCount(3);

  await page.getByRole('button', { name: 'Rebuild the pixels' }).click();
  await expect(page.locator('#portfolio [data-mode="armed"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('"Rebuild the pixels" brings the wall of dim digits back', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'skip intro' }).click({ timeout: 10_000 });
  await page.locator('#portfolio').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  const painted = () =>
    page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('#portfolio canvas')!;
      const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) count++;
      return count;
    });
  const before = await painted();
  expect(before).toBeGreaterThan(100_000);

  const box = (await page.locator('#portfolio canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.mouse.down();
  await expect(page.locator('#portfolio [data-mode="cleared"]')).toBeVisible({ timeout: 15_000 });
  await page.mouse.up();
  expect(await painted()).toBe(0);

  await page.getByRole('button', { name: 'Rebuild the pixels' }).click();
  // Check right away: the quality governor may later rebuild the field by itself and hide the bug.
  await page.waitForTimeout(150);
  expect(await painted()).toBeGreaterThan(100_000);
});

test('the reveal button works from the keyboard', async ({ page }) => {
  await openPixels(page);
  const reveal = page.getByRole('button', { name: 'Reveal links' });
  await reveal.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#portfolio [data-mode="cleared"]')).toBeVisible({ timeout: 10_000 });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the links are simply there', async ({ page }) => {
    await page.goto('/');
    await page.locator('#portfolio').scrollIntoViewIfNeeded();
    await expect(page.locator('#portfolio [data-mode="static"]')).toBeVisible();
    await expect(page.locator('#portfolio a[href^="https://"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reveal links' })).toHaveCount(0);
  });
});

test('the pixel cursor leaves a coloured trail and the system cursor is hidden', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'no custom cursor on touch devices');
  await page.goto('/');
  await page.getByRole('button', { name: 'skip intro' }).click({ timeout: 10_000 });
  await expect(page.locator('html[data-cursor-ready]')).toHaveCount(1, { timeout: 5_000 });
  for (let i = 0; i < 30; i++) await page.mouse.move(300 + i * 20, 300 + Math.sin(i / 4) * 40);
  const painted = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[aria-hidden]:last-of-type');
    const all = [...document.querySelectorAll('canvas')];
    const cursor = all.find((c) => getComputedStyle(c).position === 'fixed') ?? canvas;
    if (!cursor) return 0;
    const data = cursor.getContext('2d')!.getImageData(0, 0, cursor.width, cursor.height).data;
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) count++;
    return count;
  });
  expect(painted).toBeGreaterThan(100);
});

test('the arrow cursor puts its tip exactly on the pointer', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no custom cursor on touch devices');
  await page.goto('/');
  await page.getByRole('button', { name: 'skip intro' }).click({ timeout: 10_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(800);
  const box = (await page.locator('#contact a[href^="https://github"]').boundingBox())!;
  const px = Math.round(box.x + 40);
  const py = Math.round(box.y + 8);
  await page.mouse.move(px - 100, py + 60);
  await page.mouse.move(px, py, { steps: 4 });
  await page.waitForTimeout(1500); // the comet is gone, only the arrow is left
  const tip = await page.evaluate(() => {
    const canvas = [...document.querySelectorAll('canvas')].find(
      (c) => getComputedStyle(c).position === 'fixed' && c.width > 500,
    )!;
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = Infinity;
    let minY = Infinity;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3]! > 40) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
        }
      }
    }
    return {
      x: minX / (canvas.width / window.innerWidth),
      y: minY / (canvas.height / window.innerHeight),
    };
  });
  expect(Math.abs(tip.x - px)).toBeLessThanOrEqual(2);
  expect(Math.abs(tip.y - py)).toBeLessThanOrEqual(2);
});

test('scrolling with a still mouse changes the cursor icon to the one of the section', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'no custom cursor on touch devices');
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'skip intro' }).click({ timeout: 10_000 });
  await page.mouse.move(720, 480);

  const averageColour = () =>
    page.evaluate(() => {
      const canvas = [...document.querySelectorAll('canvas')].find(
        (c) => getComputedStyle(c).position === 'fixed' && c.width > 500,
      )!;
      const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let r = 0;
      let b = 0;
      let n = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3]! > 200) {
          r += data[i]!;
          b += data[i + 2]!;
          n++;
        }
      }
      return { r: r / Math.max(1, n), b: b / Math.max(1, n), n };
    });
  const goTo = (id: string) =>
    page.evaluate(
      (target) =>
        window.scrollTo(
          0,
          document.getElementById(target)!.getBoundingClientRect().top + window.scrollY - 64,
        ),
      id,
    );

  // Briefcase is cyan, envelope orange. Polled: the icon swaps on the next 120 ms hit-test, which a loaded CI can delay.
  const settled = async () => {
    let colour = await averageColour();
    await expect
      .poll(async () => (colour = await averageColour()).n, { timeout: 10_000 })
      .toBeGreaterThan(50);
    return colour;
  };
  await goTo('experience');
  await page.waitForTimeout(1800);
  const experience = await settled();
  await goTo('contact');
  await page.waitForTimeout(1800);
  const contact = await settled();
  expect(experience.b).toBeGreaterThan(contact.b + 20);
  expect(contact.r).toBeGreaterThan(experience.r - 1);
});
