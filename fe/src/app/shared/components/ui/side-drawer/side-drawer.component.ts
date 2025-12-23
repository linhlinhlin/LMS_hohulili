import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-side-drawer',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule],
    template: `
    <!-- Backdrop -->
    <div *ngIf="isOpen" 
         class="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000] transition-opacity"
         (click)="close()"
         [@backdropAnimation]>
    </div>

    <!-- Drawer Panel -->
    <div *ngIf="isOpen" 
         class="fixed top-0 right-0 h-full bg-white shadow-2xl z-[1001] flex flex-col overflow-hidden"
         [style.width]="width"
         [@drawerAnimation]>
      
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b bg-gray-50/50">
        <div>
          <h2 class="text-lg font-bold text-gray-800">{{ title }}</h2>
          <p class="text-xs text-gray-500" *ngIf="subtitle">{{ subtitle }}</p>
        </div>
        <button mat-icon-button (click)="close()" class="text-gray-400 hover:text-gray-600">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <ng-content></ng-content>
      </div>

      <!-- Footer (Optional) -->
      <div class="p-4 border-t bg-gray-50/50 flex justify-end gap-3" *ngIf="showFooter">
        <ng-content select="[footer]"></ng-content>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; }
  `],
    animations: [
        trigger('backdropAnimation', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('300ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0 }))
            ])
        ]),
        trigger('drawerAnimation', [
            transition(':enter', [
                style({ transform: 'translateX(100%)' }),
                animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateX(0)' }))
            ]),
            transition(':leave', [
                animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateX(100%)' }))
            ])
        ])
    ]
})
export class SideDrawerComponent {
    @Input() isOpen = false;
    @Input() title = 'Panel';
    @Input() subtitle = '';
    @Input() width = '450px';
    @Input() showFooter = true;

    @Output() isOpenChange = new EventEmitter<boolean>();
    @Output() onClosed = new EventEmitter<void>();

    close() {
        this.isOpen = false;
        this.isOpenChange.emit(false);
        this.onClosed.emit();
    }
}
