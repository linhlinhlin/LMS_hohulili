import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { StorageManagerService } from '../../../core/services/storage-manager.service';

@Component({
  selector: 'app-storage-budget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs text-gray-600">
        <span>Dung lượng ngoại tuyến</span>
        <span>{{ usedLabel() }} / {{ quotaLabel() }}</span>
      </div>
      <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500"
             [class]="barColorClass()"
             [style.width.%]="percentClamped()">
        </div>
      </div>
      @if (!storage.isPersisted()) {
        <button (click)="requestPersistence()"
                class="text-xs text-[#0056D2] hover:underline">
          Yêu cầu lưu trữ vĩnh viễn
        </button>
      }
    </div>
  `,
})
export class StorageBudgetComponent {
  protected readonly storage = inject(StorageManagerService);

  protected readonly percentClamped = computed(() =>
    Math.min(this.storage.estimate().percentUsed, 100)
  );

  protected readonly usedLabel = computed(() =>
    this.storage.formatBytes(this.storage.estimate().usedBytes)
  );

  protected readonly quotaLabel = computed(() =>
    this.storage.formatBytes(this.storage.estimate().quotaBytes)
  );

  protected readonly barColorClass = computed(() => {
    const pct = this.storage.estimate().percentUsed;
    if (pct > 90) return 'bg-red-500';
    if (pct > 70) return 'bg-amber-500';
    return 'bg-[#0056D2]';
  });

  protected async requestPersistence(): Promise<void> {
    await this.storage.requestPersistence();
  }
}
