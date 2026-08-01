# ClipTown marketing site

Astro-powered public site for the [ClipTown GitHub organization](https://github.com/cliptown).

The site describes the product architecture honestly while the desktop, mobile, browser, CLI, backend, SDK, interface, and infrastructure repositories are under active development. It does not publish placeholder download buttons as real releases.

## Local development

```bash
npm ci
npm run dev
```

## Validation

```bash
npm run check:site   # static checks over src/
npm test             # check:site, build, then re-validate the built dist/
npm run test:e2e     # Playwright: build three site variants and drive them in Chromium
```

`check:site` verifies required brand assets and routes, rejects placeholder `href="#"` links, rejects stale Astro starter content, blocks unverified production-download claims, requires `rel="noopener noreferrer"` on every `target="_blank"` link, and keeps `sitemap.xml` in sync with the real pages.

`check:dist` (run by `npm test` after the build) repeats the safety checks against the artifact that actually gets published, which is where the funding-link policy below is enforced.

## Browser tests

`npm run test:e2e` builds the site three times — with `PUBLIC_PATREON_URL` empty, set to a test destination, and set to a hostile `javascript:` value — serves each build the way GitHub Pages does, and drives all three in Chromium. The suite asserts the fail-closed funding behaviour, the enabled funding behaviour, console/page-error freedom on every route, the shared nav/footer chrome and landmarks, absence of horizontal overflow at 375px and 1280px, and internal-link/anchor/sitemap integrity.

Chromium must be installed once: `npx playwright install --with-deps chromium`.

## Deployment

Pull requests run `.github/workflows/ci.yml`. Pushes to `main` validate, build, and deploy through `.github/workflows/deploy.yml` using GitHub Pages OIDC permissions.

## Brand assets

- `public/brand-mark.svg` — primary skyline and clipboard mark for headers and footers.
- `public/favicon.svg` — compact browser icon using the same geometry.
- `public/site.webmanifest` — installable-site metadata.
- `public/logo.jpg` — retained as the current raster social-preview image until a dedicated Open Graph card is exported.

## Support links (DEN-58: fail closed)

The live GitHub organization is the primary community link. The site publishes **no** direct-funding destination by default and ships no fallback funding URL of any kind.

A funding link appears only when the `PUBLIC_PATREON_URL` environment variable is set at build time, after the destination's ownership has been verified, and only when the value parses as an absolute `https://` URL. Anything else — unset, blank, malformed, or a `javascript:`/`data:` value — renders the disabled "Support destination pending verification" state instead (`src/lib/support.ts`).

```bash
PUBLIC_PATREON_URL="https://www.example.com/verified-destination" npm run build
```

This is enforced in three places, so removing any one of them still fails the build: `check:site` (sources), `check:dist` (published artifact), the Playwright suite (rendered pages), and the artifact gate in `.github/workflows/deploy.yml`.
