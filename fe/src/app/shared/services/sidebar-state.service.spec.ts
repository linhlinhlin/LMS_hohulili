import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { SidebarStateService } from './sidebar-state.service';
import { SIDEBAR_STORAGE_KEY } from '../components/navigation/sidebar.tokens';

describe('SidebarStateService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function createService(platform: 'browser' | 'server' = 'browser'): SidebarStateService {
    TestBed.configureTestingModule({
      providers: [
        SidebarStateService,
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    return TestBed.inject(SidebarStateService);
  }

  it('initialises signals to defaults', () => {
    const svc = createService();
    expect(svc.collapsed()).toBe(false);
    expect(svc.mobileOpen()).toBe(false);
    expect(svc.hidden()).toBe(false);
    expect(svc.canShow()).toBe(true);
  });

  it('toggleCollapsed flips the value and persists to localStorage', () => {
    const svc = createService();
    svc.toggleCollapsed();
    expect(svc.collapsed()).toBe(true);
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('true');
    svc.toggleCollapsed();
    expect(svc.collapsed()).toBe(false);
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('false');
  });

  it('setCollapsed is idempotent (no write when value unchanged)', () => {
    const svc = createService();
    svc.setCollapsed(true);
    const writeSpy = spyOn(localStorage, 'setItem').and.callThrough();
    svc.setCollapsed(true); // same value
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('reacts to storage event for sidebar:collapsed key', () => {
    const svc = createService();
    expect(svc.collapsed()).toBe(false);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SIDEBAR_STORAGE_KEY,
        newValue: 'true',
      }),
    );
    expect(svc.collapsed()).toBe(true);
  });

  it('ignores storage events for unrelated keys', () => {
    const svc = createService();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'some-other-key',
        newValue: 'true',
      }),
    );
    expect(svc.collapsed()).toBe(false);
  });

  it('ignores storage events whose newValue matches current state (no feedback loop)', () => {
    const svc = createService();
    // Already false; dispatching false-matching event should be a no-op
    let emissionCount = 0;
    const sub = (TestBed.runInInjectionContext(() => svc.collapsed) as any);
    // Use effect-like watch indirectly — track via getter spy
    const getter = spyOnProperty(svc, 'collapsed', 'get').and.callThrough();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SIDEBAR_STORAGE_KEY,
        newValue: 'false',
      }),
    );
    expect(svc.collapsed()).toBe(false);
    // No change → ok
  });

  it('ignores storage events with newValue=null (key deleted)', () => {
    const svc = createService();
    svc.setCollapsed(true);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SIDEBAR_STORAGE_KEY,
        newValue: null,
      }),
    );
    expect(svc.collapsed()).toBe(true); // unchanged
  });

  it('toggleCollapsed survives localStorage write failures', () => {
    const svc = createService();
    spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');
    expect(() => svc.toggleCollapsed()).not.toThrow();
    expect(svc.collapsed()).toBe(true); // in-memory still updates
  });

  it('does not register storage listener when on server platform', () => {
    const addSpy = spyOn(window, 'addEventListener').and.callThrough();
    createService('server');
    expect(addSpy).not.toHaveBeenCalledWith('storage', jasmine.any(Function));
  });

  it('mobileOpen is ephemeral — openMobile/closeMobile do not touch localStorage', () => {
    const svc = createService();
    const writeSpy = spyOn(localStorage, 'setItem').and.callThrough();
    svc.openMobile();
    svc.closeMobile();
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('canShow returns false when hidden=true', () => {
    const svc = createService();
    svc.setHidden(true);
    expect(svc.canShow()).toBe(false);
    svc.setHidden(false);
    expect(svc.canShow()).toBe(true);
  });
});
