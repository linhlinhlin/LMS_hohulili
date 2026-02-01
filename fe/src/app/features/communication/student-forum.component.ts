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
      name: 'Tháº£o luáº­n chung',
      description: 'Tháº£o luáº­n vá» cĂ¡c chá»§ Ä‘á» chung trong há»c táº­p',
      icon: 'đŸ’¬',
      color: '#3B82F6',
      postCount: 45,
      lastPostAt: new Date()
    },
    {
      id: 'course',
      name: 'KhĂ³a há»c',
      description: 'Tháº£o luáº­n vá» ná»™i dung khĂ³a há»c',
      icon: 'đŸ“',
      color: '#10B981',
      postCount: 32,
      lastPostAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: 'assignment',
      name: 'BĂ i táº­p',
      description: 'Há»— trá»£ vĂ  tháº£o luáº­n vá» bĂ i táº­p',
      icon: 'đŸ“',
      color: '#F59E0B',
      postCount: 28,
      lastPostAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
    },
    {
      id: 'exam',
      name: 'Thi cá»­',
      description: 'Chia sáº» kinh nghiá»‡m thi cá»­',
      icon: 'đŸ“‹',
      color: '#EF4444',
      postCount: 15,
      lastPostAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
    },
    {
      id: 'help',
      name: 'Há»— trá»£',
      description: 'YĂªu cáº§u há»— trá»£ vĂ  giĂºp Ä‘á»¡',
      icon: 'đŸ†˜',
      color: '#8B5CF6',
      postCount: 12,
      lastPostAt: new Date(Date.now() - 8 * 60 * 60 * 1000)
    }
  ]);

  posts = signal<ForumPost[]>([
    {
      id: 'post-1',
      title: 'CĂ¡ch há»c hiá»‡u quáº£ mĂ´n An toĂ n hĂ ng háº£i',
      content: 'Chia sáº» kinh nghiá»‡m há»c táº­p mĂ´n An toĂ n hĂ ng háº£i. TĂ´i Ä‘Ă£ tĂ¬m ra má»™t sá»‘ phÆ°Æ¡ng phĂ¡p há»c hiá»‡u quáº£...',
      authorId: 'user-1',
      authorName: 'Nguyá»…n VÄƒn A',
      authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      courseId: 'course-1',
      courseName: 'An toĂ n hĂ ng háº£i',
      category: 'course',
      tags: ['há»c táº­p', 'kinh nghiá»‡m', 'an toĂ n'],
      likes: 15,
      replies: 8,
      views: 120,
      isPinned: true,
      isLocked: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      lastReplyAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      lastReplyBy: 'Tráº§n Thá»‹ B'
    },
    {
      id: 'post-2',
      title: 'CĂ¢u há»i vá» quy táº¯c COLREG',
      content: 'TĂ´i cĂ³ má»™t sá»‘ tháº¯c máº¯c vá» quy táº¯c COLREG, Ä‘áº·c biá»‡t lĂ  vá» quyá»n Æ°u tiĂªn cá»§a cĂ¡c tĂ u...',
      authorId: 'user-2',
      authorName: 'LĂª VÄƒn C',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      courseId: 'course-1',
      courseName: 'An toĂ n hĂ ng háº£i',
      category: 'assignment',
      tags: ['colreg', 'quy táº¯c', 'há»i Ä‘Ă¡p'],
      likes: 8,
      replies: 12,
      views: 85,
      isPinned: false,
      isLocked: false,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      lastReplyAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      lastReplyBy: 'Pháº¡m VÄƒn D'
    },
    {
      id: 'post-3',
      title: 'Chia sáº» tĂ i liá»‡u há»c táº­p',
      content: 'TĂ´i cĂ³ má»™t sá»‘ tĂ i liá»‡u hay vá» Ä‘iá»u hÆ°á»›ng GPS, muá»‘n chia sáº» vá»›i má»i ngÆ°á»i...',
      authorId: 'user-3',
      authorName: 'HoĂ ng Thá»‹ E',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
      category: 'general',
      tags: ['tĂ i liá»‡u', 'gps', 'Ä‘iá»u hÆ°á»›ng'],
      likes: 22,
      replies: 5,
      views: 150,
      isPinned: false,
      isLocked: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      lastReplyAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      lastReplyBy: 'VÅ© VÄƒn F'
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
    console.log('đŸ”§ Student Forum - Component initialized');
    console.log('đŸ”§ Student Forum - Posts count:', this.posts().length);
    console.log('đŸ”§ Student Forum - Categories count:', this.categories().length);
  }

  createNewPost(): void {
    console.log('đŸ”§ Student Forum - Create new post');
    // For now, just show a message since we don't have create post interface yet
    alert('TĂ­nh nÄƒng táº¡o bĂ i viáº¿t má»›i sáº½ Ä‘Æ°á»£c phĂ¡t triá»ƒn trong phiĂªn báº£n tiáº¿p theo');
  }

  filterByCategory(categoryId: string): void {
    console.log('đŸ”§ Student Forum - Filter by category:', categoryId);
    this.selectedCategory.set(categoryId);
  }

  filterPosts(): void {
    // Filtering is handled by computed property
    console.log('đŸ”§ Student Forum - Filter posts');
  }

  sortPosts(): void {
    // Sorting is handled by computed property
    console.log('đŸ”§ Student Forum - Sort posts');
  }

  searchPosts(): void {
    // Searching is handled by computed property
    console.log('đŸ”§ Student Forum - Search posts');
  }

  viewPost(postId: string): void {
    console.log('đŸ”§ Student Forum - View post:', postId);
    // For now, just show a message since we don't have post detail interface yet
    alert(`Xem bĂ i viáº¿t: ${postId}`);
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
      case 'general': return 'Tháº£o luáº­n chung';
      case 'course': return 'KhĂ³a há»c';
      case 'assignment': return 'BĂ i táº­p';
      case 'exam': return 'Thi cá»­';
      case 'help': return 'Há»— trá»£';
      default: return 'KhĂ´ng xĂ¡c Ä‘á»‹nh';
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }
}

