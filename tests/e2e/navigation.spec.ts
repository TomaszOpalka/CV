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
  expect(new URL(page.url()).hash).toBe('');
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
  await expect(page.getByRole('heading', { level: 2, name: 'Stack' })).toBeVisible();
  await context.close();
});

test('on a phone a tap outside the open menu closes it', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the menu panel exists on small screens only');
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Open menu' });
  await toggle.click();
  await expect(page.locator('#site-nav')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  const viewport = page.viewportSize()!;
  await page.mouse.click(viewport.width / 2, viewport.height - 40);
  await expect(page.locator('#site-nav')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('a nav link is a tile as tall as the header', async ({ page, isMobile }) => {
  test.skip(isMobile, 'tiles are as tall as the header on desktop');
  await page.goto('/');
  const link = page.getByRole('link', { name: /^Stack$/ });
  const box = (await link.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(62);
});

test('experience stays simple: three points per project, the rest behind "Show more"', async ({
  page,
}) => {
  await page.goto('/');
  const first = page
    .locator('#experience li')
    .filter({ has: page.locator('h4') })
    .first();
  await expect(first.locator('> ul').last()).toBeVisible();
  const more = first.locator('details');
  await expect(more).toHaveCount(1);
  await expect(more).not.toHaveAttribute('open', '');
  await more.locator('summary').click();
  await expect(more).toHaveAttribute('open', '');
});

test('the page tells search engines and AI assistants the same thing it tells people', async ({
  request,
}) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('<title>Tomasz Opałka | Junior Fullstack Developer in Wrocław</title>');
  const match = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html);
  expect(match).not.toBeNull();
  const data = JSON.parse(match![1]!) as {
    '@type': string;
    name: string;
    address: { addressLocality: string };
  };
  expect(data['@type']).toBe('Person');
  expect(data.name).toBe('Tomasz Opałka');
  expect(data.address.addressLocality).toBe('Wrocław');
  // The offer in the structured data is on the page for people, too.
  expect(html).toContain('a fast, affordable website');
  const llms = await request.get('/llms.txt');
  expect(llms.ok()).toBe(true);
});

test('stack: the groups are tabs, the core technologies come first in the accent colour', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  const stack = page.locator('#stack');

  const frontend = stack.getByRole('button', { name: /Languages & Frontend/i });
  await expect(frontend).toHaveAttribute('aria-expanded', 'true');
  const typescript = stack.getByRole('listitem').filter({ hasText: 'TypeScript' }).first();
  await expect(typescript).toHaveCSS('color', 'rgb(255, 150, 50)');
  const tanstack = stack.getByRole('listitem').filter({ hasText: 'TanStack Query' }).first();
  await expect(tanstack).toHaveCSS('color', 'rgb(255, 255, 255)');

  const ui = stack.getByRole('button', { name: /UI & Styling/i });
  await ui.click();
  await expect(ui).toHaveAttribute('aria-expanded', 'true');
  await expect(frontend).toHaveAttribute('aria-expanded', 'false');
  await expect(stack.getByRole('listitem').filter({ hasText: 'Figma' }).first()).toBeVisible();

  if (isMobile) {
    await ui.click();
    await expect(ui).toHaveAttribute('aria-expanded', 'false');
  } else {
    await ui.click();
    await expect(ui).toHaveAttribute('aria-expanded', 'true');
  }
});
