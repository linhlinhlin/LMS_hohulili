import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RealVideoPlayerComponent, VideoPlayerConfig } from '../../../shared/components/video-player/real-video-player.component';
import { environment } from '../../../../environments/environment';
import { CourseApi } from '../../../api/client/course.api';
import { LessonApi } from '../../../api/client/lesson.api';
import { CourseContentSection, LessonDetail, LessonAttachment } from '../../../api/types/course.types';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../shared/types/user.types';

interface VideoLesson {
  id: string;
  title: string;
  description: string;
  content?: string;
  videoUrl: string;
  duration: number;
  thumbnail: string;
  courseId: string;
  order: number;
  isCompleted: boolean;
  watchedDuration: number;
  lastWatchedAt: Date;
  bookmarks: VideoBookmark[];
  notes: VideoNote[];
  attachments?: LessonAttachment[];
}

interface VideoBookmark {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  createdAt: Date;
}

interface VideoNote {
  id: string;
  timestamp: number;
  content: string;
  createdAt: Date;
}

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  thumbnail: string;
  duration: string;
  lessons: VideoLesson[];
  progress: number;
  category: string;
  rating: number;
  sectionTitle?: string;
}

@Component({
  selector: 'app-professional-learning-interface',
  imports: [CommonModule, RouterModule, FormsModule, RealVideoPlayerComponent],
  templateUrl: './professional-learning-interface.component.html',
  styleUrls: ['./professional-learning-interface.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfessionalLearningInterfaceComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private courseApi = inject(CourseApi);
  private lessonApi = inject(LessonApi);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  // State
  enrolling = signal(false);
  accessDenied = signal(false);
  searchQuery = signal('');
  expandedAttachment: number | null = null;
  private blobUrlMap = new Map<string, string>();
  
  // Loading states
  isLoadingCourse = signal(false);
  isLoadingLesson = signal(false);

  // Role helpers
  userRole = computed<UserRole | null>(() => this.authService.userRole() as UserRole | null);
  isStudent = computed(() => this.userRole() === 'student');
  isTeacher = computed(() => this.userRole() === 'teacher');
  isAdmin = computed(() => this.userRole() === 'admin');

  // Filtered lessons
  filteredLessons = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.course().lessons;

    return this.course().lessons.filter(lesson =>
      lesson.title.toLowerCase().includes(query) ||
      lesson.description.toLowerCase().includes(query)
    );
  });

  // Course state
  course = signal<Course>({
    id: '',
    title: '',
    description: '',
    instructor: '',
    thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=200&fit=crop',
    duration: '',
    progress: 0,
    category: '',
    rating: 0,
    lessons: []
  });

  currentLesson = signal<VideoLesson | null>(null);
  
  currentLessonIndex = computed(() => {
    const current = this.currentLesson();
    if (!current) return 0;
    return this.course().lessons.findIndex(lesson => lesson.id === current.id);
  });

  videoPlayerConfig = signal<VideoPlayerConfig>({
    src: '',
    controls: true,
    autoplay: false,
    muted: false,
    loop: false,
    preload: 'metadata',
    volume: 1,
    playbackRate: 1
  });

  ngOnInit(): void {
    // Support both route patterns:
    // /student/learn/course/:id
    // /student/learn/course/:courseId/lesson/:lessonId
    const courseId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('courseId');
    const lessonId = this.route.snapshot.paramMap.get('lessonId');
    
    if (courseId) {
      this.loadCourse(courseId, lessonId || undefined);
    }
  }

  loadCourse(courseId: string, specificLessonId?: string): void {
    this.accessDenied.set(false);
    this.isLoadingCourse.set(true);

    this.courseApi.getCourseById(courseId).subscribe({
      next: (res) => {
        const detail = res?.data;
        const title = detail?.title || '';
        const instructor = detail?.teacherName || '';
        this.course.update(c => ({ ...c, id: courseId, title, description: detail?.description || '', instructor }));
      },
      error: () => {
        this.course.update(c => ({ ...c, id: courseId, title: c.title || 'Khóa học', instructor: c.instructor || 'Giảng viên' }));
      }
    });

    this.courseApi.getCourseContent(courseId).subscribe({
      next: (res) => {
        const sections: CourseContentSection[] = res?.data || [];
        const lessonsFlat: VideoLesson[] = [];
        sections.sort((a,b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)).forEach((sec) => {
          sec.lessons
            ?.sort((a,b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
            .forEach((l, idx) => {
              lessonsFlat.push({
                id: l.id,
                title: l.title,
                description: l.description || '',
                videoUrl: '',
                duration: 0,
                thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=200&fit=crop',
                courseId,
                order: lessonsFlat.length + 1,
                isCompleted: false,
                watchedDuration: 0,
                lastWatchedAt: new Date(),
                bookmarks: [],
                notes: []
              });
            });
        });
        this.course.update(c => ({ ...c, lessons: lessonsFlat }));
        
        // Select specific lesson if provided, otherwise select first lesson
        if (lessonsFlat.length > 0) {
          if (specificLessonId) {
            const targetLesson = lessonsFlat.find(l => l.id === specificLessonId);
            if (targetLesson) {
              this.selectLesson(targetLesson);
            } else {
              // Fallback to first lesson if specific lesson not found
              this.selectLesson(lessonsFlat[0]);
            }
          } else {
            this.selectLesson(lessonsFlat[0]);
          }
        }
        this.isLoadingCourse.set(false);
      },
      error: (err: any) => {
        const msg = (err?.message || '').toLowerCase();
        const forbidden = msg.includes('403') || msg.includes('không có quyền') || msg.includes('forbidden');
        if (forbidden) {
          this.accessDenied.set(true);
        } else {
          this.accessDenied.set(false);
        }
        this.isLoadingCourse.set(false);
      }
    });
  }

  enrollCurrentCourse(): void {
    const courseId = this.course().id;
    if (!courseId || !this.isStudent()) return;
    
    this.enrolling.set(true);
    this.courseApi.enrollCourse(courseId).subscribe({
      next: () => {
        this.loadCourse(courseId);
      },
      error: (err) => {
        // Handle error silently
      },
      complete: () => this.enrolling.set(false)
    });
  }

  selectLesson(lesson: VideoLesson): void {
    this.currentLesson.set(lesson);
    this.isLoadingLesson.set(true);
    this.lessonApi.getLessonById(lesson.id).subscribe({
      next: (res) => {
        const detail: LessonDetail | undefined = res?.data as any;
        
        let videoUrl = '';
        if (detail && typeof detail.videoUrl === 'string' && detail.videoUrl.trim() !== '') {
          videoUrl = detail.videoUrl;
        }
        const updated: VideoLesson = {
          ...lesson,
          videoUrl,
          content: detail?.content || '',
          duration: (detail?.durationMinutes || 0) * 60,
          attachments: detail?.attachments || []
        };
        
        const lessons = this.course().lessons.map(l => l.id === lesson.id ? updated : l);
        this.course.update(c => ({ ...c, lessons }));
        this.currentLesson.set(updated);
        this.updateVideoPlayer();
        this.isLoadingLesson.set(false);
      },
      error: (err: any) => {
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('403') || msg.includes('không có quyền') || msg.includes('forbidden')) {
          this.accessDenied.set(true);
          this.currentLesson.set(null);
        } else {
          this.updateVideoPlayer();
        }
        this.isLoadingLesson.set(false);
      }
    });
  }

  selectFirstLesson(): void {
    if (this.course().lessons.length > 0) {
      this.selectLesson(this.course().lessons[0]);
    }
  }

  previousLesson(): void {
    const currentIndex = this.currentLessonIndex();
    if (currentIndex > 0) {
      this.selectLesson(this.course().lessons[currentIndex - 1]);
    }
  }

  nextLesson(): void {
    const currentIndex = this.currentLessonIndex();
    if (currentIndex < this.course().lessons.length - 1) {
      this.selectLesson(this.course().lessons[currentIndex + 1]);
    }
  }

  isFirstLesson(): boolean {
    return this.currentLessonIndex() === 0;
  }

  isLastLesson(): boolean {
    return this.currentLessonIndex() === this.course().lessons.length - 1;
  }

  isCurrentLesson(lesson: VideoLesson): boolean {
    const current = this.currentLesson();
    return current ? current.id === lesson.id : false;
  }

  markAsComplete(): void {
    const current = this.currentLesson();
    if (current) {
      const lessons = this.course().lessons.map(lesson =>
        lesson.id === current.id ? { ...lesson, isCompleted: true } : lesson
      );

      this.course.update(course => ({
        ...course,
        lessons,
        progress: Math.round((lessons.filter(l => l.isCompleted).length / lessons.length) * 100)
      }));
    }
  }

  updateVideoPlayer(): void {
    const current = this.currentLesson();
    if (current && current.videoUrl) {
      const src = current.videoUrl.startsWith('http') ? current.videoUrl : `${environment.apiUrl}${current.videoUrl}`;
      this.videoPlayerConfig.set({
        ...this.videoPlayerConfig(),
        src,
        poster: current.thumbnail
      });
    } else {
      this.videoPlayerConfig.set({
        ...this.videoPlayerConfig(),
        src: '',
        poster: current ? current.thumbnail : ''
      });
    }
  }

  filterLessons(): void {
    // Computed signal will automatically update
  }

  goBack(): void {
    this.router.navigate(['/student']);
  }

  getBreadcrumbLink(): string[] {
    return ['/student'];
  }

  getLessonButtonClass(lesson: VideoLesson): string {
    const current = this.currentLesson();
    const isSelected = current && current.id === lesson.id;

    if (isSelected) {
      return 'active';
    } else if (lesson.isCompleted) {
      return 'completed';
    } else if (lesson.watchedDuration > 0) {
      return 'in-progress';
    } else {
      return '';
    }
  }

  getLessonNumberClass(lesson: VideoLesson): string {
    const current = this.currentLesson();
    const isSelected = current && current.id === lesson.id;

    if (isSelected) {
      return 'active';
    } else if (lesson.isCompleted) {
      return 'completed';
    } else if (lesson.watchedDuration > 0) {
      return 'in-progress';
    } else {
      return '';
    }
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // YouTube helper methods
  isYouTube(url?: string): boolean {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  getSafeYouTubeEmbedUrl(url?: string): SafeResourceUrl {
    if (!url) return '';
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    const embedUrl = match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : url;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  // File type checking methods
  isPdfFile(fileName: string): boolean {
    return fileName?.toLowerCase().endsWith('.pdf') || false;
  }

  isPresentationFile(fileName: string): boolean {
    const lower = fileName?.toLowerCase() || '';
    return lower.endsWith('.ppt') || lower.endsWith('.pptx');
  }

  isOfficeFile(fileName: string): boolean {
    const lower = fileName?.toLowerCase() || '';
    return lower.endsWith('.doc') || lower.endsWith('.docx') || 
           lower.endsWith('.xls') || lower.endsWith('.xlsx') ||
           lower.endsWith('.ppt') || lower.endsWith('.pptx');
  }

  isImageFile(fileName: string): boolean {
    const lower = fileName?.toLowerCase() || '';
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || 
           lower.endsWith('.png') || lower.endsWith('.gif') || 
           lower.endsWith('.bmp') || lower.endsWith('.webp');
  }

  isVideoFile(fileName: string): boolean {
    const lower = fileName?.toLowerCase() || '';
    return lower.endsWith('.mp4') || lower.endsWith('.avi') || 
           lower.endsWith('.mov') || lower.endsWith('.wmv') || 
           lower.endsWith('.flv') || lower.endsWith('.webm');
  }

  isAudioFile(fileName: string): boolean {
    const lower = fileName?.toLowerCase() || '';
    return lower.endsWith('.mp3') || lower.endsWith('.wav') || 
           lower.endsWith('.ogg') || lower.endsWith('.aac') || 
           lower.endsWith('.flac') || lower.endsWith('.wma');
  }

  // File utility methods
  getFileExtension(fileName: string): string {
    if (!fileName || !fileName.includes('.')) return '';
    return fileName.substring(fileName.lastIndexOf('.') + 1).toUpperCase();
  }

  getFileTypeClass(fileName: string): string {
    const ext = this.getFileExtension(fileName).toLowerCase();
    const typeMap: { [key: string]: string } = {
      'pdf': 'bg-red-100 text-red-800',
      'doc': 'bg-blue-100 text-blue-800',
      'docx': 'bg-blue-100 text-blue-800',
      'ppt': 'bg-orange-100 text-orange-800',
      'pptx': 'bg-orange-100 text-orange-800',
      'xls': 'bg-green-100 text-green-800',
      'xlsx': 'bg-green-100 text-green-800',
      'mp4': 'bg-purple-100 text-purple-800',
      'mp3': 'bg-pink-100 text-pink-800',
      'jpg': 'bg-yellow-100 text-yellow-800',
      'png': 'bg-yellow-100 text-yellow-800'
    };
    return typeMap[ext] || 'bg-gray-100 text-gray-800';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // PDF and file viewer methods
  toggleAttachmentViewer(index: number): void {
    if (this.expandedAttachment === index) {
      this.expandedAttachment = null;
      return;
    }
    this.expandedAttachment = index;
  }

  getSafeUrl(url?: string): SafeResourceUrl | null {
    if (!url) return null;
    
    const existingBlobUrl = this.blobUrlMap.get(url);
    if (existingBlobUrl) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(existingBlobUrl);
    }

    this.prefetchAndCreateBlob(url);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private async prefetchAndCreateBlob(url: string) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrlMap.set(url, blobUrl);
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.log('Could not create blob URL, using direct URL', error);
    }
  }

  getOfficeViewerUrl(fileUrl: string): SafeResourceUrl {
    const encodedUrl = encodeURIComponent(fileUrl);
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }

  getVideoMimeType(fileName: string): string {
    const ext = fileName?.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      'mp4': 'video/mp4',
      'avi': 'video/avi',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'webm': 'video/webm'
    };
    return mimeTypes[ext || ''] || 'video/mp4';
  }

  getAudioMimeType(fileName: string): string {
    const ext = fileName?.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'aac': 'audio/aac',
      'flac': 'audio/flac',
      'wma': 'audio/x-ms-wma'
    };
    return mimeTypes[ext || ''] || 'audio/mpeg';
  }

  // Video player event handlers
  onVideoStateChange(state: any): void {
    console.log('Video state changed:', state);
  }

  onVideoTimeUpdate(time: number): void {
    if (typeof time === 'number') {
      console.log('Video time update:', time);
    } else {
      console.warn('Video time update event is not a number:', time);
    }
  }

  onVideoPlay(): void {
    console.log('Video started playing');
  }

  onVideoPause(): void {
    console.log('Video paused');
  }

  onVideoEnded(): void {
    console.log('Video ended');
    this.markAsComplete();
  }

  onVideoError(error: any): void {
    console.error('Video error:', error);
  }
}
