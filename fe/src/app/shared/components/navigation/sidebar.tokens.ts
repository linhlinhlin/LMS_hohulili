/**
 * Sidebar design tokens — single source of truth for widths, durations, easings,
 * breakpoint, storage key. Imported by SidebarStateService, SidebarComponent,
 * SidebarTooltipDirective, FocusTrapDirective, and the wrapper layouts.
 *
 * SOTA references: M3 motion (emphasized + standard easings),
 * Stripe/Carbon two-state rail widths, Tailwind `lg:` breakpoint.
 */

export const SIDEBAR_STORAGE_KEY = 'sidebar:collapsed';

export const SIDEBAR_WIDTH_EXPANDED_PX = 256;
export const SIDEBAR_WIDTH_COLLAPSED_PX = 64;
export const SIDEBAR_WIDTH_MOBILE_DRAWER = 'min(280px, 80vw)';

export const SIDEBAR_BREAKPOINT_LG_PX = 1024;

export const SIDEBAR_DURATION_DESKTOP_MS = 200;
export const SIDEBAR_DURATION_MOBILE_MS = 250;
export const SIDEBAR_DURATION_BACKDROP_MS = 200;

export const SIDEBAR_EASING_EMPHASIZED = 'cubic-bezier(0.2, 0, 0, 1)';
export const SIDEBAR_EASING_STANDARD = 'cubic-bezier(0.4, 0, 0.2, 1)';

export const SIDEBAR_TOOLTIP_DELAY_MS = 500;
