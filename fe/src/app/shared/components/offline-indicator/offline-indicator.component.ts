import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { NetworkStatusService } from '../../../core/services/network-status.service';

@Component({
  selector: 'app-offline-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div [class]="containerClass()"
           role="status"
           aria-live="polite">
        <span class="inline-block w-2 h-2 rounded-full" [class]="dotClass()"></span>
        <span class="text-xs font-medium">{{ network.connectionLabel() }}</span>
      </div>
    }
  `,
})
export class OfflineIndicatorComponent {
  protected readonly network = inject(NetworkStatusService);

  protected readonly visible = computed(() => this.network.connectionTier() !== 'fast');

  protected readonly containerClass = computed(() => {
    const base = 'fixed top-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md text-white transition-all duration-300';
    switch (this.network.connectionTier()) {
      case 'none': return `${base} bg-red-600`;
      case 'slow': return `${base} bg-amber-600`;
      default: return `${base} bg-emerald-600`;
    }
  });

  protected readonly dotClass = computed(() => {
    switch (this.network.connectionTier()) {
      case 'none': return 'bg-red-300';
      case 'slow': return 'bg-amber-300 animate-pulse';
      default: return 'bg-emerald-300';
    }
  });
}
