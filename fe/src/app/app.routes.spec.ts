import { routes } from './app.routes';
import { OfflineFallbackComponent } from './shared/components/offline-fallback/offline-fallback.component';

describe('app routes', () => {
  it('keeps the offline recovery route eagerly available', () => {
    const offlineRoute = routes.find((route) => route.path === 'offline');

    expect(offlineRoute).toBeDefined();
    expect(offlineRoute?.component).toBe(OfflineFallbackComponent);
    expect(offlineRoute?.loadComponent).toBeUndefined();
  });
});
