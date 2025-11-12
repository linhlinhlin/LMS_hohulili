import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CourseApi } from '../../../api/client/course.api';
import { CreateCourseRequest, CourseSummary } from '../../../api/types/course.types';
import { IconComponent } from '../../../shared/components/ui/icon/icon.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';

/**
 * Course Creation - Coursera Style
 * 
 * Professional course creation form with:
 * - Clean form design with inline validation
 * - Helpful hints and guidance
 * - Template selection from existing courses
 * - User-centric UX
 */
@Component({
  selector: 'app-course-creation',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IconComponent,
    ButtonComponent
  ],
  templateUrl: './course-creation.component.html',
  styleUrl: './course-creation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseCreationComponent {
  private fb = inject(FormBuilder);
  private api = inject(CourseApi);
  private router = inject(Router);

  isSubmitting = signal(false);
  successMsg = signal<string>('');
  errorMsg = signal<string>('');

  // Existing courses (LMS-style section)
  loadingCourses = signal<boolean>(true);
  errorCourses = signal<string>('');
  courses = signal<CourseSummary[]>([]);
  filtered = signal<CourseSummary[]>([]);
  keyword = '';
  pageIndex = signal(1);
  pageSize = signal(10);
  paged = computed(() => {
    const start = (this.pageIndex() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  total = computed(() => this.filtered().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  goToPage(n: number) { this.pageIndex.set(Math.min(Math.max(1, n), this.totalPages())); }
  nextPage() { this.goToPage(this.pageIndex() + 1); }
  prevPage() { this.goToPage(this.pageIndex() - 1); }
  onPageSizeChange(v?: any) { if (v !== undefined) this.pageSize.set(Number(v)); this.goToPage(1); }
  applyFilters() {
    const kw = (this.keyword || '').trim().toLowerCase();
    this.filtered.set(
      this.courses().filter(c => !kw || c.code?.toLowerCase().includes(kw) || c.title?.toLowerCase().includes(kw))
    );
    this.pageIndex.set(1);
  }
  prefillingId = signal<string | null>(null);

  form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(64)]],
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['']
  });

  constructor() {
    // Load my courses for template use
    this.api.myCourses().subscribe({
      next: (res) => {
        const data = res?.data || [];
        this.courses.set(data);
        this.filtered.set(data);
        this.pageIndex.set(1);
      },
      error: (err) => this.errorCourses.set(err?.message || 'Không tải được danh sách khóa học'),
      complete: () => this.loadingCourses.set(false)
    });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    const payload = this.form.getRawValue() as CreateCourseRequest;

    try {
      const res = await this.api.createCourse(payload).toPromise();
      const course = res?.data;
      if (course?.id) {
        this.successMsg.set('Tạo khóa học thành công. Đang chuyển đến trang chỉnh sửa...');
        // Điều hướng đến trang chỉnh sửa
        await this.router.navigate([`/teacher/courses/${course.id}/edit`]);
      } else {
        this.errorMsg.set('Phản hồi không hợp lệ từ máy chủ');
      }
    } catch (e: any) {
      this.errorMsg.set(e?.error?.message || 'Tạo khóa học thất bại');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/teacher/courses']);
  }

  async prefillFrom(courseId: string) {
    try {
      this.prefillingId.set(courseId);
      const res = await this.api.getCourseById(courseId).toPromise();
      const c: any = res?.data;
      if (c) {
        const newCode = ((c.code || '') + '-copy').slice(0, 64);
        this.form.patchValue({
          code: newCode,
          title: c.title || '',
          description: c.description || ''
        });
      }
    } finally {
      this.prefillingId.set(null);
    }
  }
}