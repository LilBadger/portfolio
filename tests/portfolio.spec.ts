import { expect, test } from '@playwright/test';

test('home exposes finished work without the draft article', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('VLAD');
  await expect(page.getByRole('heading', { name: 'Night of the Living Dead - LTX-2 Contest', exact: true })).toBeVisible();
  await expect(page.getByText('Building a Cyberpunk Bucharest with AI')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Articles', exact: true })).toHaveCount(0);
});

test('clean project routes have specific metadata and return to the work archive', async ({ page }) => {
  await page.goto('/projects/cat-walkman/');

  await expect(page).toHaveTitle('Cat Walkman — Vlad Maftei');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'http://127.0.0.1:4174/projects/cat-walkman/');

  await page.getByRole('link', { name: 'WORK', exact: true }).click();
  await expect(page).toHaveURL(/\/#work$/);
  await expect.poll(async () => page.locator('#work').evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(100);
});

test('mobile hero remains readable, contained, and compact', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-specific layout check');
  await page.goto('/');

  await expect(page.locator('.ascii-bunny--hero')).toHaveClass(/ascii-bunny--idle/, { timeout: 6_000 });

  const menu = page.getByRole('button', { name: 'Toggle navigation' });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'Contact', exact: true })).toBeVisible();

  const metrics = await page.evaluate(() => {
    const bunny = document.querySelector('.ascii-bunny--hero')?.getBoundingClientRect();
    const title = document.querySelector('.hero h1')?.getBoundingClientRect();
    const titleLines = [...document.querySelectorAll('.hero h1 .glitch-text')].map((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getBoundingClientRect();
    });
    const summary = document.querySelector('.hero-summary');
    const summaryRect = summary?.getBoundingClientRect();
    const terminal = document.querySelector('.hero-terminal-line');
    const overlaps = (first?: DOMRect, second?: DOMRect) => Boolean(
      first && second && first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top
    );
    return {
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      summaryFont: summary ? Number.parseFloat(getComputedStyle(summary).fontSize) : 0,
      bunnyRect: bunny ? { left: bunny.left, right: bunny.right, top: bunny.top, bottom: bunny.bottom } : null,
      titleRect: title ? { left: title.left, right: title.right, top: title.top, bottom: title.bottom } : null,
      bunnyClass: document.querySelector('.ascii-bunny--hero')?.className ?? '',
      bunnyRight: document.querySelector('.ascii-bunny--hero') ? getComputedStyle(document.querySelector('.ascii-bunny--hero') as Element).right : '',
      bunnyTransform: document.querySelector('.ascii-bunny--hero') ? getComputedStyle(document.querySelector('.ascii-bunny--hero') as Element).transform : '',
      bunnyInside: Boolean(bunny && bunny.left >= 0 && bunny.right <= document.documentElement.clientWidth),
      bunnyAvoidsTitle: !titleLines.some((line) => overlaps(bunny, line)),
      bunnyAvoidsSummary: !overlaps(bunny, summaryRect),
      terminalFits: Boolean(terminal && terminal.scrollWidth <= terminal.clientWidth + 1)
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
  expect(metrics.summaryFont).toBeGreaterThanOrEqual(14);
  expect(metrics.bunnyInside, JSON.stringify(metrics)).toBe(true);
  expect(metrics.bunnyAvoidsTitle).toBe(true);
  expect(metrics.bunnyAvoidsSummary).toBe(true);
  expect(metrics.terminalFits).toBe(true);
});

test('local video collections defer playback until selected', async ({ page }) => {
  await page.goto('/projects/xparticles-challenge-2018-animation-tests-and-explorations/');

  await expect(page.locator('.project-video__poster')).toHaveCount(10);
  await expect(page.locator('.project-video video')).toHaveCount(0);

  await page.getByRole('button', { name: 'Play Xparticles Challenge 2018 animation test 01' }).click();
  await expect(page.locator('.project-video video')).toHaveCount(1);
});

test('LTX contest dossier leads with the final and defers inline WIP playback', async ({ page }) => {
  await page.goto('/projects/night-of-the-living-dead-ltx-contest/');

  await expect(page).toHaveTitle('Night of the Living Dead - LTX-2 Contest — Vlad Maftei');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Night of the Living Dead');
  await expect(page.getByRole('button', { name: 'Play Final contest sequence' })).toBeVisible();
  await expect(page.locator('.ascii-bunny--zombie')).toHaveCount(1);
  await expect(page.locator('.content-video__poster')).toHaveCount(3);
  await expect(page.locator('.content-video video')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'The Constraint' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ComfyUI Graph' })).toBeVisible();

  await page.getByRole('button', { name: 'Play LTX-2 pose-guided motion test' }).click();
  await expect(page.locator('.content-video video')).toHaveCount(1);
});

test('videos precede gallery images and the text toggle reports its state', async ({ page }) => {
  await page.goto('/projects/cat-walkman/');

  const order = await page.evaluate(() => ({
    videoTop: document.querySelector('.project-videos')?.getBoundingClientRect().top ?? 0,
    galleryTop: document.querySelector('.project-gallery')?.getBoundingClientRect().top ?? 0
  }));
  expect(order.videoTop).toBeLessThan(order.galleryTop);

  const toggle = page.locator('.project-view-tools button');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.content-hero__excerpt')).toBeHidden();
});
