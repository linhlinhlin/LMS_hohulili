import { Component, inject, signal, input, output, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../../../../api/client/api-client';
import { SideDrawerComponent } from '../../../../../../shared/components/side-drawer/side-drawer.component';
import { ToastService } from '../../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../../core/services/confirm-dialog.service';

interface ClassTeacher {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  role: 'PRIMARY' | 'CO_TEACHER';
  createdAt: string;
}

interface TeacherSearchResult {
  id: string;
  fullName: string;
  email: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-class-teachers-drawer',
  imports: [FormsModule, SideDrawerComponent],
  template: `
    <app-side-drawer
        [isOpen]="isOpen()"
        [title]="'Đồng giảng viên'"
        [subtitle]="'Gán giảng viên phụ trách lớp học'"
        [width]="'480px'"
        (onClose)="close()">

      <div class="space-y-5 p-1">

        <!-- Add Teacher Section -->
        <div class="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
          <label class="block text-xs font-semibold text-slate-500">Thêm giảng viên</label>
          <div class="relative">
            <input type="text" [(ngModel)]="searchQuery"
              (input)="onSearchInput()"
              class="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0056D2]/10 focus:border-[#0056D2] outline-none transition-all"
              placeholder="Tìm theo tên hoặc email...">
            <svg class="absolute left-2.5 top-2.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>

          <!-- Search Results -->
          @if (searchResults().length > 0) {
          <div class="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto"
               role="listbox" aria-label="Kết quả tìm kiếm giảng viên">
            @for (teacher of searchResults(); track teacher.id) {
            <button type="button" (click)="addTeacher(teacher)" role="option"
              class="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors"
              [attr.aria-label]="'Thêm ' + teacher.fullName">
              <div class="w-8 h-8 rounded-lg bg-[#0056D2]/10 flex items-center justify-center text-[#0056D2] text-xs font-bold shrink-0">
                {{ getInitials(teacher.fullName) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-slate-800 truncate">{{ teacher.fullName }}</p>
                <p class="text-[11px] text-slate-400 truncate">{{ teacher.email }}</p>
              </div>
              <svg class="w-4 h-4 text-[#0056D2] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
            </button>
            }
          </div>
          }

          @if (isSearching()) {
          <p class="text-xs text-slate-400 text-center py-2">Đang tìm...</p>
          }
        </div>

        <!-- Current Teachers List -->
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-2">
            Giảng viên hiện tại ({{ teachers().length }})
          </label>

          @if (isLoadingTeachers()) {
          <div class="py-8 flex justify-center" role="status" aria-label="Đang tải danh sách giảng viên">
            <div class="w-6 h-6 border-2 border-slate-200 border-t-[#0056D2] rounded-full animate-spin"></div>
          </div>
          } @else if (teachers().length === 0) {
          <div class="py-8 text-center text-sm text-slate-400">
            Chưa có giảng viên nào
          </div>
          } @else {
          <div class="space-y-2">
            @for (teacher of teachers(); track teacher.id) {
            <div class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl group hover:border-slate-300 transition-colors">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                [class.bg-[#0056D2]]="teacher.role === 'PRIMARY'"
                [class.bg-purple-500]="teacher.role === 'CO_TEACHER'">
                {{ getInitials(teacher.teacherName) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-slate-800 truncate">{{ teacher.teacherName }}</span>
                  @if (teacher.role === 'PRIMARY') {
                  <span class="px-1.5 py-0.5 text-[9px] font-bold text-[#0056D2] bg-[#0056D2]/10 border border-[#0056D2]/20 rounded">Chính</span>
                  } @else {
                  <span class="px-1.5 py-0.5 text-[9px] font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded">Phụ</span>
                  }
                </div>
                <p class="text-[11px] text-slate-400 truncate">{{ teacher.teacherEmail }}</p>
              </div>
              @if (teacher.role !== 'PRIMARY') {
              <button type="button" (click)="removeTeacher(teacher)"
                class="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                [attr.aria-label]="'Xóa ' + teacher.teacherName + ' khỏi lớp'"
                title="Xóa khỏi lớp">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
              }
            </div>
            }
          </div>
          }
        </div>
      </div>
    </app-side-drawer>
  `
})
export class ClassTeachersDrawerComponent {
  private api = inject(ApiClient);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  readonly isOpen = input(false);
  readonly classId = input('');
  readonly isOpenChange = output<boolean>();
  readonly onSaved = output<void>();

  readonly teachers = signal<ClassTeacher[]>([]);
  readonly isLoadingTeachers = signal(false);
  readonly searchResults = signal<TeacherSearchResult[]>([]);
  readonly isSearching = signal(false);
  searchQuery = '';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private loadedClassId = '';

  constructor() {
    effect(() => {
      const id = this.classId();
      const open = this.isOpen();
      if (open && id && id !== this.loadedClassId) {
        this.loadedClassId = id;
        this.loadTeachers();
      }
      if (!open) {
        this.loadedClassId = '';
        this.searchResults.set([]);
        this.searchQuery = '';
      }
    });
  }

  close(): void {
    this.isOpenChange.emit(false);
  }

  loadTeachers(): void {
    const classId = this.classId();
    if (!classId) return;

    this.isLoadingTeachers.set(true);
    this.api.get<any>(`/api/v3/classes/${classId}/teachers`).subscribe({
      next: (res: any) => {
        this.teachers.set(res?.data || []);
        this.isLoadingTeachers.set(false);
      },
      error: () => {
        this.isLoadingTeachers.set(false);
      }
    });
  }

  onSearchInput(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);

    const query = this.searchQuery.trim();
    if (query.length < 2) {
      this.searchResults.set([]);
      return;
    }

    this.searchTimeout = setTimeout(() => {
      this.isSearching.set(true);
      this.api.get<any>(`/api/v3/users/search?q=${encodeURIComponent(query)}&role=TEACHER&size=10`).subscribe({
        next: (res: any) => {
          const existingIds = new Set(this.teachers().map(t => t.teacherId));
          const items = res?.data?.content || res?.data || [];
          const filtered = items
            .filter((t: any) => !existingIds.has(t.id))
            .slice(0, 5)
            .map((t: any) => ({ id: t.id, fullName: t.fullName, email: t.email }));
          this.searchResults.set(filtered);
          this.isSearching.set(false);
        },
        error: () => {
          this.isSearching.set(false);
        }
      });
    }, 350);
  }

  addTeacher(teacher: TeacherSearchResult): void {
    const classId = this.classId();
    if (!classId) return;

    this.api.post<any>(`/api/v3/classes/${classId}/teachers`, { teacherId: teacher.id }).subscribe({
      next: (res: any) => {
        this.toast.success(res?.data?.message || 'Đã thêm giảng viên');
        this.searchResults.set([]);
        this.searchQuery = '';
        this.loadTeachers();
        this.onSaved.emit();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Không thể thêm giảng viên');
      }
    });
  }

  async removeTeacher(teacher: ClassTeacher): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa giảng viên',
      message: `Bạn có chắc muốn xóa "${teacher.teacherName}" khỏi lớp học?`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    this.api.delete<any>(`/api/v3/classes/${this.classId()}/teachers/${teacher.teacherId}`).subscribe({
      next: () => {
        this.toast.success('Đã xóa giảng viên khỏi lớp');
        this.loadTeachers();
        this.onSaved.emit();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Không thể xóa giảng viên');
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
