import { Injectable, computed, inject, signal } from '@angular/core';
import { ChatApiClient } from '../../infrastructure/api/chat-api.client';

type AiAvailabilityStatus = 'checking' | 'available' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class AiAvailabilityService {
  private readonly apiClient = inject(ChatApiClient);

  private readonly _status = signal<AiAvailabilityStatus>('checking');

  readonly status = this._status.asReadonly();
  readonly isAvailable = computed(() => this._status() === 'available');
  readonly hasResolved = computed(() => this._status() !== 'checking');

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.apiClient.checkHealth().subscribe({
      next: (health) => {
        const isAvailable = health.status === 'healthy'
          && health.aiServiceStatus === 'available';
        this._status.set(isAvailable ? 'available' : 'unavailable');
      },
      error: () => {
        this._status.set('unavailable');
      }
    });
  }
}
