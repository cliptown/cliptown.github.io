export function GET({ site }: { site?: URL }) {
  const origin = site ?? new URL('https://cliptown.github.io');
  const body = [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${new URL('/sitemap.xml', origin).toString()}`,
    '',
  ].join('\n');
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
