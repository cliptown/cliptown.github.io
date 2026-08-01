import { expect, test } from '@playwright/test';
import { CONFIGURED_SUPPORT_URL } from './e2e-constants.mjs';

/**
 * DEN-58 — the other half of the guarantee. With a verified PUBLIC_PATREON_URL
 * configured, the site must actually publish that destination (and only that
 * destination), so the fail-closed branch cannot be "passing" simply because
 * the feature is dead.
 */
test.describe('support page opens up once PUBLIC_PATREON_URL is configured', () => {
  test('renders the verified destination as a real link', async ({ page }) => {
    await page.goto('/support');

    const directSupport = page.locator('[data-support-state]');
    await expect(directSupport).toHaveCount(1);
    await expect(directSupport).toHaveAttribute('data-support-state', 'verified');

    const supportLink = directSupport.getByRole('link', { name: /open verified support page/i });
    await expect(supportLink).toBeVisible();
    await expect(supportLink).toHaveAttribute('href', CONFIGURED_SUPPORT_URL);
    await expect(supportLink).toHaveAttribute('target', '_blank');

    // New-tab links must sever the opener relationship.
    const rel = (await supportLink.getAttribute('rel')) ?? '';
    expect(rel.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));

    await expect(page.getByText('Support destination pending verification')).toHaveCount(0);
  });

  test('the footer links to the verified destination', async ({ page }) => {
    await page.goto('/');

    const footerSupport = page
      .getByRole('contentinfo')
      .getByRole('link', { name: /verified support destination/i });
    await expect(footerSupport).toBeVisible();
    await expect(footerSupport).toHaveAttribute('href', CONFIGURED_SUPPORT_URL);

    const rel = (await footerSupport.getAttribute('rel')) ?? '';
    expect(rel.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
  });

  test('still discloses the no-fallback policy', async ({ page }) => {
    await page.goto('/support');

    await expect(
      page.getByText('The site has no fallback funding URL.', { exact: false }),
    ).toBeVisible();
  });

  test('never substitutes the unverified fallback URL', async ({ page }) => {
    await page.goto('/support');

    const html = await page.content();
    expect(html).not.toMatch(/patreon\.com\/cliptown/i);
  });
});
