import {
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SIDEBAR_TOOLTIP_DELAY_MS } from '../components/navigation/sidebar.tokens';

/**
 * Sidebar icon-rail tooltip — shows the menu item label as a positioned
 * popover after a 500 ms hover/focus delay when the sidebar is collapsed.
 *
 * Custom implementation (not native `title` attribute) because:
 *   - Native `title` has uncontrollable browser-defined delay (~700 ms).
 *   - Native `title` cannot be linked via `aria-describedby` reliably.
 *   - We need design-token styling and reduced-motion support.
 *
 * Per spec FR-006 + clarify Q2.
 *
 * Usage:
 *   <a [appSidebarTooltip]="item.label" [tooltipEnabled]="collapsed()">
 *     <app-icon .../>
 *   </a>
 */
@Directive({
  selector: '[appSidebarTooltip]',
})
export class SidebarTooltipDirective implements OnDestroy {
  /** Label text. Empty/null → no tooltip rendered. Bound as `[appSidebarTooltip]`. */
  readonly label = input<string | null>('', { alias: 'appSidebarTooltip' });

  /** Enable flag — when false the directive is inert (no listeners fire). */
  readonly tooltipEnabled = input(true);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private popoverEl: HTMLElement | null = null;
  private static idCounter = 0;
  private describedById: string | null = null;

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (!this.shouldShow()) return;
    this.scheduleShow();
  }

  @HostListener('focusin')
  onFocusIn(): void {
    if (!this.shouldShow()) return;
    this.scheduleShow();
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.cancelAndHide();
  }

  @HostListener('focusout')
  onFocusOut(): void {
    this.cancelAndHide();
  }

  ngOnDestroy(): void {
    this.cancelAndHide();
  }

  private shouldShow(): boolean {
    const lbl = this.label();
    return (
      this.tooltipEnabled() &&
      !!lbl &&
      lbl.trim().length > 0 &&
      isPlatformBrowser(this.platformId)
    );
  }

  private scheduleShow(): void {
    this.cancelTimer();
    // Reduced-motion users still get the label, but instantly (no animation,
    // no delay — they need the info, not the choreography).
    const delay = this.prefersReducedMotion() ? 0 : SIDEBAR_TOOLTIP_DELAY_MS;
    this.timer = setTimeout(() => this.show(), delay);
  }

  private show(): void {
    if (this.popoverEl) return; // already showing
    const popover = document.createElement('div');
    SidebarTooltipDirective.idCounter += 1;
    this.describedById = `sidebar-tooltip-${SidebarTooltipDirective.idCounter}`;
    popover.id = this.describedById;
    popover.setAttribute('role', 'tooltip');
    popover.textContent = this.label()!;
    Object.assign(popover.style, {
      position: 'fixed',
      zIndex: '60',
      padding: '6px 10px',
      borderRadius: '6px',
      background: '#111827',
      color: 'white',
      fontSize: '12px',
      fontWeight: '500',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    } as CSSStyleDeclaration);
    document.body.appendChild(popover);
    this.popoverEl = popover;

    const rect = (this.host.nativeElement as HTMLElement).getBoundingClientRect();
    popover.style.top = `${rect.top + rect.height / 2 - popover.offsetHeight / 2}px`;
    popover.style.left = `${rect.right + 8}px`;

    this.host.nativeElement.setAttribute('aria-describedby', this.describedById);
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private cancelAndHide(): void {
    this.cancelTimer();
    if (this.popoverEl) {
      this.popoverEl.remove();
      this.popoverEl = null;
    }
    if (this.describedById) {
      this.host.nativeElement.removeAttribute('aria-describedby');
      this.describedById = null;
    }
  }

  private prefersReducedMotion(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
