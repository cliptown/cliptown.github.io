import type { Page, Response } from '@playwright/test';
import { expect } from '@playwright/test';

/** Hosts that would constitute publishing a funding destination. */
export const FUNDING_HOST_PATTERN =
  /https?:\/\/(www\.)?(patreon\.com|ko-fi\.com|buymeacoffee\.com|opencollective\.com|paypal\.(me|com)|liberapay\.com)/i;

export interface PageProblems {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
}

/**
 * Starts recording console errors, uncaught exceptions, and failed responses.
 * CSP violations surface as console errors, so this also guards the policy the
 * layout ships.
 */
export interface WatchOptions {
  /**
   * URLs that are *expected* to return an error status — currently only the
   * deliberate 404-page navigation. Everything else is a defect.
   */
  expectedErrorUrls?: RegExp;
}

export function watchForProblems(page: Page, options: WatchOptions = {}): PageProblems {
  const problems: PageProblems = { consoleErrors: [], pageErrors: [], failedRequests: [] };
  const isExpected = (url: string) => options.expectedErrorUrls?.test(url) ?? false;

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // Chromium logs a console error for the document's own 404 response.
    if (isExpected(message.location().url) || isExpected(text)) return;
    problems.consoleErrors.push(`${text} (${message.location().url})`);
  });
  page.on('pageerror', (error) => {
    problems.pageErrors.push(error.message);
  });
  page.on('requestfailed', (request) => {
    if (isExpected(request.url())) return;
    problems.failedRequests.push(`${request.url()} — ${request.failure()?.errorText ?? 'failed'}`);
  });
  page.on('response', (response: Response) => {
    // Only same-origin subresources are in scope; the site loads nothing else.
    if (response.status() >= 400 && !isExpected(response.url())) {
      problems.failedRequests.push(`${response.status()} ${response.url()}`);
    }
  });

  return problems;
}

export function expectNoProblems(problems: PageProblems): void {
  expect(problems.pageErrors, 'uncaught page errors').toEqual([]);
  expect(problems.consoleErrors, 'console errors').toEqual([]);
  expect(problems.failedRequests, 'failed requests').toEqual([]);
}

/**
 * Asserts the document never scrolls sideways. Measured against the viewport
 * rather than a fixed number so it holds at every tested width.
 */
export async function expectNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const limit = doc.clientWidth;

    // `.site-main` sets `overflow: clip`, so decorative art inside it is
    // intentionally cropped. The header and footer are not clipped, and
    // anything sticking out there is a genuine layout bug.
    const chromeOffenders: string[] = [];
    for (const element of Array.from(
      document.querySelectorAll<HTMLElement>('header *, footer *'),
    )) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right > limit + 1 || rect.left < -1) {
        chromeOffenders.push(
          `${element.tagName.toLowerCase()}.${element.className || '(no class)'} left=${Math.round(rect.left)} right=${Math.round(rect.right)}`,
        );
      }
    }

    return {
      scrollWidth: doc.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      clientWidth: limit,
      chromeOffenders: chromeOffenders.slice(0, 5),
    };
  });

  expect(
    overflow.scrollWidth,
    `${label}: document scrolls horizontally (${overflow.scrollWidth}px in a ${overflow.clientWidth}px viewport)`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);

  expect(
    overflow.bodyScrollWidth,
    `${label}: body scrolls horizontally (${overflow.bodyScrollWidth}px in a ${overflow.clientWidth}px viewport)`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);

  expect(overflow.chromeOffenders, `${label}: header/footer content overflows the viewport`).toEqual(
    [],
  );
}

/** Every same-origin href on the page, normalised to a pathname (+hash). */
export async function collectInternalLinks(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
      .map((anchor) => anchor.href)
      .filter((href) => new URL(href).origin === location.origin)
      .map((href) => {
        const url = new URL(href);
        return `${url.pathname}${url.hash}`;
      }),
  );
}
