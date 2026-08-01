import { expect, test } from '@playwright/test';
import { ROUTES } from './e2e-constants.mjs';
import { expectNoHorizontalOverflow, expectNoProblems, watchForProblems } from './helpers';

/**
 * Every published route must render the shared chrome, expose real landmarks,
 * load without a single console/page error, and never scroll sideways.
 */
for (const route of ROUTES) {
  test.describe(`route ${route}`, () => {
    test('loads without console errors, page errors, or failed requests', async ({ page }) => {
      const problems = watchForProblems(page);

      const response = await page.goto(route);
      expect(response?.status(), `${route} should return 200`).toBe(200);
      await page.waitForLoadState('networkidle');

      expectNoProblems(problems);
    });

    test('renders the header, primary navigation, and footer', async ({ page }) => {
      await page.goto(route);

      const header = page.getByRole('banner');
      await expect(header).toBeVisible();
      await expect(header.getByRole('link', { name: 'ClipTown home' })).toBeVisible();

      const nav = page.getByRole('navigation', { name: 'Primary navigation' });
      await expect(nav).toBeVisible();
      for (const label of ['Features', 'Platforms', 'Security', 'Support']) {
        await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
      }
      const githubNavLink = nav.getByRole('link', { name: /GitHub/ });
      await expect(githubNavLink).toHaveAttribute('href', 'https://github.com/cliptown');
      await expect(githubNavLink).toHaveAttribute('rel', /noopener/);
      await expect(githubNavLink).toHaveAttribute('rel', /noreferrer/);

      const footer = page.getByRole('contentinfo');
      await expect(footer).toBeVisible();
      await expect(footer.getByText(/ClipTown contributors/)).toBeVisible();
      await expect(footer.getByRole('link', { name: 'Security model' })).toBeVisible();
    });

    test('exposes a main landmark, a single h1, and a working skip link', async ({ page }) => {
      await page.goto(route);

      const main = page.getByRole('main');
      await expect(main).toBeVisible();
      await expect(main).toHaveAttribute('id', 'main-content');

      const headings = page.getByRole('heading', { level: 1 });
      await expect(headings).toHaveCount(1);
      await expect(headings).toBeVisible();
      await expect(headings).not.toHaveText('');

      const skipLink = page.getByRole('link', { name: 'Skip to content' });
      await expect(skipLink).toHaveAttribute('href', '#main-content');
      await skipLink.focus();
      await expect(skipLink).toBeVisible();
    });

    test('ships complete metadata for sharing and indexing', async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveTitle(/\S/);
      const title = await page.title();
      expect(title.length).toBeGreaterThan(8);

      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveCount(1);
      expect((await description.getAttribute('content'))?.length ?? 0).toBeGreaterThan(40);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBe(`https://cliptown.github.io${route === '/' ? '/' : route}`);

      for (const property of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']) {
        const content = await page
          .locator(`meta[property="${property}"]`)
          .getAttribute('content');
        expect(content, `${route} is missing ${property}`).toBeTruthy();
      }
      for (const name of ['twitter:card', 'twitter:title', 'twitter:image']) {
        const content = await page.locator(`meta[name="${name}"]`).getAttribute('content');
        expect(content, `${route} is missing ${name}`).toBeTruthy();
      }

      // Indexable routes must not be accidentally marked noindex.
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    });

    test('ships a restrictive content security policy', async ({ page }) => {
      await page.goto(route);

      const csp = await page
        .locator('meta[http-equiv="Content-Security-Policy"]')
        .getAttribute('content');
      expect(csp, `${route} is missing a CSP`).toBeTruthy();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("script-src 'none'");
    });

    test('does not scroll horizontally on mobile or desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(route);
      await expectNoHorizontalOverflow(page, `${route} @1280`);

      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(route);
      await expectNoHorizontalOverflow(page, `${route} @375`);
    });
  });
}

test.describe('site-wide chrome behaviour', () => {
  test('the header navigation moves between real pages', async ({ page }) => {
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await nav.getByRole('link', { name: 'Security', exact: true }).click();
    await expect(page).toHaveURL(/\/security$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Encrypted by devices');

    await nav.getByRole('link', { name: 'Support', exact: true }).click();
    await expect(page).toHaveURL(/\/support$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Support ClipTown');
  });

  test('platform cards on the homepage reach every platform page', async ({ page }) => {
    await page.goto('/');

    const platformCards = page.locator('.platform-grid a.platform-card');
    await expect(platformCards).toHaveCount(7);

    for (const path of ['/macos', '/windows', '/linux', '/ios', '/android', '/browser', '/cli']) {
      await expect(page.locator(`.platform-grid a.platform-card[href="${path}"]`)).toHaveCount(1);
    }

    await page.locator('.platform-grid a.platform-card[href="/macos"]').click();
    await expect(page).toHaveURL(/\/macos$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('macOS');
  });

  test('the 404 page renders the chrome and is marked noindex', async ({ page }) => {
    // The 404 status is the point of the test, so only that URL may error.
    const problems = watchForProblems(page, {
      expectedErrorUrls: /this-route-does-not-exist/,
    });

    const response = await page.goto('/this-route-does-not-exist');
    expect(response?.status()).toBe(404);

    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('not in the');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );

    await page.getByRole('link', { name: 'Return home' }).click();
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);

    expectNoProblems(problems);
  });

  test('every external link opens safely', async ({ page }) => {
    await page.goto('/');

    const externalLinks = await page.locator('a[target="_blank"]').evaluateAll((anchors) =>
      anchors.map((anchor) => {
        const a = anchor as HTMLAnchorElement;
        return { href: a.href, rel: a.getAttribute('rel') ?? '' };
      }),
    );

    expect(externalLinks.length).toBeGreaterThan(0);
    for (const link of externalLinks) {
      expect(link.href, `${link.href} must be https`).toMatch(/^https:\/\//);
      expect(link.rel.split(/\s+/), `${link.href} rel`).toEqual(
        expect.arrayContaining(['noopener', 'noreferrer']),
      );
    }
  });
});
