import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, isDevMode, LOCALE_ID, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { authInterceptor } from './api/interceptors/auth.interceptor';
import { errorInterceptor } from './api/interceptors/error.interceptor';
import { baseUrlInterceptor } from './api/interceptors/base-url.interceptor';
import { AuthService } from './core/services/auth.service';

// ✅ FIXED: Factory function to setup global state when app initializes
function initializeApp(authService: AuthService): () => Promise<void> {
  return () => {
    // ✅ Guard against SSR context where localStorage doesn't exist
    if (typeof localStorage === 'undefined') {
      console.log('[APP INIT] Running in SSR context, skipping localStorage access');
      return Promise.resolve();
    }
    
    console.log('[APP INIT] Initializing application...');
    
    // If user is already authenticated (token in localStorage), restore context
    if (authService.isAuthenticated()) {
      console.log('[APP INIT] User already authenticated, restoring context...');
      const user = authService.getCurrentUser();
      console.log('[APP INIT] Restored user:', user?.fullName, 'role:', user?.role);
    }
    
    return Promise.resolve();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAnimationsAsync(),
    provideHttpClient(
      withFetch(),
      withInterceptors([baseUrlInterceptor, authInterceptor, errorInterceptor])
    ),
    // Set default locale to Vietnamese for pipes like CurrencyPipe, DatePipe, etc.
    { provide: LOCALE_ID, useValue: 'vi' },
    // Service Worker disabled in development to avoid redirect issues
    ...(isDevMode() ? [] : [
      provideServiceWorker('ngsw-worker.js', {
        enabled: true,
        registrationStrategy: 'registerWhenStable:30000'
      })
    ]),
    // ✅ FIXED: Add APP_INITIALIZER to setup global state before app renders
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    }
  ]
};

// Register Vietnamese locale data once at app bootstrap time
registerLocaleData(localeVi);