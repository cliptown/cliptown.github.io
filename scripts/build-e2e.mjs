/**
 * Builds the two artifacts the browser suite drives.
 *
 * `PUBLIC_*` variables are inlined by Vite at build time, so the DEN-58
 * fail-closed behaviour and the configured behaviour are two different static
 * builds. Producing both here (sequentially, to avoid two Astro processes
 * racing on the same `.astro/` cache) keeps the Playwright config to plain
 * static file serving.
 *
 *   dist/                     PUBLIC_PATREON_URL explicitly empty -> fail closed
 *   dist-e2e-configured/      PUBLIC_PATREON_URL set to a test destination
 */
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:child_process' in globalThis ? await import('node:fs') : await import('node:fs');

export const CONFIGURED_SUPPORT_URL = 'https://example.com/cliptown-verified-support';
export const CONFIGURED_OUT_DIR = 'dist-e2e-configured';

function build({ outDir, supportUrl, label }) {
  console.log(`\n[build:e2e] ${label} -> ${outDir}`);
  rmSync(outDir, { recursive: true, force: true });

  const result = spawnSync(
    process.execPath,
    ['node_modules/astro/astro.js', 'build', '--outDir', outDir],
    {
      stdio: 'inherit',
      // An explicit empty string beats an unset variable here: it also
      // overrides anything a local .env file might inject, so the fail-closed
      // build is genuinely unconfigured.
      env: { ...process.env, PUBLIC_PATREON_URL: supportUrl },
    },
  );

  if (result.status !== 0) {
    console.error(`[build:e2e] ${label} build failed`);
    process.exit(result.status ?? 1);
  }
}

build({ outDir: 'dist', supportUrl: '', label: 'fail-closed build (PUBLIC_PATREON_URL empty)' });
build({
  outDir: CONFIGURED_OUT_DIR,
  supportUrl: CONFIGURED_SUPPORT_URL,
  label: `configured build (PUBLIC_PATREON_URL=${CONFIGURED_SUPPORT_URL})`,
});

console.log('\n[build:e2e] both builds complete');
