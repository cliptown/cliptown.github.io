/**
 * Shared between the e2e build script, the Playwright config, and the specs so
 * the two builds and the assertions about them can never drift apart.
 */

/** Output directory for the fail-closed build (PUBLIC_PATREON_URL empty). */
export const FAIL_CLOSED_OUT_DIR = 'dist';

/** Output directory for the build with a verified support destination. */
export const CONFIGURED_OUT_DIR = 'dist-e2e-configured';

/** The test-only support destination injected into the configured build. */
export const CONFIGURED_SUPPORT_URL = 'https://example.com/cliptown-verified-support';

export const FAIL_CLOSED_PORT = 4321;
export const CONFIGURED_PORT = 4322;

/** Every route the site publishes, as visitors request them. */
export const ROUTES = [
  '/',
  '/security',
  '/support',
  '/macos',
  '/windows',
  '/linux',
  '/ios',
  '/android',
  '/browser',
  '/cli',
];
