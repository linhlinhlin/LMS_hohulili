import { Injectable, signal, computed, effect } from '@angular/core';
import { fromEvent, debounceTime, startWith } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService {
  private _windowWidth = signal(window.innerWidth);
  private _windowHeight = signal(window.innerHeight);

  // Readonly signals
  readonly windowWidth = this._windowWidth.asReadonly();
  readonly windowHeight = this._windowHeight.asReadonly();

  // Breakpoint signals
  readonly isMobile = computed(() => this._windowWidth() < 768);
  readonly isTablet = computed(() => this._windowWidth() >= 768 && this._windowWidth() < 1024);
  readonly isDesktop = computed(() => this._windowWidth() >= 1024);
  readonly isLargeDesktop = computed(() => this._windowWidth() >= 1280);

  // Grid columns based on screen size
  readonly gridCols = computed(() => {
    if (this.isMobile()) return 1;
    if (this.isTablet()) return 2;
    if (this.isDesktop()) return 3;
    return 4;
  });

  // Dashboard columns
  readonly dashboardCols = computed(() => {
    if (this.isMobile()) return 1;
    if (this.isTablet()) return 2;
    return 3;
  });

  // Sidebar visibility
  readonly sidebarVisible = computed(() => !this.isMobile());

  constructor() {
    // Listen to window resize events
    fromEvent(window, 'resize')
      .pipe(
        debounceTime(100),
        startWith(null)
      )
      .subscribe(() => {
        this._windowWidth.set(window.innerWidth);
        this._windowHeight.set(window.innerHeight);
      });
  }

  // Utility methods
  getBreakpoint(): 'mobile' | 'tablet' | 'desktop' | 'large' {
    if (this.isMobile()) return 'mobile';
    if (this.isTablet()) return 'tablet';
    if (this.isDesktop()) return 'desktop';
    return 'large';
  }

  isBreakpoint(breakpoint: 'mobile' | 'tablet' | 'desktop' | 'large'): boolean {
    switch (breakpoint) {
      case 'mobile':
        return this.isMobile();
      case 'tablet':
        return this.isTablet();
      case 'desktop':
        return this.isDesktop();
      case 'large':
        return this.isLargeDesktop();
      default:
        return false;
    }
  }

  // Responsive classes helper
  getResponsiveClasses(baseClasses: string, mobileClasses?: string, tabletClasses?: string, desktopClasses?: string): string {
    let classes = baseClasses;
    
    if (this.isMobile() && mobileClasses) {
      classes += ` ${mobileClasses}`;
    } else if (this.isTablet() && tabletClasses) {
      classes += ` ${tabletClasses}`;
    } else if (this.isDesktop() && desktopClasses) {
      classes += ` ${desktopClasses}`;
    }
    
    return classes;
  }
}
