import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const required = [
  'public/brand-mark.svg',
  'public/favicon.svg',
  'public/site.webmanifest',
  'src/layouts/Layout.astro',
  'src/pages/index.astro',
  'src/pages/security.astro',
  'src/pages/support.astro',
];
const errors = [];

for (const file of required) {
  if (!existsSync(join(root, file))) errors.push(`missing required file: ${file}`);
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const sourceFiles = walk(join(root, 'src')).filter((file) => ['.astro', '.ts', '.css'].includes(extname(file)));
const pages = new Set(
  walk(join(root, 'src/pages'))
    .filter((file) => file.endsWith('.astro'))
    .map((file) => {
      const name = relative(join(root, 'src/pages'), file).replace(/\\/g, '/').replace(/\.astro$/, '');
      return name === 'index' ? '/' : `/${name.replace(/\/index$/, '')}`;
    }),
);

for (const file of sourceFiles) {
  const rel = relative(root, file);
  const text = readFileSync(file, 'utf8');
  if (/href=["']#["']/.test(text)) errors.push(`${rel}: placeholder href="#"`);
  if (/Astro Starter Kit|Astro Basics/.test(text)) errors.push(`${rel}: starter copy remains`);
  if (/Download for Apple Silicon|Download for Windows \(x64\)|Get it on Google Play|Download on the App Store/.test(text)) {
    errors.push(`${rel}: unverified production download copy remains`);
  }
  // DEN-58: the site must never ship an unverified funding fallback.
  if (/https:\/\/www\.patreon\.com\/cliptown/i.test(text)) {
    errors.push(`${rel}: unverified Patreon fallback URL`);
  }
  if (/PUBLIC_PATREON_URL\s*\?\?\s*["']https?:\/\//.test(text)) {
    errors.push(`${rel}: PUBLIC_PATREON_URL must not have an external fallback`);
  }
  for (const match of text.matchAll(/href=["'](\/[^"'#?]*)[^"']*["']/g)) {
    const path = match[1].replace(/\/$/, '') || '/';
    if (path.includes('.') || path.startsWith('/#')) continue;
    if (!pages.has(path)) errors.push(`${rel}: unresolved internal route ${path}`);
  }
  // Every new-tab link must sever the opener relationship. `rel="noreferrer"`
  // implies `noopener` in current browsers, but stating both keeps the
  // guarantee explicit and survives older engines.
  for (const match of text.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/g)) {
    const tag = match[0];
    const rel = /rel=["']([^"']*)["']/.exec(tag)?.[1] ?? '';
    const tokens = rel.split(/\s+/);
    if (!tokens.includes('noopener') || !tokens.includes('noreferrer')) {
      errors.push(`${relPath(file)}: target="_blank" link missing rel="noopener noreferrer"`);
    }
  }
}

function relPath(file) {
  return relative(root, file);
}

// The sitemap is a hand-maintained list; drift silently de-indexes real pages
// or advertises routes that do not exist.
const sitemapSource = readFileSync(join(root, 'src/pages/sitemap.xml.ts'), 'utf8');
const sitemapRoutes = new Set([...sitemapSource.matchAll(/^\s*'(\/[^']*)',/gm)].map((m) => m[1]));
const indexablePages = new Set([...pages].filter((page) => page !== '/404'));
for (const page of indexablePages) {
  if (!sitemapRoutes.has(page)) errors.push(`src/pages/sitemap.xml.ts: missing route ${page}`);
}
for (const route of sitemapRoutes) {
  if (!indexablePages.has(route)) errors.push(`src/pages/sitemap.xml.ts: route ${route} has no page`);
}

const favicon = readFileSync(join(root, 'public/favicon.svg'), 'utf8');
if (!/clipboard|ClipTown|linearGradient/i.test(favicon)) {
  errors.push('public/favicon.svg does not appear to contain the ClipTown mark');
}

// DEN-58: the support page must fail closed when no verified destination exists.
const supportPage = readFileSync(join(root, 'src/pages/support.astro'), 'utf8');
if (!supportPage.includes('Support destination pending verification')) {
  errors.push('src/pages/support.astro: missing fail-closed support status');
}
if (!supportPage.includes('The site has no fallback funding URL.')) {
  errors.push('src/pages/support.astro: missing no-fallback support disclosure');
}

// ---------------------------------------------------------------------------
// Built-output pass.
//
// The checks above only read `src/`, so nothing previously verified the
// artifact that actually gets published. A funding URL could reach `dist/`
// through `public/`, a stylesheet, the webmanifest, or a dependency and every
// source-level check would still pass. Anything shipped to GitHub Pages is
// verified here.
// ---------------------------------------------------------------------------
const requireDist = process.argv.includes('--require-dist');
const distDir = join(root, 'dist');
let distFileCount = 0;

if (!existsSync(distDir)) {
  if (requireDist) errors.push('dist/ is missing: run `npm run build` before checking built output');
} else {
  const textExtensions = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.svg', '.webmanifest', '.map']);
  const distFiles = walk(distDir).filter((file) => textExtensions.has(extname(file)));
  distFileCount = distFiles.length;

  // DEN-58: a configured PUBLIC_PATREON_URL is the ONLY way a funding link may
  // reach built output. Unset means the artifact must contain no funding link
  // at all, and the unverified fallback must never appear either way.
  const configuredSupportUrl = process.env.PUBLIC_PATREON_URL?.trim();

  for (const file of distFiles) {
    const rel = relative(root, file);
    const text = readFileSync(file, 'utf8');

    if (/patreon\.com\/cliptown/i.test(text)) {
      errors.push(`${rel}: built output contains the unverified Patreon fallback URL`);
    }
    if (!configuredSupportUrl && /https?:\/\/(www\.)?(patreon\.com|ko-fi\.com|buymeacoffee\.com|opencollective\.com|paypal\.(me|com))/i.test(text)) {
      errors.push(`${rel}: built output publishes a funding link but PUBLIC_PATREON_URL is not set`);
    }
    if (/href=["']#["']/.test(text)) errors.push(`${rel}: built output has placeholder href="#"`);
    if (/Astro Starter Kit|Astro Basics/.test(text)) errors.push(`${rel}: built output has starter copy`);
    if (/Download for Apple Silicon|Download for Windows \(x64\)|Get it on Google Play|Download on the App Store/.test(text)) {
      errors.push(`${rel}: built output has unverified production download copy`);
    }
    if (/javascript:/i.test(text)) errors.push(`${rel}: built output contains a javascript: URL`);
  }

  // The rendered fail-closed state, asserted on the published HTML itself.
  const supportHtmlPath = join(distDir, 'support/index.html');
  if (!existsSync(supportHtmlPath)) {
    errors.push('dist/support/index.html was not generated');
  } else {
    const supportHtml = readFileSync(supportHtmlPath, 'utf8');
    if (!supportHtml.includes('The site has no fallback funding URL.')) {
      errors.push('dist/support/index.html: missing no-fallback support disclosure');
    }
    if (configuredSupportUrl) {
      if (!supportHtml.includes(configuredSupportUrl)) {
        errors.push('dist/support/index.html: PUBLIC_PATREON_URL is set but the verified destination was not rendered');
      }
    } else if (!supportHtml.includes('Support destination pending verification')) {
      errors.push('dist/support/index.html: missing fail-closed support status');
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}
const distSummary = distFileCount ? `, ${distFileCount} built files` : '';
console.log(`site checks passed (${sourceFiles.length} source files, ${pages.size} routes${distSummary})`);
