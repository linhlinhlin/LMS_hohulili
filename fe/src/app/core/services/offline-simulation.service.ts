import { Injectable, signal } from '@angular/core';
import {
  ensureOfflineDbReady,
  getCurrentUserId,
  isOfflineDbUnavailableError,
  isOfflinePersistenceSupported,
} from '../db/lms-offline.db';
import type {
  SimulationPackageManifest,
  SimulationSectionData,
} from '../../api/types/simulation.types';

export const OFFLINE_SIMULATION_MAX_PACKAGE_BYTES = 500 * 1024 * 1024;

export class OfflineSimulationTooLargeError extends Error {
  override readonly name = 'OfflineSimulationTooLargeError';

  constructor(
    readonly sizeBytes: number,
    readonly maxBytes = OFFLINE_SIMULATION_MAX_PACKAGE_BYTES,
  ) {
    super(`Simulation package too large (${Math.round(sizeBytes / 1024 / 1024)}MB).`);
  }
}

export function isOfflineSimulationTooLargeError(error: unknown): error is OfflineSimulationTooLargeError {
  return error instanceof OfflineSimulationTooLargeError
    || (error instanceof Error && /Simulation package too large/i.test(error.message));
}

export interface OfflineSimulationDownloadResult {
  bytes: number;
  urlCount: number;
}

@Injectable({ providedIn: 'root' })
export class OfflineSimulationService {
  private readonly offlineSupported = isOfflinePersistenceSupported();
  readonly totalBytes = signal(0);

