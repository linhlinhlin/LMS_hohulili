import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

// Icon names based on Heroicons
export type IconName = 
  | 'academic-cap'      // 🎓 Education
  | 'book-open'         // 📚 Book/Course
  | 'pencil'            // 📝 Edit/Assignment
  | 'check-circle'      // ✅ Success/Complete
  | 'x-circle'          // ❌ Error/Failed
  | 'fire'              // 🔥 Streak
  | 'star'              // ⭐ Rating/Favorite
  | 'trophy'            // 🏆 Achievement
  | 'chart-bar'         // 📊 Stats
  | 'arrow-trending-up' // 📈 Progress
  | 'bolt'              // ⚡ Quick/Fast
  | 'sparkles'          // ✨ New/Special
  | 'clock'             // ⏰ Time
  | 'calendar'          // 📅 Date
  | 'user'              // 👤 User
  | 'users'             // 👥 Group
  | 'play'              // ▶️ Video
  | 'document-text'     // 📄 Document
  | 'clipboard-document-check' // 📋 Quiz
  | 'arrow-right'       // → Next
  | 'arrow-left'        // ← Previous
  | 'chevron-right'     // › Navigate
  | 'chevron-left'      // ‹ Navigate
  | 'chevron-up'        // ∧ Collapse
  | 'chevron-down'      // ∨ Expand
  | 'ellipsis-vertical' // ⋮ Menu
  | 'bars-3'            // ☰ Hamburger
  | 'x-mark'            // × Close
  | 'magnifying-glass'  // 🔍 Search
  | 'bell'              // 🔔 Notification
  | 'cog-6-tooth'       // ⚙️ Settings
  | 'arrow-path'        // 🔄 Refresh/Retry
  | 'exclamation-circle' // ⚠️ Warning
  | 'information-circle' // ℹ️ Info
  | 'check'             // ✓ Check
  | 'plus'              // + Add
  | 'minus';            // - Remove

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [class]="iconClasses()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-hidden]="ariaLabel() ? null : 'true'"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor">
      <ng-container [ngSwitch]="name()">
        <!-- Academic Cap -->
        <path *ngSwitchCase="'academic-cap'" stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        
        <!-- Book Open -->
        <path *ngSwitchCase="'book-open'" stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        
        <!-- Pencil -->
        <path *ngSwitchCase="'pencil'" stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        
        <!-- Check Circle -->
        <path *ngSwitchCase="'check-circle'" stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        
        <!-- X Circle -->
        <path *ngSwitchCase="'x-circle'" stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        
        <!-- Fire -->
        <path *ngSwitchCase="'fire'" stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        
        <!-- Star -->
        <path *ngSwitchCase="'star'" stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        
        <!-- Trophy -->
        <path *ngSwitchCase="'trophy'" stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
        
        <!-- Chart Bar -->
        <path *ngSwitchCase="'chart-bar'" stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        
        <!-- Arrow Trending Up -->
        <path *ngSwitchCase="'arrow-trending-up'" stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        
        <!-- Clock -->
        <path *ngSwitchCase="'clock'" stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        
        <!-- Play -->
        <path *ngSwitchCase="'play'" stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        
        <!-- Arrow Right -->
        <path *ngSwitchCase="'arrow-right'" stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        
        <!-- Arrow Left -->
        <path *ngSwitchCase="'arrow-left'" stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        
        <!-- Chevron Up -->
        <path *ngSwitchCase="'chevron-up'" stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        
        <!-- Chevron Down -->
        <path *ngSwitchCase="'chevron-down'" stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        
        <!-- Ellipsis Vertical -->
        <path *ngSwitchCase="'ellipsis-vertical'" stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
        
        <!-- Check -->
        <path *ngSwitchCase="'check'" stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        
        <!-- Arrow Path (Refresh) -->
        <path *ngSwitchCase="'arrow-path'" stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        
        <!-- Exclamation Circle -->
        <path *ngSwitchCase="'exclamation-circle'" stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </ng-container>
    </svg>
  `,
  styles: [`
    @import '../../../../../styles/variables';

    .icon {
      display: inline-block;
      flex-shrink: 0;
      vertical-align: middle;
    }

    .icon-xs {
      width: $icon-xs;
      height: $icon-xs;
    }

    .icon-sm {
      width: $icon-sm;
      height: $icon-sm;
    }

    .icon-md {
      width: $icon-md;
      height: $icon-md;
    }

    .icon-lg {
      width: $icon-lg;
      height: $icon-lg;
    }

    .icon-xl {
      width: $icon-xl;
      height: $icon-xl;
    }
  `]
})
export class IconComponent {
  name = input.required<IconName>();
  size = input<IconSize>('md');
  ariaLabel = input<string>('');

  iconClasses() {
    return ['icon', `icon-${this.size()}`].join(' ');
  }
}
