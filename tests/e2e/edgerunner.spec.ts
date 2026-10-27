import { expect, test, type Page } from '@playwright/test';

async function openSite(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'skip intro' }).click({ timeout: 10_000 });
  await expect(page.locator('section[data-state="done"]')).toBeVisible();
}

const switchOn = (page: Page) =>
  page.getByRole('button', { name: /Switch to the Edgerunner look/ });
const switchOff = (page: Page) =>
  page.getByRole('button', { name: /switch back to the classic look/ });

test('the Edgerunner button swaps the whole look, with lightning, and back', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openSite(page);
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);

  await switchOn(page).click();
  // The lightning canvas is on screen while the effect plays.
  await expect(page.locator('canvas[data-active="true"]')).toHaveCount(1, { timeout: 3_000 });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'edgerunner', {
    timeout: 5_000,
  });
  await expect(page.locator('canvas[data-active="true"]')).toHaveCount(0, { timeout: 5_000 });

  const art = page.locator('#about picture img');
  await expect(art).toBeVisible();
  await expect
    .poll(() => art.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);
  await expect(switchOff(page)).toHaveAttribute('aria-pressed', 'true');

  await switchOff(page).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/, { timeout: 5_000 });
  await expect(page.locator('#about picture')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('on a phone the hero uses the tall illustration with the text above the character', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page);
  await switchOn(page).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'edgerunner', {
    timeout: 5_000,
  });

  const art = page.locator('#about picture img');
  await expect
    .poll(() => art.evaluate((img: HTMLImageElement) => img.currentSrc))
    .toContain('hero-mobile');
  const text = (await page.locator('#about h1').boundingBox())!;
  const picture = (await page.locator('#about picture').boundingBox())!;
  expect(text.y).toBeLessThan(picture.y + picture.height * 0.3);
});

test('on a wide screen the text sits left and right of the character', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSite(page);
  await switchOn(page).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'edgerunner', {
    timeout: 5_000,
  });

  const art = page.locator('#about picture img');
  await expect
    .poll(() => art.evaluate((img: HTMLImageElement) => img.currentSrc))
    .toContain('hero-pc');
  const title = (await page.locator('#about h1').boundingBox())!;
  const about = (await page.getByText('I specialize in TypeScript').boundingBox())!;
  const middle = 1440 / 2;
  expect(title.x + title.width).toBeLessThan(middle);
  expect(about.x).toBeGreaterThan(middle);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the look switches at once, without lightning', async ({ page }) => {
    await page.goto('/');
    await switchOn(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'edgerunner', {
      timeout: 2_000,
    });
    await expect(page.locator('canvas[data-active="true"]')).toHaveCount(0);
  });
});
