import { expect, test } from '@playwright/test';

test('home exposes finished work without the draft article', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('VLAD');
  await expect(page.getByRole('heading', { name: 'Night of the Living Dead - LTX-2 Contest', exact: true })).toBeVisible();
  await expect(page.getByText('Building a Cyberpunk Bucharest with AI')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Articles', exact: true })).toHaveCount(0);
});

test('work archive prioritizes current transmissions and normalizes older cards', async ({ page }, testInfo) => {
  await page.goto('/#work');

  const currentGrid = page.locator('.work-grid--current');
  const archiveGrid = page.locator('.work-grid--archive');
  await expect(page.getByText('_CURRENT TRANSMISSIONS', { exact: true })).toBeVisible();
  await expect(page.getByText('_ARCHIVE INDEX', { exact: true })).toBeVisible();
  await expect(currentGrid.locator('.work-card')).toHaveCount(2);
  await expect(archiveGrid.locator('.work-card')).toHaveCount(12);
  await expect(currentGrid.locator('h3').nth(0)).toHaveText('F1R - Fugi Visualizer');
  await expect(currentGrid.locator('h3').nth(1)).toHaveText('Night of the Living Dead - LTX-2 Contest');

  const metrics = await page.evaluate(() => {
    const current = document.querySelector('.work-grid--current');
    const archive = document.querySelector('.work-grid--archive');
    const copyHeights = [...document.querySelectorAll('.work-grid--archive .work-card__copy')]
      .slice(0, 6)
      .map((element) => Math.round(element.getBoundingClientRect().height));
    const title = document.querySelector('.work-grid--archive h3');
    return {
      currentColumns: current ? getComputedStyle(current).gridTemplateColumns.split(' ').length : 0,
      archiveColumns: archive ? getComputedStyle(archive).gridTemplateColumns.split(' ').length : 0,
      copyHeights,
      titleClamp: title ? getComputedStyle(title).webkitLineClamp : ''
    };
  });

  expect(metrics.currentColumns).toBe(testInfo.project.name === 'mobile' ? 1 : 2);
  expect(metrics.archiveColumns).toBe(testInfo.project.name === 'mobile' ? 1 : 3);
  expect(new Set(metrics.copyHeights).size).toBe(1);
  expect(metrics.titleClamp).toBe('2');
});

test('home navigation marks the section currently crossing the viewport', async ({ page }) => {
  await page.goto('/');

  await page.locator('#process').scrollIntoViewIfNeeded();
  await expect(page.locator('#main-navigation a[href="/#process"]')).toHaveClass(/is-active/);

  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.locator('#main-navigation a[href="/#contact"]')).toHaveClass(/is-active/);
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

test('project dossiers expose sticky contents and deliberate previous-next exits', async ({ page }, testInfo) => {
  await page.goto('/projects/fugi-visualizer/');

  const utilityRail = page.locator('.project-utility-rail');
  await expect(utilityRail).toHaveCSS('position', 'sticky');
  await expect(page.locator('#project-signal')).toHaveCount(1);
  await expect(page.locator('#what-i-made-with-codex')).toHaveCount(1);
  await expect(page.locator('#f1r-character-explorations')).toHaveCount(1);
  await expect(page.locator('#extended-video-tests')).toHaveCount(1);

  if (testInfo.project.name === 'mobile') {
    const menu = page.locator('.project-contents--mobile');
    await expect(menu).toBeVisible();
    await menu.locator('summary').click();
    await expect(menu.getByRole('link', { name: '03 CHARACTER', exact: true })).toBeVisible();
  } else {
    const contents = page.locator('.project-contents--desktop');
    await expect(contents).toBeVisible();
    await expect(contents.getByRole('link')).toHaveCount(4);
  }

  await expect(page.locator('.project-exit-nav__previous')).toHaveAttribute('href', '/projects/quixel-mixer-contest/');
  await expect(page.locator('.project-exit-nav__archive')).toHaveAttribute('href', '/#work');
  await expect(page.locator('.project-exit-nav__next')).toHaveAttribute('href', '/projects/night-of-the-living-dead-ltx-contest/');
});

test('project images remain contained within the viewport height', async ({ page }) => {
  await page.goto('/projects/fugi-visualizer/');

  const image = page.locator('.content-image img').first();
  await image.scrollIntoViewIfNeeded();
  const dimensions = await image.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { height: bounds.height, viewportHeight: window.innerHeight, objectFit: getComputedStyle(element).objectFit };
  });

  expect(dimensions.height).toBeLessThanOrEqual(dimensions.viewportHeight * 0.82 + 1);
  expect(dimensions.objectFit).toBe('contain');
});

test('full-resolution viewer supports fit, actual pixels, navigation, and focus return', async ({ page }) => {
  await page.goto('/projects/trips/');

  const trigger = page.getByRole('button', { name: 'Inspect trips artwork 1 full resolution' });
  await trigger.click();

  const viewer = page.getByRole('dialog', { name: 'Full-resolution image viewer' });
  const image = viewer.locator('.image-viewer__viewport img');
  await expect(viewer).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/trips\/$/);
  await expect(viewer.getByRole('button', { name: 'FIT', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(image).toHaveAttribute('src', /\/assets\/artstation\/trips\//);

  await viewer.getByRole('button', { name: '100%', exact: true }).click();
  await expect(viewer.getByRole('button', { name: '100%', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(viewer.locator('.image-viewer__viewport')).toHaveClass(/image-viewer__viewport--actual/);
  await expect(image).toHaveCSS('max-width', 'none');

  const firstSource = await image.getAttribute('src');
  await viewer.getByRole('button', { name: 'Next image' }).click();
  await expect(viewer.getByText(/02 \/ \d{2}/)).toBeVisible();
  await expect.poll(() => image.getAttribute('src')).not.toBe(firstSource);

  await page.keyboard.press('ArrowLeft');
  await expect(viewer.getByText(/01 \/ \d{2}/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator('body')).not.toHaveClass(/image-viewer-open/);
});

test('article images open in the same full-resolution viewer', async ({ page }) => {
  await page.goto('/projects/fugi-visualizer/');

  const trigger = page.locator('.content-image__full-link').first();
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Full-resolution image viewer' })).toBeVisible();
  await expect(page.locator('.image-viewer__viewport img')).toHaveAttribute('src', /\/assets\/projects\/fugi-visualizer\/.*\.png$/);
});

test('project cards react as one object on hover', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Hover feedback is desktop-specific');
  await page.goto('/#work');

  const card = page.locator('.work-card').first();
  await card.hover();
  await expect(card.locator('.work-card__popup')).toHaveCSS('opacity', '1');
  await expect(card.locator('.work-card__media img')).toHaveCSS('filter', /brightness\(0\.62\)/);
  await expect(card.locator('h3')).toHaveCSS('color', 'rgb(229, 248, 255)');
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
