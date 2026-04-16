import { Component, input, output, signal, effect, ChangeDetectionStrategy } from '@angular/core';

import { animate, style, transition, trigger, state } from '@angular/animations';
import { LucideAngularModule, X } from 'lucide-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-side-drawer',
    imports: [LucideAngularModule],
    animations: [
        trigger('drawerAnimation', [
            state('closed', style({ transform: 'translateX(100%)', opacity: 0 })),
            state('open', style({ transform: 'translateX(0)', opacity: 1 })),
            transition('closed <=> open', animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)'))
        ]),
        trigger('backdropAnimation', [
            state('closed', style({ opacity: 0, visibility: 'hidden' })),
            state('open', style({ opacity: 1, visibility: 'visible' })),
            transition('closed <=> open', animate('300ms ease-out'))
        ])
    ],
    template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100]"
         [@backdropAnimation]="isOpen() ? 'open' : 'closed'"
         (click)="close()">
    </div>

    <!-- Drawer Panel -->
    <div class="fixed right-0 top-0 h-full bg-white shadow-2xl z-[101] border-l border-slate-200 flex flex-col overflow-hidden"
         [style.width]="width()"
         style="max-width: 100vw"
         [@drawerAnimation]="isOpen() ? 'open' : 'closed'"
         role="dialog"
         aria-modal="true"
         [attr.aria-label]="title()">
      
      <!-- Header -->
      <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h2 class="text-sm font-black text-slate-800 uppercase tracking-tight">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="text-[11px] text-slate-400 font-medium mt-1 uppercase tracking-tighter">{{ subtitle() }}</p>
          }
        </div>
        <button (click)="close()" class="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                aria-label="Đóng">
          <lucide-icon name="x" [size]="18"></lucide-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-grow overflow-y-auto custom-scrollbar p-6">
        <ng-content></ng-content>
      </div>

      <!-- Footer (Optional) -->
      <div class="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
        <ng-content select="[footer]"></ng-content>
      </div>
    </div>
  `,
    styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
  `]
})
export class SideDrawerComponent {
    isOpen = input.required<boolean>();
    title = input.required<string>();
    subtitle = input<string>('');
    width = input<string>('400px');

    onClose = output<void>();

    close() {
        this.onClose.emit();
    }
}
