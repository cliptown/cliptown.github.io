import { expect, test } from '@playwright/test';
import { FUNDING_HOST_PATTERN } from './helpers';
import { ROUTES } from './e2e-constants.mjs';

/**
 * DEN-58 — with PUBLIC_PATREON_URL unset the rendered site must fail closed:
 * no funding link anywhere, an explicitly disabled control, and an honest
 * disclosure that there is no fallback.
 */
test.describe('support page fails closed without PUBLIC_PATREON_URL', () => {
  test('renders the pending-verification state instead of a funding link', async ({ page }) => {
    await page.goto('/support');

    const directSupport = page.locator('[data-support-state]');
    await expect(directSupport).toHaveCount(1);
    await expect(directSupport).toHaveAttribute('data-support-state', 'pending');

    const pendingControl = page.getByText('Support destination pending verification', { exact: true });
    await expect(pendingControl).toBeVisible();

    // The control inside the Direct support card must not be a link at all.
    const controlInCard = directSupport.getByText('Support destination pending verification', {
      exact: true,
    });
    await expect(controlInCard).toHaveCount(1);
    await expect(controlInCard).toHaveAttribute('aria-disabled', 'true');
    await expect(controlInCard).toHaveJSProperty('tagName', 'SPAN');
    await expect(directSupport.locator('a')).toHaveCount(0);
  });

  test('discloses that no fallback funding URL exists', async ({ page }) => {
    await page.goto('/support');

    await expect(
      page.getByText('The site has no fallback funding URL.', { exact: false }),
    ).toBeVisible();
    await expect(page.getByText('has not been verified yet', { exact: false })).toBeVisible();
  });

  test('the footer points at /support rather than an external destination', async ({ page }) => {
    await page.goto('/support');

    const footer = page.getByRole('contentinfo');
    const footerSupport = footer.getByRole('link', {
      name: 'Support destination pending verification',
    });
    await expect(footerSupport).toBeVisible();
    await expect(footerSupport).toHaveAttribute('href', '/support');

    await expect(footer.getByRole('link', { name: /verified support destination/i })).toHaveCount(0);
  });

  for (const route of ROUTES) {
    test(`publishes no funding link on ${route}`, async ({ page }) => {
      await page.goto(route);

      // No anchor may target a funding host...
      const hrefs = await page
        .locator('a[href]')
        .evaluateAll((anchors) => anchors.map((a) => (a as HTMLAnchorElement).href));
      expect(hrefs.length).toBeGreaterThan(5);
      expect(hrefs.filter((href) => FUNDING_HOST_PATTERN.test(href))).toEqual([]);

      // ...and the unverified fallback must not appear in the markup at all,
      // including comments, JSON-LD, and inline styles.
      const html = await page.content();
      expect(html).not.toMatch(/patreon\.com\/cliptown/i);
      expect(html).not.toMatch(FUNDING_HOST_PATTERN);
    });
  }

  test('the homepage support call to action stays internal', async ({ page }) => {
    await page.goto('/');

    const supportCta = page.getByRole('link', { name: 'Support options' });
    await expect(supportCta).toBeVisible();
    await expect(supportCta).toHaveAttribute('href', '/support');

    await supportCta.click();
    await expect(page).toHaveURL(/\/support$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Support ClipTown');
  });
});
