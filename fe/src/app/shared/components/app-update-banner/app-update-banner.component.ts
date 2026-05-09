import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { AppUpdateStateService } from '../../../core/services/app-update-state.service';
import { SwUpdateService } from '../../../core/services/sw-update.service';

@Component({
  selector: 'app-update-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  templateUrl: './app-update-banner.component.html',
})
export class AppUpdateBannerComponent {
  private readonly swUpdate = inject(SwUpdateService);
  protected readonly updateState = inject(AppUpdateStateService);

  protected readonly state = this.updateState.state;
  protected readonly prompt = this.updateState.promptCopy;
  protected readonly shouldShow = this.updateState.shouldShowPrompt;

  protected readonly iconName = computed(() => {
    const status = this.state().status;
    if (status === 'unrecoverable') return 'alert-triangle';
    if (status === 'applying') return 'loader-2';
    return 'refresh-cw';
  });

  protected readonly ariaLive = computed(() => (
    this.prompt()?.tone === 'danger' ? 'assertive' : 'polite'
  ));

  protected readonly containerClass = computed(() => {
    const tone = this.prompt()?.tone ?? 'info';
    const toneClass = {
      info: 'border-blue-200 bg-white/95 text-slate-950 shadow-blue-950/10',
      warning: 'border-amber-200 bg-amber-50/95 text-amber-950 shadow-amber-950/10',
      danger: 'border-red-200 bg-red-50/95 text-red-950 shadow-red-950/10',
    }[tone];

    return [
      'pointer-events-auto flex min-h-14 flex-col gap-3 rounded-lg border px-3 py-3 shadow-lg backdrop-blur',
      'sm:flex-row sm:items-center sm:justify-between sm:px-4',
      toneClass,
    ].join(' ');
  });

  protected readonly iconClass = computed(() => {
    const tone = this.prompt()?.tone ?? 'info';
    const toneClass = {
      info: 'bg-blue-50 text-[#0056D2]',
      warning: 'bg-amber-100 text-amber-700',
      danger: 'bg-red-100 text-red-700',
    }[tone];

    return [
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
      toneClass,
    ].join(' ');
  });

  protected readonly primaryButtonClass = computed(() => {
    const tone = this.prompt()?.tone ?? 'info';
    const toneClass = {
      info: 'bg-[#0056D2] text-white hover:bg-[#004BB5] focus:ring-[#0056D2]',
      warning: 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    }[tone];

    return [
      'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold',
      'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-75',
      toneClass,
    ].join(' ');
  });

  protected applyUpdate(): void {
    this.swUpdate.applyPendingUpdate();
  }

  protected remindLater(): void {
    this.swUpdate.remindLater();
  }
}
