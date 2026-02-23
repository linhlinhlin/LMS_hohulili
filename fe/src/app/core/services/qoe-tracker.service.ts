import { Injectable, signal } from '@angular/core';

export interface QoEMetrics {
  sessionId: string;
  lessonId: string;
  startupTimeMs: number;
  totalPlayTimeMs: number;
  totalBufferTimeMs: number;
  rebufferCount: number;
  qualitySwitchCount: number;
  averageBitrateKbps: number;
  maxBitrateKbps: number;
  minBitrateKbps: number;
  connectionType: string;
  errorCount: number;
}

@Injectable({ providedIn: 'root' })
export class QoETrackerService {
  readonly metrics = signal<QoEMetrics | null>(null);

  private playStartTime = 0;
  private bufferStartTime = 0;
  private totalBufferTime = 0;
  private bitrateHistory: number[] = [];

  startSession(lessonId: string): void {
    this.totalBufferTime = 0;
    this.bitrateHistory = [];
    this.bufferStartTime = 0;

    this.metrics.set({
      sessionId: crypto.randomUUID(),
      lessonId,
      startupTimeMs: 0,
      totalPlayTimeMs: 0,
      totalBufferTimeMs: 0,
      rebufferCount: 0,
      qualitySwitchCount: 0,
      averageBitrateKbps: 0,
      maxBitrateKbps: 0,
      minBitrateKbps: 0,
      connectionType: this.detectConnectionType(),
      errorCount: 0,
    });

    this.playStartTime = performance.now();
  }

  recordStartup(): void {
    const startupTime = performance.now() - this.playStartTime;
    this.metrics.update(m => m ? { ...m, startupTimeMs: startupTime } : null);
  }

  recordBufferStart(): void {
    this.bufferStartTime = performance.now();
  }

  recordBufferEnd(): void {
    if (this.bufferStartTime > 0) {
      this.totalBufferTime += performance.now() - this.bufferStartTime;
      this.bufferStartTime = 0;
      this.metrics.update(m => m ? {
        ...m,
        rebufferCount: m.rebufferCount + 1,
        totalBufferTimeMs: this.totalBufferTime,
      } : null);
    }
  }

  recordBitrateChange(bitrateKbps: number): void {
    this.bitrateHistory.push(bitrateKbps);
    const avg = this.bitrateHistory.reduce((a, b) => a + b, 0) / this.bitrateHistory.length;

    this.metrics.update(m => m ? {
      ...m,
      qualitySwitchCount: m.qualitySwitchCount + 1,
      averageBitrateKbps: Math.round(avg),
      maxBitrateKbps: Math.max(m.maxBitrateKbps, bitrateKbps),
      minBitrateKbps: m.minBitrateKbps === 0
        ? bitrateKbps
        : Math.min(m.minBitrateKbps, bitrateKbps),
    } : null);
  }

  recordError(): void {
    this.metrics.update(m => m ? { ...m, errorCount: m.errorCount + 1 } : null);
  }

  private detectConnectionType(): string {
    const conn = (navigator as any).connection;
    if (!conn) return 'unknown';
    if (conn.type === 'cellular') return '4g';
    if (conn.type === 'wifi') return 'wifi';
    return conn.effectiveType || 'unknown';
  }
}
