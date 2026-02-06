import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  courseId?: string;
  courseName?: string;
  category: 'general' | 'course' | 'assignment' | 'exam' | 'help';
  tags: string[];
  likes: number;
  replies: number;
  views: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastReplyAt?: Date;
  lastReplyBy?: string;
}

interface ForumReply {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  likes: number;
  isAccepted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  postCount: number;
  lastPostAt?: Date;
}

@Component({
  selector: 'app-student-forum',
  imports: [FormsModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './student-forum.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentForumComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);

  // Filter and search
  selectedCategory = signal<string>('all');
  selectedSort = signal<string>('newest');
  searchQuery = signal<string>('');
  showPinnedOnly = signal<boolean>(false);

  // Mock data
  categories = signal<ForumCategory[]>([
    {
      id: 'general',
      name: 'Thảo luận chung',
      description: 'Thảo luận về các chủ đề chung trong học tập',
      icon: 'đŸ’¬',
      color: '#3B82F6',
      postCount: 45,
      lastPostAt: new Date()
    },
    {
      id: 'course',
      name: 'Khóa học',
      description: 'Thảo luận về nội dung khóa học',
      icon: 'đŸ“',
      color: '#10B981',
      postCount: 32,
      lastPostAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: 'assignment',
      name: 'Bài tập',
      description: 'Hỗ trợ và thảo luận về bài tập',
      icon: 'đŸ“',
      color: '#F59E0B',
      postCount: 28,
      lastPostAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
    },
    {
      id: 'exam',
      name: 'Thi cử',
      description: 'Chia sẻ kinh nghiệm thi cử',
      icon: 'đŸ“‹',
      color: '#EF4444',
      postCount: 15,
      lastPostAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
    },
    {
      id: 'help',
      name: 'Hỗ trợ',
      description: 'Yêu cầu hỗ trợ và giúp đỡ',
      icon: 'đŸ†˜',
      color: '#8B5CF6',
      postCount: 12,
      lastPostAt: new Date(Date.now() - 8 * 60 * 60 * 1000)
    }
  ]);

  posts = signal<ForumPost[]>([
    {
      id: 'post-1',
      title: 'Cách học hiệu quả môn An toàn hàng hải',
      content: 'Chia sẻ kinh nghiệm học tập môn An toàn hàng hải. Tôi đã tìm ra một số phương pháp học hiệu quả...',
      authorId: 'user-1',
      authorName: 'Nguyễn Văn A',
      authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      courseId: 'course-1',
      courseName: 'An toàn hàng hải',
      category: 'course',
      tags: ['học tập', 'kinh nghiệm', 'an toàn'],
      likes: 15,
      replies: 8,
      views: 120,
      isPinned: true,
      isLocked: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      lastReplyAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      lastReplyBy: 'Trần Thị B'
    },
    {
      id: 'post-2',
      title: 'Câu hỏi về quy tắc COLREG',
      content: 'Tôi có một số thắc mắc về quy tắc COLREG, đặc biệt là về quyền ưu tiên của các tàu...',
      authorId: 'user-2',
      authorName: 'Lê Văn C',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      courseId: 'course-1',
      courseName: 'An toàn hàng hải',
      category: 'assignment',
      tags: ['colreg', 'quy tắc', 'hỏi đáp'],
      likes: 8,
      replies: 12,
      views: 85,
      isPinned: false,
      isLocked: false,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      lastReplyAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      lastReplyBy: 'Phạm Văn D'
    },
    {
      id: 'post-3',
      title: 'Chia sẻ tài liệu học tập',
      content: 'Tôi có một số tài liệu hay về điều hướng GPS, muốn chia sẻ với mọi người...',
      authorId: 'user-3',
      authorName: 'Hoàng Thị E',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
      category: 'general',
      tags: ['tài liệu', 'gps', 'điều hướng'],
      likes: 22,
      replies: 5,
      views: 150,
      isPinned: false,
      isLocked: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      lastReplyAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      lastReplyBy: 'Vũ Văn F'
    }
  ]);

  // Computed properties
  stats = computed(() => {
    const posts = this.posts();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      totalPosts: posts.length,
      todayPosts: posts.filter(p => {
        const postDate = new Date(p.createdAt);
        postDate.setHours(0, 0, 0, 0);
        return postDate.getTime() === today.getTime();
      }).length,
      totalReplies: posts.reduce((sum, post) => sum + post.replies, 0),
      activeMembers: new Set(posts.map(p => p.authorId)).size
    };
  });

  filteredPosts = computed(() => {
    let posts = this.posts();
    
    // Filter by category
    if (this.selectedCategory() !== 'all') {
      posts = posts.filter(p => p.category === this.selectedCategory());
    }
    
    // Filter by pinned
    if (this.showPinnedOnly()) {
      posts = posts.filter(p => p.isPinned);
    }
    
    // Search
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      posts = posts.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.content.toLowerCase().includes(query) ||
        p.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Sort
    switch (this.selectedSort()) {
      case 'newest':
        posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'oldest':
        posts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'most-liked':
        posts.sort((a, b) => b.likes - a.likes);
        break;
      case 'most-replies':
        posts.sort((a, b) => b.replies - a.replies);
        break;
      case 'most-views':
        posts.sort((a, b) => b.views - a.views);
        break;
    }
    
    return posts;
  });

  ngOnInit(): void {
    // Initialize component
  }

  createNewPost(): void {
    // For now, just show a message since we don't have create post interface yet
    alert('Tính năng tạo bài viết mới sẽ được phát triển trong phiên bản tiếp theo');
  }

  filterByCategory(categoryId: string): void {
    this.selectedCategory.set(categoryId);
  }

  filterPosts(): void {
    // Filtering is handled by computed property
  }

  sortPosts(): void {
    // Sorting is handled by computed property
  }

  searchPosts(): void {
    // Searching is handled by computed property
  }

  viewPost(postId: string): void {
    // For now, just show a message since we don't have post detail interface yet
    alert(`Xem bài viết: ${postId}`);
  }

  getCategoryClass(category: string): string {
    switch (category) {
      case 'general': return 'bg-blue-100 text-blue-800';
      case 'course': return 'bg-green-100 text-green-800';
      case 'assignment': return 'bg-yellow-100 text-yellow-800';
      case 'exam': return 'bg-red-100 text-red-800';
      case 'help': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getCategoryText(category: string): string {
    switch (category) {
      case 'general': return 'Thảo luận chung';
      case 'course': return 'Khóa học';
      case 'assignment': return 'Bài tập';
      case 'exam': return 'Thi cử';
      case 'help': return 'Hỗ trợ';
      default: return 'Không xác định';
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }
}

