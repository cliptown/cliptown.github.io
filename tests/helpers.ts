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
export function watchForProblems(page: Page): PageProblems {
  const problems: PageProblems = { consoleErrors: [], pageErrors: [], failedRequests: [] };

  page.on('console', (message) => {
    if (message.type() === 'error') {
      problems.consoleErrors.push(`${message.text()} (${message.location().url})`);
    }
  });
  page.on('pageerror', (error) => {
    problems.pageErrors.push(error.message);
  });
  page.on('requestfailed', (request) => {
    problems.failedRequests.push(`${request.url()} — ${request.failure()?.errorText ?? 'failed'}`);
  });
  page.on('response', (response: Response) => {
    // Only same-origin subresources are in scope; the site loads nothing else.
    if (response.status() >= 400) {
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
    const offenders: string[] = [];
    const limit = doc.clientWidth;
    for (const element of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right > limit + 1) {
        offenders.push(
          `${element.tagName.toLowerCase()}.${element.className || '(no class)'} right=${Math.round(rect.right)}`,
        );
      }
    }
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      offenders: offenders.slice(0, 5),
    };
  });

  expect(
    overflow.scrollWidth,
    `${label}: document scrolls horizontally (${overflow.scrollWidth}px in a ${overflow.clientWidth}px viewport); first offenders: ${overflow.offenders.join(', ')}`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
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
