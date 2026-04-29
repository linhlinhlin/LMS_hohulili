/**
 * Wiii Pointy — barrel for the LMS-side integration.
 * Vendored from `meiiie/wiii` PR #188 — keep in sync when upstream bumps.
 */
export * from './types';
export {
  computeOriginPoint,
  computeTargetPoint,
  destroyCursor,
  hideCursor,
  moveCursorToRect,
} from './cursor';
export {
  computeTooltipPosition,
  destroySpotlight,
  hideSpotlight,
  showSpotlight,
} from './spotlight';
export { cancelActiveTour, runTour, type TourResult } from './tour';
export { describeTarget, resolvePointySelector } from './helpers';
