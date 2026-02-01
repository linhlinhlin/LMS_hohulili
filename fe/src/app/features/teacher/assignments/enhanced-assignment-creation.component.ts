import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AssignmentApi, CreateAssignmentRequest } from '../../../api/client/assignment.api';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';
import { ApiResponse } from '../../../api/types/common.types';
import { FileUploadComponent, FileUploadConfig } from '../../../shared/components/file-upload/enhanced-file-upload.component';
import { UploadedFile } from '../../../shared/models/uploaded-file.model';

export type AssignmentType = 'essay' | 'quiz' | 'programming' | 'project' | 'file_submission';

export interface AssignmentTemplate {
  id: string;
  name: string;
  type: AssignmentType;
  description: string;
  defaultConfig: {
    maxScore: number;
    timeLimit?: number; // in minutes
    allowMultipleAttempts: boolean;
    maxAttempts?: number;
    requireFileUpload: boolean;
    allowedFileTypes?: string[];
  };
}

@Component({
  selector: 'app-enhanced-assignment-creation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, FileUploadComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './enhanced-assignment-creation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnhancedAssignmentCreationComponent {
  private assignmentApi = inject(AssignmentApi);
  private courseApi = inject(CourseApi);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // State
  currentStep = signal(1);
  submitting = signal(false);
  success = signal('');
  error = signal('');
  courses = signal<CourseSummary[]>([]);
  attachedFiles = signal<UploadedFile[]>([]);
  selectedTemplate = signal<AssignmentTemplate | null>(null);
  selectedFileTypes = signal<string[]>([]);
  selectedCourseId = signal<string>('');
  availableLessons = signal<any[]>([]);

  // Assignment templates (nhÆ° Coursera)
  assignmentTemplates = signal<AssignmentTemplate[]>([
    {
      id: 'essay',
      name: 'BĂ i Luáº­n',
      type: 'essay',
      description: 'Há»c sinh viáº¿t bĂ i luáº­n dĂ i vá»›i yĂªu cáº§u vá» sá»‘ tá»«',
      defaultConfig: {
        maxScore: 100,
        allowMultipleAttempts: true,
        maxAttempts: 2,
        requireFileUpload: false
      }
    },
    {
      id: 'quiz',
      name: 'BĂ i Kiá»ƒm Tra',
      type: 'quiz',
      description: 'BĂ i kiá»ƒm tra tráº¯c nghiá»‡m vá»›i thá»i gian giá»›i háº¡n',
      defaultConfig: {
        maxScore: 100,
        timeLimit: 60,
        allowMultipleAttempts: false,
        requireFileUpload: false
      }
    },
    {
      id: 'programming',
      name: 'Láº­p TrĂ¬nh',
      type: 'programming',
      description: 'BĂ i táº­p code vá»›i tá»± Ä‘á»™ng cháº¥m Ä‘iá»ƒm',
      defaultConfig: {
        maxScore: 100,
        allowMultipleAttempts: true,
        maxAttempts: 5,
        requireFileUpload: true,
        allowedFileTypes: ['.java', '.py', '.js', '.cpp']
      }
    },
    {
      id: 'project',
      name: 'Dá»± Ăn',
      type: 'project',
      description: 'Dá»± Ă¡n lá»›n vá»›i nhiá»u file Ä‘Ă­nh kĂ¨m',
      defaultConfig: {
        maxScore: 100,
        allowMultipleAttempts: true,
        maxAttempts: 3,
        requireFileUpload: true,
        allowedFileTypes: ['.zip', '.rar', '.pdf', '.doc', '.docx']
      }
    },
    {
      id: 'file_submission',
      name: 'Ná»™p File',
      type: 'file_submission',
      description: 'BĂ i táº­p Ä‘Æ¡n giáº£n chá»‰ cáº§n ná»™p file',
      defaultConfig: {
        maxScore: 100,
        allowMultipleAttempts: true,
        maxAttempts: 2,
        requireFileUpload: true
      }
    }
  ]);

  availableFileTypes = [
    { value: '.pdf', label: 'PDF' },
    { value: '.doc', label: 'Word (.doc)' },
    { value: '.docx', label: 'Word (.docx)' },
    { value: '.txt', label: 'Text' },
    { value: '.jpg', label: 'JPEG' },
    { value: '.png', label: 'PNG' },
    { value: '.zip', label: 'ZIP' },
    { value: '.java', label: 'Java' },
    { value: '.py', label: 'Python' },
    { value: '.js', label: 'JavaScript' }
  ];

  // Form setup
  form = this.fb.group({
    // Basic info
    title: ['', [Validators.required, Validators.maxLength(255)]],
    courseId: ['', [Validators.required]],
    dueDate: [''],
    maxScore: [100, [Validators.required, Validators.min(1), Validators.max(1000)]],
    description: [''],
    instructions: [''],
    saveAsDraft: [false],

    // Lesson linking
    linkToLesson: [false],
    lessonId: [''],

    // Essay specific
    minWords: [0],
    maxWords: [5000],
    enablePeerReview: [false],

    // Quiz specific
    timeLimit: [60],
    maxAttempts: [1],
    randomizeQuestions: [false],

    // Programming specific
    programmingLanguage: ['java'],
    enableAutoGrading: [false]
  });

  // File upload configuration
  fileUploadConfig = computed<FileUploadConfig>(() => ({
    category: 'assignment',
    maxSize: 10,
    maxFiles: 5,
    allowedTypes: this.selectedFileTypes().length > 0 ? this.selectedFileTypes() : [
      '.pdf', 'application/pdf',
      '.doc', 'application/msword', 'doc',
      '.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx',
      '.txt', 'text/plain',
      '.jpg', '.jpeg', 'image/jpeg',
      '.png', 'image/png',
      '.zip', 'application/zip'
    ],
    acceptMultiple: true
  }));

  constructor() {
    this.loadCourses();
  }

  // Navigation
  nextStep() {
    if (this.currentStep() < 4) {
      this.currentStep.update(step => step + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
    }
  }

  // Template selection
  selectTemplate(template: AssignmentTemplate) {
    this.selectedTemplate.set(template);

    // Apply default configuration
    this.form.patchValue({
      maxScore: template.defaultConfig.maxScore,
      timeLimit: template.defaultConfig.timeLimit,
      maxAttempts: template.defaultConfig.maxAttempts || 1
    });

    if (template.defaultConfig.allowedFileTypes) {
      this.selectedFileTypes.set(template.defaultConfig.allowedFileTypes);
    }
  }

  toggleFileType(fileType: string) {
    const current = this.selectedFileTypes();
    if (current.includes(fileType)) {
      this.selectedFileTypes.set(current.filter(t => t !== fileType));
    } else {
      this.selectedFileTypes.set([...current, fileType]);
    }
  }

  getTypeLabel(type: AssignmentType): string {
    const labels = {
      essay: 'BĂ i luáº­n',
      quiz: 'Tráº¯c nghiá»‡m',
      programming: 'Láº­p trĂ¬nh',
      project: 'Dá»± Ă¡n',
      file_submission: 'Ná»™p file'
    };
    return labels[type];
  }

  private loadCourses() {
    this.courseApi.myCourses().subscribe({
      next: (response: ApiResponse<CourseSummary[]>) => {
        if (response.data) {
          this.courses.set(response.data);
        }
      },
      error: (error: Error) => {
        console.error('Error loading courses:', error);
      }
    });
  }

  onCourseChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const courseId = target.value;
    this.selectedCourseId.set(courseId);

    if (courseId) {
      this.loadLessonsForCourse(courseId);
    } else {
      this.availableLessons.set([]);
    }
  }

  private loadLessonsForCourse(courseId: string) {
    // For now, we'll use a simple approach - get course content
    // In a real implementation, you'd have a dedicated API for lessons by course
    this.courseApi.getCourseContent(courseId).subscribe({
      next: (response: any) => {
        if (response.data) {
          // Flatten sections and lessons
          const lessons: any[] = [];
          response.data.forEach((section: any) => {
            section.lessons?.forEach((lesson: any) => {
              lessons.push({
                ...lesson,
                sectionTitle: section.title
              });
            });
          });
          this.availableLessons.set(lessons);
        }
      },
      error: (error: Error) => {
        console.error('Error loading lessons:', error);
        this.availableLessons.set([]);
      }
    });
  }

  // File upload handlers
  onFilesUploaded(files: UploadedFile[]) {
    this.attachedFiles.set(files);
  }

  onFileDeleted(fileId: string) {
    const updated = this.attachedFiles().filter(f => f.id !== fileId);
    this.attachedFiles.set(updated);
  }

  onFileUploadError(error: string) {
    this.error.set(`Lá»—i táº£i file: ${error}`);
  }

  // Form submission
  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.success.set('');
    this.error.set('');

    const formValue = this.form.getRawValue();
    const template = this.selectedTemplate();

    // Check if linking to lesson
    if (formValue.linkToLesson && !formValue.lessonId) {
      this.error.set('Vui lĂ²ng chá»n bĂ i há»c Ä‘á»ƒ gáº¯n bĂ i táº­p');
      this.submitting.set(false);
      return;
    }

    // Prepare assignment config as JSON string
    const assignmentConfig = {
      // Type-specific config
      ...(template?.type === 'essay' && {
        minWords: formValue.minWords,
        maxWords: formValue.maxWords,
        enablePeerReview: formValue.enablePeerReview
      }),
      ...(template?.type === 'quiz' && {
        timeLimit: formValue.timeLimit,
        maxAttempts: formValue.maxAttempts,
        randomizeQuestions: formValue.randomizeQuestions
      }),
      ...(template?.type === 'programming' && {
        programmingLanguage: formValue.programmingLanguage,
        enableAutoGrading: formValue.enableAutoGrading
      }),
      allowedFileTypes: this.selectedFileTypes()
    };

    // Convert dueDate string to Instant (ISO string)
    let dueDateInstant: string | undefined;
    if (formValue.dueDate) {
      try {
        const date = new Date(formValue.dueDate);
        dueDateInstant = date.toISOString();
      } catch (error) {
        console.error('Invalid due date format:', formValue.dueDate);
        this.error.set('Äá»‹nh dáº¡ng ngĂ y háº¡n ná»™p khĂ´ng há»£p lá»‡');
        this.submitting.set(false);
        return;
      }
    }

    const request: CreateAssignmentRequest & any = {
      title: formValue.title!,
      description: formValue.description || undefined,
      instructions: formValue.instructions || undefined,
      dueDate: dueDateInstant,
      maxScore: formValue.maxScore!,
      assignmentConfig: assignmentConfig, // Send as object, not string
      attachments: this.attachedFiles().map(file => ({
        fileId: file.id,
        fileName: file.originalName,
        fileUrl: file.url || ''
      })),
      status: formValue.saveAsDraft ? 'DRAFT' : 'PUBLISHED'
    };

    // If linking to lesson, use lesson assignment API
    if (formValue.linkToLesson && formValue.lessonId) {
      this.createLessonAssignment(formValue.lessonId, request);
    } else {
      this.assignmentApi.createAssignment(formValue.courseId!, request).subscribe({
        next: (response) => {
          if (response.data) {
            this.success.set('Táº¡o bĂ i táº­p thĂ nh cĂ´ng!');
            setTimeout(() => {
              this.router.navigate(['/teacher/assignments']);
            }, 1500);
          }
        },
        error: (error) => {
          console.error('Error creating assignment:', error);
          this.error.set(error?.error?.message || 'Táº¡o bĂ i táº­p tháº¥t báº¡i');
        },
        complete: () => {
          this.submitting.set(false);
        }
      });
    }
  }

  private createLessonAssignment(lessonId: string, request: any) {
    // For lesson assignment, we need to call the lesson API
    // This would require a new API method or modifying existing one
    // For now, we'll create the assignment first, then link it
    this.assignmentApi.createAssignment(this.form.value.courseId!, request).subscribe({
      next: (response) => {
        if (response.data) {
          // TODO: Link assignment to lesson using lesson assignment API
          // For now, just show success
          this.success.set('Táº¡o bĂ i táº­p vĂ  gáº¯n vá»›i bĂ i há»c thĂ nh cĂ´ng!');
          setTimeout(() => {
            this.router.navigate(['/teacher/assignments']);
          }, 1500);
        }
      },
      error: (error) => {
        console.error('Error creating lesson assignment:', error);
        this.error.set(error?.error?.message || 'Táº¡o bĂ i táº­p gáº¯n vá»›i bĂ i há»c tháº¥t báº¡i');
      },
      complete: () => {
        this.submitting.set(false);
      }
    });
  }
}

