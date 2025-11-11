import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
  badge?: string | number;
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tabs-container">
      <div class="tabs" role="tablist" [attr.aria-label]="ariaLabel()">
        @for (tab of tabs(); track tab.id) {
          <button
            class="tab"
            [class.tab-active]="isActive(tab.id)"
            [disabled]="tab.disabled"
            role="tab"
            [attr.aria-selected]="isActive(tab.id)"
            [attr.aria-controls]="'panel-' + tab.id"
            [id]="'tab-' + tab.id"
            (click)="selectTab(tab.id)">
            <span class="tab-label">{{ tab.label }}</span>
            @if (tab.badge) {
              <span class="tab-badge">{{ tab.badge }}</span>
            }
          </button>
        }
      </div>
      
      <div class="tab-content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    @import '../../../../../styles/variables';

    .tabs-container {
      width: 100%;
    }

    .tabs {
      display: flex;
      gap: $spacing-2;
      border-bottom: 1px solid $border-default;
      margin-bottom: $spacing-6;
      overflow-x: auto;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .tab {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: $spacing-2;
      padding: $spacing-3 $spacing-4;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: $text-secondary;
      font-size: $text-sm;
      font-weight: $font-medium;
      font-family: $font-family-primary;
      cursor: pointer;
      transition: all $transition-fast;
      white-space: nowrap;

      &:hover:not(:disabled) {
        color: $text-primary;
        background: $bg-hover;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      @include focus-visible;
    }

    .tab-active {
      color: $blue-primary;
      border-bottom-color: $blue-primary;
      font-weight: $font-semibold;

      &:hover {
        background: transparent;
      }
    }

    .tab-label {
      line-height: 1;
    }

    .tab-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 $spacing-2;
      background: $gray-200;
      color: $text-secondary;
      font-size: $text-xs;
      font-weight: $font-semibold;
      border-radius: $radius-full;
      line-height: 1;
    }

    .tab-active .tab-badge {
      background: $blue-light;
      color: $blue-primary;
    }

    .tab-content {
      width: 100%;
    }

    /* Responsive */
    @include mobile {
      .tabs {
        gap: 0;
      }

      .tab {
        flex: 1;
        justify-content: center;
        padding: $spacing-3 $spacing-2;
        font-size: $text-xs;
      }
    }
  `]
})
export class TabsComponent {
  tabs = input.required<Tab[]>();
  activeTabId = input<string>('');
  ariaLabel = input<string>('Tabs');
  
  tabChanged = output<string>();

  private _activeTab = signal<string>('');

  constructor() {
    // Set initial active tab
    const initialTab = this.activeTabId();
    if (initialTab) {
      this._activeTab.set(initialTab);
    }
  }

  currentActiveTab = computed(() => {
    const active = this._activeTab();
    return active || this.tabs()[0]?.id || '';
  });

  isActive(tabId: string): boolean {
    return this.currentActiveTab() === tabId;
  }

  selectTab(tabId: string) {
    const tab = this.tabs().find((t: Tab) => t.id === tabId);
    if (tab && !tab.disabled) {
      this._activeTab.set(tabId);
      this.tabChanged.emit(tabId);
    }
  }
}
