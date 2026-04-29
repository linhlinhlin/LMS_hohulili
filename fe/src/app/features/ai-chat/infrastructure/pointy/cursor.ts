/**
 * Wiii Pointy — animated cursor overlay.
 *
 * Vendored from `meiiie/wiii` PR #188. Renders a single SVG circle with
 * a "W" letter (Wiii brand orange #F97316 — kept intentionally so the
 * student recognises this is Wiii pointing, not the LMS itself) that
 * animates from its current position to the target element's bounding
 * rect via the Web Animations API.
 *
 * Pure DOM. No React, no framework deps. SSR-safe — every public function
 * no-ops gracefully when `document` is undefined (call sites in
 * `WiiiContextService` are already gated by `isPlatformBrowser`).
 */

const CURSOR_ID = 'wiii-pointy-cursor';
const CURSOR_SIZE = 36;
const BRAND_ORANGE = '#F97316';
const BRAND_CREAM = '#FAF5EE';

let cursorEl: SVGSVGElement | null = null;
let lastPos: { x: number; y: number } | null = null;

function createCursor(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', CURSOR_ID);
  svg.setAttribute('width', String(CURSOR_SIZE));
  svg.setAttribute('height', String(CURSOR_SIZE));
  svg.setAttribute('viewBox', '0 0 36 36');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('data-wiii-pointy', 'cursor');

  const css = svg.style;
  css.position = 'fixed';
  css.left = '0px';
  css.top = '0px';
  css.zIndex = '2147483646';
  css.pointerEvents = 'none';
  css.transformOrigin = 'center';
  css.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))';
  css.opacity = '0';
  css.transition = 'opacity 200ms ease-out';

  svg.innerHTML = `
    <circle cx="18" cy="18" r="16" fill="${BRAND_ORANGE}" stroke="${BRAND_CREAM}" stroke-width="2"/>
    <text x="18" y="23" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="16" font-weight="700" fill="${BRAND_CREAM}">W</text>
  `;
  return svg;
}

function ensureCursor(): SVGSVGElement {
  if (cursorEl && cursorEl.isConnected) return cursorEl;
  cursorEl = createCursor();
  document.body.appendChild(cursorEl);
  return cursorEl;
}

export function computeTargetPoint(rect: DOMRect): { x: number; y: number } {
  return {
    x: rect.left + rect.width / 2 + 8,
    y: rect.top + rect.height / 2 - 8,
  };
}

export function computeOriginPoint(): { x: number; y: number } {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const h = typeof window !== 'undefined' ? window.innerHeight : 768;
  return { x: w - CURSOR_SIZE, y: h / 2 };
}

export interface MoveCursorOptions {
  duration_ms?: number;
  onComplete?: () => void;
}

export function moveCursorToRect(rect: DOMRect, opts: MoveCursorOptions = {}): Animation | null {
  if (typeof document === 'undefined') return null;
  const cursor = ensureCursor();
  const target = computeTargetPoint(rect);
  const start = lastPos ?? computeOriginPoint();
  lastPos = target;

  cursor.style.opacity = '1';
  const duration = Math.max(200, Math.min(opts.duration_ms ?? 600, 2000));

  if (typeof cursor.animate !== 'function') {
    cursor.style.transform = `translate(${target.x}px, ${target.y}px)`;
    opts.onComplete?.();
    return null;
  }

  const animation = cursor.animate(
    [
      { transform: `translate(${start.x}px, ${start.y}px) scale(0.9)` },
      { transform: `translate(${target.x}px, ${target.y}px) scale(1.05)`, offset: 0.85 },
      { transform: `translate(${target.x}px, ${target.y}px) scale(1.0)` },
    ],
    {
      duration,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      fill: 'forwards',
    },
  );
  animation.onfinish = () => opts.onComplete?.();
  return animation;
}

export function hideCursor(): void {
  if (cursorEl) cursorEl.style.opacity = '0';
}

export function destroyCursor(): void {
  if (cursorEl && cursorEl.parentNode) {
    cursorEl.parentNode.removeChild(cursorEl);
  }
  cursorEl = null;
  lastPos = null;
}
