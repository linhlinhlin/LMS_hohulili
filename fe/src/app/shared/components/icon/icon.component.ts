import { Component, Input, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export type IconName = 
  | 'search' | 'bell' | 'user' | 'grid' | 'book' | 'play' | 'star' 
  | 'globe' | 'menu' | 'x' | 'chevron-down' | 'chevron-up' | 'chevron-left' | 'chevron-right'
  | 'home' | 'courses' | 'certificate' | 'blog' | 'settings' | 'logout' | 'login'
  | 'heart' | 'share' | 'download' | 'upload' | 'edit' | 'trash' | 'plus' | 'minus'
  | 'check' | 'alert' | 'info' | 'warning' | 'error' | 'success'
  | 'phone' | 'mail' | 'map' | 'calendar' | 'clock' | 'tag' | 'filter'
  | 'arrow-up' | 'arrow-down' | 'arrow-left' | 'arrow-right'
  | 'external-link' | 'link' | 'copy' | 'refresh' | 'rotate';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg 
      [class]="iconClasses"
      [attr.width]="sizeValue"
      [attr.height]="sizeValue"
      [attr.aria-label]="ariaLabel"
      [attr.aria-hidden]="!ariaLabel"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round">
      @switch (name) {
        @case ('search') {
          <circle cx="11" cy="11" r="7"/>
          <path d="m21 21-4.35-4.35"/>
        }
        @case ('bell') {
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 5 3 9H3c0-4 3-2 3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        }
        @case ('user') {
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        }
        @case ('grid') {
          <rect width="7" height="7" x="3" y="3" rx="1"/>
          <rect width="7" height="7" x="14" y="3" rx="1"/>
          <rect width="7" height="7" x="14" y="14" rx="1"/>
          <rect width="7" height="7" x="3" y="14" rx="1"/>
        }
        @case ('book') {
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M4 4v15.5"/>
          <path d="M6.5 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5"/>
        }
        @case ('play') {
          <polygon points="5,3 19,12 5,21"/>
        }
        @case ('star') {
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        }
        @case ('globe') {
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
          <path d="M2 12h20"/>
        }
        @case ('menu') {
          <line x1="4" x2="20" y1="6" y2="6"/>
          <line x1="4" x2="20" y1="12" y2="12"/>
          <line x1="4" x2="20" y1="18" y2="18"/>
        }
        @case ('x') {
          <path d="M18 6 6 18M6 6l12 12"/>
        }
        @case ('chevron-down') {
          <path d="m6 9 6 6 6-6"/>
        }
        @case ('chevron-up') {
          <path d="m18 15-6-6-6 6"/>
        }
        @case ('chevron-left') {
          <path d="m15 18-6-6 6-6"/>
        }
        @case ('chevron-right') {
          <path d="m9 18 6-6-6-6"/>
        }
        @case ('home') {
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        }
        @case ('courses') {
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        }
        @case ('certificate') {
          <circle cx="12" cy="8" r="6"/>
          <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12"/>
        }
        @case ('blog') {
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" x2="8" y1="13" y2="13"/>
          <line x1="16" x2="8" y1="17" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        }
        @case ('settings') {
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        }
        @case ('logout') {
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16,17 21,12 16,7"/>
          <line x1="21" x2="9" y1="12" y2="12"/>
        }
        @case ('login') {
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10,17 15,12 10,7"/>
          <line x1="15" x2="3" y1="12" y2="12"/>
        }
        @case ('heart') {
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
        }
        @case ('share') {
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>
          <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
        }
        @case ('download') {
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7,10 12,15 17,10"/>
          <line x1="12" x2="12" y1="15" y2="3"/>
        }
        @case ('upload') {
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17,8 12,3 7,8"/>
          <line x1="12" x2="12" y1="3" y2="15"/>
        }
        @case ('edit') {
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        }
        @case ('trash') {
          <polyline points="3,6 5,6 21,6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" x2="10" y1="11" y2="17"/>
          <line x1="14" x2="14" y1="11" y2="17"/>
        }
        @case ('plus') {
          <line x1="12" x2="12" y1="5" y2="19"/>
          <line x1="5" x2="19" y1="12" y2="12"/>
        }
        @case ('minus') {
          <line x1="5" x2="19" y1="12" y2="12"/>
        }
        @case ('check') {
          <polyline points="20,6 9,17 4,12"/>
        }
        @case ('alert') {
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" x2="12" y1="9" y2="13"/>
          <line x1="12" x2="12.01" y1="17" y2="17"/>
        }
        @case ('info') {
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        }
        @case ('warning') {
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" x2="12" y1="9" y2="13"/>
          <line x1="12" x2="12.01" y1="17" y2="17"/>
        }
        @case ('error') {
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" x2="9" y1="9" y2="15"/>
          <line x1="9" x2="15" y1="9" y2="15"/>
        }
        @case ('success') {
          <circle cx="12" cy="12" r="10"/>
          <polyline points="9,12 12,15 22,5"/>
        }
        @case ('phone') {
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        }
        @case ('mail') {
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        }
        @case ('map') {
          <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2"/>
          <line x1="8" x2="8" y1="2" y2="18"/>
          <line x1="16" x2="16" y1="6" y2="22"/>
        }
        @case ('calendar') {
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
          <line x1="16" x2="16" y1="2" y2="6"/>
          <line x1="8" x2="8" y1="2" y2="6"/>
          <line x1="3" x2="21" y1="10" y2="10"/>
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        }
        @case ('tag') {
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" x2="7.01" y1="7" y2="7"/>
        }
        @case ('filter') {
          <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>
        }
        @case ('arrow-up') {
          <line x1="12" x2="12" y1="19" y2="5"/>
          <polyline points="5,12 12,5 19,12"/>
        }
        @case ('arrow-down') {
          <line x1="12" x2="12" y1="5" y2="19"/>
          <polyline points="19,12 12,19 5,12"/>
        }
        @case ('arrow-left') {
          <line x1="19" x2="5" y1="12" y2="12"/>
          <polyline points="12,19 5,12 12,5"/>
        }
        @case ('arrow-right') {
          <line x1="5" x2="19" y1="12" y2="12"/>
          <polyline points="12,5 19,12 12,19"/>
        }
        @case ('external-link') {
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15,3 21,3 21,9"/>
          <line x1="10" x2="21" y1="14" y2="3"/>
        }
        @case ('link') {
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        }
        @case ('copy') {
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        }
        @case ('refresh') {
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
          <path d="M21 3v5h-5"/>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
          <path d="M3 21v-5h5"/>
        }
        @case ('rotate') {
          <path d="M23 4v6h-6"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        }
      }
    </svg>
  `
})
export class IconComponent {
  @Input() name!: IconName;
  @Input() size: IconSize = 'md';
  @Input() ariaLabel?: string;
  @Input() className: string = '';

  get sizeValue(): string {
    const sizeMap: Record<IconSize, string> = {
      'xs': '14',
      'sm': '16', 
      'md': '20',
      'lg': '24'
    };
    return sizeMap[this.size];
  }

  get iconClasses(): string {
    const baseClasses = 'inline-block text-current';
    const sizeMap: Record<IconSize, string> = {
      'xs': 'w-[14px] h-[14px]',
      'sm': 'w-[16px] h-[16px]', 
      'md': 'w-[20px] h-[20px]',
      'lg': 'w-[24px] h-[24px]'
    };
    const sizeClasses = sizeMap[this.size];
    return `${baseClasses} ${sizeClasses} ${this.className}`.trim();
  }
}