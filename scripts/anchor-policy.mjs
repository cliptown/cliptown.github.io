/** Lint static authored anchors, including whitespace, case and unquoted attrs. */
function attribute(tag, name) {
  const matches = [...tag.matchAll(/\s([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)];
  const found = matches.find((match) => match[1].toLowerCase() === name);
  return found ? (found[2] ?? found[3] ?? found[4]) : null;
}

export function unsafeNewTabLinks(html) {
  return [...html.matchAll(/<a\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => {
      if (attribute(tag, 'target')?.toLowerCase() !== '_blank') return false;
      const tokens = (attribute(tag, 'rel') ?? '').toLowerCase().split(/\s+/);
      return !tokens.includes('noopener') || !tokens.includes('noreferrer');
    });
}
