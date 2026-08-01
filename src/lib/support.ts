/**
 * DEN-58: the site fails closed on funding links.
 *
 * A direct-funding destination is published only when `PUBLIC_PATREON_URL` is
 * explicitly configured after ownership verification. There is deliberately no
 * fallback URL: if the variable is unset, blank, or not a plain `https://` (or
 * `http://` for local previews) absolute URL, the UI must show the
 * pending-verification state instead of linking anywhere.
 *
 * Validating the scheme also keeps the value out of the `javascript:` /
 * `data:` href sink: `PUBLIC_*` variables are inlined into the built HTML, so
 * an unvalidated value would become a clickable script URL in every visitor's
 * browser.
 */
export function resolveSupportUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;

  const value = raw.trim();
  if (!value) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (!parsed.hostname) return null;

  return parsed.toString();
}

export const supportUrl = resolveSupportUrl(import.meta.env.PUBLIC_PATREON_URL);
