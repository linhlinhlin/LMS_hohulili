import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../api/client/api-client';
import { CertificateApi, CertificateDTO } from '../../../api/endpoints/certificate.api';

interface QuizScore {
  quizId: string;
  quizTitle: string;
  bestScore: number;
  maxScore: number;
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
  thumbnailUrl: string | null;
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
    <div class="min-h-screen bg-slate-50">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">

        <!-- Page Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Kết quả học tập</h1>
          <p class="mt-1 text-sm text-gray-500">Xem tiến độ, điểm số và chứng chỉ của bạn</p>
        </div>

        <!-- Tab Chips -->
        <div class="flex gap-2 mb-6 pb-4 border-b border-gray-200" role="tablist">
          <button
            class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border transition-all"
            [class.bg-[#0056D2]]="activeTab() === 'grades'"
            [class.text-white]="activeTab() === 'grades'"
            [class.border-[#0056D2]]="activeTab() === 'grades'"
            [class.bg-white]="activeTab() !== 'grades'"
            [class.text-gray-700]="activeTab() !== 'grades'"
            [class.border-gray-200]="activeTab() !== 'grades'"
            [class.hover:border-gray-300]="activeTab() !== 'grades'"
            (click)="activeTab.set('grades')"
            role="tab" [attr.aria-selected]="activeTab() === 'grades'" type="button">
            Bảng điểm ({{ grades().length }})
          </button>
          <button
            class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border transition-all"
            [class.bg-[#0056D2]]="activeTab() === 'certificates'"
            [class.text-white]="activeTab() === 'certificates'"
            [class.border-[#0056D2]]="activeTab() === 'certificates'"
            [class.bg-white]="activeTab() !== 'certificates'"
            [class.text-gray-700]="activeTab() !== 'certificates'"
            [class.border-gray-200]="activeTab() !== 'certificates'"
            [class.hover:border-gray-300]="activeTab() !== 'certificates'"
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

        <!-- ═══ GRADES TAB ═══ -->
        @if (activeTab() === 'grades') {
          @if (isLoading()) {
            <div class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                @for (i of [1,2,3]; track i) {
                  <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div class="animate-pulse space-y-3">
                      <div class="h-3 w-16 rounded bg-gray-200"></div>
                      <div class="h-7 w-12 rounded bg-gray-200"></div>
                    </div>
                  </div>
                }
              </div>
              <div class="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                @for (i of [1,2,3,4]; track i) {
                  <div class="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
                    <div class="animate-pulse h-4 w-16 rounded bg-gray-200"></div>
                    <div class="animate-pulse h-4 flex-1 rounded bg-gray-200"></div>
                    <div class="animate-pulse h-4 w-20 rounded bg-gray-200"></div>
                  </div>
                }
              </div>
            </div>
          } @else if (grades().length === 0) {
            <div class="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
              <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
              </svg>
              <p class="mt-3 text-sm font-medium text-gray-600">Chưa có dữ liệu điểm</p>
              <p class="mt-1 text-xs text-gray-400">Hãy đăng ký và hoàn thành các khóa học để xem điểm</p>
              <a routerLink="/student/courses/library"
                 class="mt-4 inline-flex rounded-md bg-[#0056D2] px-4 py-2 text-sm font-medium text-white hover:bg-[#004BB5] transition-colors">
                Xem khóa học
              </a>
            </div>
          } @else {
            <!-- Summary Stats -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Khóa học</p>
                <p class="mt-2 text-2xl font-bold text-[#0056D2]">{{ grades().length }}</p>
              </div>
              <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Hoàn thành</p>
                <p class="mt-2 text-2xl font-bold text-emerald-600">{{ completedCount() }}</p>
              </div>
              <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Tiến độ TB</p>
                <p class="mt-2 text-2xl font-bold text-gray-900">{{ averageProgress() }}%</p>
              </div>
            </div>

            <!-- Grades Table -->
            <div class="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="bg-gray-50 border-b border-gray-200">
                      <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Mã KH</th>
                      <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tên khóa học</th>
                      <th class="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Tiến độ</th>
                      <th class="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Trạng thái</th>
                      <th class="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Chứng chỉ</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    @for (grade of grades(); track grade.courseId) {
                      <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{{ grade.courseCode || '-' }}</td>
                        <td class="px-5 py-4">
                          <a [routerLink]="['/student/courses', grade.courseId]"
                             class="text-sm font-medium text-[#0056D2] hover:underline">
                            {{ grade.courseTitle }}
                          </a>
                          @if (grade.quizScores.length > 0 || grade.assignmentScores.length > 0) {
                            <div class="flex flex-wrap gap-1.5 mt-1.5">
                              @for (qs of grade.quizScores; track qs.quizId) {
                                <span class="inline-flex rounded-full bg-[#0056D2]/8 px-2 py-0.5 text-[11px] font-medium text-[#0056D2]">
                                  Quiz: {{ qs.bestScore | number:'1.0-0' }}pts
                                </span>
                              }
                              @for (ascore of grade.assignmentScores; track ascore.assignmentId) {
                                @if (ascore.grade !== null) {
                                  <span class="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                    BT: {{ ascore.grade }}/{{ ascore.maxScore }}
                                  </span>
                                }
                              }
                            </div>
                          }
                        </td>
                        <td class="px-5 py-4">
                          <div class="flex items-center justify-center gap-2">
                            <div class="w-20 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                              <div class="h-full rounded-full transition-all duration-300"
                                   [class.bg-emerald-500]="grade.progress >= 100"
                                   [class.bg-[#0056D2]]="grade.progress < 100"
                                   [style.width.%]="grade.progress"></div>
                            </div>
                            <span class="text-xs font-medium text-gray-600 w-8 text-right">{{ grade.progress }}%</span>
                          </div>
                        </td>
                        <td class="px-5 py-4 text-center">
                          <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                                [class.bg-emerald-50]="grade.status === 'COMPLETED'"
                                [class.text-emerald-700]="grade.status === 'COMPLETED'"
                                [class.bg-[#0056D2]/10]="grade.status !== 'COMPLETED'"
                                [class.text-[#0056D2]]="grade.status !== 'COMPLETED'">
                            {{ grade.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang học' }}
                          </span>
                        </td>
                        <td class="px-5 py-4 text-center">
                          @if (grade.hasCertificate) {
                            <span class="inline-flex rounded-full bg-[#0056D2]/10 px-2.5 py-0.5 text-xs font-medium text-[#0056D2]">
                              Đã cấp
                            </span>
                          } @else {
                            <span class="text-gray-300">-</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }

        <!-- ═══ CERTIFICATES TAB ═══ -->
        @if (activeTab() === 'certificates') {
          @if (certsLoading()) {
            <div class="space-y-3">
              @for (i of [1,2,3]; track i) {
                <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <div class="animate-pulse flex items-center gap-4">
                    <div class="h-12 w-12 rounded-lg bg-gray-200"></div>
                    <div class="flex-1 space-y-2">
                      <div class="h-4 w-48 rounded bg-gray-200"></div>
                      <div class="h-3 w-32 rounded bg-gray-200"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else if (certificates().length === 0) {
            <div class="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
              <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .982-3.172M8.25 8.25a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0Z" />
              </svg>
              <p class="mt-3 text-sm font-medium text-gray-600">Chưa có chứng chỉ</p>
              <p class="mt-1 text-xs text-gray-400">Hoàn thành khóa học để nhận chứng chỉ</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (cert of certificates(); track cert.id) {
                <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-[#0056D2]/10 flex items-center justify-center">
                    <svg class="w-6 h-6 text-[#0056D2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .982-3.172M8.25 8.25a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0Z" />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-semibold text-gray-900 truncate">{{ cert.courseName }}</h3>
                    <p class="text-xs text-gray-500 mt-0.5">Cấp ngày: {{ cert.issuedAt }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">Mã: {{ cert.verificationToken.substring(0, 8) }}...</p>
                  </div>
                  <a [routerLink]="['/student/certificate', cert.verificationToken]"
                     class="flex-shrink-0 rounded-md bg-[#0056D2] px-4 py-2 text-sm font-medium text-white hover:bg-[#004BB5] transition-colors">
                    Xem
                  </a>
                </div>
              }
            </div>
          }
        }

      </div>
    </div>
  `
})
export class StudentGradesComponent implements OnInit {
  private apiClient = inject(ApiClient);
  private certificateApi = inject(CertificateApi);

  activeTab = signal<'grades' | 'certificates'>('grades');
  grades = signal<CourseGrade[]>([]);
  certificates = signal<CertificateDTO[]>([]);
  isLoading = signal(true);
  certsLoading = signal(false);
  error = signal<string | null>(null);

  completedCount = signal(0);
  averageProgress = signal(0);

  async ngOnInit(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.apiClient.get('/api/v3/student/grades'));
      const data: CourseGrade[] = (response?.data || []).map((g: any) => ({
        ...g,
        quizScores: g.quizScores || [],
        assignmentScores: g.assignmentScores || [],
        hasCertificate: g.hasCertificate || false
      }));
      this.grades.set(data);

      this.completedCount.set(data.filter(g => g.status === 'COMPLETED').length);
      const avg = data.length > 0
        ? Math.round(data.reduce((sum, g) => sum + g.progress, 0) / data.length)
        : 0;
      this.averageProgress.set(avg);
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
      this.error.set(err?.message || 'Không thể tải danh sách chứng chỉ lúc này.');
    } finally {
      this.certsLoading.set(false);
    }
  }
}
