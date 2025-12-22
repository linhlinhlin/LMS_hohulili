/**
 * API Configuration - Single Source of Truth
 * 
 * SOTA Best Practice (Google, Amazon, YouTube patterns):
 * - All API version/prefix changes happen in ONE place
 * - Endpoints reference this config, not hardcoded strings
 * 
 * Usage in endpoint files:
 * ```typescript
 * import { API } from './api.config';
 * 
 * export const AUTH_ENDPOINTS = {
 *   LOGIN: `${API.BASE}/auth/login`,
 * };
 * ```
 */

export const API = {
    /** API Version - Change here to update everywhere */
    VERSION: 'v3',

    /** Full API prefix - computed from version */
    get BASE(): string {
        return `/api/${this.VERSION}`;
    },

    /** Helper to build full endpoint path */
    endpoint(path: string): string {
        return `${this.BASE}${path}`;
    }
} as const;

// Type-safe API version for stricter typing
export type ApiVersion = 'v1' | 'v2' | 'v3' | 'v4';