  async downloadPackage(data: SimulationSectionData): Promise<OfflineSimulationDownloadResult> {
    if (!(await this.ensureOfflineReady())) {
      throw new Error('Offline simulation packages require browser Cache API and IndexedDB support.');
    }

    if (data.allowOffline === false) {
      throw new Error('Simulation offline download is disabled for this package.');
    }

    const packageInfo = await this.resolvePackageUrls(data);
    if (packageInfo.urls.length === 0) {
      throw new Error('Simulation package manifest does not list offline assets.');
    }

    if (packageInfo.estimatedBytes > OFFLINE_SIMULATION_MAX_PACKAGE_BYTES) {
      throw new OfflineSimulationTooLargeError(packageInfo.estimatedBytes);
    }

    const cache = await caches.open(this.cacheName());
    let downloadedBytes = 0;

    for (const url of packageInfo.urls) {
      const request = new Request(url, { credentials: 'same-origin' });
      const response = await fetch(request);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} while downloading ${new URL(url).pathname}`);
      }

      const responseForSize = response.clone();
      await cache.put(request, response);
      downloadedBytes += await this.resolveResponseSize(responseForSize);
    }

    await this.refreshTotalBytes();
    return {
      bytes: downloadedBytes || packageInfo.estimatedBytes,
      urlCount: packageInfo.urls.length,
    };
  }

  async isPackageAvailable(data: SimulationSectionData | null | undefined): Promise<boolean> {
    if (!data || !(await this.ensureOfflineReady(true))) {
      return false;
    }

    const entryUrl = data.entryUrl || null;
    const manifestUrl = data.manifestUrl || null;
    const cache = await caches.open(this.cacheName());
    const required = [entryUrl, manifestUrl].filter((value): value is string => !!value);
    if (required.length === 0) {
      return false;
    }

    return Promise.all(required.map((url) => cache.match(this.toAbsoluteUrl(url)))).then((matches) =>
      matches.every(Boolean),
    );
  }

  async deletePackage(data: SimulationSectionData | null | undefined): Promise<void> {
    if (!data || !(await this.ensureOfflineReady(true))) {
      return;
    }

    const basePath = this.resolvePackageBasePath(data);
    if (!basePath) {
      return;
    }

    const cache = await caches.open(this.cacheName());
    const keys = await cache.keys();
    await Promise.all(
      keys
        .filter((request) => new URL(request.url).pathname.startsWith(basePath))
        .map((request) => cache.delete(request)),
    );
    await this.refreshTotalBytes();
  }

  async refreshTotalBytes(): Promise<void> {
    if (!(await this.ensureOfflineReady(true))) {
      this.totalBytes.set(0);
      return;
    }

    try {
      const cache = await caches.open(this.cacheName());
      const keys = await cache.keys();
      let total = 0;
      for (const request of keys) {
        const response = await cache.match(request);
        if (!response) continue;
        total += await this.resolveResponseSize(response);
      }
      this.totalBytes.set(total);
    } catch {
      this.totalBytes.set(0);
    }
  }

  private async resolvePackageUrls(data: SimulationSectionData): Promise<{ urls: string[]; estimatedBytes: number }> {
    const urls = new Set<string>();
    let estimatedBytes = data.estimatedSizeBytes ?? 0;

    const manifestUrl = data.manifestUrl ? this.toAbsoluteUrl(data.manifestUrl) : null;
    if (manifestUrl) {
      this.assertSameOrigin(manifestUrl);
      urls.add(manifestUrl);
    }

    if (data.entryUrl) {
      const entryUrl = this.toAbsoluteUrl(data.entryUrl);
      this.assertSameOrigin(entryUrl);
      urls.add(entryUrl);
    }

    if (manifestUrl) {
      const manifest = await this.fetchManifest(manifestUrl);
      if (manifest.offline?.supported === false) {
        throw new Error('Simulation manifest marks offline mode as unsupported.');
      }

      const manifestBase = new URL(manifestUrl);
      if (manifest.entrypoint) {
        const entryUrl = this.toAbsoluteUrl(manifest.entrypoint, manifestBase);
        this.assertSameOrigin(entryUrl);
        urls.add(entryUrl);
      }

      let manifestAssetBytes = 0;
      for (const asset of manifest.assets ?? []) {
        if (!asset.url) continue;
        const assetUrl = this.toAbsoluteUrl(asset.url, manifestBase);
        this.assertSameOrigin(assetUrl);
        urls.add(assetUrl);
        manifestAssetBytes += asset.bytes ?? 0;
      }
      if (manifestAssetBytes > 0) {
        estimatedBytes = manifestAssetBytes;
      }
    }

    return {
      urls: [...urls],
      estimatedBytes,
    };
  }

  private async fetchManifest(url: string): Promise<SimulationPackageManifest> {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while loading simulation manifest`);
    }
    return response.json() as Promise<SimulationPackageManifest>;
  }

  private resolvePackageBasePath(data: SimulationSectionData): string | null {
    const raw = data.manifestUrl || data.entryUrl;
    if (!raw) {
      return null;
    }

    const url = new URL(this.toAbsoluteUrl(raw));
    const parts = url.pathname.split('/');
    parts.pop();
    return `${parts.join('/')}/`;
  }

  private toAbsoluteUrl(rawUrl: string, base?: URL): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://holilihu.online';
    return new URL(rawUrl, base ?? origin).toString();
  }

  private assertSameOrigin(url: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (new URL(url).origin !== window.location.origin) {
      throw new Error('Simulation offline packages must be served from the LMS origin.');
    }
  }

  private async resolveResponseSize(response: Response): Promise<number> {
    const declared = Number(response.headers.get('content-length')) || 0;
    if (declared > 0) {
      return declared;
    }

    try {
      const blob = await response.blob();
      return blob.size;
    } catch {
      return 0;
    }
  }

  private cacheName(): string {
    return `offline-simulations:${getCurrentUserId()}`;
  }

  private async ensureOfflineReady(optional = false): Promise<boolean> {
    if (!this.offlineSupported || typeof caches === 'undefined') {
      return false;
    }

    try {
      await ensureOfflineDbReady();
      return true;
    } catch (error) {
      if (!isOfflineDbUnavailableError(error)) {
        throw error;
      }

      if (!optional) {
        throw error;
      }

      return false;
    }
  }
}
