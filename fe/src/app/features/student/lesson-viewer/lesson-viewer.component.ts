import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { VideoPlayerTrackedComponent } from '../../../shared/components/video-player-tracked/video-player-tracked.component';
import { VideoProgressApi, CanProceedResponse } from '../../../api/client/video-progress.api';

interface LessonSection {
  id: string;
  title: string;
  type: 'VIDEO' | 'DOCUMENT' | 'QUIZ';
  videoUrl?: string;
  order: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-lesson-viewer',
  imports: [VideoPlayerTrackedComponent],
  template: `
    <div class="lesson-viewer-container">
      <!-- Lesson Header -->
      <div class="lesson-header">
        <h1 class="text-2xl font-bold">{{ currentSection()?.title }}</h1>
        <div class="lesson-meta">
          <span class="badge">Bài {{ currentSectionIndex() + 1 }}/{{ sections().length }}</span>
          @if (currentSection()?.type === 'VIDEO') {
            <span class="badge badge-video">Video Lesson</span>
          }
        </div>
      </div>

      <!-- Video Content -->
      @if (currentSection()?.type === 'VIDEO' && currentSection()?.videoUrl) {
        <div class="video-content">
          <app-video-player-tracked
            [videoUrl]="currentSection()!.videoUrl!"
            [sectionId]="currentSection()!.id"
            [autoplay]="false"
            [trackingInterval]="5000"
          />
        </div>
      }

      <!-- Navigation Controls -->
      <div class="navigation-controls">
        <button
          class="btn btn-secondary"
          [disabled]="currentSectionIndex() === 0"
          (click)="goToPreviousSection()"
        >
          ← Bài trước
        </button>

        <!-- 75% Completion Gate -->
        @if (canProceed()) {
          <button
            class="btn btn-primary"
            [disabled]="currentSectionIndex() === sections().length - 1"
            (click)="goToNextSection()"
          >
            Bài tiếp theo →
          </button>
        } @else {
          <div class="locked-message">
            <span class="lock-icon">🔒</span>
            <div class="lock-text">
              <p class="font-semibold">Bài học tiếp theo đã khóa</p>
              <p class="text-sm text-gray-600">{{ lockMessage() }}</p>
            </div>
          </div>
        }
      </div>

      <!-- Progress Summary -->
      @if (progressData()) {
        <div class="progress-summary">
          <h3 class="text-lg font-semibold mb-4">Tiến độ học tập</h3>
          <div class="progress-stats">
            <div class="stat-card">
              <div class="stat-value">{{ progressData()!.currentProgress.toFixed(0) }}%</div>
              <div class="stat-label">Đã xem</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ progressData()!.canProceed ? '✓' : '✗' }}</div>
              <div class="stat-label">Hoàn thành</div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .lesson-viewer-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px;
      }

      .lesson-header {
        margin-bottom: 24px;
      }

      .lesson-meta {
        display: flex;
        gap: 12px;
        margin-top: 12px;
      }

      .badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 16px;
        background: #e0e0e0;
        font-size: 14px;
        font-weight: 500;
      }

      .badge-video {
        background: #4CAF50;
        color: white;
      }

      .video-content {
        margin-bottom: 32px;
        background: #000;
        border-radius: 8px;
        overflow: hidden;
      }

      .navigation-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 32px;
      }

      .btn {
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-primary {
        background: #4CAF50;
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        background: #45a049;
      }

      .btn-secondary {
        background: #e0e0e0;
        color: #333;
      }

      .btn-secondary:hover:not(:disabled) {
        background: #d0d0d0;
      }

      .locked-message {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 20px;
        background: #fff3cd;
        border: 2px solid #ffc107;
        border-radius: 8px;
      }

      .lock-icon {
        font-size: 24px;
      }

      .lock-text p {
        margin: 0;
      }

      .progress-summary {
        padding: 24px;
        background: #f5f5f5;
        border-radius: 12px;
      }

      .progress-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 16px;
      }

      .stat-card {
        padding: 16px;
        background: white;
        border-radius: 8px;
        text-align: center;
      }

      .stat-value {
        font-size: 32px;
        font-weight: bold;
        color: #4CAF50;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 14px;
        color: #666;
      }
    `,
  ],
})
export class LessonViewerComponent implements OnInit {
  private videoProgressApi = inject(VideoProgressApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Real data from Supabase database
  sections = signal<LessonSection[]>([
    {
      id: '4dfecf55-444a-4204-b90a-9b37dc860625',
      title: '2.1: Giới thiệu khóa học',
      type: 'VIDEO',
      videoUrl: 'https://pub-a9b1e20e911c45f69a1008c8a993fe7d.r2.dev/courses/intro-video.mp4',
      order: 1,
    },
    {
      id: '461d1828-26f4-4f75-8b5f-8be3d68ae93b',
      title: '1.4: Trà đá Hà Nội',
      type: 'VIDEO',
      videoUrl: 'https://pub-a9b1e20e911c45f69a1008c8a993fe7d.r2.dev/courses/lesson-1.mp4',
      order: 2,
    },
    {
      id: 'c293498d-8566-47c7-b3e7-f2280ba56e46',
      title: 'Test video',
      type: 'VIDEO',
      videoUrl: 'https://pub-a9b1e20e911c45f69a1008c8a993fe7d.r2.dev/courses/lesson-2.mp4',
      order: 3,
    },
  ]);

  currentSectionIndex = signal<number>(0);
  currentSection = signal<LessonSection | null>(null);
  canProceed = signal<boolean>(false);
  lockMessage = signal<string>('');
  progressData = signal<CanProceedResponse | null>(null);

  ngOnInit(): void {
    // Load first section
    this.loadSection(0);
  }

  private loadSection(index: number): void {
    const section = this.sections()[index];
    if (!section) return;

    this.currentSectionIndex.set(index);
    this.currentSection.set(section);

    // Check if can proceed to next lesson
    if (section.type === 'VIDEO') {
      this.checkCanProceed(section.id);

      // Refresh can-proceed status every 10 seconds
      setInterval(() => {
        this.checkCanProceed(section.id);
      }, 10000);
    } else {
      // Non-video sections always allow proceeding
      this.canProceed.set(true);
    }
  }

  private checkCanProceed(sectionId: string): void {
    this.videoProgressApi.canProceedToNext(sectionId).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.canProceed.set(response.data.canProceed);
          this.lockMessage.set(response.data.message);
          this.progressData.set(response.data);
        }
      },
      error: (error: any) => {
        // Default to locked on error
        this.canProceed.set(false);
        this.lockMessage.set('Không thể kiểm tra tiến độ. Vui lòng thử lại.');
      },
    });
  }

  goToNextSection(): void {
    const nextIndex = this.currentSectionIndex() + 1;
    if (nextIndex < this.sections().length) {
      this.loadSection(nextIndex);
    }
  }

  goToPreviousSection(): void {
    const prevIndex = this.currentSectionIndex() - 1;
    if (prevIndex >= 0) {
      this.loadSection(prevIndex);
    }
  }
}
