import { expect, test } from '@playwright/test';
import { ROUTES } from './e2e-constants.mjs';
import { expectNoProblems, watchForProblems } from './helpers';

/**
 * PUBLIC_* variables are inlined into every built page, so whatever is in
 * PUBLIC_PATREON_URL ends up in an `href` served to every visitor. This build
 * was fed `javascript:alert(document.domain)//`.
 *
 * The site must reject it and fall back to the DEN-58 pending state rather than
 * shipping a clickable script URL.
 */
test.describe('a dangerous PUBLIC_PATREON_URL is rejected, not rendered', () => {
  test('falls back to the pending-verification state', async ({ page }) => {
    await page.goto('/support');

    const directSupport = page.locator('[data-support-state]');
    await expect(directSupport).toHaveAttribute('data-support-state', 'pending');
    await expect(
      directSupport.getByText('Support destination pending verification', { exact: true }),
    ).toBeVisible();
    await expect(directSupport.locator('a')).toHaveCount(0);
  });

  for (const route of ROUTES) {
    test(`no script URL reaches the markup on ${route}`, async ({ page }) => {
      await page.goto(route);

      const html = await page.content();
      expect(html).not.toMatch(/javascript:/i);
      expect(html).not.toContain('alert(document.domain)');

      const schemes = await page
        .locator('a[href]')
        .evaluateAll((anchors) =>
          anchors.map((a) => new URL((a as HTMLAnchorElement).href).protocol),
        );
      expect(schemes.length).toBeGreaterThan(5);
      expect(schemes.filter((scheme) => scheme !== 'http:' && scheme !== 'https:')).toEqual([]);
    });
  }

  test('the footer degrades to the internal support route', async ({ page }) => {
    const problems = watchForProblems(page, {
      expectedErrorUrls:
        /^https:\/\/ores-chat\.github\.io\/components\/v1\/ores-chat-footer-link\.js$/,
    });
    await page.goto('/');

    const footerSupport = page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Support destination pending verification' });
    await expect(footerSupport).toHaveAttribute('href', '/support');

    expectNoProblems(problems);
  });
});
