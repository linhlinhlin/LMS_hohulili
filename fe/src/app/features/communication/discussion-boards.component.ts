import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface DiscussionThread {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  courseId: string;
  courseName: string;
  lessonId?: string;
  lessonName?: string;
  category: 'question' | 'discussion' | 'announcement' | 'resource';
  tags: string[];
  isPinned: boolean;
  isLocked: boolean;
  isResolved: boolean;
  views: number;
  replies: DiscussionReply[];
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
}

interface DiscussionReply {
  id: string;
  threadId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: 'student' | 'teacher' | 'admin';
  isAccepted: boolean;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DiscussionBoard {
  id: string;
  name: string;
  description: string;
  courseId: string;
  courseName: string;
  icon: string;
  color: string;
  threadCount: number;
  replyCount: number;
  lastActivityAt?: Date;
  isActive: boolean;
}

@Component({
  selector: 'app-discussion-boards',
  imports: [CommonModule, FormsModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">💭 Discussion Boards</h1>
            <p class="text-gray-600">Thảo luận theo khóa học và bài học</p>
          </div>
          <div class="flex items-center space-x-4">
            <button (click)="createNewThread()"
                    class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
              </svg>
              Tạo chủ đề mới
            </button>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-2xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Tổng bảng thảo luận</p>
                <p class="text-2xl font-bold text-gray-900">{{ stats().totalBoards }}</p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Tổng chủ đề</p>
                <p class="text-2xl font-bold text-gray-900">{{ stats().totalThreads }}</p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Tổng phản hồi</p>
                <p class="text-2xl font-bold text-gray-900">{{ stats().totalReplies }}</p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Chủ đề chưa giải quyết</p>
                <p class="text-2xl font-bold text-gray-900">{{ stats().unresolvedThreads }}</p>
              </div>
              <div class="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Course Filter -->
        <div class="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Lọc theo khóa học</h3>
            <select [(ngModel)]="selectedCourse" (ngModelChange)="filterByCourse()"
                    class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="all">Tất cả khóa học</option>
              @for (board of boards(); track board.id) {
                <option [value]="board.courseId">{{ board.courseName }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Discussion Boards -->
        <div class="space-y-6">
          @for (board of filteredBoards(); track board.id) {
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
              <!-- Board Header -->
              <div class="p-6 border-b border-gray-200">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center"
                         [style.background-color]="board.color + '20'">
                      <span class="text-2xl" [style.color]="board.color">{{ board.icon }}</span>
                    </div>
                    <div>
                      <h3 class="text-xl font-bold text-gray-900">{{ board.name }}</h3>
                      <p class="text-gray-600">{{ board.description }}</p>
                      <p class="text-sm text-gray-500 mt-1">{{ board.courseName }}</p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-6 text-sm text-gray-500">
                    <div class="text-center">
                      <p class="font-semibold text-gray-900">{{ board.threadCount }}</p>
                      <p>Chủ đề</p>
                    </div>
                    <div class="text-center">
                      <p class="font-semibold text-gray-900">{{ board.replyCount }}</p>
                      <p>Phản hồi</p>
                    </div>
                    @if (board.lastActivityAt) {
                      <div class="text-center">
                        <p class="font-semibold text-gray-900">{{ formatDate(board.lastActivityAt) }}</p>
                        <p>Hoạt động cuối</p>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <!-- Recent Threads -->
              <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <h4 class="text-lg font-semibold text-gray-900">Chủ đề gần đây</h4>
                  <button (click)="viewAllThreads(board.id)"
                          class="text-blue-600 hover:text-blue-800 font-medium">
                    Xem tất cả →
                  </button>
                </div>

                @if (getBoardThreads(board.id).length === 0) {
                  <div class="text-center py-8">
                    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <p class="text-gray-600 mb-4">Chưa có chủ đề nào trong bảng này</p>
                    <button (click)="createThreadForBoard(board.id)"
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Tạo chủ đề đầu tiên
                    </button>
                  </div>
                } @else {
                  <div class="space-y-4">
                    @for (thread of getBoardThreads(board.id).slice(0, 3); track thread.id) {
                      <div class="flex items-center space-x-4 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow cursor-pointer"
                           (click)="viewThread(thread.id)">
                        <div class="flex-1">
                          <div class="flex items-center space-x-2 mb-2">
                            @if (thread.isPinned) {
                              <span class="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                                📌 Ghim
                              </span>
                            }
                            @if (thread.isLocked) {
                              <span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                                🔒 Khóa
                              </span>
                            }
                            @if (thread.isResolved) {
                              <span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                ✅ Đã giải quyết
                              </span>
                            }
                            <span class="px-2 py-1 rounded-full text-xs font-medium"
                                  [class]="getCategoryClass(thread.category)">
                              {{ getCategoryText(thread.category) }}
                            </span>
                            @if (thread.lessonName) {
                              <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                {{ thread.lessonName }}
                              </span>
                            }
                          </div>
                          
                          <h5 class="font-medium text-gray-900 mb-1">{{ thread.title }}</h5>
                          <p class="text-sm text-gray-600 line-clamp-2">{{ thread.content }}</p>
                          
                          <!-- Tags -->
                          @if (thread.tags.length > 0) {
                            <div class="flex flex-wrap gap-1 mt-2">
                              @for (tag of thread.tags.slice(0, 3); track tag) {
                                <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                  #{{ tag }}
                                </span>
                              }
                              @if (thread.tags.length > 3) {
                                <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                  +{{ thread.tags.length - 3 }}
                                </span>
                              }
                            </div>
                          }
                        </div>
                        
                        <div class="text-right text-sm text-gray-500">
                          <div class="flex items-center space-x-1 mb-1">
                            <img [src]="thread.authorAvatar" [alt]="thread.authorName"
                                 class="w-6 h-6 rounded-full object-cover">
                            <span>{{ thread.authorName }}</span>
                          </div>
                          <p>{{ formatDate(thread.createdAt) }}</p>
                          <div class="flex items-center space-x-3 mt-2">
                            <div class="flex items-center space-x-1">
                              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.994a2 2 0 001.106 1.79l.05.025A4 4 0 0010 18.658a4 4 0 002.844-1.846l.05-.025A2 2 0 0014 16.327v-5.994a2 2 0 00-.106-.79l-.05-.025A4 4 0 0010 8.342a4 4 0 00-2.844 1.846l-.05.025A2 2 0 006 10.333z"></path>
                              </svg>
                              <span>{{ thread.replies.length }}</span>
                            </div>
                            <div class="flex items-center space-x-1">
                              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                                <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
                              </svg>
                              <span>{{ thread.views }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiscussionBoardsComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);

  selectedCourse = signal<string>('all');

  // Mock data
  boards = signal<DiscussionBoard[]>([
    {
      id: 'board-1',
      name: 'An toàn hàng hải',
      description: 'Thảo luận về các vấn đề an toàn trong hàng hải',
      courseId: 'course-1',
      courseName: 'An toàn hàng hải',
      icon: '🛡️',
      color: '#3B82F6',
      threadCount: 15,
      replyCount: 45,
      lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isActive: true
    },
    {
      id: 'board-2',
      name: 'Điều hướng hiện đại',
      description: 'Thảo luận về kỹ thuật điều hướng và sử dụng GPS',
      courseId: 'course-2',
      courseName: 'Điều hướng hiện đại',
      icon: '🧭',
      color: '#10B981',
      threadCount: 12,
      replyCount: 38,
      lastActivityAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      isActive: true
    },
    {
      id: 'board-3',
      name: 'Luật hàng hải',
      description: 'Thảo luận về luật pháp và quy định hàng hải',
      courseId: 'course-3',
      courseName: 'Luật hàng hải',
      icon: '⚖️',
      color: '#F59E0B',
      threadCount: 8,
      replyCount: 22,
      lastActivityAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      isActive: true
    }
  ]);

  threads = signal<DiscussionThread[]>([
    {
      id: 'thread-1',
      title: 'Cách xử lý tình huống khẩn cấp trên tàu',
      content: 'Tôi muốn thảo luận về các tình huống khẩn cấp có thể xảy ra trên tàu và cách xử lý...',
      authorId: 'user-1',
      authorName: 'Nguyễn Văn A',
      authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      courseId: 'course-1',
      courseName: 'An toàn hàng hải',
      lessonId: 'lesson-1',
      lessonName: 'Xử lý tình huống khẩn cấp',
      category: 'question',
      tags: ['khẩn cấp', 'an toàn', 'xử lý tình huống'],
      isPinned: true,
      isLocked: false,
      isResolved: false,
      views: 120,
      replies: [
        {
          id: 'reply-1',
          threadId: 'thread-1',
          content: 'Theo kinh nghiệm của tôi, điều quan trọng nhất là giữ bình tĩnh...',
          authorId: 'user-2',
          authorName: 'Trần Thị B',
          authorAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
          authorRole: 'teacher',
          isAccepted: true,
          likes: 8,
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
        }
      ],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      lastActivityAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
    },
    {
      id: 'thread-2',
      title: 'Thảo luận về quy tắc COLREG',
      content: 'Chúng ta hãy thảo luận về các quy tắc COLREG và cách áp dụng trong thực tế...',
      authorId: 'user-3',
      authorName: 'Lê Văn C',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      courseId: 'course-1',
      courseName: 'An toàn hàng hải',
      category: 'discussion',
      tags: ['colreg', 'quy tắc', 'thảo luận'],
      isPinned: false,
      isLocked: false,
      isResolved: true,
      views: 85,
      replies: [
        {
          id: 'reply-2',
          threadId: 'thread-2',
          content: 'Quy tắc COLREG rất quan trọng trong việc tránh va chạm...',
          authorId: 'user-4',
          authorName: 'Phạm Văn D',
          authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
          authorRole: 'student',
          isAccepted: false,
          likes: 5,
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
        }
      ],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      lastActivityAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
    }
  ]);

  // Computed properties
  stats = computed(() => {
    const boards = this.boards();
    const threads = this.threads();
    
    return {
      totalBoards: boards.length,
      totalThreads: threads.length,
      totalReplies: threads.reduce((sum, thread) => sum + thread.replies.length, 0),
      unresolvedThreads: threads.filter(t => !t.isResolved).length
    };
  });

  filteredBoards = computed(() => {
    const boards = this.boards();
    const selectedCourse = this.selectedCourse();
    
    if (selectedCourse === 'all') return boards;
    return boards.filter(board => board.courseId === selectedCourse);
  });

  ngOnInit(): void {
    // Initialize component
  }

  createNewThread(): void {
    console.log('Create new thread');
  }

  filterByCourse(): void {
    // Filtering is handled by computed property
  }

  getBoardThreads(boardId: string): DiscussionThread[] {
    const board = this.boards().find(b => b.id === boardId);
    if (!board) return [];
    
    return this.threads().filter(thread => thread.courseId === board.courseId)
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
  }

  viewAllThreads(boardId: string): void {
    console.log('View all threads for board:', boardId);
  }

  createThreadForBoard(boardId: string): void {
    console.log('Create thread for board:', boardId);
  }

  viewThread(threadId: string): void {
    console.log('View thread:', threadId);
  }

  getCategoryClass(category: string): string {
    switch (category) {
      case 'question': return 'bg-blue-100 text-blue-800';
      case 'discussion': return 'bg-green-100 text-green-800';
      case 'announcement': return 'bg-yellow-100 text-yellow-800';
      case 'resource': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getCategoryText(category: string): string {
    switch (category) {
      case 'question': return 'Câu hỏi';
      case 'discussion': return 'Thảo luận';
      case 'announcement': return 'Thông báo';
      case 'resource': return 'Tài nguyên';
      default: return 'Không xác định';
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }
}