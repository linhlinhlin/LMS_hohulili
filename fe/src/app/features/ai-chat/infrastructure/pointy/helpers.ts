/**
 * Wiii Pointy — small helpers shared between handler call sites.
 *
 * Vendored from `meiiie/wiii` PR #188.
 */

export function describeTarget(el: Element): string {
  const labels: string[] = [];
  const id = el.getAttribute('data-wiii-id') || el.id;
  if (id) labels.push(`#${id}`);
  const aria = el.getAttribute('aria-label');
  if (aria) labels.push(`"${aria}"`);
  if (!labels.length) {
    const text = (el.textContent || '').trim();
    if (text) labels.push(`"${text.slice(0, 40)}"`);
  }
  if (!labels.length) labels.push(el.tagName.toLowerCase());
  return labels.join(' ');
}

export function resolvePointySelector(selector: unknown): Element | null {
  if (typeof selector !== 'string') return null;
  const trimmed = selector.trim();
  if (!trimmed) return null;
  if (typeof document === 'undefined') return null;
  try {
    return document.querySelector(trimmed);
  } catch {
    return null;
  }
}
