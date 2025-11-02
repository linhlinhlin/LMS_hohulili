import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

interface PostCreation {
  title: string;
  content: string;
  category: 'general' | 'course' | 'assignment' | 'exam' | 'help';
  courseId?: string;
  tags: string[];
  attachments: PostAttachment[];
  isAnonymous: boolean;
  allowComments: boolean;
  isPinned: boolean;
}

interface PostAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document' | 'video' | 'other';
  size: number;
}

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface Course {
  id: string;
  title: string;
  instructor: string;
}

@Component({
  selector: 'app-post-creation',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <div class="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      <!-- Header -->
      <div class="bg-white shadow-xl border-b border-gray-200">
        <div class="max-w-4xl mx-auto px-6 py-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button (click)="goBack()"
                      class="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                </svg>
                <span>Quay lại</span>
              </button>
              <div>
                <h1 class="text-3xl font-bold text-gray-900">Tạo bài viết mới</h1>
                <p class="text-gray-600">Chia sẻ ý kiến và thảo luận với cộng đồng</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-6 py-8">
        <form (ngSubmit)="submitPost()" #postForm="ngForm">
          <div class="space-y-8">
            <!-- Post Content -->
            <div class="bg-white rounded-2xl shadow-lg p-8">
              <h2 class="text-xl font-bold text-gray-900 mb-6">📝 Nội dung bài viết</h2>
              
              <div class="space-y-6">
                <!-- Title -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Tiêu đề bài viết *</label>
                  <input type="text" 
                         [(ngModel)]="post().title"
                         name="title"
                         placeholder="Nhập tiêu đề bài viết..."
                         class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         required>
                </div>

                <!-- Content -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nội dung bài viết *</label>
                  <textarea 
                    [(ngModel)]="post().content"
                    name="content"
                    rows="12"
                    placeholder="Nhập nội dung bài viết của bạn..."
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    required></textarea>
                  <div class="mt-2 flex justify-between text-sm text-gray-600">
                    <span>Từ: {{ getWordCount(post().content) }}</span>
                    <span>Tối thiểu: 10 từ</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Post Settings -->
            <div class="bg-white rounded-2xl shadow-lg p-8">
              <h2 class="text-xl font-bold text-gray-900 mb-6">⚙️ Cài đặt bài viết</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Category -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Danh mục *</label>
                  <select [(ngModel)]="post().category" 
                          name="category"
                          class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required>
                    <option value="">Chọn danh mục</option>
                    @for (category of categories(); track category.id) {
                      <option [value]="category.id">{{ category.name }}</option>
                    }
                  </select>
                </div>

                <!-- Course Selection -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Khóa học liên quan</label>
                  <select [(ngModel)]="post().courseId" 
                          name="courseId"
                          class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Chọn khóa học (tùy chọn)</option>
                    @for (course of courses(); track course.id) {
                      <option [value]="course.id">{{ course.title }}</option>
                    }
                  </select>
                </div>

                <!-- Tags -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Thẻ (Tags)</label>
                  <input type="text" 
                         [(ngModel)]="tagInput"
                         (keydown.enter)="addTag($event)"
                         placeholder="Nhập thẻ và nhấn Enter..."
                         class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <div class="mt-2 flex flex-wrap gap-2">
                    @for (tag of post().tags; track tag) {
                      <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center space-x-2">
                        <span>{{ tag }}</span>
                        <button type="button" 
                                (click)="removeTag(tag)"
                                class="text-blue-600 hover:text-blue-800">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                          </svg>
                        </button>
                      </span>
                    }
                  </div>
                </div>

                <!-- Privacy Settings -->
                <div class="space-y-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Cài đặt riêng tư</label>
                  
                  <label class="flex items-center space-x-3">
                    <input type="checkbox" 
                           [(ngModel)]="post().isAnonymous"
                           name="isAnonymous"
                           class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="text-sm text-gray-700">Đăng bài ẩn danh</span>
                  </label>
                  
                  <label class="flex items-center space-x-3">
                    <input type="checkbox" 
                           [(ngModel)]="post().allowComments"
                           name="allowComments"
                           class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="text-sm text-gray-700">Cho phép bình luận</span>
                  </label>
                  
                  <label class="flex items-center space-x-3">
                    <input type="checkbox" 
                           [(ngModel)]="post().isPinned"
                           name="isPinned"
                           class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="text-sm text-gray-700">Ghim bài viết (chỉ admin)</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- File Attachments -->
            <div class="bg-white rounded-2xl shadow-lg p-8">
              <h2 class="text-xl font-bold text-gray-900 mb-6">📎 Tệp đính kèm</h2>
              
              <div class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                <input type="file" 
                       multiple
                       (change)="onFileSelected($event)"
                       class="hidden"
                       #fileInput>
                <button type="button" 
                        (click)="fileInput.click()"
                        class="flex flex-col items-center space-y-4 text-gray-600 hover:text-blue-600 transition-colors">
                  <svg class="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                  </svg>
                  <div>
                    <p class="font-medium text-lg">Chọn tệp hoặc kéo thả vào đây</p>
                    <p class="text-sm">JPG, PNG, PDF, DOC, DOCX (tối đa 10MB mỗi tệp)</p>
                  </div>
                </button>
              </div>
              
              <!-- Uploaded Files -->
              @if (post().attachments.length > 0) {
                <div class="mt-6 space-y-3">
                  @for (attachment of post().attachments; track attachment.id) {
                    <div class="flex items-center space-x-3 p-4 bg-green-50 rounded-xl">
                      <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                        </svg>
                      </div>
                      <div class="flex-1">
                        <p class="font-medium text-gray-900">{{ attachment.name }}</p>
                        <p class="text-sm text-gray-600">{{ formatFileSize(attachment.size) }}</p>
                      </div>
                      <button type="button" 
                              (click)="removeAttachment(attachment.id)"
                              class="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Preview -->
            @if (post().title && post().content) {
              <div class="bg-white rounded-2xl shadow-lg p-8">
                <h2 class="text-xl font-bold text-gray-900 mb-6">👁️ Xem trước bài viết</h2>
                
                <div class="border border-gray-200 rounded-xl p-6">
                  <div class="flex items-center space-x-3 mb-4">
                    <img [src]="authService.currentUser()?.avatar || 'https://via.placeholder.com/150'" 
                         [alt]="authService.userName()"
                         class="w-10 h-10 rounded-full object-cover">
                    <div>
                      <p class="font-medium text-gray-900">
                        {{ post().isAnonymous ? 'Người dùng ẩn danh' : authService.userName() }}
                      </p>
                      <p class="text-sm text-gray-600">{{ getCurrentDate() }}</p>
                    </div>
                  </div>
                  
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">{{ post().title }}</h3>
                  <div class="prose max-w-none text-gray-700 mb-4">
                    <p>{{ post().content }}</p>
                  </div>
                  
                  @if (post().tags.length > 0) {
                    <div class="flex flex-wrap gap-2 mb-4">
                      @for (tag of post().tags; track tag) {
                        <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          #{{ tag }}
                        </span>
                      }
                    </div>
                  }
                  
                  @if (post().attachments.length > 0) {
                    <div class="text-sm text-gray-600">
                      📎 {{ post().attachments.length }} tệp đính kèm
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Submit Actions -->
            <div class="bg-white rounded-2xl shadow-lg p-8">
              <div class="flex items-center justify-between">
                <div class="text-sm text-gray-600">
                  <p>Bài viết sẽ được kiểm duyệt trước khi hiển thị công khai</p>
                  <p>Vui lòng tuân thủ quy định của cộng đồng</p>
                </div>
                
                <div class="flex space-x-4">
                  <button type="button" 
                          (click)="saveDraft()"
                          class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    Lưu nháp
                  </button>
                  <button type="submit" 
                          [disabled]="!canSubmit()"
                          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                    Đăng bài
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostCreationComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);

  // Component state
  post = signal<PostCreation>({
    title: '',
    content: '',
    category: 'general',
    courseId: '',
    tags: [],
    attachments: [],
    isAnonymous: false,
    allowComments: true,
    isPinned: false
  });

  tagInput = signal<string>('');

  // Mock data
  categories = signal<ForumCategory[]>([
    {
      id: 'general',
      name: 'Thảo luận chung',
      description: 'Thảo luận về các chủ đề chung trong học tập',
      icon: '💬',
      color: '#3B82F6'
    },
    {
      id: 'course',
      name: 'Khóa học',
      description: 'Thảo luận về nội dung khóa học',
      icon: '📚',
      color: '#10B981'
    },
    {
      id: 'assignment',
      name: 'Bài tập',
      description: 'Hỗ trợ và thảo luận về bài tập',
      icon: '📝',
      color: '#F59E0B'
    },
    {
      id: 'exam',
      name: 'Thi cử',
      description: 'Chia sẻ kinh nghiệm thi cử',
      icon: '📋',
      color: '#EF4444'
    },
    {
      id: 'help',
      name: 'Hỗ trợ',
      description: 'Yêu cầu hỗ trợ và giúp đỡ',
      icon: '🆘',
      color: '#8B5CF6'
    }
  ]);

  courses = signal<Course[]>([
    {
      id: 'course-1',
      title: 'Kỹ thuật Tàu biển Cơ bản',
      instructor: 'ThS. Nguyễn Văn Hải'
    },
    {
      id: 'course-2',
      title: 'An toàn Hàng hải',
      instructor: 'TS. Trần Thị Lan'
    },
    {
      id: 'course-3',
      title: 'Quản lý Cảng biển',
      instructor: 'ThS. Lê Văn Minh'
    }
  ]);

  ngOnInit(): void {
    console.log('🔧 Post Creation - Component initialized');
  }

  getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }

  getCurrentDate(): string {
    return this.formatDate(new Date());
  }

  addTag(event: Event): void {
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const tag = input.value.trim();
    
    if (tag && !this.post().tags.includes(tag)) {
      this.post.update(p => ({
        ...p,
        tags: [...p.tags, tag]
      }));
      this.tagInput.set('');
      console.log('🔧 Post Creation - Tag added:', tag);
    }
  }

  removeTag(tag: string): void {
    this.post.update(p => ({
      ...p,
      tags: p.tags.filter(t => t !== tag)
    }));
    console.log('🔧 Post Creation - Tag removed:', tag);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      
      files.forEach(file => {
        const attachment: PostAttachment = {
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          name: file.name,
          url: URL.createObjectURL(file),
          type: this.getFileType(file.type),
          size: file.size
        };
        
        this.post.update(p => ({
          ...p,
          attachments: [...p.attachments, attachment]
        }));
      });
      
      console.log('🔧 Post Creation - Files selected:', files.length);
    }
  }

  private getFileType(mimeType: string): 'image' | 'document' | 'video' | 'other' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    return 'other';
  }

  removeAttachment(attachmentId: string): void {
    this.post.update(p => ({
      ...p,
      attachments: p.attachments.filter(att => att.id !== attachmentId)
    }));
    console.log('🔧 Post Creation - Attachment removed:', attachmentId);
  }

  canSubmit(): boolean {
    const postData = this.post();
    return postData.title.trim().length > 0 && 
           postData.content.trim().length > 0 && 
           postData.category &&
           this.getWordCount(postData.content) >= 10;
  }

  saveDraft(): void {
    console.log('🔧 Post Creation - Save draft');
    // Mock save draft functionality
    alert('Đã lưu nháp thành công!');
  }

  submitPost(): void {
    if (!this.canSubmit()) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    console.log('🔧 Post Creation - Submit post');
    console.log('🔧 Post Creation - Post data:', this.post());
    
    // Mock submission
    alert('Đăng bài thành công! Bài viết sẽ được kiểm duyệt trước khi hiển thị công khai.');
    
    // Navigate back to forum
    this.router.navigate(['/student/forum']).then(success => {
      if (success) {
        console.log('🔧 Post Creation - Navigation to forum successful');
      } else {
        console.error('🔧 Post Creation - Navigation to forum failed');
      }
    });
  }

  goBack(): void {
    console.log('🔧 Post Creation - Go back');
    this.router.navigate(['/student/forum']).then(success => {
      if (success) {
        console.log('🔧 Post Creation - Navigation back successful');
      } else {
        console.error('🔧 Post Creation - Navigation back failed');
      }
    });
  }
}