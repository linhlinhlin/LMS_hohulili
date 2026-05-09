import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertTriangle, Loader2, LucideAngularModule, RefreshCw } from 'lucide-angular';
import { AppUpdateStateService, AppUpdateVersionInfo } from '../../../core/services/app-update-state.service';
import { SwUpdateService } from '../../../core/services/sw-update.service';
import { AppUpdateBannerComponent } from './app-update-banner.component';

const version: AppUpdateVersionInfo = {
  currentHash: 'old',
  latestHash: 'new',
  detectedAt: 1,
  severity: 'normal',
  releaseNote: null,
};

describe('AppUpdateBannerComponent', () => {
  let fixture: ComponentFixture<AppUpdateBannerComponent>;
  let state: AppUpdateStateService;
  let swUpdate: jasmine.SpyObj<Pick<SwUpdateService, 'applyPendingUpdate' | 'remindLater'>>;

  beforeEach(() => {
    swUpdate = jasmine.createSpyObj('SwUpdateService', ['applyPendingUpdate', 'remindLater']);

    TestBed.configureTestingModule({
      imports: [AppUpdateBannerComponent],
      providers: [
        AppUpdateStateService,
        { provide: SwUpdateService, useValue: swUpdate },
        importProvidersFrom(LucideAngularModule.pick({ AlertTriangle, Loader2, RefreshCw })),
      ],
    });

    fixture = TestBed.createComponent(AppUpdateBannerComponent);
    state = TestBed.inject(AppUpdateStateService);
  });

  it('stays hidden when no update is ready', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="app-update-banner"]')).toBeNull();
  });

  it('shows a non-blocking update prompt and applies the update from the primary action', () => {
    state.markReady(version, null);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Có bản cập nhật mới');

    const updateButton = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Cập nhật')) as HTMLButtonElement;

    updateButton.click();

    expect(swUpdate.applyPendingUpdate).toHaveBeenCalled();
  });

  it('lets users postpone non-critical updates', () => {
    state.markReady(version, null);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const laterButton = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Để sau')) as HTMLButtonElement;

    laterButton.click();

    expect(swUpdate.remindLater).toHaveBeenCalled();
  });
});
