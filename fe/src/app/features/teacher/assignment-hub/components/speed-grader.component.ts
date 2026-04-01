import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { FilePreviewComponent } from '../../../../shared/components/file-preview/file-preview.component';
import { AssignmentDetailStore } from '../stores/assignment-detail.store';
import { SubmissionsStore } from '../stores/submissions.store';
import { SubmissionDetail, SubmissionGrade } from '../../../../api/client/assignment.api';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * SpeedGrader Component
 * 
 * Full-screen grading interface with file preview and rubric support.
 * 
 * @requirements Expert feedback - SpeedGrader in assignment context
 */
@Component({
  selector: 'app-speed-grader',
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, FilePreviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <!-- Header — đồng bộ design tokens -->
      <header class="h-14 bg-white border-b border-gray-200 px-5 flex items-center justify-between flex-shrink-0 z-30">
        <div class="flex items-center gap-4">
          <button (click)="goBack()" type="button" aria-label="Quay lại"
                  class="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <lucide-icon name="arrow-left" [size]="18"></lucide-icon>
          </button>
          <div class="h-6 w-px bg-gray-200"></div>
          <div>
            <h1 class="text-sm font-semibold text-gray-900 truncate max-w-[300px]">{{ assignmentStore.assignmentTitle() }}</h1>
            <p class="text-xs text-gray-500">Chấm điểm nhanh</p>
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex items-center gap-3 bg-gray-50 p-1 rounded-lg border border-gray-200">
          <button (click)="previousSubmission()" [disabled]="!hasPrevious()" type="button" aria-label="Bài trước"
                  class="w-8 h-8 flex items-center justify-center rounded-md bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <lucide-icon name="chevron-left" [size]="16"></lucide-icon>
          </button>
          <div class="px-3 flex flex-col items-center">
            <span class="text-xs font-semibold text-gray-900">{{ currentIndex() + 1 }} / {{ totalSubmissions() }}</span>
            @if (remainingCount() > 0) {
              <span class="text-[10px] text-amber-600">còn {{ remainingCount() }}</span>
            } @else {
              <span class="text-[10px] text-emerald-600">hoàn tất</span>
            }
          </div>
          <button (click)="nextSubmission()" [disabled]="!hasNext()" type="button" aria-label="Bài tiếp"
                  class="w-8 h-8 flex items-center justify-center rounded-md bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <lucide-icon name="chevron-right" [size]="16"></lucide-icon>
          </button>
        </div>

        <div class="flex items-center gap-3">
          @if (draftSavedAt()) {
            <span class="hidden sm:block text-xs text-gray-400">Nháp lưu {{ draftSavedAt() }}</span>
          }
          <button (click)="goBack()" type="button" aria-label="Thoát"
                  class="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
            <lucide-icon name="x" [size]="18"></lucide-icon>
          </button>
        </div>
      </header>

      <!-- Main Workspace -->
      @if (currentSubmission(); as sub) {
        <div class="flex-1 flex flex-col md:flex-row overflow-hidden">

          <!-- Left: Submission Content -->
          <div class="flex-1 border-r border-gray-200 bg-white overflow-y-auto p-6">
            <div class="max-w-3xl mx-auto">
              @if (sub.content) {
                <div class="flex items-center gap-3 mb-5">
                  <div class="w-9 h-9 rounded-xl bg-[#0056D2]/5 flex items-center justify-center text-[#0056D2]">
                    <lucide-icon name="file-text" [size]="18"></lucide-icon>
                  </div>
                  <div>
                    <h3 class="text-sm font-semibold text-gray-900">Nội dung bài nộp</h3>
                    <p class="text-xs text-gray-500">Nộp lúc {{ sub.submittedAt | date:'dd/MM/yyyy HH:mm' }}</p>
                  </div>
                </div>
                <div class="bg-gray-50 rounded-xl p-6 border border-gray-100 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {{ sub.content }}
                </div>
              } @else {
                <div class="py-20 flex flex-col items-center text-center">
                  <div class="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mb-4 border border-gray-100 text-gray-300">
                    <lucide-icon name="file-question" [size]="32"></lucide-icon>
                  </div>
                  <h4 class="text-sm font-semibold text-gray-700 mb-1">Không có nội dung văn bản</h4>
                  <p class="text-xs text-gray-500 max-w-xs">Vui lòng kiểm tra tệp đính kèm bên dưới.</p>
                </div>
              }

              @if (sub.attachments && sub.attachments.length) {
                <div class="mt-6 pt-6 border-t border-gray-100">
                  <h4 class="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2">
                    <lucide-icon name="paperclip" [size]="14"></lucide-icon>
                    Tệp đính kèm ({{ sub.attachments.length }})
                  </h4>
                  <div class="space-y-3">
                    @for (file of sub.attachments; track file.id) {
                      <app-file-preview [fileUrl]="file.fileUrl" [fileName]="file.fileName" />
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Right: Grading Panel — compact, feedback visible -->
          <div class="w-full md:w-[380px] xl:w-[420px] bg-white flex flex-col border-l border-gray-200 z-20">
            <!-- Student info (compact) -->
            <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0056D2] to-[#004BB5] flex items-center justify-center text-white text-sm font-semibold">
                  {{ getInitials(sub.studentName || '') }}
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ sub.studentName }}</p>
                  <p class="text-xs text-gray-500 truncate">{{ sub.studentEmail }}</p>
                </div>
              </div>
              @if (sub.isLate) {
                <span class="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-semibold rounded-md border border-red-100">Muộn</span>
              } @else {
                <span class="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-semibold rounded-md border border-emerald-100">Đúng hạn</span>
              }
            </div>

            <!-- Grade Form (compact — feedback on fold) -->
            <div class="flex-1 overflow-y-auto px-5 py-4">
              <form [formGroup]="gradingForm" class="space-y-4" (keydown.enter)="onEnterKey($event)">
                <!-- Score -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <lucide-icon name="star" [size]="12" class="text-amber-400 fill-amber-400"></lucide-icon>
                      Điểm số
                    </label>
                    <span class="text-xs text-gray-400">/ {{ maxScore() }}</span>
                  </div>
                  <div class="flex items-end gap-3 p-3 bg-white rounded-xl border-2 border-gray-200 transition-all focus-within:border-[#0056D2] focus-within:shadow-lg focus-within:shadow-blue-50/50">
                    <input type="number" formControlName="score"
                           class="w-full bg-transparent border-none p-0 text-3xl font-bold text-gray-900 focus:ring-0 placeholder:text-gray-300"
                           [min]="0" [max]="maxScore()" placeholder="0"/>
                    <span class="text-sm font-semibold text-gray-300 mb-1">/ {{ maxScore() }}</span>
                  </div>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    @for (score of quickScores(); track score) {
                      <button type="button" (click)="setScore(score)"
                              [class]="gradingForm.get('score')?.value === score ? 'bg-[#0056D2] text-white border-[#0056D2]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0056D2] hover:text-[#0056D2]'"
                              class="px-3 py-1 text-xs font-medium border rounded-lg transition-colors">
                        {{ score }}
                      </button>
                    }
                  </div>
                </div>

                <div class="h-px bg-gray-100"></div>

                <!-- Feedback (VISIBLE — not below fold) -->
                <div>
                  <label class="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
                    <lucide-icon name="message-square" [size]="12" class="text-[#0056D2]"></lucide-icon>
                    Nhận xét
                  </label>
                  <textarea formControlName="feedback" rows="4"
                            class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:bg-white focus:border-[#0056D2] focus:ring-2 focus:ring-blue-50 transition-all resize-none"
                            placeholder="Nhận xét cho học viên..."></textarea>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" (click)="appendFeedback('Yêu cầu sửa lại: Bài làm chưa đạt yêu cầu, vui lòng xem nhận xét và nộp lại.')"
                            class="px-2.5 py-1 bg-white text-gray-600 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">Yêu cầu sửa lại</button>
                    <button type="button" (click)="appendFeedback('Bài làm xuất sắc! Nội dung đầy đủ, trình bày rõ ràng và logic.')"
                            class="px-2.5 py-1 bg-white text-gray-600 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">Xuất sắc</button>
                    <button type="button" (click)="appendFeedback('Cần cải thiện trình bày: Nội dung đúng nhưng cần chú ý hơn về bố cục và hình thức.')"
                            class="px-2.5 py-1 bg-white text-gray-600 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">Cải thiện</button>
                  </div>
                </div>
              </form>
            </div>

            <!-- Sticky Actions -->
            <div class="px-5 py-3 bg-gray-50 border-t border-gray-200 flex gap-3">
              <button (click)="saveDraft()" [disabled]="saving()"
                      class="flex-1 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                <lucide-icon name="save" [size]="14" class="mr-1.5"></lucide-icon>
                Nháp
              </button>
              <button (click)="submitGrade()" [disabled]="saving() || gradingForm.invalid"
                      class="flex-[2] h-10 flex items-center justify-center rounded-xl bg-[#0056D2] text-white text-sm font-medium hover:bg-[#004BB5] disabled:opacity-50 transition-colors shadow-sm">
                @if (saving()) {
                  <lucide-icon name="loader-2" [size]="14" class="mr-1.5 animate-spin"></lucide-icon>
                  Đang lưu...
                } @else {
                  <lucide-icon name="check-circle" [size]="14" class="mr-1.5"></lucide-icon>
                  Hoàn thành
                }
              </button>
            </div>
          </div>
        </div>
      } @else if (noSubmissionAvailable()) {
        <div class="flex-1 flex flex-col items-center justify-center bg-white px-8 text-center">
          <div class="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300">
            <lucide-icon name="file-question" [size]="28"></lucide-icon>
          </div>
          <h3 class="mt-5 text-sm font-semibold text-gray-800">Chưa có bài nộp để chấm</h3>
          <p class="mt-2 max-w-sm text-sm text-gray-500 leading-relaxed">{{ getNoSubmissionMessage() }}</p>
          <button (click)="goBack()"
                  class="mt-5 h-10 px-5 rounded-xl bg-[#0056D2] text-white text-sm font-medium shadow-sm hover:bg-[#004BB5] transition-colors">
            Quay lại bài nộp
          </button>
        </div>
      } @else {
        <div class="flex-1 flex flex-col items-center justify-center bg-white">
          <div class="w-16 h-16 border-4 border-gray-100 border-t-[#0056D2] rounded-full animate-spin"></div>
          <p class="text-sm font-medium text-gray-600 mt-5">Đang tải dữ liệu...</p>
        </div>
      }
    </div>
  `
})
export class SpeedGraderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  assignmentStore = inject(AssignmentDetailStore);
  submissionsStore = inject(SubmissionsStore);

  saving = signal(false);
  currentIndex = signal(0);
  noSubmissionAvailable = signal(false);
  draftSavedAt = signal<string | null>(null);

  gradingForm = this.fb.group({
    score: [0, [Validators.required, Validators.min(0)]],
    feedback: ['']
  });

  currentSubmission = computed(() => {
    const submissions = this.submissionsStore.submissions();
    return submissions[this.currentIndex()] || null;
  });

  totalSubmissions = computed(() => this.submissionsStore.submissions().length);
  gradedCount = computed(() => this.submissionsStore.gradedCount());
  remainingCount = computed(() => this.totalSubmissions() - this.gradedCount());
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
      this.assignmentStore.loadAssignment(assignmentId).subscribe({
        error: () => this.toast.error('Không thể tải bài tập')
      });
      this.submissionsStore.loadSubmissions(assignmentId).subscribe({ next: () => {
        if (this.submissionsStore.submissions().length === 0) {
          this.noSubmissionAvailable.set(true);
          return;
        }
        if (submissionId) {
          const idx = this.submissionsStore.submissions().findIndex(s => s.id === submissionId);
          if (idx >= 0) this.currentIndex.set(idx);
          // Load full detail for current submission
          this.loadCurrentSubmissionDetail();
        }
        this.noSubmissionAvailable.set(false);
        this.loadCurrentGrade();
      }, error: () => this.toast.error('Không thể tải danh sách bài nộp') });
    }
  }

  loadCurrentSubmissionDetail(): void {
    const sub = this.currentSubmission();
    if (sub && !sub.content) {
      this.submissionsStore.loadSubmissionDetail(sub.id).subscribe({
        next: () => this.loadCurrentGrade(), // Re-populate grade after detail (feedback) loads
        error: () => this.toast.error('Không thể tải chi tiết bài nộp')
      });
    }
  }

  loadCurrentGrade(): void {
    const sub = this.currentSubmission();
    if (!sub) {
      this.gradingForm.reset({ score: 0, feedback: '' });
      return;
    }

    // Restore draft from localStorage if available (FE-H7 fix)
    const draftKey = `grade_draft_${sub.id}`;
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        this.gradingForm.patchValue(parsed);
        return;
      } catch { /* ignore invalid draft */ }
    }

    // Fall back to existing grade from API
    if (sub.grade) {
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

  getNoSubmissionMessage(): string {
    const assignment = this.assignmentStore.assignment();

    if (assignment?.deliveryMode === 'SELF_PACED') {
      return 'Bài tập này hiện chưa có bài nộp trong toàn khóa học. Hãy quay lại danh sách bài nộp để kiểm tra trạng thái phân phối hoặc chờ học viên nộp bài.';
    }

    if (assignment?.distributionType === 'CLASS' && assignment.className) {
      return `Bài tập này hiện chưa có bài nộp trong lớp ${assignment.className}. Hãy quay lại danh sách bài nộp để kiểm tra trạng thái phân phối hoặc chờ học viên nộp bài.`;
    }

    if (assignment?.distributionType === 'SPECIFIC_STUDENTS') {
      return 'Bài tập này hiện chưa có bài nộp từ nhóm học viên đã được giao. Hãy quay lại danh sách bài nộp để kiểm tra trạng thái phân phối hoặc chờ học viên nộp bài.';
    }

    return 'Bài tập này hiện chưa có bài nộp trong không gian vận hành hiện tại. Hãy quay lại danh sách bài nộp để kiểm tra trạng thái phân phối hoặc chờ học viên nộp bài.';
  }

  setScore(score: number): void {
    this.gradingForm.patchValue({ score });
  }

  appendFeedback(text: string): void {
    const current = this.gradingForm.get('feedback')?.value || '';
    const newValue = current ? current + '\n' + text : text;
    this.gradingForm.patchValue({ feedback: newValue });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  saveDraft(): void {
    const sub = this.currentSubmission();
    if (sub) {
      localStorage.setItem(`grade_draft_${sub.id}`, JSON.stringify(this.gradingForm.value));
      this.draftSavedAt.set(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    }
  }

  onEnterKey(event: Event): void {
    // Don't submit if focus is in textarea (allow newlines)
    const target = event.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') return;
    event.preventDefault();
    this.submitGrade();
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
          this.toast.error('Lỗi: ' + error);
          return;
        }
        localStorage.removeItem(`grade_draft_${sub.id}`);
        this.toast.success('Chấm điểm thành công!');
        if (this.hasNext()) {
          setTimeout(() => this.nextSubmission(), 500);
        }
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Không thể chấm điểm. Vui lòng thử lại.');
      }
    });
  }

  goBack(): void {
    const assignmentId = this.assignmentStore.assignmentId();
    this.router.navigate(['/teacher/assessments/classes/assignments', assignmentId, 'submissions']);
  }
}
