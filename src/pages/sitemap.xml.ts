const routes = [
  '/',
  '/android',
  '/browser',
  '/cli',
  '/ios',
  '/linux',
  '/macos',
  '/security',
  '/support',
  '/windows',
];

export function GET({ site }: { site?: URL }) {
  const origin = site ?? new URL('https://cliptown.github.io');
  const urls = routes
    .map((route) => `<url><loc>${new URL(route, origin).toString()}</loc></url>`)
    .join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
