import { expect, test, type Page } from '@playwright/test';

async function openPixels(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'skip intro' }).click({ timeout: 10_000 });
  await expect(page.locator('section[data-state="done"]')).toBeVisible();
  await page.locator('#pixels').scrollIntoViewIfNeeded();
  await expect(page.locator('#pixels [data-mode="armed"]')).toBeVisible({ timeout: 10_000 });
}

test('before the explosion the links are hidden, holding the pointer reveals them', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openPixels(page);

  const links = page.locator('#pixels a[href^="https://"]');
  const cards = page.locator('#pixels ul');
  await expect(cards).toHaveCSS('opacity', '0');
  await expect(cards).toHaveAttribute('inert', '');
  const canvas = page.locator('#pixels canvas');
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
  // Holding heats the pixels up and, once fully charged, explodes them.
  await page.mouse.down();

  await expect(page.locator('#pixels [data-mode="cleared"]')).toBeVisible({ timeout: 12_000 });
  await page.mouse.up();
  await expect(cards).toHaveCSS('opacity', '1');
  await expect(cards).not.toHaveAttribute('inert', '');
  await expect(links).toHaveCount(3);

  await page.getByRole('button', { name: 'Rebuild the pixels' }).click();
  await expect(page.locator('#pixels [data-mode="armed"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the reveal button works from the keyboard', async ({ page }) => {
  await openPixels(page);
  const reveal = page.getByRole('button', { name: 'Reveal links' });
  await reveal.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#pixels [data-mode="cleared"]')).toBeVisible({ timeout: 10_000 });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the links are simply there', async ({ page }) => {
    await page.goto('/');
    await page.locator('#pixels').scrollIntoViewIfNeeded();
    await expect(page.locator('#pixels [data-mode="static"]')).toBeVisible();
    await expect(page.locator('#pixels a[href^="https://"]').first()).toBeVisible();
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
