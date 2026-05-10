/**
 * Wiii Pointy — type contracts for the LMS host integration.
 *
 * Vendored from `meiiie/wiii` PR #188 and updated to match PR #282 V1.1 safe-click.
 * Re-sync this folder when the upstream Pointy package bumps its version.
 *
 * V1.1 is tutor-safe: highlight, scroll_to, show_tour, and safe-click. No
 * auto-fill. Safe-click is fail-closed and only works on host-marked
 * `data-wiii-click-safe="true"` navigation-like targets.
 *
 * Note: `ui.navigate` is intentionally NOT shipped here — LMS already
 * exposes `navigation.go_to` (with semantic targets + clickButtonByText)
 * which covers the same surface and is integrated with Angular Router.
 */

export const POINTY_ACTION_HIGHLIGHT = 'ui.highlight';
export const POINTY_ACTION_SCROLL_TO = 'ui.scroll_to';
export const POINTY_ACTION_SHOW_TOUR = 'ui.show_tour';
export const POINTY_ACTION_CLICK = 'ui.click';

export const POINTY_ACTIONS = [
  POINTY_ACTION_HIGHLIGHT,
  POINTY_ACTION_SCROLL_TO,
  POINTY_ACTION_SHOW_TOUR,
  POINTY_ACTION_CLICK,
] as const;

export type PointyAction = (typeof POINTY_ACTIONS)[number];

export interface HighlightParams {
  selector: string;
  message?: string;
  duration_ms?: number;
}

export interface ScrollToParams {
  selector: string;
  block?: ScrollLogicalPosition;
}

export interface TourStep {
  selector: string;
  message: string;
  duration_ms?: number;
}

export interface ShowTourParams {
  steps: TourStep[];
  start_at?: number;
}

export interface ClickParams {
  selector: string;
  message?: string;
}
