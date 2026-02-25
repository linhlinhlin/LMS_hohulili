import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { NoteApi, NoteResponse } from '../../../api/endpoints/note.api';

interface Note {
  id: string;
  title: string;
  content: string;
  courseId: string;
  courseName: string;
  lessonId?: string;
  lessonTitle?: string;
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  wordCount: number;
  characterCount: number;
}

interface NoteFilter {
  course: string[];
  tags: string[];
  search: string;
  sortBy: 'title' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-note-taking',
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Ghi chú học tập</h1>
              <p class="text-gray-600 mt-1">Quản lý và tổ chức ghi chú của bạn</p>
            </div>
            <button (click)="createNewNote()"
                    class="px-6 py-3 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors font-medium">
              <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
              </svg>
              Tạo ghi chú mới
            </button>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <!-- Sidebar -->
          <div class="lg:col-span-1">
            <!-- Search -->
            <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Tìm kiếm</h3>
              <input type="text" 
                     [(ngModel)]="filters.search"
                     (ngModelChange)="applyFilters()"
                     placeholder="Tìm kiếm ghi chú..."
                     class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0056D2]">
            </div>

            <!-- Course Filter -->
            <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Khóa học</h3>
              <div class="space-y-2">
                @for (course of availableCourses(); track course.id) {
                  <label class="flex items-center">
                    <input type="checkbox" 
                           [value]="course.id"
                           [checked]="filters.course.includes(course.id)"
                           (change)="toggleCourseFilter(course.id)"
                           class="w-4 h-4 text-[#0056D2] border-gray-300 rounded focus:ring-[#0056D2]">
                    <span class="ml-2 text-sm text-gray-700">{{ course.name }}</span>
                  </label>
                }
              </div>
            </div>

            <!-- Tags Filter -->
            <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Thẻ</h3>
              <div class="space-y-2">
                @for (tag of availableTags(); track tag) {
                  <label class="flex items-center">
                    <input type="checkbox" 
                           [value]="tag"
                           [checked]="filters.tags.includes(tag)"
                           (change)="toggleTagFilter(tag)"
                           class="w-4 h-4 text-[#0056D2] border-gray-300 rounded focus:ring-[#0056D2]">
                    <span class="ml-2 text-sm text-gray-700">{{ tag }}</span>
                  </label>
                }
              </div>
            </div>

            <!-- Sort Options -->
            <div class="bg-white rounded-lg shadow-sm p-4">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Sắp xếp</h3>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input type="radio" 
                         name="sortBy"
                         value="updatedAt"
                         [checked]="filters.sortBy === 'updatedAt'"
                         (change)="updateSortBy('updatedAt')"
                         class="w-4 h-4 text-[#0056D2] border-gray-300 focus:ring-[#0056D2]">
                  <span class="ml-2 text-sm text-gray-700">Cập nhật gần nhất</span>
                </label>
                <label class="flex items-center">
                  <input type="radio" 
                         name="sortBy"
                         value="createdAt"
                         [checked]="filters.sortBy === 'createdAt'"
                         (change)="updateSortBy('createdAt')"
                         class="w-4 h-4 text-[#0056D2] border-gray-300 focus:ring-[#0056D2]">
                  <span class="ml-2 text-sm text-gray-700">Tạo gần nhất</span>
                </label>
                <label class="flex items-center">
                  <input type="radio" 
                         name="sortBy"
                         value="title"
                         [checked]="filters.sortBy === 'title'"
                         (change)="updateSortBy('title')"
                         class="w-4 h-4 text-[#0056D2] border-gray-300 focus:ring-[#0056D2]">
                  <span class="ml-2 text-sm text-gray-700">Tên A-Z</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div class="lg:col-span-3">
            <!-- Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div class="bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">Tổng ghi chú</p>
                    <p class="text-3xl font-bold text-gray-900">{{ notes().length }}</p>
                  </div>
                  <div class="w-12 h-12 bg-[#0056D2]/10 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-[#0056D2]" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">Từ đã viết</p>
                    <p class="text-3xl font-bold text-gray-900">{{ totalWords() }}</p>
                  </div>
                  <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">Khóa học</p>
                    <p class="text-3xl font-bold text-gray-900">{{ availableCourses().length }}</p>
                  </div>
                  <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                      <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              @for (note of filteredNotes(); track note.id) {
                <div class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                      <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ note.title }}</h3>
                      <p class="text-sm text-gray-600 mb-2">{{ note.courseName }}</p>
                      @if (note.lessonTitle) {
                        <p class="text-xs text-gray-500 mb-3">{{ note.lessonTitle }}</p>
                      }
                    </div>
                    <div class="flex items-center space-x-2">
                      <button (click)="editNote(note.id)"
                              class="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                        </svg>
                      </button>
                      <button (click)="deleteNote(note.id)"
                              class="p-2 text-gray-400 hover:text-red-600 transition-colors">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div class="mb-4">
                    <p class="text-gray-700 text-sm line-clamp-3">{{ note.content }}</p>
                  </div>

                  <!-- Tags -->
                  @if (note.tags.length > 0) {
                    <div class="flex flex-wrap gap-2 mb-4">
                      @for (tag of note.tags; track tag) {
                        <span class="px-2 py-1 bg-[#0056D2]/10 text-[#004BB5] text-xs rounded-full">
                          {{ tag }}
                        </span>
                      }
                    </div>
                  }

                  <!-- Footer -->
                  <div class="flex items-center justify-between text-xs text-gray-500">
                    <div class="flex items-center space-x-4">
                      <span>{{ note.wordCount }} từ</span>
                      <span>{{ formatDate(note.updatedAt) }}</span>
                    </div>
                    @if (note.isPublic) {
                      <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                        Công khai
                      </span>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Empty State -->
            @if (filteredNotes().length === 0) {
              <div class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">Không có ghi chú nào</h3>
                <p class="mt-1 text-sm text-gray-500">Bạn chưa tạo ghi chú nào hoặc không có ghi chú phù hợp với bộ lọc.</p>
                <div class="mt-6">
                  <button (click)="createNewNote()"
                          class="px-6 py-3 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors font-medium">
                    Tạo ghi chú đầu tiên
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoteTakingComponent implements OnInit {
  protected authService = inject(AuthService);
  private confirmDialog = inject(ConfirmDialogService);
  private noteApi = inject(NoteApi);

  notes = signal<Note[]>([]);

  filters: NoteFilter = {
    course: [],
    tags: [],
    search: '',
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  };

  // Computed values
  availableCourses = computed(() => {
    const courses = this.notes().map(note => ({
      id: note.courseId,
      name: note.courseName
    }));
    return courses.filter((course, index, self) => 
      index === self.findIndex(c => c.id === course.id)
    );
  });

  availableTags = computed(() => {
    const allTags = this.notes().flatMap(note => note.tags);
    return [...new Set(allTags)].sort();
  });

  totalWords = computed(() => 
    this.notes().reduce((sum, note) => sum + note.wordCount, 0)
  );

  filteredNotes = computed(() => {
    let notes = [...this.notes()];

    // Apply search filter
    if (this.filters.search) {
      const searchTerm = this.filters.search.toLowerCase();
      notes = notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm) ||
        note.content.toLowerCase().includes(searchTerm) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply course filter
    if (this.filters.course.length > 0) {
      notes = notes.filter(note => this.filters.course.includes(note.courseId));
    }

    // Apply tags filter
    if (this.filters.tags.length > 0) {
      notes = notes.filter(note => 
        this.filters.tags.some(tag => note.tags.includes(tag))
      );
    }

    // Apply sorting
    notes.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (this.filters.sortBy) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'updatedAt':
        default:
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return this.filters.sortOrder === 'desc' 
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return this.filters.sortOrder === 'desc' 
          ? bValue.getTime() - aValue.getTime()
          : aValue.getTime() - bValue.getTime();
      }
      
      return 0;
    });

    return notes;
  });

  ngOnInit(): void {
    // Load notes
    this.loadNotes();
  }

  private loadNotes(): void {
    this.noteApi.listNotes().subscribe({
      next: (response: any) => {
        const data = response?.data || response || [];
        const notes: Note[] = (Array.isArray(data) ? data : []).map((n: NoteResponse) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          courseId: n.courseId,
          courseName: '',
          lessonId: n.lessonId || undefined,
          lessonTitle: undefined,
          tags: n.tags || [],
          isPublic: n.isPublic || false,
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
          wordCount: (n.content || '').split(/\s+/).filter(Boolean).length,
          characterCount: (n.content || '').length
        }));
        this.notes.set(notes);
      },
      error: () => this.notes.set([])
    });
  }

  applyFilters(): void {
    // Filters are applied automatically through computed signal
  }

  toggleCourseFilter(courseId: string): void {
    const index = this.filters.course.indexOf(courseId);
    if (index > -1) {
      this.filters.course.splice(index, 1);
    } else {
      this.filters.course.push(courseId);
    }
    this.applyFilters();
  }

  toggleTagFilter(tag: string): void {
    const index = this.filters.tags.indexOf(tag);
    if (index > -1) {
      this.filters.tags.splice(index, 1);
    } else {
      this.filters.tags.push(tag);
    }
    this.applyFilters();
  }

  updateSortBy(sortBy: 'title' | 'createdAt' | 'updatedAt'): void {
    this.filters.sortBy = sortBy;
    this.applyFilters();
  }

  createNewNote(): void {
    this.noteApi.createNote({
      courseId: '00000000-0000-0000-0000-000000000000',
      title: 'Ghi chú mới',
      content: '',
      tags: []
    }).subscribe({
      next: () => this.loadNotes(),
      error: () => {}
    });
  }

  editNote(noteId: string): void {
    const note = this.notes().find(n => n.id === noteId);
    if (!note) return;
    this.noteApi.updateNote(noteId, {
      title: note.title,
      content: note.content,
      tags: note.tags
    }).subscribe({
      next: () => this.loadNotes(),
      error: () => {}
    });
  }

  async deleteNote(noteId: string): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa ghi chú',
      message: 'Bạn có chắc chắn muốn xóa ghi chú này?',
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (confirmed) {
      this.noteApi.deleteNote(noteId).subscribe({
        next: () => this.notes.update(notes => notes.filter(note => note.id !== noteId)),
        error: () => {}
      });
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }
}
