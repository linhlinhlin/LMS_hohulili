import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  template: `
    <div class="fixed bottom-4 right-4 z-50 space-y-2">
      @for (toast of toastService.toasts$(); track toast.id) {
        <div
          class="px-4 py-3 rounded shadow-lg flex items-center gap-2 min-w-[300px] max-w-[500px]"
          [class]="getToastClass(toast.type)"
          role="alert"
        >
          <span class="flex-1">{{ toast.message }}</span>
          <button
            (click)="toastService.dismiss(toast.id)"
            class="ml-2 hover:opacity-80 font-bold text-lg"
            aria-label="Close notification"
          >×</button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  getToastClass(type: string): string {
    const classes = {
      success: 'bg-green-500 text-white',
      error: 'bg-red-500 text-white',
      warning: 'bg-yellow-500 text-black',
      info: 'bg-blue-500 text-white'
    };
    return classes[type as keyof typeof classes] || classes.info;
  }
}
