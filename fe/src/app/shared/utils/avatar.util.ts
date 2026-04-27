/**
 * Local SVG initials-avatar generator.
 *
 * Why not ui-avatars.com? Third-party endpoints fail CSP `connect-src` checks
 * inside the service worker (ngsw-worker.js:2234 caches every fetch through
 * the network) and add a runtime dependency on an external host that defeats
 * the PWA offline guarantee. Pattern used by Linear, GitHub fallbacks, Notion:
 * generate the avatar inline as a `data:` URL — zero network, CSP-friendly,
 * works offline. Identical visual result.
 *
 * Returns a `data:image/svg+xml;utf8,...` URL safe for `<img src>`.
 */
// XML/HTML special chars that must be escaped before embedding in SVG text node.
// Without this, `name = "<img src=x onerror=...>"` would inject raw markup into
// the SVG and could break the XML parser or (worse) execute when the data: URL
// is rendered. SOTA practice: always escape user-controlled strings even inside
// data: URLs we generate ourselves — defense-in-depth, not just attack-surface.
function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Fixed palette for `bgColor` / `fgColor` — only allow #RRGGBB or #RGB. Rejects
// anything else to prevent CSS expression / url() injection if a caller ever
// passes through user-supplied color.
function safeColor(c: string, fallback: string): string {
  return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(c) ? c : fallback;
}

export function initialsAvatar(
  name: string,
  bgColor = '#0056D2',
  fgColor = '#ffffff',
  size = 160,
): string {
  const rawInitials = (name || 'U')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
  const initials = escapeSvgText(rawInitials);
  const bg = safeColor(bgColor, '#0056D2');
  const fg = safeColor(fgColor, '#ffffff');
  const dim = Number.isFinite(size) && size > 0 && size <= 1024 ? Math.floor(size) : 160;
  const fontSize = Math.round(dim * 0.42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}"><rect width="${dim}" height="${dim}" fill="${bg}"/><text x="50%" y="50%" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="${fontSize}" font-weight="600" fill="${fg}" text-anchor="middle" dominant-baseline="central">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
