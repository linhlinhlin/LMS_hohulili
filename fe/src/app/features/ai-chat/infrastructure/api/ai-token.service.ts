import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

interface AiTokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/**
 * Manages AI service JWT tokens obtained via the LMS backend token exchange.
 *
 * Flow:
 * 1. User navigates to AI chat
 * 2. This service calls POST /api/v3/ai/token (LMS backend)
 * 3. LMS backend exchanges user identity for AI JWT via HMAC
 * 4. Returns AI JWT pair
 * 5. Frontend can use AI JWT for direct streaming or LMS proxy
 */
@Injectable({ providedIn: 'root' })
export class AiTokenService {
  private readonly _token = signal<string | null>(null);
  private readonly _refreshToken = signal<string | null>(null);
  private readonly _expiresAt = signal<number>(0);

  readonly hasToken = computed(() => {
    const token = this._token();
    const expires = this._expiresAt();
    return token !== null && Date.now() < expires;
  });

  constructor(private http: HttpClient) {}

  /**
   * Get a valid AI token, exchanging if needed.
   * Caches token for 14 minutes (AI JWT expires at 15 min).
   */
  async getToken(): Promise<string | null> {
    if (this.hasToken()) {
      return this._token();
    }
    return this.exchangeToken();
  }

  /**
   * Exchange LMS session for AI JWT via backend proxy.
   */
  private async exchangeToken(): Promise<string | null> {
    try {
      const response = await this.http
        .post<{ success: boolean; data: AiTokenPair }>(
          `${environment.apiUrl}/api/v3/ai/token`,
          {}
        )
        .toPromise();

      if (response?.success && response.data?.access_token) {
        this._token.set(response.data.access_token);
        this._refreshToken.set(response.data.refresh_token);
        // Cache for 14 minutes (JWT expires at 15 min)
        this._expiresAt.set(Date.now() + 14 * 60 * 1000);
        return response.data.access_token;
      }
    } catch (error) {
      console.error('AI token exchange failed:', error);
    }
    return null;
  }

  /**
   * Clear cached token (e.g., on logout).
   */
  clearToken(): void {
    this._token.set(null);
    this._refreshToken.set(null);
    this._expiresAt.set(0);
  }
}
