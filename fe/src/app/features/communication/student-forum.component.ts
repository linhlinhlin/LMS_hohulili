import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, FormsModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <div class="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">💬 Student Forum</h1>
            <p class="text-gray-600">Thảo luận, chia sẻ kinh nghiệm và hỗ trợ học tập</p>
          </div>
          <div class="flex items-center space-x-4">
            <button (click)="createNewPost()"
                    class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
              </svg>
              Tạo bài viết mới
            </button>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-2xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Tổng bài viết</p>
                <p class="text-2xl font-bold text-gray-900">{{ stats().totalPosts }}</p>
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
                <p class="text-sm font-medium text-gray-600">Bài viết hôm nay</p>
                <p class="text-2xl font-bold text-gray-900">{{ stats().todayPosts }}</p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
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
                <p class="text-sm font-medium text-gray-600">Thành viên tích cực</p>
                <p class="text-2xl font-bold text-gray-900">{{ stats().activeMembers }}</p>
              </div>
              <div class="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Categories -->
        <div class="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 class="text-xl font-bold text-gray-900 mb-6">📂 Danh mục thảo luận</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (category of categories(); track category.id) {
              <div class="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow cursor-pointer"
                   (click)="filterByCategory(category.id)">
                <div class="flex items-center space-x-3 mb-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                       [style.background-color]="category.color + '20'">
                    <span class="text-lg" [style.color]="category.color">{{ category.icon }}</span>
                  </div>
                  <div>
                    <h4 class="font-semibold text-gray-900">{{ category.name }}</h4>
                    <p class="text-sm text-gray-600">{{ category.postCount }} bài viết</p>
                  </div>
                </div>
                <p class="text-sm text-gray-600 mb-3">{{ category.description }}</p>
                @if (category.lastPostAt) {
                  <p class="text-xs text-gray-500">Bài viết mới nhất: {{ formatDate(category.lastPostAt) }}</p>
                }
              </div>
            }
          </div>
        </div>

        <!-- Filters and Search -->
        <div class="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div class="flex items-center space-x-4">
              <select [(ngModel)]="selectedCategory" (ngModelChange)="filterPosts()"
                      class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="all">Tất cả danh mục</option>
                @for (category of categories(); track category.id) {
                  <option [value]="category.id">{{ category.name }}</option>
                }
              </select>
              
              <select [(ngModel)]="selectedSort" (ngModelChange)="sortPosts()"
                      class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="most-liked">Nhiều lượt thích</option>
                <option value="most-replies">Nhiều phản hồi</option>
                <option value="most-views">Nhiều lượt xem</option>
              </select>
            </div>
            
            <div class="flex items-center space-x-4">
              <div class="relative">
                <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="searchPosts()"
                       placeholder="Tìm kiếm bài viết..."
                       class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64">
                <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
                </svg>
              </div>
              
              <label class="flex items-center space-x-2">
                <input type="checkbox" [(ngModel)]="showPinnedOnly" (ngModelChange)="filterPosts()"
                       class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span class="text-sm text-gray-700">Chỉ bài viết ghim</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Posts List -->
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
          @if (filteredPosts().length === 0) {
            <div class="text-center py-12">
              <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Không tìm thấy bài viết</h3>
              <p class="text-gray-600 mb-6">Thử thay đổi bộ lọc hoặc tạo bài viết đầu tiên</p>
              <button (click)="createNewPost()"
                      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Tạo bài viết đầu tiên
              </button>
            </div>
          } @else {
            <div class="divide-y divide-gray-200">
              @for (post of filteredPosts(); track post.id) {
                <div class="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                     (click)="viewPost(post.id)">
                  <div class="flex items-start space-x-4">
                    <!-- Author Avatar -->
                    <img [src]="post.authorAvatar" [alt]="post.authorName"
                         class="w-12 h-12 rounded-full object-cover">
                    
                    <!-- Post Content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center space-x-2 mb-2">
                        @if (post.isPinned) {
                          <span class="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                            📌 Ghim
                          </span>
                        }
                        @if (post.isLocked) {
                          <span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                            🔒 Khóa
                          </span>
                        }
                        <span class="px-2 py-1 rounded-full text-xs font-medium"
                              [class]="getCategoryClass(post.category)">
                          {{ getCategoryText(post.category) }}
                        </span>
                        @if (post.courseName) {
                          <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            {{ post.courseName }}
                          </span>
                        }
                      </div>
                      
                      <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ post.title }}</h3>
                      <p class="text-gray-600 mb-3 line-clamp-2">{{ post.content }}</p>
                      
                      <!-- Tags -->
                      @if (post.tags.length > 0) {
                        <div class="flex flex-wrap gap-2 mb-3">
                          @for (tag of post.tags.slice(0, 3); track tag) {
                            <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              #{{ tag }}
                            </span>
                          }
                          @if (post.tags.length > 3) {
                            <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              +{{ post.tags.length - 3 }}
                            </span>
                          }
                        </div>
                      }
                      
                      <!-- Post Meta -->
                      <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{{ post.authorName }}</span>
                          <span>{{ formatDate(post.createdAt) }}</span>
                          @if (post.lastReplyAt) {
                            <span>Cập nhật: {{ formatDate(post.lastReplyAt) }}</span>
                          }
                        </div>
                        
                        <div class="flex items-center space-x-4 text-sm text-gray-500">
                          <div class="flex items-center space-x-1">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.994a2 2 0 001.106 1.79l.05.025A4 4 0 0010 18.658a4 4 0 002.844-1.846l.05-.025A2 2 0 0014 16.327v-5.994a2 2 0 00-.106-.79l-.05-.025A4 4 0 0010 8.342a4 4 0 00-2.844 1.846l-.05.025A2 2 0 006 10.333z"></path>
                            </svg>
                            <span>{{ post.likes }}</span>
                          </div>
                          <div class="flex items-center space-x-1">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"></path>
                            </svg>
                            <span>{{ post.replies }}</span>
                          </div>
                          <div class="flex items-center space-x-1">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                              <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
                            </svg>
                            <span>{{ post.views }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
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
      icon: '💬',
      color: '#3B82F6',
      postCount: 45,
      lastPostAt: new Date()
    },
    {
      id: 'course',
      name: 'Khóa học',
      description: 'Thảo luận về nội dung khóa học',
      icon: '📚',
      color: '#10B981',
      postCount: 32,
      lastPostAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: 'assignment',
      name: 'Bài tập',
      description: 'Hỗ trợ và thảo luận về bài tập',
      icon: '📝',
      color: '#F59E0B',
      postCount: 28,
      lastPostAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
    },
    {
      id: 'exam',
      name: 'Thi cử',
      description: 'Chia sẻ kinh nghiệm thi cử',
      icon: '📋',
      color: '#EF4444',
      postCount: 15,
      lastPostAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
    },
    {
      id: 'help',
      name: 'Hỗ trợ',
      description: 'Yêu cầu hỗ trợ và giúp đỡ',
      icon: '🆘',
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
    console.log('🔧 Student Forum - Component initialized');
    console.log('🔧 Student Forum - Posts count:', this.posts().length);
    console.log('🔧 Student Forum - Categories count:', this.categories().length);
  }

  createNewPost(): void {
    console.log('🔧 Student Forum - Create new post');
    // For now, just show a message since we don't have create post interface yet
    alert('Tính năng tạo bài viết mới sẽ được phát triển trong phiên bản tiếp theo');
  }

  filterByCategory(categoryId: string): void {
    console.log('🔧 Student Forum - Filter by category:', categoryId);
    this.selectedCategory.set(categoryId);
  }

  filterPosts(): void {
    // Filtering is handled by computed property
    console.log('🔧 Student Forum - Filter posts');
  }

  sortPosts(): void {
    // Sorting is handled by computed property
    console.log('🔧 Student Forum - Sort posts');
  }

  searchPosts(): void {
    // Searching is handled by computed property
    console.log('🔧 Student Forum - Search posts');
  }

  viewPost(postId: string): void {
    console.log('🔧 Student Forum - View post:', postId);
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