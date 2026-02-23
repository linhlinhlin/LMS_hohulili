import { NetworkStatusService, ConnectionTier } from './network-status.service';

describe('NetworkStatusService', () => {
  let service: NetworkStatusService;

  beforeEach(() => {
    service = new NetworkStatusService();
  });

  describe('Initial state', () => {
    it('should have online signal reflecting navigator.onLine', () => {
      expect(typeof service.online()).toBe('boolean');
    });

    it('should have effectiveBandwidthMbps as a number', () => {
      expect(typeof service.effectiveBandwidthMbps()).toBe('number');
    });
  });

  describe('connectionTier computed', () => {
    it('should return "none" when offline', () => {
      service.online.set(false);
      expect(service.connectionTier()).toBe('none');
    });

    it('should return "slow" when bandwidth < 1 Mbps', () => {
      service.online.set(true);
      service.effectiveBandwidthMbps.set(0.5);
      expect(service.connectionTier()).toBe('slow');
    });

    it('should return "fast" when bandwidth >= 1 Mbps', () => {
      service.online.set(true);
      service.effectiveBandwidthMbps.set(5);
      expect(service.connectionTier()).toBe('fast');
    });

    it('should return "fast" when bandwidth is exactly 1 Mbps', () => {
      service.online.set(true);
      service.effectiveBandwidthMbps.set(1);
      expect(service.connectionTier()).toBe('fast');
    });
  });

  describe('connectionLabel computed', () => {
    it('should return "Ngoại tuyến" when offline', () => {
      service.online.set(false);
      expect(service.connectionLabel()).toBe('Ngoại tuyến');
    });

    it('should return "Kết nối chậm" when slow', () => {
      service.online.set(true);
      service.effectiveBandwidthMbps.set(0.3);
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
      service.effectiveBandwidthMbps.set(10);
      expect(service.connectionTier()).toBe('fast');

      service.online.set(false);
      expect(service.connectionTier()).toBe('none');

      service.online.set(true);
      expect(service.connectionTier()).toBe('fast');
    });

    it('should update connectionTier when bandwidth changes', () => {
      service.online.set(true);

      service.effectiveBandwidthMbps.set(10);
      expect(service.connectionTier()).toBe('fast');

      service.effectiveBandwidthMbps.set(0.2);
      expect(service.connectionTier()).toBe('slow');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero bandwidth as slow', () => {
      service.online.set(true);
      service.effectiveBandwidthMbps.set(0);
      expect(service.connectionTier()).toBe('slow');
    });

    it('should handle very high bandwidth as fast', () => {
      service.online.set(true);
      service.effectiveBandwidthMbps.set(1000);
      expect(service.connectionTier()).toBe('fast');
    });
  });
});
