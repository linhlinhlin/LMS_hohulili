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
export function initialsAvatar(
  name: string,
  bgColor = '#0056D2',
  fgColor = '#ffffff',
  size = 160,
): string {
  const initials = (name || 'U')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
  const fontSize = Math.round(size * 0.42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${bgColor}"/><text x="50%" y="50%" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="${fontSize}" font-weight="600" fill="${fgColor}" text-anchor="middle" dominant-baseline="central">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
