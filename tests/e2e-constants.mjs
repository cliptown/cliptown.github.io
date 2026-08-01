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

/** Output directory for the build fed a dangerous PUBLIC_PATREON_URL value. */
export const HOSTILE_OUT_DIR = 'dist-e2e-hostile';

/**
 * A script URL in the funding variable. `PUBLIC_*` values are inlined into every
 * page, so an unvalidated value would become a clickable XSS vector; the site
 * must fail closed instead of rendering it.
 */
export const HOSTILE_SUPPORT_URL = 'javascript:alert(document.domain)//';

export const FAIL_CLOSED_PORT = 4321;
export const CONFIGURED_PORT = 4322;
export const HOSTILE_PORT = 4323;

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
