import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { AUTH_ENDPOINTS } from '../../api/endpoints/auth.endpoints';
import { ApiResponse } from '../../api/types/common.types';

export interface GoogleAuthConfig {
  enabled: boolean;
  clientId: string | null;
  /**
   * When true, the backend has the server-side authorization-code flow fully configured.
   * The FE should prefer it over the in-page GSI button — clicking "Sign in with Google"
   * should `window.location` to {@link authorizeUrl} instead of opening the GSI popup.
   */
  redirectFlowEnabled?: boolean;
  /** Path to navigate to for the redirect flow (e.g. "/api/v3/auth/google/authorize"). */
  authorizeUrl?: string | null;
  /** Stable reason code when Google auth is unavailable. */
  unavailableReason?: string | null;
  /** User-facing fallback copy to show on the login page when Google auth is unavailable. */
  unavailableMessage?: string | null;
}

export interface GoogleButtonExperience {
  kind: 'desktop_popup' | 'browser_native';
  helperText: string;
}

type GoogleCredentialCallback = (credential: string) => void;

type GoogleButtonTheme = 'outline' | 'filled_blue' | 'filled_black';
type GoogleButtonSize = 'large' | 'medium' | 'small';
type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with';
type GoogleButtonShape = 'rectangular' | 'pill' | 'circle' | 'square';
type GoogleButtonUxMode = 'popup' | 'redirect';

export interface GoogleButtonRenderOptions {
  theme?: GoogleButtonTheme;
  size?: GoogleButtonSize;
  text?: GoogleButtonText;
  shape?: GoogleButtonShape;
  width?: string | number | null;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleInitializeOptions {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  itp_support?: boolean;
  use_fedcm_for_button?: boolean;
  ux_mode?: GoogleButtonUxMode;
}

interface GoogleButtonConfiguration {
  theme: GoogleButtonTheme;
  size: GoogleButtonSize;
  text: GoogleButtonText;
  shape: GoogleButtonShape;
  width?: string | number;
}

interface GoogleAccountsIdApi {
  initialize(options: GoogleInitializeOptions): void;
  renderButton(container: HTMLElement, options: GoogleButtonConfiguration): void;
}

interface GoogleIdentityWindow {
  accounts?: {
    id?: GoogleAccountsIdApi;
  };
}

const GOOGLE_GSI_SCRIPT_ID = 'google-identity-services-client';
const GOOGLE_GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

@Injectable({
  providedIn: 'root'
})
export class GoogleIdentityService {
  private http = inject(HttpClient);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  private googleConfig$?: Observable<GoogleAuthConfig>;
  private scriptLoadPromise?: Promise<void>;

  /**
   * Per Google Identity docs, `google.accounts.id.initialize()` is expected to run exactly once
   * per page lifecycle per (client_id, ux_mode, fedcm). Calling it repeatedly triggers the
   * `[GSI_LOGGER]: google.accounts.id.initialize() is called multiple times` warning and — per
   * the library's behavior — only the last call wins, which can clobber our live callback.
   *
   * We cache the signature of the last successful initialize and skip redundant calls. The
   * credential callback is stored as a mutable pointer so that late re-renders still reach the
   * current component instance without needing a re-init.
   */
  private initializedSignature: string | null = null;
  private activeCredentialCallback: GoogleCredentialCallback | null = null;

