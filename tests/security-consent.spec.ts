import { expect, test } from '@playwright/test';

test('security page documents consent and protected-field boundaries', async ({ page }) => {
  await page.goto('/security');

  const consent = page.locator('#browser-capture-consent');
  await expect(consent).toBeVisible();
  const section = page.locator('article.prose');
  await expect(section).toContainText('exact site origin');
  await expect(section).toContainText('Revoking an origin');
  const source = section.getByRole('link', { name: /browser extension source/ });
  await expect(source).toHaveAttribute(
    'href',
    'https://github.com/cliptown/cliptown-extension',
  );
  await expect(source).toHaveAttribute('rel', /noopener/);
  await expect(source).toHaveAttribute('rel', /noreferrer/);
});
