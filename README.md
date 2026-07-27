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
npm run check:site
npm test
```

`check:site` verifies required brand assets and routes, rejects placeholder `href="#"` links, rejects stale Astro starter content, and blocks unverified production-download claims. `npm test` also builds the complete static site.

## Deployment

Pull requests run `.github/workflows/ci.yml`. Pushes to `main` validate, build, and deploy through `.github/workflows/deploy.yml` using GitHub Pages OIDC permissions.

## Brand assets

- `public/brand-mark.svg` — primary skyline and clipboard mark for headers and footers.
- `public/favicon.svg` — compact browser icon using the same geometry.
- `public/site.webmanifest` — installable-site metadata.
- `public/logo.jpg` — retained as the current raster social-preview image until a dedicated Open Graph card is exported.

## Support links

The live GitHub organization is the primary community link. `patreon.com/cliptown` is included as the intended Patreon URL but must be verified before a public funding announcement.
