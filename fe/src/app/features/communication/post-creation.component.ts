import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

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
  imports: [RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './post-creation.component.html',
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
      icon: 'đŸ’¬',
      color: '#3B82F6'
    },
    {
      id: 'course',
      name: 'Khóa học',
      description: 'Thảo luận về nội dung khóa học',
      icon: 'đŸ“',
      color: '#10B981'
    },
    {
      id: 'assignment',
      name: 'Bài tập',
      description: 'Hỗ trợ và thảo luận về bài tập',
      icon: 'đŸ“',
      color: '#F59E0B'
    },
    {
      id: 'exam',
      name: 'Thi cử',
      description: 'Chia sẻ kinh nghiệm thi cử',
      icon: 'đŸ“‹',
      color: '#EF4444'
    },
    {
      id: 'help',
      name: 'Hỗ trợ',
      description: 'Yêu cầu hỗ trợ và giúp đỡ',
      icon: 'đŸ†˜',
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
    }
  }

  removeTag(tag: string): void {
    this.post.update(p => ({
      ...p,
      tags: p.tags.filter(t => t !== tag)
    }));
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
  }

  canSubmit(): boolean {
    const postData = this.post();
    return postData.title.trim().length > 0 && 
           postData.content.trim().length > 0 && 
           postData.category &&
           this.getWordCount(postData.content) >= 10;
  }

  saveDraft(): void {
    // Mock save draft functionality
    alert('Đã lưu nháp thành công!');
  }

  submitPost(): void {
    if (!this.canSubmit()) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    // Mock submission
    alert('Đăng bài thành công! Bài viết sẽ được kiểm duyệt trước khi hiển thị công khai.');
    
    // Navigate back to forum
    this.router.navigate(['/student/forum']);
  }

  goBack(): void {
    this.router.navigate(['/student/forum']);
  }
}

