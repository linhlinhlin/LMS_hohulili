import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CourseApi } from '../../../../api/client/course.api';
import { CourseSummary } from '../../../../api/types/course.types';

@Component({
  selector: 'app-quiz-create-launcher',
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50/50">
      <div class="max-w-5xl mx-auto px-4 py-6 sm:px-6">
        <div class="mb-6 flex items-center justify-between gap-4">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-[#0056D2]">Vận hành</p>
            <h1 class="mt-1 text-2xl font-black tracking-tight text-slate-900">Chuẩn bị tạo bài kiểm tra</h1>
            <p class="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Chọn khóa học trước. Ở bước tiếp theo, hệ thống sẽ cho bạn đặt quiz vào chương phù hợp và xác định
              phạm vi áp dụng là <strong>toàn khóa học</strong> hoặc <strong>theo lớp</strong> nếu khóa học có giảng viên.
            </p>
          </div>
          <a
            routerLink="/teacher/assessments/classes/quizzes"
            class="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
          >
            Quay lại danh sách
          </a>
        </div>

        <div class="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <label class="block text-sm font-bold text-slate-900">
              Khóa học
              <span class="text-rose-500">*</span>
            </label>
            <p class="mt-2 text-sm text-slate-500">
              Chỉ khi biết khóa học, hệ thống mới xác định đúng chương neo quiz, delivery mode, và lớp học khả dụng.
            </p>

            <div class="mt-5">
              <select
                [ngModel]="selectedCourseId()"
                (ngModelChange)="selectedCourseId.set($event || '')"
                class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-[#0056D2] focus:ring-4 focus:ring-[#0056D2]/5"
              >
                <option value="">-- Chọn khóa học --</option>
                @for (course of courses(); track course.id) {
                  <option [value]="course.id">{{ course.title }} ({{ course.code }})</option>
                }
              </select>
            </div>

            @if (selectedCourse()) {
              <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-xl border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em]"
                        [class]="selectedCourse()?.deliveryMode === 'INSTRUCTOR_LED'
                          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                          : 'border-blue-100 bg-blue-50 text-[#0056D2]'">
                    {{ selectedCourse()?.deliveryMode === 'INSTRUCTOR_LED' ? 'Lớp học' : 'Khóa học tự học' }}
                  </span>
                  <span class="text-sm font-bold text-slate-900">{{ selectedCourse()?.title }}</span>
                </div>
                <p class="mt-3 text-sm font-medium leading-6 text-slate-600">
                  {{ selectedCourse()?.deliveryMode === 'INSTRUCTOR_LED'
                    ? 'Bạn sẽ có thể phân phối quiz cho một lớp cụ thể hoặc cho toàn bộ khóa học nếu phù hợp.'
                    : 'Quiz sẽ áp dụng cho toàn bộ học viên đã ghi danh trong khóa học tự học này.' }}
                </p>
              </div>
            }

            @if (error()) {
              <div class="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {{ error() }}
              </div>
            }

            <div class="mt-6 flex justify-end">
              <button
                type="button"
                (click)="continueToScopedCreate()"
                [disabled]="!selectedCourseId()"
                class="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0056D2] px-5 text-sm font-black text-white transition-all hover:bg-[#004BB5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tiếp tục tạo bài kiểm tra
              </button>
            </div>
          </section>

          <aside class="space-y-4">
            <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Luồng đúng</p>
              <ol class="mt-4 space-y-3 text-sm font-medium text-slate-600">
                <li class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <strong class="block text-slate-900">1. Chọn khóa học</strong>
                  Xác định đúng curriculum và loại delivery.
                </li>
                <li class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <strong class="block text-slate-900">2. Chọn chương neo quiz</strong>
                  Quiz vẫn là canonical content của khóa học.
                </li>
                <li class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <strong class="block text-slate-900">3. Chốt phạm vi áp dụng</strong>
                  Theo lớp nếu là instructor-led, hoặc toàn khóa học nếu là self-paced.
                </li>
              </ol>
            </article>

            <article class="rounded-3xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-[#0056D2]">Nhắc nhanh</p>
              <p class="mt-3 text-sm font-semibold leading-6 text-slate-700">
                Quiz vẫn được gắn vào curriculum của khóa học. Không tạo một bản quiz khác chỉ để phục vụ từng lớp.
              </p>
            </article>
          </aside>
        </div>
      </div>
    </div>
  `,
})
export class QuizCreateLauncherComponent implements OnInit {
  private readonly courseApi = inject(CourseApi);
  private readonly router = inject(Router);

  readonly courses = signal<CourseSummary[]>([]);
  readonly selectedCourseId = signal('');
  readonly error = signal('');

  readonly selectedCourse = computed(() =>
    this.courses().find(course => course.id === this.selectedCourseId()) ?? null
  );

  ngOnInit(): void {
    this.loadCourses();
  }

  private loadCourses(): void {
    this.courseApi.myCourses().subscribe({
      next: (response: any) => {
        const courseList = Array.isArray(response) ? response : (response?.data ?? []);
        this.courses.set(courseList);
      },
      error: () => {
        this.error.set('Không thể tải danh sách khóa học. Vui lòng thử lại.');
      }
    });
  }

  continueToScopedCreate(): void {
    if (!this.selectedCourseId()) {
      this.error.set('Vui lòng chọn khóa học trước khi tiếp tục.');
      return;
    }

    this.error.set('');
    this.router.navigate(['/teacher/assessments/classes/quizzes/create', this.selectedCourseId()]);
  }
}
