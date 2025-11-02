import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface Bookmark {
  id: string;
  title: string;
  description: string;
  url: string;
  courseId: string;
  courseName: string;
  lessonId?: string;
  lessonTitle?: string;
  timestamp?: number; // for video bookmarks
  type: 'lesson' | 'video' | 'document' | 'quiz' | 'external';
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  thumbnail?: string;
}

interface BookmarkFolder {
  id: string;
  name: string;
  description: string;
  bookmarks: string[]; // bookmark IDs
  color: string;
  createdAt: Date;
}

interface BookmarkFilter {
  type: string[];
  course: string[];
  tags: string[];
  search: string;
  sortBy: 'title' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-bookmark-system',
  imports: [CommonModule, FormsModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Dấu trang</h1>
              <p class="text-gray-600 mt-1">Quản lý và tổ chức dấu trang học tập</p>
            </div>
            <div class="flex items-center space-x-4">
              <button (click)="createNewFolder()"
                      class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
                </svg>
                Tạo thư mục
              </button>
              <button (click)="addBookmark()"
                      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                </svg>
                Thêm dấu trang
              </button>
            </div>
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
                     placeholder="Tìm kiếm dấu trang..."
                     class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            <!-- Folders -->
            <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Thư mục</h3>
              <div class="space-y-2">
                <button (click)="selectFolder('all')"
                        [class]="selectedFolder() === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'"
                        class="w-full text-left px-3 py-2 rounded-md transition-colors">
                  <div class="flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
                    </svg>
                    <span>Tất cả ({{ bookmarks().length }})</span>
                  </div>
                </button>
                @for (folder of folders(); track folder.id) {
                  <button (click)="selectFolder(folder.id)"
                          [class]="selectedFolder() === folder.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'"
                          class="w-full text-left px-3 py-2 rounded-md transition-colors">
                    <div class="flex items-center space-x-2">
                      <div class="w-3 h-3 rounded-full" [style.background-color]="folder.color"></div>
                      <span>{{ folder.name }} ({{ folder.bookmarks.length }})</span>
                    </div>
                  </button>
                }
              </div>
            </div>

            <!-- Type Filter -->
            <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Loại</h3>
              <div class="space-y-2">
                @for (type of availableTypes(); track type) {
                  <label class="flex items-center">
                    <input type="checkbox" 
                           [value]="type"
                           [checked]="filters.type.includes(type)"
                           (change)="toggleTypeFilter(type)"
                           class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">{{ getTypeLabel(type) }}</span>
                  </label>
                }
              </div>
            </div>

            <!-- Course Filter -->
            <div class="bg-white rounded-lg shadow-sm p-4">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Khóa học</h3>
              <div class="space-y-2">
                @for (course of availableCourses(); track course.id) {
                  <label class="flex items-center">
                    <input type="checkbox" 
                           [value]="course.id"
                           [checked]="filters.course.includes(course.id)"
                           (change)="toggleCourseFilter(course.id)"
                           class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">{{ course.name }}</span>
                  </label>
                }
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div class="lg:col-span-3">
            <!-- Stats -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div class="bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">Tổng dấu trang</p>
                    <p class="text-3xl font-bold text-gray-900">{{ bookmarks().length }}</p>
                  </div>
                  <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">Video</p>
                    <p class="text-3xl font-bold text-gray-900">{{ getBookmarksByType('video').length }}</p>
                  </div>
                  <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">Tài liệu</p>
                    <p class="text-3xl font-bold text-gray-900">{{ getBookmarksByType('document').length }}</p>
                  </div>
                  <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">Thư mục</p>
                    <p class="text-3xl font-bold text-gray-900">{{ folders().length }}</p>
                  </div>
                  <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bookmarks Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              @for (bookmark of filteredBookmarks(); track bookmark.id) {
                <div class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                  <!-- Thumbnail -->
                  @if (bookmark.thumbnail) {
                    <div class="mb-4">
                      <img [src]="bookmark.thumbnail" [alt]="bookmark.title" 
                           class="w-full h-32 object-cover rounded-lg">
                    </div>
                  }

                  <!-- Content -->
                  <div class="mb-4">
                    <div class="flex items-start justify-between mb-2">
                      <h3 class="text-lg font-semibold text-gray-900 line-clamp-2">{{ bookmark.title }}</h3>
                      <div class="flex items-center space-x-1 ml-2">
                        <button (click)="editBookmark(bookmark.id)"
                                class="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                          </svg>
                        </button>
                        <button (click)="deleteBookmark(bookmark.id)"
                                class="p-1 text-gray-400 hover:text-red-600 transition-colors">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <p class="text-sm text-gray-600 mb-2">{{ bookmark.courseName }}</p>
                    @if (bookmark.lessonTitle) {
                      <p class="text-xs text-gray-500 mb-3">{{ bookmark.lessonTitle }}</p>
                    }
                    
                    <p class="text-gray-700 text-sm line-clamp-2 mb-3">{{ bookmark.description }}</p>
                  </div>

                  <!-- Type Badge -->
                  <div class="mb-3">
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {{ getTypeLabel(bookmark.type) }}
                    </span>
                    @if (bookmark.timestamp) {
                      <span class="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        {{ formatTime(bookmark.timestamp) }}
                      </span>
                    }
                  </div>

                  <!-- Tags -->
                  @if (bookmark.tags.length > 0) {
                    <div class="flex flex-wrap gap-1 mb-4">
                      @for (tag of bookmark.tags.slice(0, 3); track tag) {
                        <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {{ tag }}
                        </span>
                      }
                      @if (bookmark.tags.length > 3) {
                        <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          +{{ bookmark.tags.length - 3 }}
                        </span>
                      }
                    </div>
                  }

                  <!-- Actions -->
                  <div class="flex items-center justify-between">
                    <button (click)="openBookmark(bookmark)"
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                      <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                      </svg>
                      Mở
                    </button>
                    <span class="text-xs text-gray-500">{{ formatDate(bookmark.createdAt) }}</span>
                  </div>
                </div>
              }
            </div>

            <!-- Empty State -->
            @if (filteredBookmarks().length === 0) {
              <div class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">Không có dấu trang nào</h3>
                <p class="mt-1 text-sm text-gray-500">Bạn chưa tạo dấu trang nào hoặc không có dấu trang phù hợp với bộ lọc.</p>
                <div class="mt-6">
                  <button (click)="addBookmark()"
                          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Thêm dấu trang đầu tiên
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
export class BookmarkSystemComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);

  // Mock bookmarks data
  bookmarks = signal<Bookmark[]>([
    {
      id: 'bookmark-1',
      title: 'Cấu trúc tàu container - Video bài giảng',
      description: 'Video giải thích chi tiết về cấu trúc tàu container và các thành phần chính',
      url: '/learn/course/course-1/lesson/lesson-1',
      courseId: 'course-1',
      courseName: 'Kỹ thuật Tàu biển Cơ bản',
      lessonId: 'lesson-1',
      lessonTitle: 'Cấu trúc tàu biển',
      timestamp: 1250, // 20:50
      type: 'video',
      tags: ['cấu trúc', 'container', 'video'],
      isPublic: false,
      createdAt: new Date('2024-09-10'),
      updatedAt: new Date('2024-09-15'),
      thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=200&fit=crop'
    },
    {
      id: 'bookmark-2',
      title: 'Quy định STCW - Tài liệu PDF',
      description: 'Tài liệu chi tiết về các quy định STCW và yêu cầu đào tạo thuyền viên',
      url: '/documents/stcw-regulations.pdf',
      courseId: 'course-2',
      courseName: 'An toàn Hàng hải',
      lessonId: 'lesson-2',
      lessonTitle: 'Quy định quốc tế',
      type: 'document',
      tags: ['STCW', 'quy định', 'PDF'],
      isPublic: true,
      createdAt: new Date('2024-09-08'),
      updatedAt: new Date('2024-09-12')
    },
    {
      id: 'bookmark-3',
      title: 'Quiz An toàn Hàng hải',
      description: 'Bài kiểm tra kiến thức về an toàn hàng hải với 20 câu hỏi',
      url: '/learn/quiz/quiz-1',
      courseId: 'course-2',
      courseName: 'An toàn Hàng hải',
      lessonId: 'lesson-3',
      lessonTitle: 'Kiểm tra kiến thức',
      type: 'quiz',
      tags: ['quiz', 'kiểm tra', 'an toàn'],
      isPublic: false,
      createdAt: new Date('2024-09-05'),
      updatedAt: new Date('2024-09-10')
    },
    {
      id: 'bookmark-4',
      title: 'IMO Guidelines - External Link',
      description: 'Hướng dẫn của Tổ chức Hàng hải Quốc tế về an toàn hàng hải',
      url: 'https://www.imo.org/en/OurWork/Safety/Pages/Default.aspx',
      courseId: 'course-2',
      courseName: 'An toàn Hàng hải',
      type: 'external',
      tags: ['IMO', 'hướng dẫn', 'quốc tế'],
      isPublic: true,
      createdAt: new Date('2024-09-03'),
      updatedAt: new Date('2024-09-08')
    }
  ]);

  folders = signal<BookmarkFolder[]>([
    {
      id: 'folder-1',
      name: 'An toàn hàng hải',
      description: 'Các dấu trang liên quan đến an toàn hàng hải',
      bookmarks: ['bookmark-2', 'bookmark-3', 'bookmark-4'],
      color: '#3B82F6',
      createdAt: new Date('2024-09-01')
    },
    {
      id: 'folder-2',
      name: 'Kỹ thuật tàu',
      description: 'Các dấu trang về kỹ thuật tàu biển',
      bookmarks: ['bookmark-1'],
      color: '#10B981',
      createdAt: new Date('2024-09-02')
    }
  ]);

  filters: BookmarkFilter = {
    type: [],
    course: [],
    tags: [],
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  };

  selectedFolder = signal<string>('all');

  // Computed values
  availableCourses = computed(() => {
    const courses = this.bookmarks().map(bookmark => ({
      id: bookmark.courseId,
      name: bookmark.courseName
    }));
    return courses.filter((course, index, self) => 
      index === self.findIndex(c => c.id === course.id)
    );
  });

  availableTypes = computed(() => {
    const types = this.bookmarks().map(bookmark => bookmark.type);
    return [...new Set(types)].sort();
  });

  filteredBookmarks = computed(() => {
    let bookmarks = [...this.bookmarks()];

    // Apply folder filter
    if (this.selectedFolder() !== 'all') {
      const folder = this.folders().find(f => f.id === this.selectedFolder());
      if (folder) {
        bookmarks = bookmarks.filter(bookmark => folder.bookmarks.includes(bookmark.id));
      }
    }

    // Apply search filter
    if (this.filters.search) {
      const searchTerm = this.filters.search.toLowerCase();
      bookmarks = bookmarks.filter(bookmark => 
        bookmark.title.toLowerCase().includes(searchTerm) ||
        bookmark.description.toLowerCase().includes(searchTerm) ||
        bookmark.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply type filter
    if (this.filters.type.length > 0) {
      bookmarks = bookmarks.filter(bookmark => this.filters.type.includes(bookmark.type));
    }

    // Apply course filter
    if (this.filters.course.length > 0) {
      bookmarks = bookmarks.filter(bookmark => this.filters.course.includes(bookmark.courseId));
    }

    // Apply sorting
    bookmarks.sort((a, b) => {
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

    return bookmarks;
  });

  ngOnInit(): void {
    // Load bookmarks
    this.loadBookmarks();
  }

  private loadBookmarks(): void {
    // In real implementation, load from API
    console.log('Loading bookmarks...');
  }

  applyFilters(): void {
    // Filters are applied automatically through computed signal
    console.log('Applying filters...');
  }

  selectFolder(folderId: string): void {
    this.selectedFolder.set(folderId);
  }

  toggleTypeFilter(type: string): void {
    const index = this.filters.type.indexOf(type);
    if (index > -1) {
      this.filters.type.splice(index, 1);
    } else {
      this.filters.type.push(type);
    }
    this.applyFilters();
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

  getBookmarksByType(type: string): Bookmark[] {
    return this.bookmarks().filter(bookmark => bookmark.type === type);
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'lesson': 'Bài học',
      'video': 'Video',
      'document': 'Tài liệu',
      'quiz': 'Quiz',
      'external': 'Liên kết'
    };
    return labels[type] || type;
  }

  createNewFolder(): void {
    // Navigate to folder creation
    console.log('Creating new folder...');
  }

  addBookmark(): void {
    // Navigate to bookmark creation
    console.log('Adding new bookmark...');
  }

  editBookmark(bookmarkId: string): void {
    // Navigate to bookmark editor
    console.log('Editing bookmark:', bookmarkId);
  }

  deleteBookmark(bookmarkId: string): void {
    if (confirm('Bạn có chắc chắn muốn xóa dấu trang này?')) {
      this.bookmarks.update(bookmarks => bookmarks.filter(bookmark => bookmark.id !== bookmarkId));
    }
  }

  openBookmark(bookmark: Bookmark): void {
    if (bookmark.type === 'external') {
      window.open(bookmark.url, '_blank');
    } else {
      this.router.navigateByUrl(bookmark.url);
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }
}