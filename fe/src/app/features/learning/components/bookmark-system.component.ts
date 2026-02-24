import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { BookmarkApi, BookmarkResponse } from '../../../api/client/bookmark.api';

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
  imports: [FormsModule, RouterModule],
  templateUrl: './bookmark-system.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookmarkSystemComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private confirmDialog = inject(ConfirmDialogService);
  private toast = inject(ToastService);
  private bookmarkApi = inject(BookmarkApi);

  // Bookmarks — loaded from real API
  bookmarks = signal<Bookmark[]>([]);
  isLoading = signal(false);

  folders = signal<BookmarkFolder[]>([]);

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
    this.loadBookmarks();
  }

  private loadBookmarks(): void {
    this.isLoading.set(true);
    this.bookmarkApi.getBookmarks().subscribe({
      next: (response) => {
        const items = (response.data || []).map(item => this.mapToBookmark(item));
        this.bookmarks.set(items);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  private mapToBookmark(item: BookmarkResponse): Bookmark {
    const metadata = item.metadata || {};
    return {
      id: item.id,
      title: item.title,
      description: metadata['description'] || '',
      url: item.url,
      courseId: item.courseId,
      courseName: metadata['courseName'] || 'Khóa học',
      lessonId: item.lessonId,
      lessonTitle: metadata['lessonTitle'],
      timestamp: metadata['timestamp'],
      type: metadata['type'] || 'lesson',
      tags: metadata['tags'] || [],
      isPublic: metadata['isPublic'] || false,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      thumbnail: metadata['thumbnail']
    };
  }

  applyFilters(): void {
    // Filters are applied automatically through computed signal
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
    this.toast.info('Tính năng tạo thư mục sẽ được phát triển trong phiên bản tiếp theo');
  }

  addBookmark(): void {
    this.toast.info('Sử dụng nút "Đánh dấu" trên trang bài học để thêm dấu trang mới');
  }

  editBookmark(bookmarkId: string): void {
    // Inline edit through API
    const bookmark = this.bookmarks().find(b => b.id === bookmarkId);
    if (!bookmark) return;

    // For now, navigate to the bookmarked content
    this.router.navigateByUrl(bookmark.url);
  }

  async deleteBookmark(bookmarkId: string): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa dấu trang',
      message: 'Bạn có chắc chắn muốn xóa dấu trang này?',
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (confirmed) {
      this.bookmarkApi.deleteBookmark(bookmarkId).subscribe({
        next: () => {
          this.bookmarks.update(bookmarks => bookmarks.filter(b => b.id !== bookmarkId));
          this.toast.success('Đã xóa dấu trang');
        },
        error: () => {
          this.toast.error('Không thể xóa dấu trang');
        }
      });
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
