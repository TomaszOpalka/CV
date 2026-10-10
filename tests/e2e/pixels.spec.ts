import { expect, test } from '@playwright/test';

async function openPixels(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'skip intro' }).click({ timeout: 10_000 });
  await expect(page.locator('section[data-state="done"]')).toBeVisible();
  await page.locator('#pixels').scrollIntoViewIfNeeded();
  await expect(page.locator('#pixels [data-mode="armed"]')).toBeVisible({ timeout: 10_000 });
}

test('before the explosion the links are hidden, a click reveals them', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openPixels(page);

  const links = page.locator('#pixels a[href^="https://"]');
  const cards = page.locator('#pixels ul');
  await expect(cards).toHaveCSS('opacity', '0');
  await expect(cards).toHaveAttribute('inert', '');
  const canvas = page.locator('#pixels canvas');
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(page.locator('#pixels [data-mode="cleared"]')).toBeVisible({ timeout: 10_000 });
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
