import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test('the header and the sections are there once the intro is over', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('header[data-visible="true"]');
  await expect(header).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-intro-lock', '');
  for (const id of ['about', 'experience', 'stack', 'education', 'contact']) {
    await expect(page.locator(`section#${id}`)).toHaveCount(1);
  }
});

test('a menu link scrolls to its section and becomes the current one', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  await page
    .getByRole('link', { name: /^(\d{2}\s?)?Stack$/ })
    .first()
    .click();
  await expect(page.locator('#stack')).toBeInViewport({ timeout: 5_000 });
  await expect(page).toHaveURL(/#stack$/);
  if (!isMobile) {
    await expect(page.getByRole('link', { name: /^(\d{2}\s?)?Stack$/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
  }
});

test('the page cannot scroll while the intro plays', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('section[data-state="idle"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('html')).toHaveAttribute('data-intro-lock', '');
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await context.close();
});

test('a reload starts the intro at the top, not at the restored scroll position', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'skip intro' }).click({ timeout: 10_000 });
  await page.evaluate(() => window.scrollTo(0, 145));
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator('section[data-state="idle"]')).toBeVisible({ timeout: 10_000 });
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await context.close();
});

test('headings decode from digits as they scroll in and keep the real text for assistive technology', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'skip intro' }).click({ timeout: 10_000 });
  await page.locator('#stack').scrollIntoViewIfNeeded();

  const visible = page.locator('#stack-title [aria-hidden="true"]');
  await expect(visible).toHaveText('Stack', { timeout: 5_000 });
  // The accessibility tree always has the real text, never the digits.
  await expect(page.getByRole('heading', { level: 2, name: 'Stack' })).toBeVisible();
  await context.close();
});
