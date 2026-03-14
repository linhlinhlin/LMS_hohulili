import { Injectable, signal } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ContentBlock, ImageBlock } from '../../api/types/content-block.types';

interface MaritimeLMSDB extends DBSchema {
    'content-blocks': {
        key: string;
        value: ContentBlock[];
    };
    'image-queue': {
        key: string;
        value: {
            url: string;
            addedAt: number;
            width?: number;
        };
    };
}

@Injectable({
    providedIn: 'root'
})
export class OfflineStorageService {
    private dbPromise: Promise<IDBPDatabase<MaritimeLMSDB>> | null = null;
    isOffline = signal<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

    constructor() {
        if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
            return;
        }

        this.dbPromise = openDB<MaritimeLMSDB>('maritime-lms-db', 1, {
            upgrade(db) {
                db.createObjectStore('content-blocks');
                db.createObjectStore('image-queue', { keyPath: 'url' });
            },
        });

        window.addEventListener('online', () => this.isOffline.set(false));
        window.addEventListener('offline', () => this.isOffline.set(true));
    }

    async saveBlocks(key: string, blocks: ContentBlock[]) {
        if (!this.dbPromise) return;
        const db = await this.dbPromise;
        const tx = db.transaction(['content-blocks', 'image-queue'], 'readwrite');

        // Save all blocks
        await tx.objectStore('content-blocks').put(blocks, key);

        // Queue images
        for (const block of blocks) {
            if (block.type === 'image') {
                const img = block as ImageBlock;
                if (img.url && !img.url.startsWith('data:')) {
                    await tx.objectStore('image-queue').put({
                        url: img.url,
                        addedAt: Date.now(),
                        width: img.width
                    });
                }
            }
        }

        await tx.done;
    }

    async getBlocks(key: string): Promise<ContentBlock[] | undefined> {
        if (!this.dbPromise) return undefined;
        const db = await this.dbPromise;
        return db.get('content-blocks', key);
    }

    async getPendingImages() {
        if (!this.dbPromise) return [];
        const db = await this.dbPromise;
        return db.getAll('image-queue');
    }

    /**
     * Tries to fetch a blob from IDB if we manually stored it (Advanced)
     * Or relies on SW cache integrity.
     */
    async getCachedBlobUrl(uuid: string): Promise<string | null> {
        // Implementation for manual blob storage if needed
        // For now, returning null to let ContentIdentityService fall back or use SW URL
        return null;
    }
}
