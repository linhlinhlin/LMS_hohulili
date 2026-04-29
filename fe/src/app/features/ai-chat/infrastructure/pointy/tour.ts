/**
 * Wiii Pointy — multi-step tour sequencer.
 *
 * Vendored from `meiiie/wiii` PR #188. Walks through TourStep[] one at a
 * time, scrolling, moving the cursor, and showing the spotlight + tooltip
 * for each step. A new tour cancels any tour in progress so the AI can
 * interrupt itself cleanly.
 */
import type { TourStep } from './types';
import { hideCursor, moveCursorToRect } from './cursor';
import { hideSpotlight, showSpotlight } from './spotlight';

let activeTour: { cancelled: boolean } | null = null;

export interface RunTourOptions {
  resolveSelector?: (selector: string) => Element | null;
  startAt?: number;
}

const DEFAULT_RESOLVE = (sel: string) =>
  typeof document !== 'undefined' ? document.querySelector(sel) : null;

export interface TourResult {
  completed_steps: number;
  total_steps: number;
  cancelled: boolean;
  missing_selectors: string[];
}

export async function runTour(
  steps: TourStep[],
  opts: RunTourOptions = {},
): Promise<TourResult> {
  if (activeTour) activeTour.cancelled = true;
  const handle = { cancelled: false };
  activeTour = handle;

  const resolve = opts.resolveSelector ?? DEFAULT_RESOLVE;
  const startAt = Math.max(0, Math.min(opts.startAt ?? 0, steps.length));
  const result: TourResult = {
    completed_steps: 0,
    total_steps: steps.length,
    cancelled: false,
    missing_selectors: [],
  };

  for (let i = startAt; i < steps.length; i++) {
    if (handle.cancelled) break;
    const step = steps[i];
    const target = resolve(step.selector);
    if (!target) {
      result.missing_selectors.push(step.selector);
      continue;
    }

    if ('scrollIntoView' in target && typeof (target as HTMLElement).scrollIntoView === 'function') {
      (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const rect = target.getBoundingClientRect();
    moveCursorToRect(rect, { duration_ms: 500 });

    showSpotlight(target, {
      message: step.message,
      duration_ms: step.duration_ms ?? 2400,
    });

    await interruptibleWait(step.duration_ms ?? 2400, handle);
    if (handle.cancelled) break;
    result.completed_steps += 1;
  }

  result.cancelled = handle.cancelled;

  if (activeTour === handle) {
    hideSpotlight();
    hideCursor();
    activeTour = null;
  }
  return result;
}

export function cancelActiveTour(): void {
  if (activeTour) activeTour.cancelled = true;
  hideSpotlight();
  hideCursor();
}

function interruptibleWait(ms: number, handle: { cancelled: boolean }): Promise<void> {
  return new Promise((resolve) => {
    const end = Date.now() + Math.max(0, ms);
    const tick = () => {
      if (handle.cancelled) {
        resolve();
        return;
      }
      const remaining = end - Date.now();
      if (remaining <= 0) {
        resolve();
        return;
      }
      setTimeout(tick, Math.min(20, remaining));
    };
    tick();
  });
}
