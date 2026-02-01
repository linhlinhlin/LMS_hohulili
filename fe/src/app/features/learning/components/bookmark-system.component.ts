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
  templateUrl: './bookmark-system.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookmarkSystemComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);

  // Mock bookmarks data
  bookmarks = signal<Bookmark[]>([
    {
      id: 'bookmark-1',
      title: 'Cáº¥u trĂºc tĂ u container - Video bĂ i giáº£ng',
      description: 'Video giáº£i thĂ­ch chi tiáº¿t vá» cáº¥u trĂºc tĂ u container vĂ  cĂ¡c thĂ nh pháº§n chĂ­nh',
      url: '/learn/course/course-1/lesson/lesson-1',
      courseId: 'course-1',
      courseName: 'Ká»¹ thuáº­t TĂ u biá»ƒn CÆ¡ báº£n',
      lessonId: 'lesson-1',
      lessonTitle: 'Cáº¥u trĂºc tĂ u biá»ƒn',
      timestamp: 1250, // 20:50
      type: 'video',
      tags: ['cáº¥u trĂºc', 'container', 'video'],
      isPublic: false,
      createdAt: new Date('2024-09-10'),
      updatedAt: new Date('2024-09-15'),
      thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=200&fit=crop'
    },
    {
      id: 'bookmark-2',
      title: 'Quy Ä‘á»‹nh STCW - TĂ i liá»‡u PDF',
      description: 'TĂ i liá»‡u chi tiáº¿t vá» cĂ¡c quy Ä‘á»‹nh STCW vĂ  yĂªu cáº§u Ä‘Ă o táº¡o thuyá»n viĂªn',
      url: '/documents/stcw-regulations.pdf',
      courseId: 'course-2',
      courseName: 'An toĂ n HĂ ng háº£i',
      lessonId: 'lesson-2',
      lessonTitle: 'Quy Ä‘á»‹nh quá»‘c táº¿',
      type: 'document',
      tags: ['STCW', 'quy Ä‘á»‹nh', 'PDF'],
      isPublic: true,
      createdAt: new Date('2024-09-08'),
      updatedAt: new Date('2024-09-12')
    },
    {
      id: 'bookmark-3',
      title: 'Quiz An toĂ n HĂ ng háº£i',
      description: 'BĂ i kiá»ƒm tra kiáº¿n thá»©c vá» an toĂ n hĂ ng háº£i vá»›i 20 cĂ¢u há»i',
      url: '/learn/quiz/quiz-1',
      courseId: 'course-2',
      courseName: 'An toĂ n HĂ ng háº£i',
      lessonId: 'lesson-3',
      lessonTitle: 'Kiá»ƒm tra kiáº¿n thá»©c',
      type: 'quiz',
      tags: ['quiz', 'kiá»ƒm tra', 'an toĂ n'],
      isPublic: false,
      createdAt: new Date('2024-09-05'),
      updatedAt: new Date('2024-09-10')
    },
    {
      id: 'bookmark-4',
      title: 'IMO Guidelines - External Link',
      description: 'HÆ°á»›ng dáº«n cá»§a Tá»• chá»©c HĂ ng háº£i Quá»‘c táº¿ vá» an toĂ n hĂ ng háº£i',
      url: 'https://www.imo.org/en/OurWork/Safety/Pages/Default.aspx',
      courseId: 'course-2',
      courseName: 'An toĂ n HĂ ng háº£i',
      type: 'external',
      tags: ['IMO', 'hÆ°á»›ng dáº«n', 'quá»‘c táº¿'],
      isPublic: true,
      createdAt: new Date('2024-09-03'),
      updatedAt: new Date('2024-09-08')
    }
  ]);

  folders = signal<BookmarkFolder[]>([
    {
      id: 'folder-1',
      name: 'An toĂ n hĂ ng háº£i',
      description: 'CĂ¡c dáº¥u trang liĂªn quan Ä‘áº¿n an toĂ n hĂ ng háº£i',
      bookmarks: ['bookmark-2', 'bookmark-3', 'bookmark-4'],
      color: '#3B82F6',
      createdAt: new Date('2024-09-01')
    },
    {
      id: 'folder-2',
      name: 'Ká»¹ thuáº­t tĂ u',
      description: 'CĂ¡c dáº¥u trang vá» ká»¹ thuáº­t tĂ u biá»ƒn',
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
      'lesson': 'BĂ i há»c',
      'video': 'Video',
      'document': 'TĂ i liá»‡u',
      'quiz': 'Quiz',
      'external': 'LiĂªn káº¿t'
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
    if (confirm('Báº¡n cĂ³ cháº¯c cháº¯n muá»‘n xĂ³a dáº¥u trang nĂ y?')) {
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

