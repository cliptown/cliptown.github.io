import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const errors = [];
const required = [
  'public/favicon.svg',
  'public/logo.svg',
  'public/social-card.svg',
  'public/site.webmanifest',
  'src/components/SiteHeader.astro',
  'src/components/SiteFooter.astro',
  'src/pages/security.astro',
  'src/pages/support.astro',
];

for (const file of required) {
  if (!existsSync(join(root, file))) errors.push(`missing required file: ${file}`);
}

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(join(root, 'src')).filter((file) => ['.astro', '.ts'].includes(extname(file)));
const pageRoutes = new Set(
  walk(join(root, 'src/pages'))
    .filter((file) => file.endsWith('.astro'))
    .map((file) => {
      const name = relative(join(root, 'src/pages'), file).replace(/\\/g, '/').replace(/\.astro$/, '');
      return name === 'index' ? '/' : `/${name.replace(/\/index$/, '')}`;
    }),
);

for (const file of files) {
  const label = relative(root, file);
  const text = readFileSync(file, 'utf8');
  if (/href=["']#["']/.test(text)) errors.push(`${label}: placeholder href="#"`);
  if (/Astro Starter Kit|Astro Basics|Download for Apple Silicon|Download for Windows \(x64\)|Get it on Google Play|Download on the App Store/.test(text)) {
    errors.push(`${label}: stale starter or unverified download copy`);
  }
  if (/https:\/\/www\.patreon\.com\/cliptown/i.test(text)) {
    errors.push(`${label}: unverified Patreon fallback URL`);
  }
  if (/PUBLIC_PATREON_URL\s*\?\?\s*["']https?:\/\//.test(text)) {
    errors.push(`${label}: PUBLIC_PATREON_URL must not have an external fallback`);
  }
  for (const match of text.matchAll(/href=["'](\/[^"'#?]*)[^"']*["']/g)) {
    const route = match[1].replace(/\/$/, '') || '/';
    if (route.includes('.')) continue;
    if (!pageRoutes.has(route)) errors.push(`${label}: unresolved internal route ${route}`);
  }
}

const supportPage = readFileSync(join(root, 'src/pages/support.astro'), 'utf8');
if (!supportPage.includes('Support destination pending verification')) {
  errors.push('src/pages/support.astro: missing fail-closed support status');
}
if (!supportPage.includes('The site has no fallback funding URL.')) {
  errors.push('src/pages/support.astro: missing no-fallback support disclosure');
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`site checks passed (${files.length} source files, ${pageRoutes.size} routes)`);
