import { expect, test } from '@playwright/test';
import { ROUTES } from './e2e-constants.mjs';
import { collectInternalLinks } from './helpers';

/**
 * Link integrity across the whole published site: every internal href must
 * resolve, every in-page anchor must have a target, and the sitemap must match
 * what was actually built.
 */
test.describe('internal link integrity', () => {
  test('every internal link on every page resolves to a real route', async ({ page, request }) => {
    const seen = new Map<string, string[]>();

    for (const route of ROUTES) {
      await page.goto(route);
      for (const link of await collectInternalLinks(page)) {
        seen.set(link, [...(seen.get(link) ?? []), route]);
      }
    }

    expect(seen.size, 'no internal links were collected').toBeGreaterThan(5);

    const broken: string[] = [];
    for (const [link, sources] of seen) {
      const [pathname] = link.split('#');
      const response = await request.get(pathname || '/');
      if (response.status() !== 200) {
        broken.push(`${link} -> ${response.status()} (linked from ${sources.join(', ')})`);
      }
    }

    expect(broken, 'broken internal links').toEqual([]);
  });

  test('every in-page anchor target exists', async ({ page }) => {
    const anchorsByPage = new Map<string, Set<string>>();

    for (const route of ROUTES) {
      await page.goto(route);
      for (const link of await collectInternalLinks(page)) {
        const [pathname, hash] = link.split('#');
        if (!hash) continue;
        const target = pathname || '/';
        anchorsByPage.set(target, (anchorsByPage.get(target) ?? new Set()).add(hash));
      }
    }

    expect(anchorsByPage.size, 'no in-page anchors were collected').toBeGreaterThan(0);

    const missing: string[] = [];
    for (const [target, hashes] of anchorsByPage) {
      await page.goto(target);
      for (const hash of hashes) {
        if ((await page.locator(`[id="${hash}"]`).count()) === 0) {
          missing.push(`${target}#${hash}`);
        }
      }
    }

    expect(missing, 'anchors pointing at nothing').toEqual([]);
  });

  test('the sitemap lists exactly the routes that were built', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);

    const xml = await response.text();
    const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
      new URL(match[1]).pathname.replace(/\/$/, ''),
    );

    const expected = ROUTES.map((route) => (route === '/' ? '' : route));
    expect(listed.sort()).toEqual(expected.sort());

    // The 404 page is noindex and must never be advertised.
    expect(xml).not.toContain('/404');
  });

  test('robots.txt points at the sitemap and allows crawling', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap: https://cliptown.github.io/sitemap.xml');
  });

  test('brand assets referenced by the chrome actually load', async ({ page, request }) => {
    await page.goto('/');

    const assets = await page.evaluate(() => {
      const sources = new Set<string>();
      document
        .querySelectorAll<HTMLImageElement>('img[src]')
        .forEach((img) => sources.add(new URL(img.src).pathname));
      document
        .querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="manifest"], link[rel="stylesheet"]')
        .forEach((link) => sources.add(new URL(link.href).pathname));
      return [...sources];
    });

    expect(assets).toContain('/brand-mark.svg');
    expect(assets).toContain('/favicon.svg');
    expect(assets).toContain('/site.webmanifest');

    for (const asset of assets) {
      const response = await request.get(asset);
      expect(response.status(), `${asset} should be served`).toBe(200);
    }
  });
});
