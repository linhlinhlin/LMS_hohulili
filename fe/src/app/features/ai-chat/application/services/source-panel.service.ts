/**
 * SourcePanelService
 * Manages the state of the source panel sidebar
 * 
 * Created: 11/12/2025
 */
import { Injectable, signal, computed } from '@angular/core';
import { MessageSource } from '../../domain/types';

@Injectable({
    providedIn: 'root'
})
export class SourcePanelService {
    // State signals
    private readonly _isOpen = signal<boolean>(false);
    private readonly _sources = signal<MessageSource[]>([]);
    private readonly _selectedIndex = signal<number>(0);

    // Public readonly signals
    readonly isOpen = this._isOpen.asReadonly();
    readonly sources = this._sources.asReadonly();
    readonly selectedIndex = this._selectedIndex.asReadonly();

    // Computed - current selected source
    readonly currentSource = computed(() => {
        const sources = this._sources();
        const index = this._selectedIndex();
        return sources[index] || null;
    });

    /**
     * Open the source panel with a list of sources
     */
    openWithSources(sources: MessageSource[], initialIndex = 0): void {
        this._sources.set(sources);
        this._selectedIndex.set(Math.min(initialIndex, sources.length - 1));
        this._isOpen.set(true);
    }

    /**
     * Close the source panel
     */
    close(): void {
        this._isOpen.set(false);
    }

    /**
     * Toggle the source panel
     */
    toggle(): void {
        if (this._isOpen()) {
            this.close();
        }
    }

    /**
     * Select a source by index
     */
    selectSource(index: number): void {
        if (index >= 0 && index < this._sources().length) {
            this._selectedIndex.set(index);
        }
    }

    /**
     * Navigate to next source
     */
    nextSource(): void {
        const current = this._selectedIndex();
        const max = this._sources().length - 1;
        if (current < max) {
            this._selectedIndex.set(current + 1);
        }
    }

    /**
     * Navigate to previous source
     */
    previousSource(): void {
        const current = this._selectedIndex();
        if (current > 0) {
            this._selectedIndex.set(current - 1);
        }
    }
}
