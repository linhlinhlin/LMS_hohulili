import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LessonApi } from '../../api/client/lesson.api';
import { firstValueFrom } from 'rxjs';

interface CourseModule {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: CourseLesson[];
  duration: number; // in minutes
  isCompleted: boolean;
  isUnlocked: boolean;
}

interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  type: 'video' | 'text' | 'quiz' | 'assignment' | 'resource';
  duration: number; // in minutes
  content?: string;
  videoUrl?: string;
  resources: CourseResource[];
  isCompleted: boolean;
  isUnlocked: boolean;
  isPreview: boolean;
  order: number;
}

interface CourseResource {
  id: string;
  lessonId: string;
  title: string;
  type: 'pdf' | 'video' | 'audio' | 'document' | 'link';
  url: string;
  size?: number;
  downloadCount: number;
}

interface CourseLearning {
  id: string;
  title: string;
  description: string;
  instructor: {
    name: string;
    avatar: string;
    title: string;
  };
  thumbnail: string;
  modules: CourseModule[];
  totalDuration: number;
  progress: number;
  currentLesson?: string;
  lastAccessed: Date;
}

interface LearningProgress {
  courseId: string;
  userId: string;
  completedLessons: string[];
  currentModule: string;
  currentLesson: string;
  totalTimeSpent: number; // in minutes
  lastAccessed: Date;
}

