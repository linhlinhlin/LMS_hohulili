import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, isDevMode, LOCALE_ID, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { provideRouter, withViewTransitions, withInMemoryScrolling } from '@angular/router';
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
  ChevronUp,
  Plus,
  PlusCircle,
  Trash2,
  Edit2,
  Paperclip,
  X,
  FileText,
  Pilcrow,
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
  GripVertical,
  Play,
  Pause,
  RefreshCw,
  Link,
  User,
  Edit3,
  AlertCircle,
  Info,
  AlertTriangle,
  Users,
  Calendar,
  Award,
  LayoutGrid,
  Archive,
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  AlertOctagon,
  Loader2,
  BarChart,
  Layers,
  Anchor,
  CheckCheck,
  Lightbulb,
  FileEdit,
  FileQuestion,
  Save,
  ChevronLeft,
  TrendingUp,
  MessageSquare,
  History,
  ExternalLink,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Printer,
  Send,
  Folder,
  MoreVertical,
  Upload,
  Book,
  Globe,
  Lock,
  FolderSync,
  Filter,
  Image,
  MousePointer2,
  List,
  SearchX,
  Type,
  Tag,
  ShieldCheck,
  ArrowUpDown,
  Building2,
  RotateCcw,
  CircleCheck,
  CircleX,
  Youtube,
  File,
  FileUp,
  FileType,
  Film,
  Clock3,
  PencilLine,
  Library,
  Sheet,
  Presentation,
  WifiOff,
  HardDrive,
  FileWarning,
  ServerCrash,
  Check,
  Sparkles,
  Star,
  LayoutList,
  Move
} from 'lucide-angular';

function isLocalBrowserRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function shouldEnableServiceWorker(): boolean {
  return !isDevMode() && !isLocalBrowserRuntime();
}

function shouldEnableViewTransitions(): boolean {
  return !isLocalBrowserRuntime();
}

// ✅ FIXED: Factory function to setup global state when app initializes
function canUseLocalStorage(): boolean {
  return typeof localStorage !== 'undefined'
    && typeof localStorage.getItem === 'function';
}

function initializeApp(authService: AuthService): () => Promise<void> {
  return () => {
    // ✅ Guard against SSR context where localStorage doesn't exist
    if (!canUseLocalStorage()) {
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
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      ...(shouldEnableViewTransitions() ? [withViewTransitions()] : [])
    ),
    // Only enable hydration in production (SSR). In dev (static mode), hydration
    // + zoneless change detection causes NG0506 timeout since there's no server DOM.
    ...(!isDevMode() ? [provideClientHydration(withEventReplay())] : []),
    provideAnimationsAsync(),
    provideHttpClient(
      withFetch(),
      withInterceptors([baseUrlInterceptor, authInterceptor, offlineInterceptor, errorInterceptor])
    ),
    // Set default locale to Vietnamese for pipes like CurrencyPipe, DatePipe, etc.
    { provide: LOCALE_ID, useValue: 'vi' },
    // Service Worker — register immediately so cache is populated ASAP
    // (was registerWhenStable:30000 — too late; users closing tab within 30s got zero cache)
    ...(shouldEnableServiceWorker() ? [
      provideServiceWorker('sw-wrapper.js', {
        enabled: true,
        registrationStrategy: 'registerImmediately'
      })
    ] : []),
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
      ChevronUp,
      Plus,
      PlusCircle,
      Trash2,
      Edit2,
      Paperclip,
      X,
      FileText,
      Pilcrow,
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
      GripVertical,
      Play,
      Pause,
      RefreshCw,
      Link,
      User,
      Edit3,
      AlertCircle,
      Info,
      AlertTriangle,
      Users,
      Calendar,
      Award,
      LayoutGrid,
      Archive,
      Activity,
      ArrowLeft,
      ArrowRight,
      ArrowUp,
      ArrowDown,
      Eye,
      EyeOff,
      AlertOctagon,
      Loader2,
      BarChart,
      Layers,
      Anchor,
      CheckCheck,
      Lightbulb,
      FileEdit,
      FileQuestion,
      Save,
      ChevronLeft,
      TrendingUp,
      MessageSquare,
      History,
      ExternalLink,
      Maximize2,
      Minimize2,
      ZoomIn,
      ZoomOut,
      RotateCw,
      Printer,
      Send,
      Folder,
      MoreVertical,
      Upload,
      Book,
      Globe,
      Lock,
      FolderSync,
      Filter,
      Image,
      MousePointer2,
      List,
      SearchX,
      Type,
      Tag,
      ShieldCheck,
      ArrowUpDown,
      Building2,
      RotateCcw,
      CircleCheck,
      CircleX,
      Youtube,
      File,
      FileUp,
      FileType,
      Film,
      Clock3,
      PencilLine,
      Library,
      Sheet,
      Presentation,
      WifiOff,
      HardDrive,
      FileWarning,
      ServerCrash,
      Check,
      Sparkles,
      Star,
      LayoutList,
      Move
    }))
  ]
};

// Register Vietnamese locale data once at app bootstrap time
registerLocaleData(localeVi);
