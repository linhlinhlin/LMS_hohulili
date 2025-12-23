import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AssignmentDetailStore } from '../stores/assignment-detail.store';
import { SubmissionsStore } from '../stores/submissions.store';
import { SubmissionDetail, SubmissionGrade } from '../../../../api/client/assignment.api';

/**
 * SpeedGrader Component
 * 
 * Full-screen grading interface with file preview and rubric support.
 * 
 * @requirements Expert feedback - SpeedGrader in assignment context
 */
@Component({
  selector: 'app-speed-grader',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-screen flex flex-col bg-gray-100">
      <!-- Header -->
      <header class="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-4">
          <button (click)="goBack()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </button>
          <div>
            <h1 class="font-semibold text-gray-900">{{ assignmentStore.assignmentTitle() }}</h1>
            @if (currentSubmission(); as sub) {
              <p class="text-sm text-gray-500">{{ sub.studentName }}</p>
            }
          </div>
        </div>
        
        <!-- Navigation -->
        <div class="flex items-center gap-2">
          <button (click)="previousSubmission()" [disabled]="!hasPrevious()"
                  class="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">Trước</button>
          <span class="text-sm text-gray-600">{{ currentIndex() + 1 }} / {{ totalSubmissions() }}</span>
          <button (click)="nextSubmission()" [disabled]="!hasNext()"
                  class="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">Sau</button>
        </div>
      </header>

      <!-- Main Content -->
      @if (currentSubmission(); as sub) {
        <div class="flex-1 flex overflow-hidden">
          <!-- Left: Submission Content -->
          <div class="w-1/2 xl:w-3/5 border-r bg-white overflow-y-auto p-6">
            @if (sub.content) {
              <div class="prose max-w-none">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Nội dung bài nộp</h3>
                <div class="bg-gray-50 rounded-xl p-4 whitespace-pre-wrap text-gray-700">
                  {{ sub.content }}
                </div>
              </div>
            } @else {
              <div class="text-center py-12 text-gray-500">
                <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p>Không có nội dung văn bản</p>
              </div>
            }
            
            @if (sub.attachments && sub.attachments.length) {
              <div class="mt-6">
                <h4 class="text-sm font-medium text-gray-700 mb-3">Tệp đính kèm</h4>
                <div class="space-y-2">
                  @for (file of sub.attachments; track file.id) {
                    <a [href]="file.fileUrl" target="_blank" 
                       class="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <span>{{ file.fileName }}</span>
                    </a>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Right: Grading Form -->
          <div class="w-1/2 xl:w-2/5 bg-white flex flex-col">
            <!-- Student Info -->
            <div class="p-4 border-b">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span class="text-blue-600 font-medium">{{ getInitials(sub.studentName || '') }}</span>
                </div>
                <div>
                  <p class="font-medium">{{ sub.studentName }}</p>
                  <p class="text-sm text-gray-500">{{ sub.studentEmail }}</p>
                </div>
              </div>
              @if (sub.isLate) {
                <span class="mt-2 inline-block px-2 py-1 bg-red-100 text-red-600 text-xs rounded">Nộp muộn</span>
              }
            </div>

            <!-- Form -->
            <div class="flex-1 overflow-y-auto p-4">
              <form [formGroup]="gradingForm">
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Điểm</label>
                  <div class="flex items-center gap-2">
                    <input type="number" formControlName="score" 
                           class="w-24 px-3 py-2 border rounded-lg" [min]="0" [max]="maxScore()"/>
                    <span class="text-gray-500">/ {{ maxScore() }}</span>
                  </div>
                </div>
                
                <!-- Quick Scores -->
                <div class="mb-4">
                  <p class="text-xs text-gray-500 mb-2">Điểm nhanh</p>
                  <div class="flex flex-wrap gap-2">
                    @for (score of quickScores(); track score) {
                      <button type="button" (click)="setScore(score)"
                              class="px-3 py-1 text-sm border rounded-lg hover:bg-blue-50 transition-colors">{{ score }}</button>
                    }
                  </div>
                </div>

                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nhận xét</label>
                  <textarea formControlName="feedback" rows="4"
                            class="w-full px-3 py-2 border rounded-lg" placeholder="Nhập nhận xét..."></textarea>
                </div>
              </form>
            </div>

            <!-- Actions -->
            <div class="p-4 border-t bg-gray-50">
              <div class="flex gap-2">
                <button (click)="saveDraft()" [disabled]="saving()" class="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors">
                  Lưu nháp
                </button>
                <button (click)="submitGrade()" [disabled]="saving() || gradingForm.invalid"
                        class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  {{ saving() ? 'Đang lưu...' : 'Chấm điểm' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div class="flex-1 flex items-center justify-center bg-white">
          <div class="text-center">
             <div class="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
             <p class="text-gray-500 font-medium">Đang tải dữ liệu bài nộp...</p>
          </div>
        </div>
      }
    </div>
  `
})
export class SpeedGraderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  assignmentStore = inject(AssignmentDetailStore);
  submissionsStore = inject(SubmissionsStore);

  saving = signal(false);
  currentIndex = signal(0);

  gradingForm = this.fb.group({
    score: [0, [Validators.required, Validators.min(0)]],
    feedback: ['']
  });

  currentSubmission = computed(() => {
    const submissions = this.submissionsStore.submissions();
    return submissions[this.currentIndex()] || null;
  });

  totalSubmissions = computed(() => this.submissionsStore.submissions().length);
  hasPrevious = computed(() => this.currentIndex() > 0);
  hasNext = computed(() => this.currentIndex() < this.totalSubmissions() - 1);
  maxScore = computed(() => this.currentSubmission()?.maxScore || 100);
  quickScores = computed(() => {
    const max = this.maxScore();
    return [max, Math.round(max * 0.9), Math.round(max * 0.8), Math.round(max * 0.7), Math.round(max * 0.5)];
  });

  ngOnInit(): void {
    const assignmentId = this.route.snapshot.paramMap.get('id');
    const submissionId = this.route.snapshot.paramMap.get('submissionId');

    if (assignmentId) {
      this.assignmentStore.loadAssignment(assignmentId).subscribe();
      this.submissionsStore.loadSubmissions(assignmentId).subscribe(() => {
        if (submissionId) {
          const idx = this.submissionsStore.submissions().findIndex(s => s.id === submissionId);
          if (idx >= 0) this.currentIndex.set(idx);
          // Load full detail for current submission
          this.loadCurrentSubmissionDetail();
        }
        this.loadCurrentGrade();
      });
    }
  }

  loadCurrentSubmissionDetail(): void {
    const sub = this.currentSubmission();
    if (sub && !sub.content) {
      // Load full detail if content is not available
      this.submissionsStore.loadSubmissionDetail(sub.id).subscribe();
    }
  }

  loadCurrentGrade(): void {
    const sub = this.currentSubmission();
    if (sub?.grade) {
      const score = typeof sub.grade === 'number' ? sub.grade : (sub.grade as SubmissionGrade).score;
      const feedback = typeof sub.grade === 'object' ? (sub.grade as SubmissionGrade).feedback : '';
      this.gradingForm.patchValue({ score, feedback: feedback || '' });
    } else {
      this.gradingForm.reset({ score: 0, feedback: '' });
    }
  }

  previousSubmission(): void {
    if (this.hasPrevious()) {
      this.currentIndex.update(i => i - 1);
      this.loadCurrentGrade();
      this.loadCurrentSubmissionDetail();
    }
  }

  nextSubmission(): void {
    if (this.hasNext()) {
      this.currentIndex.update(i => i + 1);
      this.loadCurrentGrade();
      this.loadCurrentSubmissionDetail();
    }
  }

  setScore(score: number): void {
    this.gradingForm.patchValue({ score });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  saveDraft(): void {
    // Save to localStorage
    const sub = this.currentSubmission();
    if (sub) {
      localStorage.setItem(`grade_draft_${sub.id}`, JSON.stringify(this.gradingForm.value));
    }
  }

  submitGrade(): void {
    const sub = this.currentSubmission();
    if (!sub || this.gradingForm.invalid) return;

    this.saving.set(true);
    const { score, feedback } = this.gradingForm.value;

    this.submissionsStore.updateInlineGrade({
      submissionId: sub.id,
      score: score || 0,
      feedback: feedback || undefined
    }).subscribe({
      next: () => {
        this.saving.set(false);
        // Check if there was an error in the store
        const error = this.submissionsStore.error();
        if (error) {
          alert('Lỗi: ' + error);
          return;
        }
        localStorage.removeItem(`grade_draft_${sub.id}`);
        alert('Chấm điểm thành công!');
        if (this.hasNext()) {
          setTimeout(() => this.nextSubmission(), 500);
        }
      },
      error: (err) => {
        console.error('Error grading submission:', err);
        this.saving.set(false);
        alert('Không thể chấm điểm. Vui lòng thử lại.');
      }
    });
  }

  goBack(): void {
    const assignmentId = this.assignmentStore.assignmentId();
    this.router.navigate(['/teacher/assignments', assignmentId, 'submissions']);
  }
}
