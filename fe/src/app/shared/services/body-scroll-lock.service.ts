import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

/**
 * Ref-counted body scroll lock.
 * Multiple stacked dialogs can call lock() without fighting; the body is only
 * unlocked when every caller has released it.
 *
 * Also restores the scrollbar gutter so layout doesn't shift under fixed
 * elements (headers) when the scrollbar disappears.
 */
@Injectable({ providedIn: 'root' })
export class BodyScrollLockService {
  private doc = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private count = 0;
  private previousOverflow = '';
  private previousPaddingRight = '';

  lock(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.count++;
    if (this.count > 1) {
      return;
    }
    const body = this.doc.body;
    if (!body) {
      return;
    }
    const scrollbarWidth = window.innerWidth - this.doc.documentElement.clientWidth;
    this.previousOverflow = body.style.overflow;
    this.previousPaddingRight = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  unlock(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.count === 0) {
      return;
    }
    this.count--;
    if (this.count > 0) {
      return;
    }
    const body = this.doc.body;
    if (!body) {
      return;
    }
    body.style.overflow = this.previousOverflow;
    body.style.paddingRight = this.previousPaddingRight;
  }
}
