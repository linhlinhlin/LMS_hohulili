import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { NetworkStatusService } from './network-status.service';

describe('NetworkStatusService', () => {
  let service: NetworkStatusService;
  let fetchSpy: jasmine.Spy<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;

  beforeEach(() => {
    fetchSpy = spyOn(window, 'fetch').and.callFake(async () => new Response('', { status: 200 }));
    service = new NetworkStatusService();
  });

  afterEach(() => {
    service.ngOnDestroy();
    fetchSpy.calls.reset();
  });

  async function confirmSlowConnection(rttMs = 1600): Promise<void> {
    let now = 0;
    spyOn(performance, 'now').and.callFake(() => now);
    fetchSpy.calls.reset();
    fetchSpy.and.callFake(async () => {
      now += rttMs;
      return new Response('', { status: 200 });
    });

    await service.probeNow();
    await service.probeNow();
  }

  describe('Initial state', () => {
    it('should have online signal reflecting navigator.onLine', () => {
      expect(typeof service.online()).toBe('boolean');
    });

    it('should have effectiveBandwidthMbps as a number', () => {
      expect(typeof service.effectiveBandwidthMbps()).toBe('number');
    });

    it('should expose reportedDownlinkMbps as nullable browser telemetry', () => {
      expect(
        service.reportedDownlinkMbps() === null ||
          typeof service.reportedDownlinkMbps() === 'number',
      ).toBeTrue();
    });
  });

  describe('connectionTier computed', () => {
    it('should return "none" when offline', () => {
      service.online.set(false);
      expect(service.connectionTier()).toBe('none');
    });

    it('should not show slow from raw bandwidth telemetry alone', () => {
      service.online.set(true);
      service.effectiveBandwidthMbps.set(0.5);
      expect(service.connectionTier()).toBe('fast');
    });

    it('should return "fast" while online before slow connectivity is confirmed', () => {
      service.online.set(true);
      service.effectiveBandwidthMbps.set(5);
      expect(service.connectionTier()).toBe('fast');
    });

    it('should return "slow" after repeated slow connectivity probes', async () => {
      service.online.set(true);

      await confirmSlowConnection();

      expect(service.connectionTier()).toBe('slow');
    });
  });

  describe('connectionLabel computed', () => {
    it('should return "Ngoại tuyến" when offline', () => {
      service.online.set(false);
      expect(service.connectionLabel()).toBe('Ngoại tuyến');
    });

    it('should return "Kết nối chậm" when slow is confirmed', async () => {
      service.online.set(true);

      await confirmSlowConnection();

      expect(service.connectionLabel()).toBe('Kết nối chậm');
    });

    it('should return "Trực tuyến" when fast', () => {
      service.online.set(true);
      service.effectiveBandwidthMbps.set(10);
      expect(service.connectionLabel()).toBe('Trực tuyến');
    });
  });

  describe('Signal reactivity', () => {
    it('should update connectionTier when online signal changes', () => {
      service.online.set(true);
      expect(service.connectionTier()).toBe('fast');

      service.online.set(false);
      expect(service.connectionTier()).toBe('none');

      service.online.set(true);
      expect(service.connectionTier()).toBe('fast');
    });

    it('should keep connectionTier stable when bandwidth telemetry changes', () => {
      service.online.set(true);

      service.effectiveBandwidthMbps.set(10);
      expect(service.connectionTier()).toBe('fast');

      service.effectiveBandwidthMbps.set(0.2);
      expect(service.connectionTier()).toBe('fast');
    });
  });

  describe('probe behavior', () => {
    it('should probe the frontend edge instead of backend actuator health', async () => {
      fetchSpy.calls.reset();

      await service.probeNow();

      const probeUrl = String(fetchSpy.calls.mostRecent().args[0]);
      expect(probeUrl).toContain('/health?offlineProbe=');
    });

    it('should require two slow probe samples before showing slow', async () => {
      let now = 0;
      spyOn(performance, 'now').and.callFake(() => now);
      fetchSpy.calls.reset();
      fetchSpy.and.callFake(async () => {
        now += 1600;
        return new Response('', { status: 200 });
      });

      await service.probeNow();
      expect(service.connectionTier()).toBe('fast');

      await service.probeNow();
      expect(service.connectionTier()).toBe('slow');
    });

    it('should clear confirmed slow state after a fast probe', async () => {
      await confirmSlowConnection();
      expect(service.connectionTier()).toBe('slow');

      (performance.now as jasmine.Spy).and.returnValues(0, 200);
      fetchSpy.and.callFake(async () => new Response('', { status: 200 }));

      await service.probeNow();

      expect(service.connectionTier()).toBe('fast');
    });
  });

  describe('offline signal tracking', () => {
    it('should wait for a probe before showing offline after a transport failure', fakeAsync(() => {
      service.online.set(true);
      fetchSpy.calls.reset();

      service.markOfflineFromTransportFailure();

      expect(service.online()).toBeTrue();
      expect(service.hasRecentOfflineSignal()).toBeTrue();
      expect(service.isEffectivelyOffline()).toBeFalse();

      tick(250);
      flushMicrotasks();

      expect(fetchSpy).toHaveBeenCalled();
      expect(service.online()).toBeTrue();
      expect(service.hasRecentOfflineSignal()).toBeFalse();
    }));

    it('should treat one failed probe as suspected, not visible slow', fakeAsync(() => {
      service.online.set(true);
      fetchSpy.and.callFake(async () => new Response('', { status: 503 }));

      service.markOfflineFromTransportFailure();
      tick(250);
      flushMicrotasks();

      expect(service.online()).toBeTrue();
      expect(service.connectionTier()).toBe('fast');
      expect(service.effectiveBandwidthMbps()).toBe(0.5);
      expect(service.hasRecentOfflineSignal()).toBeTrue();
      expect(service.isEffectivelyOffline()).toBeFalse();
    }));

    it('should confirm offline after repeated failed probes', async () => {
      service.online.set(true);
      fetchSpy.and.callFake(async () => new Response('', { status: 503 }));

      await service.probeNow();
      await service.probeNow();

      expect(service.online()).toBeFalse();
      expect(service.hasRecentOfflineSignal()).toBeTrue();
      expect(service.isEffectivelyOffline()).toBeTrue();
    });

    it('should let manual retry recover on a successful frontend probe', async () => {
      service.online.set(true);
      fetchSpy.calls.reset();
      fetchSpy.and.callFake(async () => new Response('', { status: 200 }));

      const recovered = await service.probeNow();

      expect(recovered).toBeTrue();
      expect(service.online()).toBeTrue();
      expect(service.hasRecentOfflineSignal()).toBeFalse();
      expect(fetchSpy.calls.count()).toBe(1);
    });

    it('should clear a suspected offline signal after a successful HTTP response', fakeAsync(() => {
      service.online.set(true);
      fetchSpy.calls.reset();
      service.markOfflineFromTransportFailure();

      service.markOnlineFromHttpSuccess(250);
      tick(250);

      expect(service.online()).toBeTrue();
      expect(service.hasRecentOfflineSignal()).toBeFalse();
      expect(service.isEffectivelyOffline()).toBeFalse();
      expect(fetchSpy).not.toHaveBeenCalled();
    }));
  });

  describe('background mutation timeout tracking', () => {
    it('should defer background sync without showing the slow badge', () => {
      service.online.set(true);

      service.markBackgroundMutationTimeout();

      expect(service.hasRecentBackgroundTimeout()).toBeTrue();
      expect(service.shouldDeferNonCriticalSync()).toBeTrue();
      expect(service.connectionTier()).toBe('fast');
    });

    it('should keep background deferral after a successful frontend probe', fakeAsync(() => {
      service.online.set(true);
      fetchSpy.calls.reset();

      service.markBackgroundMutationTimeout();
      tick(250);
      flushMicrotasks();

      expect(fetchSpy).toHaveBeenCalled();
      expect(service.hasRecentBackgroundTimeout()).toBeTrue();
      expect(service.shouldDeferNonCriticalSync()).toBeTrue();
      expect(service.connectionTier()).toBe('fast');
    }));

    it('should clear background timeout state after a successful HTTP response', () => {
      service.online.set(true);
      service.markBackgroundMutationTimeout();

      service.markOnlineFromHttpSuccess(250);

      expect(service.hasRecentBackgroundTimeout()).toBeFalse();
      expect(service.shouldDeferNonCriticalSync()).toBeFalse();
    });
  });

  describe('non-critical sync deferral', () => {
    it('should defer background sync while effectively offline', () => {
      service.online.set(false);

      expect(service.shouldDeferNonCriticalSync()).toBeTrue();
    });

    it('should defer background sync on confirmed slow connections', async () => {
      service.online.set(true);

      await confirmSlowConnection();

      expect(service.shouldDeferNonCriticalSync()).toBeTrue();
    });

    it('should defer background sync when Save-Data is enabled', () => {
      service.online.set(true);
      service.effectiveBandwidthMbps.set(10);
      service.saveDataEnabled.set(true);

      expect(service.shouldDeferNonCriticalSync()).toBeTrue();
    });

    it('should allow background sync on a stable fast connection', () => {
      service.online.set(true);
      service.effectiveBandwidthMbps.set(10);
      service.saveDataEnabled.set(false);

      expect(service.shouldDeferNonCriticalSync()).toBeFalse();
    });
  });
});
