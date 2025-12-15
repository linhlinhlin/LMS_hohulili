import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class ApiCacheService {
    private cache = new Map<string, CacheEntry<any>>();
    private readonly DEFAULT_TTL = 60000; // 1 minute

    get<T>(key: string, fetcher: () => Observable<T>, ttl: number = this.DEFAULT_TTL): Observable<T> {
        const cached = this.cache.get(key);
        const now = Date.now();

        // Return cached data if valid
        if (cached && (now - cached.timestamp < ttl)) {
            return of(cached.data);
        }

        // Fetch fresh data and cache it
        return fetcher().pipe(
            tap(data => {
                this.cache.set(key, { data, timestamp: now });
            })
        );
    }

    invalidate(key: string): void {
        this.cache.delete(key);
    }

    invalidateAll(): void {
        this.cache.clear();
    }

    invalidatePattern(pattern: string): void {
        const regex = new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }
}
