import { defineConfig, devices } from '@playwright/test';
import {
  CONFIGURED_OUT_DIR,
  CONFIGURED_PORT,
  FAIL_CLOSED_OUT_DIR,
  FAIL_CLOSED_PORT,
  HOSTILE_OUT_DIR,
  HOSTILE_PORT,
} from './tests/e2e-constants.mjs';

const failClosedBaseURL = `http://127.0.0.1:${FAIL_CLOSED_PORT}`;
const configuredBaseURL = `http://127.0.0.1:${CONFIGURED_PORT}`;
const hostileBaseURL = `http://127.0.0.1:${HOSTILE_PORT}`;

/**
 * Two static builds are served in parallel (see scripts/build-e2e.mjs), one per
 * project, because `PUBLIC_PATREON_URL` is inlined at build time and cannot be
 * toggled at runtime.
 *
 * Run with `npm run test:e2e`, which builds both artifacts first.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['list']],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'fail-closed',
      testMatch: /.*\.failclosed\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: failClosedBaseURL },
    },
    {
      name: 'configured',
      testMatch: /.*\.configured\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: configuredBaseURL },
    },
  ],
  webServer: [
    {
      command: `node tests/static-server.mjs ${FAIL_CLOSED_OUT_DIR} ${FAIL_CLOSED_PORT}`,
      url: failClosedBaseURL,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      timeout: 30_000,
    },
    {
      command: `node tests/static-server.mjs ${CONFIGURED_OUT_DIR} ${CONFIGURED_PORT}`,
      url: configuredBaseURL,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      timeout: 30_000,
    },
  ],
});
