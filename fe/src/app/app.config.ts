import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, isDevMode, LOCALE_ID } from '@angular/core';
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
    ])
  ]
};

// Register Vietnamese locale data once at app bootstrap time
registerLocaleData(localeVi);