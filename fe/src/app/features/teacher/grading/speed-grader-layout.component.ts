import { Component, ViewEncapsulation, inject, signal, OnInit, computed, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AssignmentApi, SubmissionDetail, GradeSubmissionRequest } from '../../../api/client/assignment.api';
import { validateGrade } from '../assignments/utils/assignment-validators';
import { calculateRubricScore, Rubric, RubricGradeSelection, RubricScoreResult } from './utils/rubric-calculator';

@Component({
  selector: 'app-speed-grader-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-screen flex flex-col bg-gray-100">
      <header class="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-4">
          <button (click)="goBack()" class="p-2 hover:bg-gray-100 rounded-lg">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </button>
          <div>
            <h1 class="font-semibold text-gray-900">{{ assignmentTitle() }}</h1>
            <p class="text-sm text-gray-500">{{ studentName() }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button (click)="previousSubmission()" [disabled]="!hasPrevious()" 
                  class="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50">Truoc</button>
          <span class="text-sm text-gray-600">{{ currentIndex() + 1 }} / {{ totalSubmissions() }}</span>
          <button (click)="nextSubmission()" [disabled]="!hasNext()"
                  class="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50">Sau</button>
        </div>
      </header>
      <div class="flex-1 flex overflow-hidden">
        <div class="w-1/2 xl:w-3/5 2xl:w-2/3 border-r bg-white overflow-y-auto" id="file-viewer">
          @if (loading()) {
            <div class="flex items-center justify-center h-full">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          } @else if (currentFile()) {
            <div class="p-4 flex items-center justify-center h-full">
              <p class="text-gray-600">{{ currentFile()!.fileName }}</p>
            </div>
          } @else {
            <div class="flex items-center justify-center h-full text-gray-500">
              <p>Khong co file dinh kem</p>
            </div>
          }
        </div>
        <div class="w-1/2 xl:w-2/5 2xl:w-1/3 bg-white flex flex-col">
          <div class="p-4 border-b">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span class="text-blue-600 font-medium">{{ studentInitials() }}</span>
              </div>
              <div>
                <p class="font-medium">{{ studentName() }}</p>
                <p class="text-sm text-gray-500">{{ studentEmail() }}</p>
              </div>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto p-4">
            <form [formGroup]="gradingForm" (ngSubmit)="submitGrade()">
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Diem</label>
                <div class="flex items-center gap-2">
                  <input type="number" formControlName="score" 
                         class="w-24 px-3 py-2 border rounded-lg" [min]="0" [max]="maxScore()"/>
                  <span class="text-gray-500">/ {{ maxScore() }}</span>
                </div>
              </div>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Nhan xet</label>
                <textarea formControlName="feedback" rows="4"
                          class="w-full px-3 py-2 border rounded-lg" placeholder="Nhap nhan xet..."></textarea>
              </div>
            </form>
          </div>
          <div class="p-4 border-t bg-gray-50">
            <div class="flex gap-2">
              <button type="button" (click)="saveDraft()" [disabled]="saving()"
                      class="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50">Luu nhap</button>
              <button type="button" (click)="submitGrade()" [disabled]="saving() || !gradingForm.valid"
                      class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {{ saving() ? 'Dang luu...' : 'Cham diem' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SpeedGraderLayoutComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private assignmentApi = inject(AssignmentApi);

  loading = signal(false);
  saving = signal(false);
  submissions = signal<SubmissionDetail[]>([]);
  currentIndex = signal(0);
  rubric = signal<Rubric | null>(null);
  rubricSelections = signal<RubricGradeSelection[]>([]);
  autoSaveStatus = signal<string>('');
  currentFile = signal<{ id: string; fileName: string; fileUrl: string; mimeType?: string } | null>(null);

  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private readonly AUTO_SAVE_INTERVAL = 30000;

  gradingForm = this.fb.group({
    score: [0, [Validators.required, Validators.min(0)]],
    feedback: ['']
  });

  currentSubmission = computed(() => this.submissions()[this.currentIndex()] || null);
  assignmentTitle = computed(() => this.currentSubmission()?.assignmentTitle || 'Bai tap');
  studentName = computed(() => this.currentSubmission()?.studentName || '');
  studentEmail = computed(() => this.currentSubmission()?.studentEmail || '');
  studentInitials = computed(() => {
    const name = this.studentName();
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  });
  isLate = computed(() => this.currentSubmission()?.isLate || false);
  maxScore = computed(() => this.currentSubmission()?.maxScore || 100);
  totalSubmissions = computed(() => this.submissions().length);
  hasPrevious = computed(() => this.currentIndex() > 0);
  hasNext = computed(() => this.currentIndex() < this.totalSubmissions() - 1);
  submissionFiles = computed(() => this.currentSubmission()?.attachments || []);
  isPdf = computed(() => this.currentFile()?.mimeType?.includes('pdf') || this.currentFile()?.fileName?.endsWith('.pdf'));
  isImage = computed(() => {
    const file = this.currentFile();
    const mimeType = file?.mimeType || '';
    return mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file?.fileName || '');
  });
  quickScores = computed(() => {
    const max = this.maxScore();
    return [max, Math.round(max * 0.9), Math.round(max * 0.8), Math.round(max * 0.7), Math.round(max * 0.5)];
  });
  rubricScore = computed((): RubricScoreResult | null => {
    const r = this.rubric();
    const selections = this.rubricSelections();
    if (!r || selections.length === 0) return null;
    return calculateRubricScore(r, selections);
  });

  ngOnInit(): void {
    const assignmentId = this.route.snapshot.paramMap.get('assignmentId');
    const submissionId = this.route.snapshot.paramMap.get('submissionId');
    if (assignmentId) this.loadSubmissions(assignmentId, submissionId);
    this.startAutoSave();
  }

  ngOnDestroy(): void {
    this.stopAutoSave();
  }

  private loadSubmissions(assignmentId: string, targetSubmissionId?: string | null): void {
    this.loading.set(true);
    this.assignmentApi.getSubmissions(assignmentId).subscribe({
      next: (response: { data?: SubmissionDetail[] }) => {
        const subs = response.data || [];
        this.submissions.set(subs);
        if (targetSubmissionId) {
          const idx = subs.findIndex((s: SubmissionDetail) => s.id === targetSubmissionId);
          if (idx >= 0) this.currentIndex.set(idx);
        }
        this.loadCurrentSubmissionData();
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error('Error loading submissions:', err);
        this.loading.set(false);
      }
    });
  }

  private loadCurrentSubmissionData(): void {
    const sub = this.currentSubmission();
    if (!sub) return;
    if (sub.attachments && sub.attachments.length > 0) {
      this.currentFile.set(sub.attachments[0]);
    } else {
      this.currentFile.set(null);
    }
    if (sub.grade) {
      this.gradingForm.patchValue({ score: sub.grade.score, feedback: sub.grade.feedback || '' });
    } else {
      this.gradingForm.reset({ score: 0, feedback: '' });
    }
    if (sub.grade?.rubricGrades) {
      this.rubricSelections.set(sub.grade.rubricGrades.map((rg) => ({
        criterionId: rg.criterionId, levelId: rg.levelId, points: rg.score
      })));
    } else {
      this.rubricSelections.set([]);
    }
  }

  selectFile(file: { id: string; fileName: string; fileUrl: string; mimeType?: string }): void {
    this.currentFile.set(file);
  }

  previousSubmission(): void {
    if (this.hasPrevious()) {
      this.currentIndex.update((i: number) => i - 1);
      this.loadCurrentSubmissionData();
    }
  }

  nextSubmission(): void {
    if (this.hasNext()) {
      this.currentIndex.update((i: number) => i + 1);
      this.loadCurrentSubmissionData();
    }
  }

  setQuickScore(score: number): void {
    this.gradingForm.patchValue({ score });
  }

  selectRubricLevel(criterionId: string, levelId: string, points: number): void {
    this.rubricSelections.update((selections: RubricGradeSelection[]) => {
      const filtered = selections.filter((s: RubricGradeSelection) => s.criterionId !== criterionId);
      return [...filtered, { criterionId, levelId, points }];
    });
    const result = this.rubricScore();
    if (result) this.gradingForm.patchValue({ score: result.totalScore });
  }

  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(() => this.saveDraft(true), this.AUTO_SAVE_INTERVAL);
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  saveDraft(isAutoSave = false): void {
    const sub = this.currentSubmission();
    if (!sub) return;
    const formValue = this.gradingForm.value;
    const draftKey = `grade_draft_${sub.id}`;
    const draft = { score: formValue.score, feedback: formValue.feedback, rubricSelections: this.rubricSelections(), savedAt: new Date().toISOString() };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
      this.autoSaveStatus.set(isAutoSave ? `Tu dong luu luc ${new Date().toLocaleTimeString()}` : 'Da luu nhap');
      setTimeout(() => this.autoSaveStatus.set(''), 3000);
    } catch (e) {
      console.warn('Failed to save draft:', e);
    }
  }

  submitGrade(): void {
    const sub = this.currentSubmission();
    if (!sub || !this.gradingForm.valid) return;
    const formValue = this.gradingForm.value;
    const score = formValue.score || 0;
    const validation = validateGrade(score, this.maxScore());
    if (!validation.isValid) {
      this.gradingForm.get('score')?.setErrors({ invalidGrade: true });
      return;
    }
    this.saving.set(true);
    const request: GradeSubmissionRequest = {
      score,
      feedback: formValue.feedback || undefined,
      rubricGrades: this.rubricSelections().map((s: RubricGradeSelection) => ({
        criterionId: s.criterionId, levelId: s.levelId, score: s.points || 0
      }))
    };
    this.assignmentApi.gradeSubmission(sub.id, request).subscribe({
      next: () => {
        localStorage.removeItem(`grade_draft_${sub.id}`);
        this.submissions.update((subs: SubmissionDetail[]) =>
          subs.map((s: SubmissionDetail) => s.id === sub.id ? {
            ...s, status: 'graded' as const,
            grade: { score, feedback: formValue.feedback || '', gradedAt: new Date().toISOString(), gradedBy: '', maxScore: this.maxScore(), percentage: (score / this.maxScore()) * 100 }
          } : s)
        );
        this.saving.set(false);
        this.autoSaveStatus.set('Da cham diem thanh cong!');
        if (this.hasNext()) setTimeout(() => this.nextSubmission(), 1000);
      },
      error: (err: unknown) => {
        console.error('Error submitting grade:', err);
        this.saving.set(false);
        this.autoSaveStatus.set('Loi khi luu diem');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['../..'], { relativeTo: this.route });
  }
}
