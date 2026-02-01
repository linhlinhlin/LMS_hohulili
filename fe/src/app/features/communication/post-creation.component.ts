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
      name: 'Tháº£o luáº­n chung',
      description: 'Tháº£o luáº­n vá» cĂ¡c chá»§ Ä‘á» chung trong há»c táº­p',
      icon: 'đŸ’¬',
      color: '#3B82F6'
    },
    {
      id: 'course',
      name: 'KhĂ³a há»c',
      description: 'Tháº£o luáº­n vá» ná»™i dung khĂ³a há»c',
      icon: 'đŸ“',
      color: '#10B981'
    },
    {
      id: 'assignment',
      name: 'BĂ i táº­p',
      description: 'Há»— trá»£ vĂ  tháº£o luáº­n vá» bĂ i táº­p',
      icon: 'đŸ“',
      color: '#F59E0B'
    },
    {
      id: 'exam',
      name: 'Thi cá»­',
      description: 'Chia sáº» kinh nghiá»‡m thi cá»­',
      icon: 'đŸ“‹',
      color: '#EF4444'
    },
    {
      id: 'help',
      name: 'Há»— trá»£',
      description: 'YĂªu cáº§u há»— trá»£ vĂ  giĂºp Ä‘á»¡',
      icon: 'đŸ†˜',
      color: '#8B5CF6'
    }
  ]);

  courses = signal<Course[]>([
    {
      id: 'course-1',
      title: 'Ká»¹ thuáº­t TĂ u biá»ƒn CÆ¡ báº£n',
      instructor: 'ThS. Nguyá»…n VÄƒn Háº£i'
    },
    {
      id: 'course-2',
      title: 'An toĂ n HĂ ng háº£i',
      instructor: 'TS. Tráº§n Thá»‹ Lan'
    },
    {
      id: 'course-3',
      title: 'Quáº£n lĂ½ Cáº£ng biá»ƒn',
      instructor: 'ThS. LĂª VÄƒn Minh'
    }
  ]);

  ngOnInit(): void {
    console.log('đŸ”§ Post Creation - Component initialized');
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
      console.log('đŸ”§ Post Creation - Tag added:', tag);
    }
  }

  removeTag(tag: string): void {
    this.post.update(p => ({
      ...p,
      tags: p.tags.filter(t => t !== tag)
    }));
    console.log('đŸ”§ Post Creation - Tag removed:', tag);
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
      
      console.log('đŸ”§ Post Creation - Files selected:', files.length);
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
    console.log('đŸ”§ Post Creation - Attachment removed:', attachmentId);
  }

  canSubmit(): boolean {
    const postData = this.post();
    return postData.title.trim().length > 0 && 
           postData.content.trim().length > 0 && 
           postData.category &&
           this.getWordCount(postData.content) >= 10;
  }

  saveDraft(): void {
    console.log('đŸ”§ Post Creation - Save draft');
    // Mock save draft functionality
    alert('ÄĂ£ lÆ°u nhĂ¡p thĂ nh cĂ´ng!');
  }

  submitPost(): void {
    if (!this.canSubmit()) {
      alert('Vui lĂ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ thĂ´ng tin báº¯t buá»™c.');
      return;
    }

    console.log('đŸ”§ Post Creation - Submit post');
    console.log('đŸ”§ Post Creation - Post data:', this.post());
    
    // Mock submission
    alert('ÄÄƒng bĂ i thĂ nh cĂ´ng! BĂ i viáº¿t sáº½ Ä‘Æ°á»£c kiá»ƒm duyá»‡t trÆ°á»›c khi hiá»ƒn thá»‹ cĂ´ng khai.');
    
    // Navigate back to forum
    this.router.navigate(['/student/forum']).then(success => {
      if (success) {
        console.log('đŸ”§ Post Creation - Navigation to forum successful');
      } else {
        console.error('đŸ”§ Post Creation - Navigation to forum failed');
      }
    });
  }

  goBack(): void {
    console.log('đŸ”§ Post Creation - Go back');
    this.router.navigate(['/student/forum']).then(success => {
      if (success) {
        console.log('đŸ”§ Post Creation - Navigation back successful');
      } else {
        console.error('đŸ”§ Post Creation - Navigation back failed');
      }
    });
  }
}