@Component({
  selector: 'app-course-learning',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  templateUrl: './course-learning.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseLearningComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private lessonApi = inject(LessonApi);

  // Component state
  course = signal<CourseLearning | null>(null);
  currentLessonId = signal<string | null>(null);
  learningProgress = signal<LearningProgress | null>(null);

  ngOnInit(): void {
    this.loadCourse();
    console.log('đŸ”§ Course Learning - Component initialized');
  }

  private loadCourse(): void {
    // Mock course data
    const mockCourse: CourseLearning = {
      id: 'course-1',
      title: 'Ká»¹ thuáº­t TĂ u biá»ƒn CÆ¡ báº£n',
      description: 'KhĂ³a há»c cung cáº¥p kiáº¿n thá»©c cÆ¡ báº£n vá» ká»¹ thuáº­t tĂ u biá»ƒn, bao gá»“m cáº¥u trĂºc tĂ u, há»‡ thá»‘ng Ä‘á»™ng lá»±c, vĂ  quy trĂ¬nh váº­n hĂ nh. KhĂ³a há»c Ä‘Æ°á»£c thiáº¿t káº¿ Ä‘á»ƒ giĂºp há»c viĂªn hiá»ƒu rĂµ vá» cĂ¡c thĂ nh pháº§n chĂ­nh cá»§a tĂ u biá»ƒn vĂ  cĂ¡ch thá»©c hoáº¡t Ä‘á»™ng cá»§a chĂºng.',
      instructor: {
        name: 'ThS. Nguyá»…n VÄƒn Háº£i',
        avatar: 'https://via.placeholder.com/150',
        title: 'Giáº£ng viĂªn Khoa HĂ ng háº£i'
      },
      thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop',
      modules: [
        {
          id: 'module-1',
          title: 'Giá»›i thiá»‡u vá» TĂ u biá»ƒn',
          description: 'Tá»•ng quan vá» tĂ u biá»ƒn vĂ  cĂ¡c thĂ nh pháº§n cÆ¡ báº£n',
          order: 1,
          duration: 120,
          isCompleted: true,
          isUnlocked: true,
          lessons: [
            {
              id: 'lesson-1',
              moduleId: 'module-1',
              title: 'Lá»‹ch sá»­ phĂ¡t triá»ƒn tĂ u biá»ƒn',
              description: 'TĂ¬m hiá»ƒu vá» lá»‹ch sá»­ phĂ¡t triá»ƒn cá»§a tĂ u biá»ƒn tá»« xÆ°a Ä‘áº¿n nay',
              type: 'video',
              duration: 30,
              videoUrl: 'https://example.com/video1.mp4',
              resources: [],
              isCompleted: true,
              isUnlocked: true,
              isPreview: false,
              order: 1
            },
            {
              id: 'lesson-2',
              moduleId: 'module-1',
              title: 'PhĂ¢n loáº¡i tĂ u biá»ƒn',
              description: 'CĂ¡c loáº¡i tĂ u biá»ƒn vĂ  Ä‘áº·c Ä‘iá»ƒm cá»§a tá»«ng loáº¡i',
              type: 'text',
              duration: 45,
              content: '<h3>PhĂ¢n loáº¡i tĂ u biá»ƒn</h3><p>TĂ u biá»ƒn Ä‘Æ°á»£c phĂ¢n loáº¡i theo nhiá»u tiĂªu chĂ­ khĂ¡c nhau...</p>',
              resources: [
                {
                  id: 'res-1',
                  lessonId: 'lesson-2',
                  title: 'TĂ i liá»‡u phĂ¢n loáº¡i tĂ u.pdf',
                  type: 'pdf',
                  url: '/resources/ship-classification.pdf',
                  size: 1024000,
                  downloadCount: 150
                }
              ],
              isCompleted: true,
              isUnlocked: true,
              isPreview: false,
              order: 2
            },
            {
              id: 'lesson-3',
              moduleId: 'module-1',
              title: 'Kiá»ƒm tra kiáº¿n thá»©c',
              description: 'BĂ i kiá»ƒm tra vá» lá»‹ch sá»­ vĂ  phĂ¢n loáº¡i tĂ u biá»ƒn',
              type: 'quiz',
              duration: 15,
              resources: [],
              isCompleted: false,
              isUnlocked: true,
              isPreview: false,
              order: 3
            }
          ]
        },
        {
          id: 'module-2',
          title: 'Cáº¥u trĂºc TĂ u biá»ƒn',
          description: 'CĂ¡c thĂ nh pháº§n cáº¥u trĂºc chĂ­nh cá»§a tĂ u biá»ƒn',
          order: 2,
          duration: 180,
          isCompleted: false,
          isUnlocked: true,
          lessons: [
            {
              id: 'lesson-4',
              moduleId: 'module-2',
              title: 'ThĂ¢n tĂ u vĂ  boong',
              description: 'Cáº¥u trĂºc thĂ¢n tĂ u vĂ  há»‡ thá»‘ng boong',
              type: 'video',
              duration: 60,
              videoUrl: 'https://example.com/video2.mp4',
              resources: [],
              isCompleted: false,
              isUnlocked: true,
              isPreview: false,
              order: 1
            },
            {
              id: 'lesson-5',
              moduleId: 'module-2',
              title: 'BĂ i táº­p vá» cáº¥u trĂºc tĂ u',
              description: 'BĂ i táº­p thá»±c hĂ nh vá» cáº¥u trĂºc tĂ u biá»ƒn',
              type: 'assignment',
              duration: 120,
              resources: [],
              isCompleted: false,
              isUnlocked: true,
              isPreview: false,
              order: 2
            }
          ]
        }
      ],
      totalDuration: 300,
      progress: 45,
      currentLesson: 'lesson-3',
      lastAccessed: new Date()
    };

    this.course.set(mockCourse);
    this.currentLessonId.set(mockCourse.currentLesson || null);
    console.log('đŸ”§ Course Learning - Course loaded:', mockCourse.title);
  }

  currentLesson(): CourseLesson | null {
    const course = this.course();
    const lessonId = this.currentLessonId();
    if (!course || !lessonId) return null;

    for (const module of course.modules) {
      const lesson = module.lessons.find(l => l.id === lessonId);
      if (lesson) return lesson;
    }
    return null;
  }

  getTotalLessons(): number {
    const course = this.course();
    if (!course) return 0;
    return course.modules.reduce((total, module) => total + module.lessons.length, 0);
  }

  getTotalModules(): number {
    const course = this.course();
    if (!course) return 0;
    return course.modules.length;
  }

  getCompletedLessons(): number {
    const course = this.course();
    if (!course) return 0;
    return course.modules.reduce((total, module) => 
      total + module.lessons.filter(lesson => lesson.isCompleted).length, 0);
  }

  getLessonTypeText(type: string): string {
    switch (type) {
      case 'video': return 'Video';
      case 'text': return 'LĂ½ thuyáº¿t';
      case 'quiz': return 'Quiz';
      case 'assignment': return 'BĂ i táº­p';
      case 'resource': return 'TĂ i liá»‡u';
      default: return 'KhĂ´ng xĂ¡c Ä‘á»‹nh';
    }
  }

  getLessonTypeClass(type: string): string {
    switch (type) {
      case 'video': return 'bg-blue-100 text-blue-800';
      case 'text': return 'bg-green-100 text-green-800';
      case 'quiz': return 'bg-purple-100 text-purple-800';
      case 'assignment': return 'bg-orange-100 text-orange-800';
      case 'resource': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getLessonButtonClass(lesson: CourseLesson): string {
    const isCurrent = lesson.id === this.currentLessonId();
    const baseClass = 'w-full p-3 rounded-lg transition-colors text-left';
    
    if (isCurrent) {
      return `${baseClass} bg-blue-100 border-2 border-blue-300`;
    } else if (lesson.isCompleted) {
      return `${baseClass} bg-green-50 hover:bg-green-100`;
    } else if (lesson.isUnlocked) {
      return `${baseClass} bg-white hover:bg-gray-50 border border-gray-200`;
    } else {
      return `${baseClass} bg-gray-50 text-gray-400 cursor-not-allowed`;
    }
  }

  getResourceTypeText(type: string): string {
    switch (type) {
      case 'pdf': return 'PDF Document';
      case 'video': return 'Video File';
      case 'audio': return 'Audio File';
      case 'document': return 'Document';
      case 'link': return 'External Link';
      default: return 'File';
    }
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  selectLesson(lessonId: string): void {
    this.currentLessonId.set(lessonId);
    console.log('đŸ”§ Course Learning - Select lesson:', lessonId);
  }

  startCourse(): void {
    const course = this.course();
    if (course && course.modules.length > 0 && course.modules[0].lessons.length > 0) {
      this.currentLessonId.set(course.modules[0].lessons[0].id);
      console.log('đŸ”§ Course Learning - Start course');
    }
  }

  previousLesson(): void {
    const course = this.course();
    const currentLesson = this.currentLesson();
    if (!course || !currentLesson) return;

    // Find previous lesson
    for (let i = 0; i < course.modules.length; i++) {
      const module = course.modules[i];
      const lessonIndex = module.lessons.findIndex(l => l.id === currentLesson.id);
      
      if (lessonIndex > 0) {
        // Previous lesson in same module
        this.currentLessonId.set(module.lessons[lessonIndex - 1].id);
        console.log('đŸ”§ Course Learning - Previous lesson:', module.lessons[lessonIndex - 1].id);
        return;
      } else if (i > 0) {
        // Last lesson in previous module
        const prevModule = course.modules[i - 1];
        this.currentLessonId.set(prevModule.lessons[prevModule.lessons.length - 1].id);
        console.log('đŸ”§ Course Learning - Previous lesson:', prevModule.lessons[prevModule.lessons.length - 1].id);
        return;
      }
    }
  }

  nextLesson(): void {
    const course = this.course();
    const currentLesson = this.currentLesson();
    if (!course || !currentLesson) return;

    // Find next lesson
    for (let i = 0; i < course.modules.length; i++) {
      const module = course.modules[i];
      const lessonIndex = module.lessons.findIndex(l => l.id === currentLesson.id);
      
      if (lessonIndex < module.lessons.length - 1) {
        // Next lesson in same module
        this.currentLessonId.set(module.lessons[lessonIndex + 1].id);
        console.log('đŸ”§ Course Learning - Next lesson:', module.lessons[lessonIndex + 1].id);
        return;
      } else if (i < course.modules.length - 1) {
        // First lesson in next module
        const nextModule = course.modules[i + 1];
        this.currentLessonId.set(nextModule.lessons[0].id);
        console.log('đŸ”§ Course Learning - Next lesson:', nextModule.lessons[0].id);
        return;
      }
    }
  }

  canGoPrevious(): boolean {
    const course = this.course();
    const currentLesson = this.currentLesson();
    if (!course || !currentLesson) return false;

    // Check if there's a previous lesson
    for (let i = 0; i < course.modules.length; i++) {
      const module = course.modules[i];
      const lessonIndex = module.lessons.findIndex(l => l.id === currentLesson.id);
      
      if (lessonIndex > 0) return true;
      if (i > 0) return true;
    }
    return false;
  }

  canGoNext(): boolean {
    const course = this.course();
    const currentLesson = this.currentLesson();
    if (!course || !currentLesson) return false;

    // Check if there's a next lesson
    for (let i = 0; i < course.modules.length; i++) {
      const module = course.modules[i];
      const lessonIndex = module.lessons.findIndex(l => l.id === currentLesson.id);
      
      if (lessonIndex < module.lessons.length - 1) return true;
      if (i < course.modules.length - 1) return true;
    }
    return false;
  }

  markAsCompleted(): void {
    const currentLesson = this.currentLesson();
    if (!currentLesson || currentLesson.isCompleted) return;

    console.log('đŸ”§ Course Learning - Mark lesson as completed:', currentLesson.id);
    
    // Mock completion
    alert('ÄĂ£ Ä‘Ă¡nh dáº¥u bĂ i há»c hoĂ n thĂ nh!');
    
    // Update progress
    this.course.update(course => {
      if (!course) return course;
      
      const updatedCourse = { ...course };
      updatedCourse.modules = updatedCourse.modules.map(module => ({
        ...module,
        lessons: module.lessons.map(lesson => 
          lesson.id === currentLesson.id ? { ...lesson, isCompleted: true } : lesson
        )
      }));
      
      // Recalculate progress
      const totalLessons = updatedCourse.modules.reduce((total, module) => total + module.lessons.length, 0);
      const completedLessons = updatedCourse.modules.reduce((total, module) => 
        total + module.lessons.filter(lesson => lesson.isCompleted).length, 0);
      updatedCourse.progress = Math.round((completedLessons / totalLessons) * 100);
      
      return updatedCourse;
    });
  }

  startQuiz(lessonId: string): void {
    console.log('đŸ”§ Course Learning - Start quiz:', lessonId);
    // Navigate to quiz taking interface
    this.router.navigate(['/student/quiz/take', lessonId]).then(success => {
      if (success) {
        console.log('đŸ”§ Course Learning - Navigation to quiz successful');
      } else {
        console.error('đŸ”§ Course Learning - Navigation to quiz failed');
      }
    });
  }

  startAssignment(lessonId: string): void {
    console.log('đŸ”§ Course Learning - Start assignment:', lessonId);
    // Navigate to assignment work interface
    this.router.navigate(['/student/assignments/work', lessonId]).then(success => {
      if (success) {
        console.log('đŸ”§ Course Learning - Navigation to assignment successful');
      } else {
        console.error('đŸ”§ Course Learning - Navigation to assignment failed');
      }
    });
  }

  downloadResource(resourceId: string): void {
    console.log('đŸ”§ Course Learning - Download resource:', resourceId);
    // Mock download functionality
    alert(`Táº£i xuá»‘ng tĂ i liá»‡u: ${resourceId}`);
  }

  goBack(): void {
    console.log('đŸ”§ Course Learning - Go back');
    this.router.navigate(['/student/courses']).then(success => {
      if (success) {
        console.log('đŸ”§ Course Learning - Navigation back successful');
      } else {
        console.error('đŸ”§ Course Learning - Navigation back failed');
      }
    });
  }

  async onMarkComplete(): Promise<void> {
    const lesson = this.currentLesson();
    if (!lesson) {
      console.log('[CourseLearning] onMarkComplete: no current lesson');
      return;
    }

    // Náº¿u Ä‘Ă£ completed thĂ¬ khĂ´ng gá»i láº¡i
    if (lesson.isCompleted) {
      console.log('[CourseLearning] onMarkComplete: lesson already completed');
      return;
    }

    console.log('[CourseLearning] onMarkComplete: START, lessonId =', lesson.id);

    const token = localStorage.getItem('lms_access_token');
    console.log('[CourseLearning] Token check:', {
      tokenExists: !!token,
      tokenLength: token?.length,
      tokenPrefix: token?.substring(0, 20) + '...'
    });

    if (token) {
      try {
        // Decode JWT Ä‘á»ƒ kiá»ƒm tra payload
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('[CourseLearning] JWT Payload:', {
          sub: payload.sub,
          roles: payload.roles || payload.authorities,
          exp: new Date(payload.exp * 1000).toISOString(),
          isExpired: payload.exp * 1000 < Date.now()
        });
      } catch (e) {
        console.error('[CourseLearning] Cannot decode JWT:', e);
      }
    }

    try {
      console.log('[CourseLearning] BEFORE API CALL');

      const res = await firstValueFrom(
        this.lessonApi.markLessonComplete(lesson.id)
      );

      console.log('[CourseLearning] API success:', res);

      // Cáº­p nháº­t tráº¡ng thĂ¡i hoĂ n thĂ nh á»Ÿ FE
      this.course.update(course => {
        if (!course) return course;

        const updatedCourse = { ...course };
        updatedCourse.modules = updatedCourse.modules.map(module => ({
          ...module,
          lessons: module.lessons.map(l =>
            l.id === lesson.id ? { ...l, isCompleted: true } : l
          )
        }));

        // TĂ­nh láº¡i progress
        const totalLessons = updatedCourse.modules.reduce((total, module) => total + module.lessons.length, 0);
        const completedLessons = updatedCourse.modules.reduce((total, module) =>
          total + module.lessons.filter(l => l.isCompleted).length, 0);
        updatedCourse.progress = Math.round((completedLessons / totalLessons) * 100);

        return updatedCourse;
      });

    } catch (error: any) {
      console.error('[CourseLearning] API error:', {
        status: error?.status,
        statusText: error?.statusText,
        message: error?.message,
        url: error?.url,
        error: error?.error
      });
    }
  }

}

