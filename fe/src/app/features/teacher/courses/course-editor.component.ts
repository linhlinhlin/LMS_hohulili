import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CourseApi } from '../../../api/client/course.api';
import { CourseDetail, CreateSectionRequest } from '../../../api/types/course.types';
import { SectionApi } from '../../../api/client/section.api';
import { IconComponent } from '../../../shared/components/ui/icon/icon.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { CourseStudentsListComponent } from './components/course-students-list.component';

/**
 * Course Editor - Coursera Style
 * 
 * Professional course editor with:
 * - Course info editing
 * - Section/chapter management
 * - Student assignment (single & bulk)
 * - Enrolled students list
 * - Accordion sections for better organization
 */
@Component({
  selector: 'app-course-editor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    IconComponent,
    ButtonComponent,
    CourseStudentsListComponent
  ],
  templateUrl: './course-editor.component.html',
  styleUrl: './course-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseEditorComponent {
  private route = inject(ActivatedRoute);
  private api = inject(CourseApi);
  private fb = inject(FormBuilder);
  private sectionApi = inject(SectionApi);

  course = signal<CourseDetail | null>(null);
  saving = signal(false);
  publishing = signal(false);
  success = signal('');
  error = signal('');

  // Accordion state - Only Course Info is open by default
  accordionState = {
    courseInfo: true,
    courseContent: false,
    studentAssignment: false,
    enrolledStudents: false
  };

  // Content state
  sections = signal<any[]>([]);
  sectionTitles: Record<string, string> = {};
  newSectionTitle = '';
  sectionError = '';
  // Inline lesson editing removed

  // Assign student state
  assigning = signal(false);
  assignSuccess = signal('');
  assignError = signal('');
  assign: { email?: string } = {};

  // Bulk enrollment state
  bulkEnrolling = signal(false);
  bulkSuccess = signal('');
  bulkError = signal('');
  selectedFile = signal<File | null>(null);
  bulkResult = signal<any>(null);

  form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(64)]],
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['']
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getCourseById(id).subscribe({
      next: (res) => {
        const c = res?.data as CourseDetail;
        this.course.set(c);
        if (c) {
          this.form.patchValue({ code: c.code, title: c.title, description: c.description });
          // Load sections using flat endpoint
          this.sectionApi.listSectionsFlat(id).subscribe({
            next: (sres) => {
              const data = sres?.data || [];
              this.sections.set(data);
              data.forEach((sec: any) => {
                this.sectionTitles[sec.id] = sec.title;
              });
            },
            error: (err) => {
              this.error.set(err?.message || 'Không tải được danh sách chương');
            }
          });
        }
      },
      error: (err) => {
        const msg = err?.message || err?.original?.error?.message || 'Không tải được khóa học';
        this.error.set(msg);
      }
    });
  }

  onSave() {
    if (this.form.invalid || !this.course()) return;
    this.saving.set(true);
    this.success.set('');
    this.error.set('');
    const id = this.course()!.id;
    const raw = this.form.getRawValue();
    const payload = {
      code: raw.code || undefined,
      title: raw.title || undefined,
      description: raw.description || undefined
    };
    this.api.updateCourse(id, payload).subscribe({
      next: () => {
        this.success.set('Đã lưu thay đổi');
      },
      error: (err) => {
        this.error.set(err?.message || 'Lưu thất bại');
      },
      complete: () => this.saving.set(false)
    });
  }

  onPublish() {
    if (!this.course()) return;
    this.publishing.set(true);
    this.success.set('');
    this.error.set('');
    const id = this.course()!.id;
    this.api.publishCourse(id).subscribe({
      next: () => {
        this.success.set('Đã xuất bản khóa học');
      },
      error: (err) => {
        this.error.set(err?.message || 'Xuất bản thất bại');
      },
      complete: () => this.publishing.set(false)
    });
  }

  // --- Content actions ---
  createSection() {
    this.sectionError = '';
    const c = this.course();
    if (!c) return;
    const title = (this.newSectionTitle || '').trim();
    if (!title) { this.sectionError = 'Nhập tiêu đề section'; return; }
    const payload: CreateSectionRequest = { title };
    this.sectionApi.createSection(c.id, payload).subscribe({
      next: (res) => {
        const sec = res?.data as any;
        if (sec) {
          this.sections.update(list => [...list, sec]);
          this.sectionTitles[sec.id] = sec.title;
          this.newSectionTitle = '';
        }
      },
      error: (err) => this.sectionError = err?.message || 'Tạo section thất bại'
    });
  }

  deleteSection(sectionId: string) {
    this.sectionApi.deleteSection(sectionId).subscribe({
      next: () => {
        this.sections.update(list => list.filter(s => s.id !== sectionId));
        delete this.sectionTitles[sectionId];
      }
    });
  }

  renameSection(sectionId: string) {
    const title = (this.sectionTitles[sectionId] || '').trim();
    if (!title) { this.sectionError = 'Tiêu đề section không được để trống'; return; }
    const payload = { title } as any;
    this.sectionApi.updateSection(sectionId, payload).subscribe({
      next: (res) => {
        const updated = res as any; // ApiClient put currently returns ApiResponse<SectionDetail> type, but usage here is simple
        this.sections.update(list => list.map(s => s.id === sectionId ? { ...s, title } : s));
      },
      error: (err) => this.sectionError = err?.message || 'Đổi tên section thất bại'
    });
  }

  // Inline lessons are managed on a dedicated page; no lesson handlers here

  assignStudent() {
    const c = this.course();
    if (!c) return;
    this.assignError.set('');
    this.assignSuccess.set('');
    this.assigning.set(true);
    
    if (!this.assign.email?.trim()) {
      this.assignError.set('Vui lòng nhập email sinh viên');
      this.assigning.set(false);
      return;
    }
    
    const payload = { email: this.assign.email.trim() };
    this.api.enrollStudentAsTeacher(c.id, payload).subscribe({
      next: () => {
        this.assignSuccess.set('Đã gán học viên vào khóa học');
        this.assign = {}; // Clear form
        this.assigning.set(false);
      },
      error: (err) => {
        this.assignError.set(err?.message || 'Gán học viên thất bại');
        this.assigning.set(false);
      }
    });
  }

  onExcelFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        this.bulkError.set('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.bulkError.set('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB');
        return;
      }
      
      this.selectedFile.set(file);
      this.bulkError.set('');
      this.bulkResult.set(null);
    }
  }

  clearExcelFile() {
    this.selectedFile.set(null);
    this.bulkResult.set(null);
    this.bulkError.set('');
    this.bulkSuccess.set('');
  }

  bulkEnrollStudents() {
    const c = this.course();
    const file = this.selectedFile();
    if (!c || !file) return;

    this.bulkError.set('');
    this.bulkSuccess.set('');
    this.bulkResult.set(null);
    this.bulkEnrolling.set(true);

    this.api.bulkEnrollStudents(c.id, file).subscribe({
      next: (res) => {
        this.bulkResult.set(res?.data);
        this.bulkSuccess.set(res?.message || 'Hoàn thành xử lý file Excel');
        this.bulkEnrolling.set(false);
      },
      error: (err) => {
        this.bulkError.set(err?.message || 'Lỗi xử lý file Excel');
        this.bulkEnrolling.set(false);
      }
    });
  }

  toggleAccordion(section: keyof typeof this.accordionState) {
    this.accordionState[section] = !this.accordionState[section];
  }
}