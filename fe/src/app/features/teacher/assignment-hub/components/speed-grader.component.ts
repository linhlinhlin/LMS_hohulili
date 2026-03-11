import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
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
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <!-- Premium Header -->
      <header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 z-30 shadow-sm">
        <div class="flex items-center gap-6">
          <button (click)="goBack()" 
                  class="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all group">
            <lucide-icon name="arrow-left" [size]="18" class="group-hover:-translate-x-0.5 transition-transform"></lucide-icon>
          </button>
          <div class="h-8 w-px bg-slate-100"></div>
          <div>
            <h1 class="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <lucide-icon name="file-edit" [size]="14" class="text-[#0056D2]"></lucide-icon>
              {{ assignmentStore.assignmentTitle() }}
            </h1>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tight">SpeedGrader™</span>
              @if (currentSubmission(); as sub) {
                <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                <span class="text-[10px] font-bold text-[#0056D2] uppercase tracking-tight">{{ sub.studentName }}</span>
              }
            </div>
          </div>
        </div>
        
        <!-- Navigation Controls -->
        <div class="flex items-center gap-4 bg-slate-50 p-1 rounded-2xl border border-slate-100">
          <button (click)="previousSubmission()" [disabled]="!hasPrevious()"
                  class="w-9 h-9 flex items-center justify-center rounded-xl bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
            <lucide-icon name="chevron-left" [size]="18"></lucide-icon>
          </button>
          
          <div class="px-4 flex items-center gap-1.5">
            <span class="text-xs font-black text-slate-900">{{ currentIndex() + 1 }}</span>
            <span class="text-[10px] font-bold text-slate-400 uppercase">/</span>
            <span class="text-[10px] font-bold text-slate-400 uppercase">{{ totalSubmissions() }}</span>
          </div>
          
          <button (click)="nextSubmission()" [disabled]="!hasNext()"
                  class="w-9 h-9 flex items-center justify-center rounded-xl bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
            <lucide-icon name="chevron-right" [size]="18"></lucide-icon>
          </button>
        </div>

        <div class="flex items-center gap-3">
          <div class="hidden sm:flex flex-col items-end mr-2">
            <span class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Trạng thái</span>
            <span class="text-[10px] font-black text-emerald-600 uppercase">Auto-save On</span>
          </div>
          <button (click)="goBack()" class="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all">
            <lucide-icon name="x" [size]="20"></lucide-icon>
          </button>
        </div>
      </header>

      <!-- Main Workspace -->
      @if (currentSubmission(); as sub) {
        <div class="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          <!-- Left: Submission Content Preview -->
          <div class="flex-1 border-r border-slate-200 bg-white overflow-y-auto p-12 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <div class="max-w-4xl mx-auto">
              @if (sub.content) {
                <div class="prose prose-slate max-w-none">
                  <div class="flex items-center gap-3 mb-8">
                    <div class="w-10 h-10 rounded-2xl bg-[#0056D2]/5 flex items-center justify-center text-[#0056D2]">
                      <lucide-icon name="file-text" [size]="20"></lucide-icon>
                    </div>
                    <div>
                      <h3 class="text-xl font-black text-slate-900 tracking-tight">Văn bản bài nộp</h3>
                      <p class="text-xs font-medium text-slate-400">Nội dung được học viên nhập trực tiếp</p>
                    </div>
                  </div>
                  
                  <div class="bg-slate-50/50 rounded-3xl p-8 border border-slate-100 whitespace-pre-wrap text-slate-700 leading-relaxed font-medium shadow-inner shadow-slate-100/50">
                    {{ sub.content }}
                  </div>
                </div>
              } @else {
                <div class="py-32 flex flex-col items-center text-center">
                  <div class="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 border border-slate-100 shadow-sm text-slate-200">
                    <lucide-icon name="file-question" [size]="48"></lucide-icon>
                  </div>
                  <h4 class="text-lg font-black text-slate-800 uppercase tracking-widest mb-2">Không có nội dung văn bản</h4>
                  <p class="text-sm text-slate-500 font-medium max-w-xs">
                    Học viên không cung cấp nội dung văn bản trực tiếp. Vui lòng kiểm tra các tệp đính kèm bên dưới.
                  </p>
                </div>
              }
              
              @if (sub.attachments && sub.attachments.length) {
                <div class="mt-12 pt-12 border-t border-slate-100">
                  <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <lucide-icon name="paperclip" [size]="12"></lucide-icon>
                    Tệp đính kèm ({{ sub.attachments.length }})
                  </h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    @for (file of sub.attachments; track file.id) {
                      <a [href]="file.fileUrl" target="_blank" 
                         class="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-[#0056D2] hover:shadow-lg hover:shadow-blue-50 transition-all duration-300">
                        <div class="flex items-center gap-4">
                          <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#0056D2]/5 group-hover:text-[#0056D2] transition-colors">
                            <lucide-icon name="file" [size]="18"></lucide-icon>
                          </div>
                          <div>
                            <p class="text-sm font-black text-slate-900 tracking-tight group-hover:text-[#0056D2] transition-colors break-all line-clamp-1">{{ file.fileName }}</p>
                            <p class="text-[10px] font-bold text-slate-400 uppercase">Tệp bài làm</p>
                          </div>
                        </div>
                        <lucide-icon name="external-link" [size]="14" class="text-slate-300 group-hover:text-[#0056D2] transition-colors"></lucide-icon>
                      </a>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Right: Sidebar Grading Panel -->
          <div class="w-full md:w-[400px] xl:w-[460px] bg-white flex flex-col border-l border-slate-200 shadow-2xl shadow-slate-200/50 z-20">
            <!-- Student Profile Summary -->
            <div class="p-8 border-b border-slate-100 bg-slate-50/30">
              <div class="flex items-start justify-between mb-6">
                <div class="flex items-center gap-4">
                  <div class="relative">
                    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0056D2] to-[#004BB5] flex items-center justify-center text-white shadow-lg shadow-blue-100">
                      <span class="text-lg font-black tracking-tighter">{{ getInitials(sub.studentName || '') }}</span>
                    </div>
                    @if (sub.isLate) {
                      <div class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center shadow-md animate-bounce">
                        <lucide-icon name="clock" [size]="12" class="text-white"></lucide-icon>
                      </div>
                    }
                  </div>
                  <div>
                    <h4 class="text-base font-black text-slate-900 tracking-tight">{{ sub.studentName }}</h4>
                    <p class="text-xs font-medium text-slate-400">{{ sub.studentEmail }}</p>
                  </div>
                </div>
                
                @if (sub.isLate) {
                  <span class="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-rose-100">
                    Nộp muộn
                  </span>
                } @else {
                  <span class="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">
                    Đúng hạn
                  </span>
                }
              </div>

              <!-- Quick Status Cards -->
              <div class="grid grid-cols-2 gap-3">
                <div class="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Thời gian nộp</p>
                  <p class="text-[11px] font-black text-slate-900">12 Th03, 2024</p>
                </div>
                <div class="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Số lần nộp</p>
                  <p class="text-[11px] font-black text-slate-900">Lần 1</p>
                </div>
              </div>
            </div>

            <!-- Grade Form Container -->
            <div class="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-100 scrollbar-track-transparent">
              <form [formGroup]="gradingForm" class="space-y-8">
                <!-- Score Input -->
                <section>
                  <div class="flex items-center justify-between mb-4">
                    <label class="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                       <lucide-icon name="star" [size]="12" class="text-amber-400 fill-amber-400"></lucide-icon>
                       Điểm số đánh giá
                    </label>
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-tight">Thang {{ maxScore() }}đ</span>
                  </div>
                  
                  <div class="flex items-end gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 transition-all focus-within:bg-white focus-within:border-[#0056D2] focus-within:shadow-xl focus-within:shadow-blue-50/50">
                    <input type="number" formControlName="score" 
                           class="w-full bg-transparent border-none p-0 text-5xl font-black text-slate-900 focus:ring-0 placeholder:text-slate-200" 
                           [min]="0" [max]="maxScore()" placeholder="0.0"/>
                    <div class="flex flex-col items-center mb-1">
                      <span class="text-lg font-black text-slate-300">/</span>
                      <span class="text-xs font-black text-slate-400">{{ maxScore() }}</span>
                    </div>
                  </div>
                  
                  <!-- Quality Presets -->
                  <div class="mt-4 flex flex-wrap gap-2">
                    @for (score of quickScores(); track score) {
                      <button type="button" (click)="setScore(score)"
                              [class]="gradingForm.get('score')?.value === score ? 'bg-[#0056D2] text-white border-[#0056D2]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#0056D2] hover:text-[#0056D2]'"
                              class="px-4 py-2 text-[10px] font-black uppercase tracking-widest border rounded-xl transition-all shadow-sm">
                        {{ score }}
                      </button>
                    }
                  </div>
                </section>

                <div class="h-px bg-slate-100 mx-[-2rem]"></div>

                <!-- Feedback Section -->
                <section>
                  <label class="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                     <lucide-icon name="message-square" [size]="12" class="text-blue-500"></lucide-icon>
                     Nhận xét & Phản hồi
                  </label>
                  <div class="relative group">
                    <textarea formControlName="feedback" rows="6"
                              class="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-[#0056D2] focus:ring-4 focus:ring-blue-50 transition-all resize-none" 
                              placeholder="Viết nhận xét chi tiết để học viên cải thiện..."></textarea>
                    <div class="absolute bottom-4 right-4 text-[9px] font-black text-slate-300 uppercase opacity-0 group-focus-within:opacity-100 transition-opacity">
                      Học viên sẽ thấy nhận xét này
                    </div>
                  </div>
                </section>
                
                <!-- Quick Feedback Buttons -->
                <div class="flex flex-wrap gap-2 pb-8">
                  <button type="button" class="px-3 py-1.5 bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">Yêu cầu sửa lại</button>
                  <button type="button" class="px-3 py-1.5 bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">Bài làm xuất sắc</button>
                  <button type="button" class="px-3 py-1.5 bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">Cần cải thiện trình bày</button>
                </div>
              </form>
            </div>

            <!-- Global Actions -->
            <div class="p-8 bg-slate-50 border-t border-slate-200">
              <div class="flex gap-4">
                <button (click)="saveDraft()" [disabled]="saving()" 
                        class="flex-1 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-[0.15em] hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                  <lucide-icon name="save" [size]="14" class="mr-2"></lucide-icon>
                  Lưu nháp
                </button>
                <button (click)="submitGrade()" [disabled]="saving() || gradingForm.invalid"
                        [class.opacity-70]="saving()"
                        class="flex-[1.5] h-12 flex items-center justify-center rounded-2xl bg-[#0056D2] text-white font-black text-[10px] uppercase tracking-[0.15em] hover:bg-[#004BB5] hover:shadow-xl hover:shadow-blue-200 transition-all shadow-lg shadow-blue-100 relative overflow-hidden group">
                  <span class="relative z-10 flex items-center">
                    @if (saving()) {
                      <lucide-icon name="loader-2" [size]="14" class="mr-2 animate-spin"></lucide-icon>
                      Đang lưu...
                    } @else {
                      <lucide-icon name="check-circle" [size]="14" class="mr-2"></lucide-icon>
                      Hoàn thành chấm điểm
                    }
                  </span>
                  <div class="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      } @else if (noSubmissionAvailable()) {
        <div class="flex-1 flex flex-col items-center justify-center bg-white px-8 text-center">
          <div class="w-20 h-20 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 shadow-sm">
            <lucide-icon name="file-question" [size]="32" class="text-[#0056D2]/30"></lucide-icon>
          </div>
          <h3 class="mt-6 text-sm font-black text-slate-800 uppercase tracking-[0.28em]">Chưa có bài nộp để chấm</h3>
          <p class="mt-3 max-w-sm text-sm font-medium leading-6 text-slate-500">
            {{ getNoSubmissionMessage() }}
          </p>
          <button (click)="goBack()"
                  class="mt-6 h-11 px-6 rounded-2xl bg-[#0056D2] text-white text-xs font-black uppercase tracking-[0.14em] shadow-md shadow-blue-100 transition-all hover:bg-[#004BB5]">
            Quay lại bài nộp
          </button>
        </div>
      } @else {
        <div class="flex-1 flex flex-col items-center justify-center bg-white">
          <div class="relative">
            <div class="w-24 h-24 border-8 border-slate-50 border-t-[#0056D2] rounded-full animate-spin"></div>
            <div class="absolute inset-0 flex items-center justify-center">
              <lucide-icon name="file-edit" [size]="32" class="text-[#0056D2]/20"></lucide-icon>
            </div>
          </div>
          <h3 class="text-sm font-black text-slate-800 uppercase tracking-[0.34em] mt-8">Đang tải SpeedGrader™</h3>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 animate-pulse">Đang chuẩn bị dữ liệu bài nộp...</p>
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
      // Load full detail if content is not available
      this.submissionsStore.loadSubmissionDetail(sub.id).subscribe({
        error: () => this.toast.error('Không thể tải chi tiết bài nộp')
      });
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
