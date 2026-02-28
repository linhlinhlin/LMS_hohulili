import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, isDevMode, LOCALE_ID, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
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
import { offlineInterceptor } from './api/interceptors/offline.interceptor';
import { AuthService } from './core/services/auth.service';
import {
  LucideAngularModule,
  Search,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  PlusCircle,
  Trash2,
  Edit2,
  Paperclip,
  X,
  FileText,
  Video,
  HelpCircle,
  Code,
  Layout,
  Inbox,
  PlayCircle,
  ClipboardCheck,
  CheckCircle,
  Settings,
  Clock,
  Target,
  Repeat,
  ListChecks,
  Shuffle,
  ClipboardList,
  Download,
  UploadCloud,
  GripVertical
} from 'lucide-angular';

// ✅ FIXED: Factory function to setup global state when app initializes
function initializeApp(authService: AuthService): () => Promise<void> {
  return () => {
    // ✅ Guard against SSR context where localStorage doesn't exist
    if (typeof localStorage === 'undefined') {
      return Promise.resolve();
    }

    // If user is already authenticated (token in localStorage), restore context
    if (authService.isAuthenticated()) {
      authService.getCurrentUser();
    }

    return Promise.resolve();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withViewTransitions()),
    provideClientHydration(withEventReplay()),
    provideAnimationsAsync(),
    provideHttpClient(
      withFetch(),
      withInterceptors([baseUrlInterceptor, authInterceptor, offlineInterceptor, errorInterceptor])
    ),
    // Set default locale to Vietnamese for pipes like CurrencyPipe, DatePipe, etc.
    { provide: LOCALE_ID, useValue: 'vi' },
    // Service Worker — register immediately so cache is populated ASAP
    // (was registerWhenStable:30000 — too late; users closing tab within 30s got zero cache)
    ...(isDevMode() ? [] : [
      provideServiceWorker('ngsw-worker.js', {
        enabled: true,
        registrationStrategy: 'registerImmediately'
      })
    ]),
    // ✅ FIXED: Add APP_INITIALIZER to setup global state before app renders
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    },
    // ✅ NEW: SOTA 2025 Global Lucide Icon Provider
    importProvidersFrom(LucideAngularModule.pick({
      Search,
      BookOpen,
      ChevronRight,
      ChevronDown,
      Plus,
      PlusCircle,
      Trash2,
      Edit2,
      Paperclip,
      X,
      FileText,
      Video,
      HelpCircle,
      Code,
      Layout,
      Inbox,
      PlayCircle,
      ClipboardCheck,
      CheckCircle,
      Settings,
      Clock,
      Target,
      Repeat,
      ListChecks,
      Shuffle,
      ClipboardList,
      Download,
      UploadCloud,
      GripVertical
    }))
  ]
};

// Register Vietnamese locale data once at app bootstrap time
registerLocaleData(localeVi);
