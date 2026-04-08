import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../api/client/api-client';
import { CertificateApi, CertificateDTO } from '../../../api/endpoints/certificate.api';

interface QuizScore {
  quizId: string;
  quizTitle: string;
  bestScore: number;
  maxScore: number;
  isPassed: boolean | null;
  bestAttemptId: string | null;
  attempts: number;
}

interface AssignmentScore {
  assignmentId: string;
  assignmentTitle: string;
  grade: number | null;
  maxScore: number;
  status: string;
}

interface CourseGrade {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  progress: number;
  status: string;
  quizScores: QuizScore[];
  assignmentScores: AssignmentScore[];
  hasCertificate: boolean;
}

@Component({
  selector: 'app-student-grades',
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">

      <!-- Header -->
      <div class="mb-5">
        <h1 class="text-xl font-bold text-gray-900">Kết quả học tập</h1>
        <p class="mt-0.5 text-sm text-gray-500">Điểm số và chứng chỉ từ các khóa học đã đăng ký</p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-5 pb-3 border-b border-gray-200" role="tablist">
        <button
          class="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
          [class.bg-[#0056D2]]="activeTab() === 'grades'"
          [class.text-white]="activeTab() === 'grades'"
          [class.border-[#0056D2]]="activeTab() === 'grades'"
          [class.bg-white]="activeTab() !== 'grades'"
          [class.text-gray-700]="activeTab() !== 'grades'"
          [class.border-gray-200]="activeTab() !== 'grades'"
          (click)="activeTab.set('grades')"
          role="tab" [attr.aria-selected]="activeTab() === 'grades'" type="button">
          Bảng điểm
        </button>
        <button
          class="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
          [class.bg-[#0056D2]]="activeTab() === 'certificates'"
          [class.text-white]="activeTab() === 'certificates'"
          [class.border-[#0056D2]]="activeTab() === 'certificates'"
          [class.bg-white]="activeTab() !== 'certificates'"
          [class.text-gray-700]="activeTab() !== 'certificates'"
          [class.border-gray-200]="activeTab() !== 'certificates'"
          (click)="activeTab.set('certificates'); loadCertificates()"
          role="tab" [attr.aria-selected]="activeTab() === 'certificates'" type="button">
          Chứng chỉ ({{ certificates().length }})
        </button>
      </div>

      @if (error()) {
        <div class="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-4">
          <span class="text-sm text-red-700">{{ error() }}</span>
          <button class="text-red-400 hover:text-red-600" (click)="error.set(null)" type="button">&times;</button>
        </div>
      }

      <!-- GRADES TAB -->
      @if (activeTab() === 'grades') {
        @if (isLoading()) {
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            @for (i of [1,2,3]; track i) {
              <div class="px-5 py-4 border-b border-gray-100 animate-pulse">
                <div class="h-4 w-48 rounded bg-gray-200 mb-2"></div>
                <div class="h-3 w-full rounded bg-gray-100"></div>
              </div>
            }
          </div>
        } @else if (grades().length === 0) {
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-10 text-center">
            <p class="text-sm font-medium text-gray-600">Chưa có dữ liệu điểm</p>
            <p class="text-xs text-gray-400 mt-1">Đăng ký và hoàn thành các khóa học để xem bảng điểm</p>
            <a routerLink="/student/courses/library"
               class="mt-4 inline-block text-sm font-medium text-[#0056D2] hover:underline">
              Xem khóa học →
            </a>
          </div>
        } @else {
          <!-- Summary -->
          <p class="text-xs text-gray-500 mb-4">
            {{ grades().length }} khóa học · {{ completedCount() }} hoàn thành · Trung bình {{ averageProgress() }}%
          </p>

          <!-- VMU-style: Course tables -->
          <div class="space-y-5">
            @for (course of visibleGrades(); track course.courseId) {
              <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <!-- Course Header -->
                <div class="px-5 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
                  <div class="min-w-0">
                    <a [routerLink]="['/student/courses', course.courseId]"
                       class="text-sm font-semibold text-gray-900 hover:text-[#0056D2] transition-colors">
                      {{ course.courseTitle }}
                    </a>
                    @if (course.courseCode) {
                      <span class="ml-2 text-xs text-gray-400">{{ course.courseCode }}</span>
                    }
                  </div>
                  <span class="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                    [class.bg-green-50]="course.status === 'COMPLETED'"
                    [class.text-green-700]="course.status === 'COMPLETED'"
                    [class.bg-gray-100]="course.status !== 'COMPLETED'"
                    [class.text-gray-500]="course.status !== 'COMPLETED'">
                    {{ course.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang học' }}
                  </span>
                </div>

                <!-- Table -->
                @if (course.quizScores.length === 0 && course.assignmentScores.length === 0) {
                  <div class="px-5 py-4 text-xs text-gray-400 text-center">Chưa có bài kiểm tra hoặc bài tập</div>
                } @else {
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="border-b border-gray-100">
                          <th class="text-left px-5 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Bài</th>
                          <th class="text-center px-3 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-20">Loại</th>
                          <th class="text-right px-3 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-24">Điểm</th>
                          <th class="text-center px-3 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-24">Kết quả</th>
                          <th class="text-right px-5 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-16"></th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-50">
                        @for (item of getAllItems(course); track item.quizId || item.assignmentId) {
                          <tr class="hover:bg-gray-50/40 transition-colors group">
                            <td class="px-5 py-2.5 text-sm text-gray-800">{{ item.quizTitle || item.assignmentTitle }}</td>
                            <td class="text-center px-3 py-2.5 text-xs text-gray-400">{{ item.type === 'quiz' ? 'Trắc nghiệm' : 'Bài tập' }}</td>
                            <td class="text-right px-3 py-2.5 text-sm font-medium tabular-nums text-gray-900">
                              @if (item.type === 'quiz') {
                                {{ formatScore(item.bestScore) }}/{{ formatScore(item.maxScore) }}
                              } @else if (item.grade !== null && item.grade !== undefined) {
                                {{ item.grade }}/{{ item.maxScore }}
                              } @else {
                                <span class="text-gray-300">—</span>
                              }
                            </td>
                            <td class="text-center px-3 py-2.5">
                              @if (item.type === 'quiz') {
                                <span class="text-xs font-medium"
                                  [class.text-green-600]="item.isPassed === true"
                                  [class.text-red-500]="item.isPassed === false"
                                  [class.text-gray-400]="item.isPassed === null">
                                  {{ item.isPassed === true ? 'Đạt' : item.isPassed === false ? 'Chưa đạt' : '—' }}
                                </span>
                              } @else {
                                <span class="text-xs font-medium"
                                  [class.text-green-600]="item.status === 'GRADED'"
                                  [class.text-amber-600]="item.status === 'SUBMITTED'"
                                  [class.text-gray-400]="item.status !== 'GRADED' && item.status !== 'SUBMITTED'">
                                  {{ getAssignmentStatusLabel(item.status) }}
                                </span>
                              }
                            </td>
                            <td class="text-right px-5 py-2.5">
                              @if (item.type === 'quiz' && item.bestAttemptId) {
                                <button (click)="viewQuizResult(item.bestAttemptId); $event.stopPropagation()"
                                  class="text-xs font-medium text-[#0056D2] opacity-0 group-hover:opacity-100 transition-opacity">
                                  Xem
                                </button>
                              }
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Load More -->
          @if (hasMoreGrades()) {
            <div class="flex flex-col items-center gap-2 pt-4">
              <button type="button" (click)="loadMoreGrades()"
                      class="px-6 py-2.5 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 hover:border-[#0056D2] hover:text-[#0056D2] hover:bg-[#0056D2]/5 transition-colors">
                Xem thêm {{ remainingGrades() }} khóa học
              </button>
              <p class="text-xs text-gray-400">Đang hiện {{ visibleGrades().length }} / {{ grades().length }}</p>
            </div>
          } @else if (grades().length > 5) {
            <p class="text-center text-xs text-gray-400 pt-4">Đã hiện tất cả {{ grades().length }} khóa học</p>
          }
        }
      }

      <!-- CERTIFICATES TAB -->
      @if (activeTab() === 'certificates') {
        @if (certsLoading()) {
          <div class="space-y-3">
            @for (i of [1,2]; track i) {
              <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <div class="animate-pulse flex items-center gap-4">
                  <div class="h-10 w-10 rounded-lg bg-gray-200"></div>
                  <div class="flex-1 space-y-2">
                    <div class="h-4 w-48 rounded bg-gray-200"></div>
                    <div class="h-3 w-32 rounded bg-gray-200"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else if (certificates().length === 0) {
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-10 text-center">
            <p class="text-sm font-medium text-gray-600">Chưa có chứng chỉ</p>
            <p class="text-xs text-gray-400 mt-1">Hoàn thành khóa học để nhận chứng chỉ</p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (cert of certificates(); track cert.id) {
              <div class="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4 hover:border-gray-300 transition-colors">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ cert.courseName }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">Cấp ngày {{ cert.issuedAt }} · Mã: {{ cert.verificationToken.substring(0, 8) }}...</p>
                </div>
                <a [routerLink]="['/student/certificate', cert.verificationToken]"
                   class="flex-shrink-0 text-sm font-medium text-[#0056D2] hover:underline">
                  Xem
                </a>
              </div>
            }
          </div>
        }
      }
    </div>
  `
})
export class StudentGradesComponent implements OnInit {
  private apiClient = inject(ApiClient);
  private certificateApi = inject(CertificateApi);
  private router = inject(Router);

  activeTab = signal<'grades' | 'certificates'>('grades');
  grades = signal<CourseGrade[]>([]);
  certificates = signal<CertificateDTO[]>([]);
  isLoading = signal(true);
  certsLoading = signal(false);
  error = signal<string | null>(null);

  completedCount = computed(() => this.grades().filter(g => g.status === 'COMPLETED').length);
  averageProgress = computed(() => {
    const g = this.grades();
    return g.length > 0 ? Math.round(g.reduce((s, c) => s + c.progress, 0) / g.length) : 0;
  });

  // Load More — show 5 courses initially, +5 each click
  private readonly INITIAL_COUNT = 5;
  private readonly LOAD_MORE_COUNT = 5;
  visibleCount = signal(5);
  visibleGrades = computed(() => this.grades().slice(0, this.visibleCount()));
  hasMoreGrades = computed(() => this.visibleCount() < this.grades().length);
  remainingGrades = computed(() => Math.max(0, this.grades().length - this.visibleCount()));

  loadMoreGrades(): void {
    this.visibleCount.update(c => c + this.LOAD_MORE_COUNT);
  }

  // Expand/collapse per course — show first 3 items, "Xem thêm" to expand
  private readonly ITEMS_PER_COURSE = 3;
  expandedCourses = signal<Set<string>>(new Set());

  getVisibleItems(course: CourseGrade): any[] {
    const all = [...course.quizScores.map(q => ({ ...q, type: 'quiz' })), ...course.assignmentScores.map(a => ({ ...a, type: 'assignment' }))];
    if (this.expandedCourses().has(course.courseId)) return all;
    return all.slice(0, this.ITEMS_PER_COURSE);
  }

  getAllItems(course: CourseGrade): any[] {
    return [
      ...course.quizScores.map(q => ({ ...q, type: 'quiz' })),
      ...course.assignmentScores.map(a => ({ ...a, type: 'assignment' }))
    ];
  }

  hasMoreItems(course: CourseGrade): boolean {
    return this.getAllItems(course).length > this.ITEMS_PER_COURSE && !this.expandedCourses().has(course.courseId);
  }

  isExpanded(course: CourseGrade): boolean {
    return this.expandedCourses().has(course.courseId) && this.getAllItems(course).length > this.ITEMS_PER_COURSE;
  }

  toggleCourseExpand(courseId: string): void {
    const current = new Set(this.expandedCourses());
    if (current.has(courseId)) { current.delete(courseId); } else { current.add(courseId); }
    this.expandedCourses.set(current);
  }

  async ngOnInit(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.apiClient.get('/api/v3/student/grades'));
      const data: CourseGrade[] = (response?.data || []).map((g: any) => ({
        ...g,
        quizScores: (g.quizScores || []).map((qs: any) => ({
          ...qs,
          isPassed: qs.isPassed ?? null,
          bestAttemptId: qs.bestAttemptId ?? null
        })),
        assignmentScores: g.assignmentScores || [],
        hasCertificate: g.hasCertificate || false
      }));
      this.grades.set(data);
    } catch (err: any) {
      this.error.set(err?.message || 'Không thể tải bảng điểm');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadCertificates(): Promise<void> {
    if (this.certificates().length > 0) return;
    this.certsLoading.set(true);
    this.error.set(null);
    try {
      const response: any = await firstValueFrom(this.certificateApi.getMyCertificates());
      this.certificates.set(response?.data || []);
    } catch (err: any) {
      this.error.set(err?.message || 'Không thể tải danh sách chứng chỉ.');
    } finally {
      this.certsLoading.set(false);
    }
  }

  viewQuizResult(attemptId: string): void {
    this.router.navigate(['/student/quiz/result'], {
      queryParams: { attemptId, returnUrl: '/student/results' }
    });
  }

  formatScore(score: number): string {
    return Number.isInteger(score) ? score.toString() : score.toFixed(1);
  }

  getAssignmentStatusLabel(status: string): string {
    switch (status) {
      case 'GRADED': return 'Đã chấm';
      case 'SUBMITTED': return 'Đã nộp';
      case 'OVERDUE': return 'Quá hạn';
      default: return 'Chưa nộp';
    }
  }
}
