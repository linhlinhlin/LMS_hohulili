import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RealVideoPlayerComponent, VideoPlayerConfig } from '../../../shared/components/video-player/real-video-player.component';

interface VideoLesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: number; // in seconds
  thumbnail: string;
  courseId: string;
  order: number;
  isCompleted: boolean;
  watchedDuration: number;
  lastWatchedAt: Date;
  bookmarks: VideoBookmark[];
  notes: VideoNote[];
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
}

@Component({
  selector: 'app-enhanced-learning-interface',
  imports: [RouterModule, FormsModule, RealVideoPlayerComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './enhanced-learning-interface.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnhancedLearningInterfaceComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Mock course data
  course = signal<Course>({
    id: 'course-1',
    title: 'Kỹ thuật Tàu biển Cơ bản',
    description: 'Khóa học cung cấp kiến thức cơ bản về kỹ thuật tàu biển',
    instructor: 'ThS. Nguyễn Văn Hải',
    thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
    duration: '8 tuần',
    progress: 75,
    category: 'engineering',
    rating: 4.7,
    lessons: [
      {
        id: 'lesson-1',
        title: 'Giới thiệu về Kỹ thuật Tàu biển',
        description: 'Tổng quan về ngành kỹ thuật tàu biển và các thành phần cơ bản',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        duration: 1800, // 30 minutes
        thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
        courseId: 'course-1',
        order: 1,
        isCompleted: true,
        watchedDuration: 1800,
        lastWatchedAt: new Date(),
        bookmarks: [],
        notes: []
      },
      {
        id: 'lesson-2',
        title: 'Cấu trúc Tàu biển',
        description: 'Phân tích chi tiết các thành phần cấu trúc của tàu biển',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
        duration: 2400, // 40 minutes
        thumbnail: 'https://images.unsplash.com/photo-1506905925346-14b1e3d71e51?w=300&h=200&fit=crop',
        courseId: 'course-1',
        order: 2,
        isCompleted: false,
        watchedDuration: 1200,
        lastWatchedAt: new Date(),
        bookmarks: [
          {
            id: 'bookmark-1',
            timestamp: 300,
            title: 'Cấu trúc thân tàu',
            description: 'Phần quan trọng về cấu trúc thân tàu',
            createdAt: new Date()
          }
        ],
        notes: [
          {
            id: 'note-1',
            timestamp: 600,
            content: 'Cấu trúc tàu được chia thành nhiều phần khác nhau',
            createdAt: new Date()
          }
        ]
      },
      {
        id: 'lesson-3',
        title: 'Hệ thống Động lực',
        description: 'Tìm hiểu về các hệ thống động lực trên tàu biển',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4',
        duration: 2700, // 45 minutes
        thumbnail: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=300&h=200&fit=crop',
        courseId: 'course-1',
        order: 3,
        isCompleted: false,
        watchedDuration: 0,
        lastWatchedAt: new Date(),
        bookmarks: [],
        notes: []
      }
    ]
  });

  currentLesson = signal<VideoLesson | null>(null);
  showNotes = signal(false);
  playbackRate = 1;
  newNoteContent = signal('');
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

  completedLessons = computed(() => 
    this.course().lessons.filter(lesson => lesson.isCompleted).length
  );

  remainingLessons = computed(() => 
    this.course().lessons.length - this.completedLessons()
  );

  ngOnInit(): void {
    // Get course ID from route params
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId) {
      // Load course data based on ID
      this.loadCourse(courseId);
    }
  }

  loadCourse(courseId: string): void {
    // In real app, this would load from service
    // For now, we'll use mock data
  }

  selectLesson(lesson: VideoLesson): void {
    this.currentLesson.set(lesson);
  }

  selectFirstLesson(): void {
    if (this.course().lessons.length > 0) {
      this.selectLesson(this.course().lessons[0]);
    }
  }

  previousLesson(): void {
    const current = this.currentLesson();
    if (current) {
      const currentIndex = this.course().lessons.findIndex(l => l.id === current.id);
      if (currentIndex > 0) {
        this.selectLesson(this.course().lessons[currentIndex - 1]);
      }
    }
  }

  nextLesson(): void {
    const current = this.currentLesson();
    if (current) {
      const currentIndex = this.course().lessons.findIndex(l => l.id === current.id);
      if (currentIndex < this.course().lessons.length - 1) {
        this.selectLesson(this.course().lessons[currentIndex + 1]);
      }
    }
  }

  isFirstLesson(): boolean {
    const current = this.currentLesson();
    if (!current) return true;
    return this.course().lessons[0].id === current.id;
  }

  isLastLesson(): boolean {
    const current = this.currentLesson();
    if (!current) return true;
    return this.course().lessons[this.course().lessons.length - 1].id === current.id;
  }

  markAsComplete(): void {
    const current = this.currentLesson();
    if (current) {
      // Update lesson completion status
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

  toggleBookmark(): void {
    // Toggle bookmark functionality
  }

  toggleNotes(): void {
    this.showNotes.set(!this.showNotes());
  }

  addNote(): void {
    if (this.newNoteContent().trim()) {
      const current = this.currentLesson();
      if (current) {
        const newNote: VideoNote = {
          id: 'note-' + Date.now(),
          timestamp: 0, // Current video time
          content: this.newNoteContent().trim(),
          createdAt: new Date()
        };

        const lessons = this.course().lessons.map(lesson => 
          lesson.id === current.id 
            ? { ...lesson, notes: [...lesson.notes, newNote] }
            : lesson
        );

        this.course.update(course => ({ ...course, lessons }));
        this.newNoteContent.set('');
      }
    }
  }

  deleteNote(noteId: string): void {
    const current = this.currentLesson();
    if (current) {
      const lessons = this.course().lessons.map(lesson => 
        lesson.id === current.id 
          ? { ...lesson, notes: lesson.notes.filter(note => note.id !== noteId) }
          : lesson
      );

      this.course.update(course => ({ ...course, lessons }));
    }
  }

  playVideo(): void {
    // Update video player config with current lesson
    if (this.currentLesson()) {
      this.videoPlayerConfig.set({
        ...this.videoPlayerConfig(),
        src: this.currentLesson()!.videoUrl,
        poster: this.currentLesson()!.thumbnail
      });
    }
  }

  rewindVideo(): void {
    // Video player will handle this internally
  }

  fastForwardVideo(): void {
    // Video player will handle this internally
  }

  changePlaybackRate(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const rate = parseFloat(target.value);
    this.playbackRate = rate;
    
    // Update video player config
    this.videoPlayerConfig.set({
      ...this.videoPlayerConfig(),
      playbackRate: rate
    });
  }

  toggleFullscreen(): void {
    // Video player will handle this internally
  }

  onVideoPlayerReady(): void {
  }

  onVideoPlayerError(error: any): void {
  }

  onVideoPlayerProgress(progress: number): void {
    // Update learning progress
  }

  onVideoStateChange(state: any): void {
  }

  onVideoTimeUpdate(time: number): void {
  }

  onVideoPlay(): void {
  }

  onVideoPause(): void {
  }

  onVideoEnded(): void {
    // Mark lesson as completed
    this.markLessonCompleted();
  }

  onVideoError(error: any): void {
  }

  markLessonCompleted(): void {
    const current = this.currentLesson();
    if (current) {
      const lessons = this.course().lessons.map(lesson => 
        lesson.id === current.id 
          ? { ...lesson, isCompleted: true, watchedDuration: lesson.duration }
          : lesson
      );

      this.course.update(course => ({ ...course, lessons }));
    }
  }

  goBack(): void {
    this.router.navigate(['/learn']);
  }

  isBookmarked(): boolean {
    const current = this.currentLesson();
    return current ? current.bookmarks.length > 0 : false;
  }

  getLessonClass(lesson: VideoLesson): string {
    const current = this.currentLesson();
    if (current && current.id === lesson.id) {
      return 'bg-blue-50 border-2 border-blue-200';
    } else if (lesson.isCompleted) {
      return 'bg-green-50 border border-green-200 hover:bg-green-100';
    } else if (lesson.watchedDuration > 0) {
      return 'bg-blue-50 border border-blue-200 hover:bg-blue-100';
    } else {
      return 'bg-gray-50 border border-gray-200 hover:bg-gray-100';
    }
  }

  getLessonNumberClass(lesson: VideoLesson): string {
    const current = this.currentLesson();
    if (current && current.id === lesson.id) {
      return 'bg-blue-600 text-white';
    } else if (lesson.isCompleted) {
      return 'bg-green-600 text-white';
    } else if (lesson.watchedDuration > 0) {
      return 'bg-blue-100 text-blue-800';
    } else {
      return 'bg-gray-200 text-gray-600';
    }
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

