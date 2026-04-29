/**
 * Wiii Pointy — type contracts for the LMS host integration.
 *
 * Vendored from `meiiie/wiii` PR #188 (Wiii Pointy V1, 2026-04-29).
 * Re-sync this folder when the upstream Pointy package bumps its version.
 *
 * V1 is read-only: highlight, scroll_to, show_tour. No auto-click, no
 * auto-fill. All actions are `mutates_state: false, requires_confirmation: false`.
 *
 * Note: `ui.navigate` is intentionally NOT shipped here — LMS already
 * exposes `navigation.go_to` (with semantic targets + clickButtonByText)
 * which covers the same surface and is integrated with Angular Router.
 */

export const POINTY_ACTION_HIGHLIGHT = 'ui.highlight';
export const POINTY_ACTION_SCROLL_TO = 'ui.scroll_to';
export const POINTY_ACTION_SHOW_TOUR = 'ui.show_tour';

export const POINTY_ACTIONS = [
  POINTY_ACTION_HIGHLIGHT,
  POINTY_ACTION_SCROLL_TO,
  POINTY_ACTION_SHOW_TOUR,
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
