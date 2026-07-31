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

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`site checks passed (${sourceFiles.length} source files, ${pages.size} routes)`);
