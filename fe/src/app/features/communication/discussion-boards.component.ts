import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DiscussionThread, DiscussionReply, DiscussionBoard } from '../../api/types/communication.types';

@Component({
  selector: 'app-discussion-boards',
  imports: [FormsModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './discussion-boards.component.html',
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
  }

  createThreadForBoard(boardId: string): void {
  }

  viewThread(threadId: string): void {
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
