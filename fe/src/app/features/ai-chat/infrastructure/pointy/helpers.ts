/**
 * Wiii Pointy — small helpers shared between handler call sites.
 *
 * Vendored from `meiiie/wiii` PR #188 and updated to match PR #282 V1.1 ID resolution.
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
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    try {
      const semantic = document.querySelector(`[data-wiii-id="${escapeDataWiiiId(trimmed)}"]`);
      if (semantic) return semantic;
    } catch {
      return null;
    }
  }
  try {
    return document.querySelector(trimmed);
  } catch {
    return null;
  }
}

function escapeDataWiiiId(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