  getConfig(): Observable<GoogleAuthConfig> {
    if (!this.googleConfig$) {
      this.googleConfig$ = this.http.get<ApiResponse<GoogleAuthConfig>>(AUTH_ENDPOINTS.GOOGLE_CONFIG).pipe(
        map(response => response.data ?? {
          enabled: false,
          clientId: null,
          redirectFlowEnabled: false,
          authorizeUrl: null,
          unavailableReason: null,
          unavailableMessage: null
        }),
        catchError(() => of({
          enabled: false,
          clientId: null,
          redirectFlowEnabled: false,
          authorizeUrl: null,
          unavailableReason: null,
          unavailableMessage: null
        } as GoogleAuthConfig)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.googleConfig$;
  }

  async renderSignInButton(
    container: HTMLElement,
    config: GoogleAuthConfig,
    callback: GoogleCredentialCallback,
    options: GoogleButtonRenderOptions = {}
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !config.enabled || !config.clientId) {
      return;
    }

    await this.loadScript();

    const googleAccountsId = this.getGoogleAccountsId();
    const signature = `${config.clientId}|popup|classic`;

    // Always keep the credential callback fresh — component instances come and go across routes.
    this.activeCredentialCallback = callback;

    if (this.initializedSignature !== signature) {
      // FedCM is Google's newer in-browser identity prompt, but it requires third-party cookies
      // on accounts.google.com and fails with "NetworkError: Error retrieving a token" in many
      // real networks (corporate proxies, adblockers, restricted regions, Brave/Arc defaults).
      // The classic popup flow has none of those failure modes, so we disable FedCM entirely
      // and rely on the popup — much more reliable across devices and network conditions.
      googleAccountsId.initialize({
        client_id: config.clientId,
        callback: (response) => {
          if (response.credential && this.activeCredentialCallback) {
            this.activeCredentialCallback(response.credential);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        ux_mode: 'popup',
        use_fedcm_for_button: false
      });
      this.initializedSignature = signature;
    }

    container.innerHTML = '';
    googleAccountsId.renderButton(container, {
      theme: options.theme ?? 'outline',
      size: options.size ?? 'large',
      text: options.text ?? 'continue_with',
      shape: options.shape ?? 'rectangular',
      width: this.resolveButtonWidth(container, options.width)
    });
  }

  getPreferredButtonExperience(): GoogleButtonExperience {
    if (!isPlatformBrowser(this.platformId)) {
      return {
        kind: 'desktop_popup',
        helperText: ''
      };
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent)
      || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const compactViewport = window.matchMedia?.('(max-width: 1023px)').matches ?? false;

    if (isIOS || coarsePointer || compactViewport) {
      return {
        kind: 'browser_native',
        helperText: 'Google có thể mở trong tab hoặc cửa sổ mới.'
      };
    }

    return {
      kind: 'desktop_popup',
      helperText: 'Google sẽ mở trong cửa sổ riêng.'
    };
  }

  private async loadScript(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.hasGoogleClient()) {
      return;
    }

    if (this.scriptLoadPromise) {
      return this.scriptLoadPromise;
    }

    this.scriptLoadPromise = new Promise<void>((resolve, reject) => {
      const existingScript = this.document.getElementById(GOOGLE_GSI_SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Google script failed to load')), { once: true });
        return;
      }

      const script = this.document.createElement('script');
      script.id = GOOGLE_GSI_SCRIPT_ID;
      script.src = GOOGLE_GSI_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google script failed to load'));
      this.document.head.appendChild(script);
    });

    return this.scriptLoadPromise;
  }

  private hasGoogleClient(): boolean {
    const googleWindow = (window as typeof window & { google?: GoogleIdentityWindow }).google;
    return !!googleWindow?.accounts?.id;
  }

  private getGoogleAccountsId(): GoogleAccountsIdApi {
    const googleWindow = (window as typeof window & { google?: GoogleIdentityWindow }).google;
    const googleAccountsId = googleWindow?.accounts?.id;

    if (!googleAccountsId) {
      throw new Error('Google Identity Services client is unavailable');
    }

    return googleAccountsId;
  }

  private resolveButtonWidth(container: HTMLElement, requestedWidth?: string | number | null): number | undefined {
    if (typeof requestedWidth === 'number' && Number.isFinite(requestedWidth)) {
      return Math.round(requestedWidth);
    }

    if (typeof requestedWidth === 'string') {
      const normalized = requestedWidth.trim();
      if (/^\d+$/.test(normalized)) {
        return Number(normalized);
      }
    }

    const measuredWidth = container.getBoundingClientRect().width
      || container.parentElement?.getBoundingClientRect().width
      || 0;

    if (!measuredWidth) {
      return undefined;
    }

    return Math.max(220, Math.round(measuredWidth));
  }
}
