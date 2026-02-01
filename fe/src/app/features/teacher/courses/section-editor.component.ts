import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ViewEncapsulation, inject, signal, OnDestroy, ViewChild, resource } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ActivatedRoute, Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter, Subscription, take } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LessonApi } from '../../../api/client/lesson.api';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { DocumentService, DocumentUploadResponse, UploadProgress } from '../../../api/client/document.service';
import { LessonAttachmentApi } from '../../../api/client/lesson-attachment.api';
import { CreateAssignmentLessonRequest } from '../../../api/types/assignment.types';
import { CreateLessonRequest } from '../../../api/types/course.types';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { QuestionApi, Question } from '../../../api/endpoints/question.api';
import { SectionApi } from '../../../api/client/section.api';
import { PackageApi } from '../../../api/endpoints/package.api';
import { firstValueFrom } from 'rxjs';
import { QuizEditModalComponent } from './components/quiz-edit-modal.component';
import { QuizCreationModalComponent } from './components/quiz-creation-modal.component';
import { SectionSmartEditorComponent } from './components/section-smart-editor/section-smart-editor.component';

@Component({
  selector: 'app-section-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, QuizEditModalComponent, QuizCreationModalComponent, SectionSmartEditorComponent],
  encapsulation: ViewEncapsulation.None,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(16px) scale(0.96);
      }
      to { 
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(100px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    .animate-fadeIn {
      animation: fadeIn 0.15s ease-out;
    }
    .animate-slideUp {
      animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .animate-slideInRight {
      animation: slideInRight 0.3s ease-out;
    }
  `],
  templateUrl: './section-editor.component.html',
  // changeDetection: ChangeDetectionStrategy.OnPush  // Temporarily disabled for debugging
})
export class SectionEditorComponent implements OnDestroy {
  // SOTA 2025 Resource Pattern for PDF Viewing with Memory Cleanup
  pdfResource = (resource as any)({
    request: () => {
      const idx = this.expandedAttachment();
      const s = this.selected();
      if (idx !== null && s && s.attachments && s.attachments[idx]) {
        const attachment = s.attachments[idx];
        if (this.isPdfFile(attachment.originalFileName)) {
          return attachment.id;
        }
      }
      return null;
    },
    loader: async (params: any) => {
      const id = params.request;
      if (!id) return null;
      try {
        const blob = await firstValueFrom(this.http.get(`${environment.apiUrl}/api/v3/files/stream/${id}`, { responseType: 'blob' }));
        const url = URL.createObjectURL(blob);
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } catch (err) {
        console.error('âŒ Error loading PDF blob:', err);
        return null;
      }
    }
  });

  @ViewChild(QuizEditModalComponent) quizEditModal!: QuizEditModalComponent;
  @ViewChild(QuizCreationModalComponent) quizCreationModal!: QuizCreationModalComponent;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lessonApi = inject(LessonApi);
  private lessonAttachmentApi = inject(LessonAttachmentApi);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);
  private documentService = inject(DocumentService);
  private quizApi = inject(QuizApi);
  private questionApi = inject(QuestionApi);
  private packageApi = inject(PackageApi);
  private sectionApi = inject(SectionApi);
  private http = inject(HttpClient); // Inject HttpClient

  courseId: string = '';
  sectionId: string = '';
  lessons = signal<any[]>([]);

  // Section Management Signals
  showCreateSectionModal = signal(false); // Legacy? Maybe reuse or replace logic.
  // New Smart Editor State
  showSmartEditor = signal(false);
  activeLessonIdForEditor = signal<string | null>(null);

  createSectionType = signal<'TEXT' | 'VIDEO' | 'QUIZ'>('TEXT');
  editingSectionId = signal<string | null>(null);
  loading = signal(false); // Added missing signal

  error = signal<string>('');
  opError = signal<string>('');
  editingId = signal<string | null>(null);
  selected = signal<any | null>(null);
  private _sanitizedEmbed = signal<SafeResourceUrl | null>(null);

  // Document upload signals
  uploadProgress = signal<UploadProgress | null>(null);
  uploadSuccess = signal<string>('');

  // File attachments signals
  attachmentUploadProgress = signal<UploadProgress | null>(null);
  attachmentUploadSuccess = signal<string>('');

  // PDF upload for current lesson signals
  currentLessonUploadProgress = signal<UploadProgress | null>(null);
  currentLessonUploadSuccess = signal<string>('');

  // Edit attachments signals
  editAttachmentUploadProgress = signal<UploadProgress | null>(null);
  editAttachmentUploadSuccess = signal<string>('');

  // Show/hide create lesson form
  showCreateForm = signal<boolean>(false);

  // Store recently created quiz ID for NgĂ¢n hĂ ng cĂ¢u há»i navigation
  lastCreatedQuizId = signal<string | null>(null);
  lastCreatedQuizTitle = signal<string>('');

  // Router subscription for detecting navigation back
  private routerSubscription: Subscription | null = null;

  // Quiz viewer data
  currentViewingQuizId = signal<string | null>(null);
  quizQuestions = signal<any[]>([]);
  quizQuestionsLoading = signal<boolean>(false);

  // Quiz preview data
  showQuizPreview = signal<boolean>(false);
  previewQuizId = signal<string | null>(null);
  previewQuizTitle = signal<string>('');
  previewQuestions = signal<any[]>([]);

  // Course questions data
  courseQuestions = signal<Question[]>([]);
  courseQuestionsError = signal<string>('');

  // Selected questions for bulk addition
  selectedQuestionIds = signal<Set<string>>(new Set());

  // Quiz creation - Package and Question selection
  quizPackages = signal<any[]>([]);
  quizPackageId = '';
  quizPackageQuestions = signal<any[]>([]);
  selectedQuizQuestions = signal<Set<string>>(new Set());

  // Inline add questions to existing quiz
  inlinePackageId = '';
  inlinePackageQuestions = signal<any[]>([]);
  selectedInlineQuestions = signal<string[]>([]);
  addingInlineQuestions = signal<boolean>(false);

  // Temporary storage for attachments before lesson creation
  tempAttachments: File[] = [];

  // PDF fullscreen viewer state
  pdfFullscreenAttachment: any = null;
  showFullscreenHeader = true;
  fullscreenHeaderTimeout: any;

  // Delete confirmation modal state
  showDeleteModal = signal<boolean>(false);
  lessonToDelete = signal<any>(null);
  isDeleting = signal<boolean>(false);
  showSuccessToast = signal<boolean>(false);

  // Create lesson state - prevent double-click
  isCreating = signal<boolean>(false);



  lessonTypeOptions = [
    { value: 'LECTURE', label: 'đŸ“– BĂ i giáº£ng', icon: 'book' },
    { value: 'ASSIGNMENT', label: 'đŸ“‹ BĂ i táº­p', icon: 'assignment' },
    { value: 'QUIZ', label: 'â“ Tráº¯c nghiá»‡m', icon: 'quiz' }
  ];

  createForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    lessonType: ['LECTURE', [Validators.required]],
    content: [''], // Validation will be set dynamically based on lessonType
    videoUrl: [''],
    // Assignment-specific fields
    assignmentTitle: [''],
    assignmentDescription: [''],
    assignmentInstructions: [''],
    dueDate: [''],
    maxScore: [100],
    // Quiz-specific fields
    quizTimeLimit: [30],      // minutes
    quizMaxScore: [100],       // points
    quizMaxAttempts: [1]       // number of attempts
  });

  get isAssignmentType(): boolean {
    return this.createForm.get('lessonType')?.value === 'ASSIGNMENT';
  }

  get isQuizType(): boolean {
    return this.createForm.get('lessonType')?.value === 'QUIZ';
  }

  editForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    content: [''],
    videoUrl: ['']
  });

  constructor() {
    // Set initial validation for LECTURE (default type)
    this.createForm.get('content')?.setValidators([Validators.required]);

    this.sectionId = this.route.snapshot.paramMap.get('sectionId')!;
    // Resolve courseId to support back navigation
    this.courseId = this.route.snapshot.paramMap.get('courseId')
      || this.route.parent?.snapshot.paramMap.get('courseId')
      || this.route.parent?.parent?.snapshot.paramMap.get('courseId')
      || '';
    this.lessonApi.listBySection(this.sectionId).subscribe({
      next: (res) => this.lessons.set(res?.data || []),
      error: (err) => this.error.set(err?.message || 'KhĂ´ng táº£i Ä‘Æ°á»£c danh sĂ¡ch bĂ i há»c')
    });

    // Subscribe to router events to reload quiz questions when navigating back
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // If we have a quiz being viewed, reload its questions
      const currentQuizId = this.currentViewingQuizId();
      if (currentQuizId) {
        this.loadQuizQuestions(currentQuizId);
      }
    });

    // Watch lesson type changes and update field validation
    this.createForm.get('lessonType')?.valueChanges.subscribe(lessonType => {
      const contentControl = this.createForm.get('content');
      const assignmentDescriptionControl = this.createForm.get('assignmentDescription');

      if (lessonType === 'LECTURE') {
        // Content is required for LECTURE
        contentControl?.setValidators([Validators.required]);
        assignmentDescriptionControl?.clearValidators();
      } else if (lessonType === 'ASSIGNMENT') {
        // Content is optional for ASSIGNMENT, but assignmentDescription is required
        contentControl?.clearValidators();
        assignmentDescriptionControl?.setValidators([Validators.required]);
      } else if (lessonType === 'QUIZ') {
        // Quiz doesn't need content or assignment description
        contentControl?.clearValidators();
        assignmentDescriptionControl?.clearValidators();
        // Load packages when switching to QUIZ type
        this.loadQuizPackages();
      } else {
        // Other types - both optional
        contentControl?.clearValidators();
        assignmentDescriptionControl?.clearValidators();
      }

      contentControl?.updateValueAndValidity();
      assignmentDescriptionControl?.updateValueAndValidity();
    });

    // Add keyboard listener for ESC key to exit fullscreen
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.pdfFullscreenAttachment) {
        this.closePdfFullscreen();
      }
      // Space key to toggle header visibility in fullscreen
      if (event.key === ' ' && this.pdfFullscreenAttachment) {
        event.preventDefault();
        this.showFullscreenHeader = !this.showFullscreenHeader;
        if (this.showFullscreenHeader) {
          this.startHeaderAutoHide();
        }
      }
    });
  }

  createLesson() {
    const sectionId = this.route.snapshot.paramMap.get('sectionId')!;
    if (this.createForm.invalid) return;

    // Prevent double-click
    if (this.isCreating()) return;
    this.isCreating.set(true);

    const lessonType = this.createForm.value.lessonType;

    if (lessonType === 'ASSIGNMENT') {
      // Create assignment lesson using typed payload
      const payload: CreateAssignmentLessonRequest = {
        title: this.createForm.value.title ?? '',
        content: this.createForm.value.content || undefined,
        videoUrl: this.createForm.value.videoUrl || undefined,
        assignmentTitle: this.createForm.value.assignmentTitle ?? this.createForm.value.title ?? '',
        assignmentDescription: this.createForm.value.assignmentDescription ?? '',
        assignmentInstructions: this.createForm.value.assignmentInstructions || undefined,
        dueDate: this.createForm.value.dueDate ? new Date(this.createForm.value.dueDate).toISOString() : undefined,
        maxScore: Number(this.createForm.value.maxScore) || 100
      };

      // Use assignment endpoint
      this.lessonApi.createAssignmentLesson(sectionId, payload).subscribe({
        next: (res) => {
          const l = res?.data;
          if (l) {
            this.lessons.update(list => [...list, l]);

            // Upload attachments if any
            if (this.tempAttachments.length > 0) {
              this.uploadAttachmentsToLesson(l.id);
            }

            this.createForm.reset({
              title: '',
              lessonType: 'LECTURE',
              content: '',
              videoUrl: '',
              assignmentTitle: '',
              assignmentDescription: '',
              assignmentInstructions: '',
              dueDate: '',
              maxScore: 100
            });
            this.resetAttachments();

            // Close the form after successful creation
            this.showCreateForm.set(false);
          }
          this.isCreating.set(false);
        },
        error: (err) => {
          this.opError.set(err?.message || 'Táº¡o bĂ i táº­p tháº¥t báº¡i');
          this.isCreating.set(false);
        }
      });
    } else if (lessonType === 'QUIZ') {
      // Get selected question IDs
      const selectedQuestionIds = this.selectedQuizQuestions();

      // Create quiz lesson with configuration from form
      const lessonPayload: CreateLessonRequest = {
        title: this.createForm.value.title ?? '',
        lessonType: 'QUIZ',
        // Use values from form, with defaults if empty
        quizTimeLimit: Number(this.createForm.value.quizTimeLimit) || 30,
        quizMaxScore: Number(this.createForm.value.quizMaxScore) || 60,
        quizMaxAttempts: Number(this.createForm.value.quizMaxAttempts) || 1
      };

      // Create the lesson first
      this.lessonApi.createLesson(sectionId, lessonPayload).subscribe({
        next: async (lessonRes) => {
          const lesson = lessonRes?.data;
          if (lesson) {
            try {
              // Check if quiz already exists for this lesson
              let createdQuiz: any = null;

              try {
                // Try to get existing quiz
                const existingQuizResponse = await firstValueFrom(this.quizApi.getQuizByLessonId(lesson.id));
                createdQuiz = existingQuizResponse as any;

                // If quiz exists, update it with new questions
                if (createdQuiz && Array.from(selectedQuestionIds).length > 0) {
                  await firstValueFrom(this.quizApi.updateQuizQuestions(lesson.id, { questionIds: Array.from(selectedQuestionIds) }));
                  console.log('âœ… Updated existing quiz with new questions');
                }
              } catch (getQuizError: any) {
                // Quiz doesn't exist yet, create it
                if (getQuizError?.status === 404 || getQuizError?.message?.includes('not found')) {
                  const quizPayload = {
                    questionIds: Array.from(selectedQuestionIds), // Use selected questions
                    timeLimitMinutes: Number(this.createForm.value.quizTimeLimit) || 30,
                    maxAttempts: Number(this.createForm.value.quizMaxAttempts) || 1,
                    passingScore: Number(this.createForm.value.quizMaxScore) || 100,
                    shuffleQuestions: false,
                    shuffleOptions: false,
                    showResultsImmediately: true,
                    showCorrectAnswers: true
                  };

                  // Create Quiz entity
                  const quizResponse = await firstValueFrom(this.quizApi.createQuiz(lesson.id, quizPayload));
                  createdQuiz = quizResponse as any;
                  console.log('âœ… Created new quiz');
                } else {
                  throw getQuizError;
                }
              }

              if (createdQuiz) {
                this.lessons.update(list => [...list, lesson]);

                // Save quiz ID and title for NgĂ¢n hĂ ng cĂ¢u há»i navigation
                this.lastCreatedQuizId.set(createdQuiz.id || lesson.id);
                this.lastCreatedQuizTitle.set(lesson.title);

                // Reset form and quiz selection
                this.createForm.reset({
                  title: '',
                  lessonType: 'LECTURE',
                  content: '',
                  videoUrl: '',
                  assignmentTitle: '',
                  assignmentDescription: '',
                  assignmentInstructions: '',
                  dueDate: '',
                  maxScore: 100,
                  quizTimeLimit: 30,
                  quizMaxScore: 100,
                  quizMaxAttempts: 1
                });

                // Reset quiz selection state
                this.quizPackageId = '';
                this.quizPackageQuestions.set([]);
                this.selectedQuizQuestions.set(new Set());

                // Close the form after successful creation
                this.showCreateForm.set(false);

                // Show success message
                this.opError.set('');
                const questionCount = Array.from(selectedQuestionIds).length;
                alert(`âœ… ÄĂ£ táº¡o bĂ i tráº¯c nghiá»‡m "${lesson.title}" thĂ nh cĂ´ng!\n\nđŸ“ ${questionCount} cĂ¢u há»i Ä‘Ă£ Ä‘Æ°á»£c thĂªm vĂ o quiz.`);
              } else {
                // Lesson created but Quiz creation failed
                this.lessons.update(list => [...list, lesson]);
                this.opError.set('');
                alert(`â ï¸ ÄĂ£ táº¡o lesson "${lesson.title}" nhÆ°ng khĂ´ng thá»ƒ táº¡o Quiz entity. Vui lĂ²ng kiá»ƒm tra logs.`);
              }
              this.isCreating.set(false);
            } catch (quizError) {
              console.error('Quiz creation error:', quizError);
              // Still add the lesson even if quiz creation failed
              this.lessons.update(list => [...list, lesson]);
              this.opError.set('');
              this.isCreating.set(false);
              alert(`â ï¸ ÄĂ£ táº¡o lesson "${lesson.title}" nhÆ°ng lá»—i khi táº¡o Quiz entity: ${(quizError as any)?.message || 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh'}`);
            }
          }
        },
        error: (err) => {
          this.opError.set(err?.message || 'Táº¡o bĂ i tráº¯c nghiá»‡m tháº¥t báº¡i');
          this.isCreating.set(false);
        }
      });
    } else {
      // Create regular lesson (LECTURE)
      const payload: CreateLessonRequest = {
        title: this.createForm.value.title!,
        content: this.createForm.value.content || undefined,
        videoUrl: this.createForm.value.videoUrl || undefined,
        lessonType: 'LECTURE'
      };

      this.lessonApi.createLesson(sectionId, payload).subscribe({
        next: (res) => {
          const l = res?.data;
          if (l) {
            this.lessons.update(list => [...list, l]);

            // Upload attachments if any
            if (this.tempAttachments.length > 0) {
              this.uploadAttachmentsToLesson(l.id);
            }

            this.createForm.reset({
              title: '',
              lessonType: 'LECTURE',
              content: '',
              videoUrl: '',
              assignmentTitle: '',
              assignmentDescription: '',
              assignmentInstructions: '',
              dueDate: '',
              maxScore: 100
            });
            this.resetAttachments();

            // Close the form after successful creation
            this.showCreateForm.set(false);
          }
          this.isCreating.set(false);
        },
        error: (err) => {
          this.opError.set(err?.message || 'Táº¡o bĂ i há»c tháº¥t báº¡i');
          this.isCreating.set(false);
        }
      });
    }
  }

  startEdit(l: any) {
    // Close viewer if open (only show one at a time)
    this.selected.set(null);
    this._sanitizedEmbed.set(null);
    this.expandedAttachment.set(null);

    this.editingId.set(l.id);
    this.editForm.patchValue({ title: l.title || '', content: l.content || '', videoUrl: l.videoUrl || '' });

    // Scroll to edit form after a short delay to ensure it's rendered
    setTimeout(() => {
      const editPanel = document.querySelector('[class*="Edit Lesson Panel"]')?.parentElement;
      if (editPanel) {
        editPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  startAddNew() {
    this.showCreateForm.set(true);
    this.createForm.reset();
    // Close view form when opening create form
    this.selected.set(null);
    this.currentViewingQuizId.set(null);
  }

  cancelEdit() { this.editingId.set(null); }

  saveEdit(id: string) {
    if (this.editForm.invalid) return;
    const payload: any = {
      courseId: this.courseId, // Required by backend
      // chapterId not needed - backend will scan chapters to find lesson
      title: this.editForm.value.title || undefined,
      content: this.editForm.value.content || undefined,
      videoUrl: this.editForm.value.videoUrl || undefined
    };
    this.lessonApi.updateLesson(id, payload).subscribe({
      next: () => {
        this.lessons.update(list => list.map(it => it.id === id ? { ...it, ...payload } : it));
        this.cancelEdit();
      },
      error: (err) => this.opError.set(err?.message || 'Cáº­p nháº­t bĂ i há»c tháº¥t báº¡i')
    });
  }

  deleteLesson(id: string) {
    this.lessonApi.deleteLesson(id, this.courseId).subscribe({
      next: () => this.lessons.update(list => list.filter(i => i.id !== id)),
      error: (err) => this.opError.set(err?.message || 'XĂ³a bĂ i há»c tháº¥t báº¡i')
    });
  }

  // Confirm delete with proper message based on lesson type
  private cdr = inject(ChangeDetectorRef);

  confirmDeleteLesson(lesson: any) {
    this.lessonToDelete.set(lesson);
    this.showDeleteModal.set(true);
  }

  cancelDelete() {
    this.showDeleteModal.set(false);
    this.isDeleting.set(false);
    this.lessonToDelete.set(null);
  }

  executeDelete() {
    const lesson = this.lessonToDelete();
    if (!lesson) return;

    const id = lesson.id;
    this.isDeleting.set(true);

    this.lessonApi.deleteLesson(id, this.courseId).pipe(
      take(1)
    ).subscribe({
      next: () => {
        // Remove from list
        this.lessons.update(list => list.filter(i => i.id !== id));

        // Close modal
        this.showDeleteModal.set(false);
        this.lessonToDelete.set(null);
        this.isDeleting.set(false);

        // Show success toast
        this.showSuccessToast.set(true);

        // Auto hide toast after 3 seconds
        setTimeout(() => {
          this.showSuccessToast.set(false);
        }, 3000);
      },
      error: (err) => {
        this.opError.set(err?.message || 'XĂ³a bĂ i há»c tháº¥t báº¡i');
        this.isDeleting.set(false);
      }
    });
  }

  // Get delete warning message based on lesson type
  getDeleteWarningMessage(): string {
    const lesson = this.lessonToDelete();
    if (!lesson) return '';

    if (lesson.lessonType === 'QUIZ') {
      return 'Táº¥t cáº£ cĂ¢u há»i trong quiz vĂ  káº¿t quáº£ lĂ m bĂ i cá»§a há»c viĂªn sáº½ bá»‹ xĂ³a vÄ©nh viá»…n.';
    } else if (lesson.lessonType === 'ASSIGNMENT') {
      return 'Táº¥t cáº£ bĂ i ná»™p cá»§a há»c viĂªn sáº½ bá»‹ xĂ³a vÄ©nh viá»…n.';
    }
    return 'HĂ nh Ä‘á»™ng nĂ y khĂ´ng thá»ƒ hoĂ n tĂ¡c.';
  }

  // Preview quiz - simulate student experience
  async previewQuizLesson(lesson: any) {
    try {
      // First check if quiz has questions
      const response = await firstValueFrom(this.quizApi.getQuizQuestions(lesson.id));
      const questions = Array.isArray(response) ? response : (response as any).data || [];

      if (questions.length === 0) {
        alert('â ï¸ Quiz nĂ y chÆ°a cĂ³ cĂ¢u há»i nĂ o.\n\nVui lĂ²ng thĂªm cĂ¢u há»i trÆ°á»›c khi xem trÆ°á»›c.');
        return;
      }

      // Navigate to quiz preview page
      this.router.navigate(['/teacher/quiz/preview', lesson.id], {
        queryParams: {
          title: lesson.title,
          returnUrl: this.router.url
        }
      });
    } catch (error: any) {
      console.error('Error previewing quiz:', error);
      alert('KhĂ´ng thá»ƒ xem trÆ°á»›c quiz: ' + (error?.message || 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh'));
    }
  }

  // --- Viewer helpers ---
  viewLesson(l: any) {
    console.log('đŸ¯ viewLesson called for:', l);
    console.log('đŸ¥ Video URL check:', {
      raw: l?.videoUrl,
      hasValid: this.hasValidVideoUrl(l)
    });

    // Close edit panel if open (only show one at a time)
    this.editingId.set(null);

    this.selected.set(l);

    // Only setup video embed if video URL exists and is valid
    if (this.hasValidVideoUrl(l)) {
      const url = l.videoUrl.trim();
      if (this.isYouTube(url)) {
        const embed = this.toYouTubeEmbed(url);
        this._sanitizedEmbed.set(this.sanitizer.bypassSecurityTrustResourceUrl(embed));
        console.log('âœ… YouTube embed setup for:', url);
      } else {
        this._sanitizedEmbed.set(null);
        console.log('đŸ“¹ Non-YouTube video URL:', url);
      }
    } else {
      // No valid video URL, clear any previous embed
      this._sanitizedEmbed.set(null);
      console.log('âŒ No valid video URL, clearing embed');
    }

    // Load attachments for this lesson - THIS IS CRITICAL!
    console.log('đŸ“ Loading attachments for lesson:', l.id);
    this.loadLessonAttachments(l.id);

    // Auto-load quiz questions if this is a QUIZ lesson
    if (l.lessonType === 'QUIZ') {
      console.log('đŸ¯ Auto-loading quiz questions for lesson:', l.id);
      this.loadQuizQuestions(l.id);
      // Also load packages for inline add questions
      this.loadQuizPackages();
      // Reset inline selection state
      this.inlinePackageId = '';
      this.inlinePackageQuestions.set([]);
      this.selectedInlineQuestions.set([]);
    }
  }

  closeViewer() {
    this.selected.set(null);
    this._sanitizedEmbed.set(null);
    this.expandedAttachment.set(null);
    this.closePdfFullscreen();
  }

  sanitizedEmbed() {
    return this._sanitizedEmbed();
  }

  isYouTube(url: string): boolean {
    if (!url) return false;
    try {
      const u = new URL(url);
      return u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be');
    } catch { return false; }
  }

  hasValidVideoUrl(lesson: any): boolean {
    const url = lesson?.videoUrl;
    // Check for null, undefined, empty string, or whitespace-only string
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return false;
    }

    // Additional check for common invalid values
    const cleanUrl = url.trim().toLowerCase();
    if (cleanUrl === 'null' || cleanUrl === 'undefined' || cleanUrl === '') {
      return false;
    }

    // Try to create URL to validate format
    try {
      new URL(url.trim());
      return true;
    } catch {
      return false;
    }
  }

  toYouTubeEmbed(url: string): string {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace('/', '');
        return `https://www.youtube.com/embed/${id}`;
      }
      if (u.hostname.includes('youtube.com')) {
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
        // handle /shorts/ or /embed/
        const parts = u.pathname.split('/').filter(Boolean);
        const idx = parts.findIndex(p => p === 'embed' || p === 'shorts' || p === 'watch');
        if (idx >= 0 && parts[idx + 1]) return `https://www.youtube.com/embed/${parts[idx + 1]}`;
      }
    } catch { }
    return url; // fallback
  }

  // --- Document Upload Methods ---
  onDocumentUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.processDocumentUpload(file, this.createForm);
  }

  onDocumentUploadEdit(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.processDocumentUpload(file, this.editForm);
  }

  // Handle instructions document upload for assignments
  onInstructionsDocumentUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.processInstructionsDocumentUpload(file);
  }

  // Handle file attachments upload for edit
  onEditAttachmentsUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) return;

    const lesson = this.getCurrentLessonForEdit();
    if (!lesson) {
      this.opError.set('KhĂ´ng tĂ¬m tháº¥y bĂ i há»c Ä‘á»ƒ chá»‰nh sá»­a');
      return;
    }

    // Process each file
    Array.from(files).forEach(file => {
      this.uploadAttachmentForEdit(file, lesson.id);
    });

    // Clear file input
    input.value = '';
  }

  // Upload single attachment for editing lesson
  private uploadAttachmentForEdit(file: File, lessonId: string) {
    // Validate file
    const validation = this.validateAttachmentFile(file);
    if (!validation.isValid) {
      this.opError.set(validation.error || 'File khĂ´ng há»£p lá»‡');
      return;
    }

    console.log('đŸ“¤ Uploading attachment to lesson (edit):', lessonId, 'File:', file.name);

    // Reset states
    this.editAttachmentUploadProgress.set(null);
    this.editAttachmentUploadSuccess.set('');
    this.opError.set('');

    // Upload attachment to lesson
    this.lessonAttachmentApi.addAttachment(lessonId, file, 0).subscribe({
      next: (result) => {
        if ('progress' in result) {
          // Progress update
          this.editAttachmentUploadProgress.set(result);
        } else {
          // Upload completed
          this.editAttachmentUploadProgress.set(null);
          this.editAttachmentUploadSuccess.set(`ÄĂ£ thĂªm: ${file.name}`);

          // Reload attachments for this lesson
          console.log('đŸ”„ Reloading attachments after edit upload...');
          this.loadLessonAttachments(lessonId);

          // Clear success message after 3 seconds
          setTimeout(() => {
            this.editAttachmentUploadSuccess.set('');
          }, 3000);
        }
      },
      error: (error) => {
        console.error('đŸ“¤ Edit upload error:', error);
        this.editAttachmentUploadProgress.set(null);

        let errorMsg = `Lá»—i upload: ${file.name}`;
        if (error?.status === 403) {
          errorMsg += ' - KhĂ´ng cĂ³ quyá»n upload';
        } else if (error?.status === 401) {
          errorMsg += ' - PhiĂªn Ä‘Äƒng nháº­p háº¿t háº¡n';
        } else {
          errorMsg += ` - ${error?.message || 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh'}`;
        }

        this.opError.set(errorMsg);
      }
    });
  }

  // Get current lesson being edited
  getCurrentLessonForEdit(): any {
    const editId = this.editingId();
    if (!editId) return null;
    return this.lessons().find(l => l.id === editId);
  }

  // Remove attachment from editing lesson
  removeAttachmentFromEditingLesson(attachmentId: string) {
    const lesson = this.getCurrentLessonForEdit();
    if (!lesson) return;

    this.lessonAttachmentApi.deleteAttachment(attachmentId).subscribe({
      next: () => {
        console.log('đŸ—‘ï¸ Attachment deleted successfully');
        // Reload attachments for this lesson
        this.loadLessonAttachments(lesson.id);
      },
      error: (error) => {
        console.error('đŸ—‘ï¸ Delete attachment error:', error);
        this.opError.set('Lá»—i xĂ³a tá»‡p Ä‘Ă­nh kĂ¨m: ' + (error?.message || 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh'));
      }
    });
  }

  private processDocumentUpload(file: File, targetForm: any) {
    // Reset states
    this.uploadProgress.set(null);
    this.uploadSuccess.set('');
    this.opError.set('');

    // Validate file
    const validation = this.documentService.validateFile(file);
    if (!validation.isValid) {
      this.opError.set(validation.error || 'Invalid file');
      return;
    }

    // Upload and process
    this.documentService.uploadDocument(file).subscribe({
      next: (result) => {
        if ('progress' in result) {
          // Progress update
          this.uploadProgress.set(result as UploadProgress);
        } else {
          // Final result
          const response = result as DocumentUploadResponse;
          if (response.success) {
            // Update form content
            targetForm.patchValue({
              content: response.content
            });
            this.uploadSuccess.set(response.filename);
            this.uploadProgress.set(null);
          } else {
            this.opError.set(response.message || 'Upload failed');
            this.uploadProgress.set(null);
          }
        }
      },
      error: (error) => {
        console.error('Document upload error:', error);
        this.opError.set(error?.error?.message || 'CĂ³ lá»—i xáº£y ra khi táº£i file');
        this.uploadProgress.set(null);
      }
    });
  }

  // Process instructions document upload specifically for assignments
  private processInstructionsDocumentUpload(file: File) {
    // Reset states
    this.uploadProgress.set(null);
    this.uploadSuccess.set('');
    this.opError.set('');

    // Validate file
    const validation = this.documentService.validateFile(file);
    if (!validation.isValid) {
      this.opError.set(validation.error || 'Invalid file');
      return;
    }

    // Upload and process
    this.documentService.uploadDocument(file).subscribe({
      next: (result) => {
        if ('progress' in result) {
          // Progress update
          this.uploadProgress.set(result as UploadProgress);
        } else {
          // Final result
          const response = result as DocumentUploadResponse;
          if (response.success) {
            // Update assignment instructions field specifically
            this.createForm.patchValue({
              assignmentInstructions: response.content
            });
            this.uploadSuccess.set(`ÄĂ£ Ä‘iá»n hÆ°á»›ng dáº«n tá»«: ${response.filename}`);
            this.uploadProgress.set(null);
          } else {
            this.opError.set(response.message || 'Upload failed');
            this.uploadProgress.set(null);
          }
        }
      },
      error: (error) => {
        console.error('Instructions document upload error:', error);
        this.opError.set(error?.error?.message || 'CĂ³ lá»—i xáº£y ra khi táº£i file hÆ°á»›ng dáº«n');
        this.uploadProgress.set(null);
      }
    });
  }

  // --- File Attachments Upload Methods ---
  onFileAttachmentsUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) return;

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.uploadFileAttachment(file);
    }
  }

  private uploadFileAttachment(file: File) {
    // Reset states
    this.attachmentUploadProgress.set(null);
    this.attachmentUploadSuccess.set('');
    this.opError.set('');

    // Validate file
    const validation = this.validateAttachmentFile(file);
    if (!validation.isValid) {
      this.opError.set(validation.error || 'Invalid file');
      return;
    }

    // Store file temporarily to attach to the next created lesson
    if (!this.tempAttachments) {
      this.tempAttachments = [];
    }
    this.tempAttachments.push(file);
    this.attachmentUploadSuccess.set(`ÄĂ£ thĂªm file: ${file.name}. File sáº½ Ä‘Æ°á»£c Ä‘Ă­nh kĂ¨m khi táº¡o bĂ i há»c.`);
  }

  private validateAttachmentFile(file: File): { isValid: boolean; error?: string } {
    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size exceeds 100MB limit'
      };
    }

    // Check file extension
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.mp4', '.avi', '.mov', '.mp3', '.wav'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      return {
        isValid: false,
        error: 'Only PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, MP4, AVI, MOV, MP3, WAV files are supported'
      };
    }

    return { isValid: true };
  }

  private refreshLessons() {
    const sectionId = this.route.snapshot.paramMap.get('sectionId')!;
    this.lessonApi.listBySection(sectionId).subscribe({
      next: (res) => this.lessons.set(res?.data || []),
      error: (err) => this.error.set(err?.message || 'KhĂ´ng táº£i Ä‘Æ°á»£c danh sĂ¡ch bĂ i há»c')
    });
  }

  resetForm() {
    this.createForm.reset();
    this.uploadSuccess.set('');
    this.uploadProgress.set(null);
    this.attachmentUploadSuccess.set('');
    this.attachmentUploadProgress.set(null);
    this.opError.set('');
    this.resetAttachments();
  }

  openQuizBankInNewTab() {
    // Navigate to NgĂ¢n hĂ ng cĂ¢u há»i in same tab with quiz context if available
    const quizId = this.lastCreatedQuizId();
    const quizTitle = this.lastCreatedQuizTitle();

    if (quizId && quizTitle) {
      // Pass quiz context via URL query params
      this.router.navigate(['/teacher/quiz/quiz-bank'], {
        queryParams: {
          quizId: quizId,
          quizTitle: quizTitle,
          returnUrl: this.router.url // Save current URL to return later
        }
      });
    } else {
      // Open without context
      this.router.navigate(['/teacher/quiz/quiz-bank']);
    }
  }

  // ==================== QUIZ PACKAGE SELECTION METHODS ====================

  async loadQuizPackages() {
    try {
      const packages = await firstValueFrom(this.packageApi.getMyPackages());
      this.quizPackages.set(packages || []);
      console.log('đŸ“¦ Loaded packages:', packages?.length || 0);
      console.log('đŸ“¦ Package details:', packages);
    } catch (error) {
      console.error('Failed to load packages:', error);
      this.quizPackages.set([]);
    }
  }

  async loadQuizPackageQuestions() {
    if (!this.quizPackageId) {
      this.quizPackageQuestions.set([]);
      return;
    }

    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(this.quizPackageId));
      const questionList = Array.isArray(questions) ? questions : [];
      this.quizPackageQuestions.set(questionList);
      console.log('đŸ“ Loaded questions for package:', questionList.length);
    } catch (error) {
      console.error('Failed to load package questions:', error);
      this.quizPackageQuestions.set([]);
    }
  }


  async onQuizPackageChange(packageId: string) {
    this.quizPackageId = packageId;
    this.selectedQuizQuestions.set(new Set());

    if (!packageId) {
      this.quizPackageQuestions.set([]);
      return;
    }

    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(packageId));
      const questionList = Array.isArray(questions) ? questions : [];
      this.quizPackageQuestions.set(questionList);
      console.log('đŸ“ Loaded questions for package:', questionList.length);
    } catch (error) {
      console.error('Failed to load package questions:', error);
      this.quizPackageQuestions.set([]);
    }
  }

  // ==================== INLINE ADD QUESTIONS TO EXISTING QUIZ ====================

  async onInlinePackageChange(packageId: string) {
    this.inlinePackageId = packageId;
    this.selectedInlineQuestions.set([]);

    if (!packageId) {
      this.inlinePackageQuestions.set([]);
      return;
    }

    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(packageId));
      const questionList = Array.isArray(questions) ? questions : [];
      this.inlinePackageQuestions.set(questionList);
      console.log('đŸ“ Loaded inline questions for package:', questionList.length);
    } catch (error) {
      console.error('Failed to load inline package questions:', error);
      this.inlinePackageQuestions.set([]);
    }
  }

  clearInlinePackageSelection() {
    this.inlinePackageId = '';
    this.inlinePackageQuestions.set([]);
    this.selectedInlineQuestions.set([]);
  }

  toggleInlineQuestion(questionId: string) {
    const current = this.selectedInlineQuestions();
    if (current.includes(questionId)) {
      this.selectedInlineQuestions.set(current.filter(id => id !== questionId));
    } else {
      this.selectedInlineQuestions.set([...current, questionId]);
    }
  }

  toggleInlineQuestionSelection(questionId: string) {
    this.toggleInlineQuestion(questionId);
  }

  clearInlineQuestionSelection() {
    this.selectedInlineQuestions.set([]);
  }

  isInlineQuestionSelected(questionId: string): boolean {
    return this.selectedInlineQuestions().includes(questionId);
  }

  selectAllInlineQuestions() {
    const allIds = this.inlinePackageQuestions().map(q => q.id);
    if (this.selectedInlineQuestions().length === allIds.length) {
      // Deselect all
      this.selectedInlineQuestions.set([]);
    } else {
      // Select all
      this.selectedInlineQuestions.set(allIds);
    }
  }

  async addInlineQuestionsToQuiz(lessonId: string) {
    const selectedIds = this.selectedInlineQuestions();
    if (selectedIds.length === 0) return;

    this.addingInlineQuestions.set(true);

    try {
      let addedCount = 0;
      let skippedCount = 0;

      for (const questionId of selectedIds) {
        try {
          console.log('đŸ”„ Adding question to quiz - lessonId:', lessonId, 'questionId:', questionId);
          const result = await firstValueFrom(this.quizApi.addQuestionToQuiz(lessonId, questionId));
          console.log('âœ… Add question result:', result);
          addedCount++;
        } catch (error: any) {
          console.error('âŒ Error adding question:', questionId, error);
          if (error?.error?.message?.includes('Ä‘Ă£ tá»“n táº¡i')) {
            skippedCount++;
          } else {
            // Log full error for debugging
            console.error('Full error:', JSON.stringify(error, null, 2));
          }
        }
      }

      // Reload quiz questions
      await this.loadQuizQuestions(lessonId);

      // Reset inline selection
      this.selectedInlineQuestions.set([]);
      this.inlinePackageId = '';
      this.inlinePackageQuestions.set([]);

      // Show result
      console.log('đŸ“ Add result - added:', addedCount, 'skipped:', skippedCount);
      if (addedCount > 0) {
        let msg = `âœ… ÄĂ£ thĂªm ${addedCount} cĂ¢u há»i vĂ o Quiz!`;
        if (skippedCount > 0) {
          msg += ` (${skippedCount} cĂ¢u Ä‘Ă£ cĂ³ sáºµn)`;
        }
        alert(msg);
        // Close modal after success
        this.closeInlineAddQuestionsModal();
      } else if (skippedCount > 0) {
        alert('â ï¸ Táº¥t cáº£ cĂ¢u há»i Ä‘Ă£ cĂ³ trong Quiz rá»“i!');
      } else {
        alert('â ï¸ KhĂ´ng cĂ³ cĂ¢u há»i nĂ o Ä‘Æ°á»£c thĂªm. Kiá»ƒm tra console log Ä‘á»ƒ biáº¿t chi tiáº¿t.');
      }
    } catch (error: any) {
      console.error('Error adding inline questions:', error);
      alert('âŒ Lá»—i: ' + (error?.message || error?.error?.message || 'KhĂ´ng xĂ¡c Ä‘á»‹nh'));
    } finally {
      this.addingInlineQuestions.set(false);
    }
  }

  async loadQuizQuestions(lessonId: string): Promise<void> {
    this.quizQuestionsLoading.set(true);
    this.currentViewingQuizId.set(lessonId);

    try {
      console.log('đŸ” Loading quiz questions for lesson:', lessonId);

      // Fetch real questions from API using lesson ID
      const response = await firstValueFrom(this.quizApi.getQuizQuestions(lessonId));
      console.log('đŸ“¦ Raw API response:', response);

      // Handle ApiResponse wrapper
      const questions = Array.isArray(response) ? response : (response as any).data || [];

      console.log('đŸ“ Loaded quiz questions:', questions.length, 'questions');

      // Transform to display format - handle both optionKey and key
      this.quizQuestions.set(questions.map((q: any) => ({
        id: q.id,
        content: q.content,
        difficulty: q.difficulty,
        tags: q.tags,
        correctOption: q.correctOption,
        options: (q.options || []).sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((opt: any) => ({
          key: opt.optionKey || opt.key,
          optionKey: opt.optionKey || opt.key,
          content: opt.content
        }))
      })));

    } catch (error: any) {
      console.error('âŒ Error loading quiz questions:', error);
      console.error('âŒ Error details:', JSON.stringify(error, null, 2));

      // Show error to user if quiz not found
      if (error?.error?.message?.includes('Quiz not found')) {
        console.log('â ï¸ Quiz entity does not exist for this lesson. It will be created when adding questions.');
      }

      this.quizQuestions.set([]);
    } finally {
      this.quizQuestionsLoading.set(false);
    }
  }

  // Open modal to add questions from NgĂ¢n hĂ ng cĂ¢u há»i
  showInlineAddQuestionsModal = signal<boolean>(false);
  inlineAddQuizLessonId = signal<string | null>(null);

  openAddQuestionsModal(lessonId: string) {
    // Load packages first, then show inline modal
    this.loadQuizPackages();
    this.inlineAddQuizLessonId.set(lessonId);
    this.showInlineAddQuestionsModal.set(true);
    // Reset selection
    this.inlinePackageId = '';
    this.inlinePackageQuestions.set([]);
    this.selectedInlineQuestions.set([]);
  }

  closeInlineAddQuestionsModal() {
    this.showInlineAddQuestionsModal.set(false);
    this.inlineAddQuizLessonId.set(null);
    this.inlinePackageId = '';
    this.inlinePackageQuestions.set([]);
    this.selectedInlineQuestions.set([]);
  }

  // Remove question from quiz
  async removeQuestionFromQuiz(lessonId: string, questionId: string) {
    if (!confirm('Báº¡n cĂ³ cháº¯c muá»‘n xĂ³a cĂ¢u há»i nĂ y khá»i quiz?')) return;

    try {
      await firstValueFrom(this.quizApi.removeQuestionFromQuiz(lessonId, questionId));
      // Reload questions
      await this.loadQuizQuestions(lessonId);
      console.log('âœ… Removed question from quiz');
    } catch (error) {
      console.error('Error removing question:', error);
      alert('KhĂ´ng thá»ƒ xĂ³a cĂ¢u há»i: ' + (error as any).message);
    }
  }

  // Edit question - navigate to NgĂ¢n hĂ ng cĂ¢u há»i with question ID
  editQuestionInQuizBank(questionId: string) {
    this.router.navigate(['/teacher/quiz/quiz-bank'], {
      queryParams: {
        editQuestion: questionId,
        returnUrl: this.router.url
      }
    });
  }

  async previewQuiz(quizId: string, quizTitle: string) {
    try {
      console.log('đŸ” Preview Quiz - ID:', quizId, 'Title:', quizTitle);

      // Load quiz questions first to validate
      const response = await firstValueFrom(this.quizApi.getQuizQuestions(quizId));
      console.log('đŸ” Preview Quiz - API Response:', response);

      const questions = Array.isArray(response) ? response : (response as any).data || [];
      console.log('đŸ” Preview Quiz - Questions:', questions);

      if (questions.length === 0) {
        alert('Quiz nĂ y chÆ°a cĂ³ cĂ¢u há»i nĂ o. Vui lĂ²ng thĂªm cĂ¢u há»i trÆ°á»›c khi xem trÆ°á»›c.');
        return;
      }

      // Navigate to quiz preview page
      this.router.navigate(['/teacher/quiz/preview', quizId]);

    } catch (error) {
      console.error('âŒ Error loading quiz for preview:', error);
      alert('KhĂ´ng thá»ƒ táº£i quiz Ä‘á»ƒ xem trÆ°á»›c: ' + (error as any).message);
    }
  }

  closeQuizPreview() {
    this.showQuizPreview.set(false);
    this.previewQuizId.set(null);
    this.previewQuizTitle.set('');
    this.previewQuestions.set([]);
  }

  selectPreviewAnswer(questionId: string, selectedKey: string) {
    const questions = this.previewQuestions();
    const updatedQuestions = questions.map(q =>
      q.id === questionId ? { ...q, selectedAnswer: selectedKey } : q
    );
    this.previewQuestions.set(updatedQuestions);
  }

  openQuizBankToAddQuestions(quizId: string, quizTitle: string) {
    // Navigate to NgĂ¢n hĂ ng cĂ¢u há»i to add questions to an existing quiz
    this.router.navigate(['/teacher/quiz/quiz-bank'], {
      queryParams: {
        quizId: quizId,
        quizTitle: quizTitle,
        courseId: this.courseId,  // Pass courseId for question creation
        returnUrl: this.router.url
      }
    });
  }

  toggleCreateForm() {
    this.showCreateForm.update(show => !show);
    // Reset form when opening
    if (this.showCreateForm()) {
      this.resetForm();
      // Close view form and edit form when opening create form (only show one at a time)
      this.selected.set(null);
      this.currentViewingQuizId.set(null);
      this.editingId.set(null);
    }
  }

  private uploadAttachmentsToLesson(lessonId: string) {
    if (this.tempAttachments.length === 0) return;

    // Debug authentication
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('lms_user');
    console.log('đŸ” Debug Auth Status:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      hasUser: !!userStr,
      user: userStr ? JSON.parse(userStr) : null
    });

    this.attachmentUploadProgress.set({
      progress: 0,
      status: 'uploading',
      message: `Uploading ${this.tempAttachments.length} attachments...`
    });

    // Upload each attachment
    let completedUploads = 0;
    const totalUploads = this.tempAttachments.length;

    this.tempAttachments.forEach((file, index) => {
      this.lessonAttachmentApi.addAttachment(lessonId, file, index).subscribe({
        next: (result) => {
          if ('progress' in result) {
            // Progress update
            this.attachmentUploadProgress.set(result);
          } else {
            // Upload completed for this file
            completedUploads++;
            const overallProgress = Math.round((completedUploads / totalUploads) * 100);

            if (completedUploads === totalUploads) {
              // All uploads completed
              this.attachmentUploadProgress.set(null);
              this.attachmentUploadSuccess.set(`Successfully uploaded ${totalUploads} attachments`);
            } else {
              this.attachmentUploadProgress.set({
                progress: overallProgress,
                status: 'uploading',
                message: `Uploaded ${completedUploads}/${totalUploads} attachments`
              });
            }
          }
        },
        error: (error) => {
          console.error('đŸ“¤ Attachment upload error:', {
            file: file.name,
            error: error,
            status: error?.status,
            message: error?.message,
            details: error?.error
          });

          let errorMsg = `Lá»—i upload ${file.name}`;
          if (error?.status === 403) {
            errorMsg += ': KhĂ´ng cĂ³ quyá»n. Vui lĂ²ng Ä‘Äƒng nháº­p vá»›i tĂ i khoáº£n TEACHER.';
          } else if (error?.status === 401) {
            errorMsg += ': PhiĂªn Ä‘Äƒng nháº­p háº¿t háº¡n. Vui lĂ²ng Ä‘Äƒng nháº­p láº¡i.';
          } else {
            errorMsg += `: ${error?.message || 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh'}`;
          }

          this.opError.set(errorMsg);
          this.attachmentUploadProgress.set(null);
        }
      });
    });
  }

  private resetAttachments() {
    this.tempAttachments = [];
    this.attachmentUploadSuccess.set('');
    this.attachmentUploadProgress.set(null);
  }

  removeAttachment(index: number) {
    this.tempAttachments.splice(index, 1);
    if (this.tempAttachments.length === 0) {
      this.attachmentUploadSuccess.set('');
    }
  }

  getFileExtension(fileName: string): string {
    const ext = fileName.split('.').pop()?.toUpperCase() || '';
    return ext;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // File type detection methods
  isPdfFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.pdf');
  }

  isPresentationFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.ppt') || ext.endsWith('.pptx');
  }

  isOfficeFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.doc') || ext.endsWith('.docx') ||
      ext.endsWith('.xls') || ext.endsWith('.xlsx') ||
      ext.endsWith('.ppt') || ext.endsWith('.pptx');
  }

  isImageFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.jpg') || ext.endsWith('.jpeg') ||
      ext.endsWith('.png') || ext.endsWith('.gif') ||
      ext.endsWith('.bmp') || ext.endsWith('.webp');
  }

  isVideoFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.mp4') || ext.endsWith('.avi') ||
      ext.endsWith('.mov') || ext.endsWith('.wmv') ||
      ext.endsWith('.webm');
  }

  isAudioFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.mp3') || ext.endsWith('.wav') ||
      ext.endsWith('.aac') || ext.endsWith('.ogg');
  }

  getFileTypeClass(fileName: string): string {
    if (this.isPdfFile(fileName)) return 'bg-red-100 text-red-800';
    if (this.isPresentationFile(fileName)) return 'bg-green-100 text-green-800';
    if (this.isOfficeFile(fileName)) return 'bg-blue-100 text-blue-800';
    if (this.isImageFile(fileName)) return 'bg-purple-100 text-purple-800';
    if (this.isVideoFile(fileName)) return 'bg-yellow-100 text-yellow-800';
    if (this.isAudioFile(fileName)) return 'bg-pink-100 text-pink-800';
    return 'bg-gray-100 text-gray-800';
  }

  getVideoMimeType(fileName: string): string {
    const ext = fileName.toLowerCase();
    if (ext.endsWith('.mp4')) return 'video/mp4';
    if (ext.endsWith('.webm')) return 'video/webm';
    if (ext.endsWith('.avi')) return 'video/avi';
    if (ext.endsWith('.mov')) return 'video/quicktime';
    return 'video/mp4';
  }

  getAudioMimeType(fileName: string): string {
    const ext = fileName.toLowerCase();
    if (ext.endsWith('.mp3')) return 'audio/mpeg';
    if (ext.endsWith('.wav')) return 'audio/wav';
    if (ext.endsWith('.aac')) return 'audio/aac';
    if (ext.endsWith('.ogg')) return 'audio/ogg';
    return 'audio/mpeg';
  }

  expandedAttachment = signal<number | null>(null);

  toggleAttachmentViewer(index: number) {
    // Simple toggle like professional-learning
    this.expandedAttachment.set(this.expandedAttachment() === index ? null : index);
  }


  getSafeUrl(url: string): any {
    // Simple implementation like professional-learning
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getOfficeViewerUrl(fileUrl: string): any {
    // Use Microsoft Office Online Viewer
    const encodedUrl = encodeURIComponent(fileUrl);
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }

  getGoogleDocsPdfUrl(fileUrl: string): any {
    // Sá»­ dá»¥ng Google Docs viewer cho PDF
    const encodedUrl = encodeURIComponent(fileUrl);
    const viewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }



  // Quiz Edit Modal Methods
  editQuizSettings(lessonId: string) {
    console.log('đŸ”§ Opening quiz edit modal for lesson:', lessonId);
    if (this.quizEditModal) {
      this.quizEditModal.lessonId.set(lessonId);
      this.quizEditModal.open();
    }
  }

  onQuizSettingsSaved() {
    console.log('âœ… Quiz settings updated, refreshing lessons...');
    // Reload lessons to show updated quiz settings
    this.lessonApi.listBySection(this.sectionId).subscribe({
      next: (res) => {
        this.lessons.set(res?.data || []);
        console.log('âœ… Lessons refreshed after quiz settings update');
      },
      error: (err) => this.error.set(err?.message || 'KhĂ´ng táº£i Ä‘Æ°á»£c danh sĂ¡ch bĂ i há»c')
    });
  }

  onQuizEditModalClosed() {
    console.log('Quiz edit modal closed');
  }

  ngOnDestroy(): void {
    // Clean up any timeouts
    this.clearHeaderTimeout();
    // Clean up router subscription
    this.routerSubscription?.unsubscribe();
  }

  openPdfFullscreen(attachment: any) {
    this.pdfFullscreenAttachment = attachment;
    // Auto-hide header after 3 seconds
    this.startHeaderAutoHide();
  }

  closePdfFullscreen() {
    // Clear auto-hide timeout
    this.clearHeaderTimeout();
    this.showFullscreenHeader = true;
    this.pdfFullscreenAttachment = null;
  }

  // Auto-hide header functionality for fullscreen PDF viewer
  startHeaderAutoHide(): void {
    this.showFullscreenHeader = true;
    this.clearHeaderTimeout();
    this.fullscreenHeaderTimeout = setTimeout(() => {
      this.showFullscreenHeader = false;
    }, 3000);
  }

  clearHeaderTimeout(): void {
    if (this.fullscreenHeaderTimeout) {
      clearTimeout(this.fullscreenHeaderTimeout);
      this.fullscreenHeaderTimeout = null;
    }
  }

  onFullscreenMouseMove(): void {
    this.startHeaderAutoHide();
  }

  // Bulk question selection methods
  toggleQuestionSelection(questionId: string): void {
    const currentSelection = this.selectedQuestionIds();
    const newSelection = new Set(currentSelection);

    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }

    this.selectedQuestionIds.set(newSelection);
  }

  selectAllQuestions(): void {
    const allQuestionIds = new Set(this.courseQuestions().map(q => q.id));
    this.selectedQuestionIds.set(allQuestionIds);
  }

  clearQuestionSelection(): void {
    this.selectedQuestionIds.set(new Set());
  }

  getSelectedQuestionCount(): number {
    return this.selectedQuestionIds().size;
  }

  isQuestionSelected(questionId: string): boolean {
    return this.selectedQuestionIds().has(questionId);
  }

  // Quiz question selection methods for inline form

  selectAllQuizQuestions(): void {
    const allQuestionIds = this.quizPackageQuestions().map(q => q.id);
    this.selectedQuizQuestions.set(new Set(allQuestionIds));
  }

  clearQuizQuestionSelection(): void {
    this.selectedQuizQuestions.set(new Set());
  }

  toggleQuizQuestionSelection(questionId: string): void {
    const currentSelection = this.selectedQuizQuestions();
    const newSelection = new Set(currentSelection);

    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }

    this.selectedQuizQuestions.set(newSelection);
  }

  // Add selected questions to quiz (bulk operation) - Uses QuizQuestion table
  async addSelectedQuestionsToQuiz(lessonId: string): Promise<void> {
    const selectedIds = Array.from(this.selectedQuestionIds());

    if (selectedIds.length === 0) {
      alert('Vui lĂ²ng chá»n Ă­t nháº¥t má»™t cĂ¢u há»i Ä‘á»ƒ thĂªm vĂ o quiz.');
      return;
    }

    try {
      console.log('đŸ”„ Adding selected questions to quiz:', selectedIds.length, 'questions');

      let addedCount = 0;
      let skippedCount = 0;

      // Add each question using the correct API
      for (const questionId of selectedIds) {
        try {
          await firstValueFrom(this.quizApi.addQuestionToQuiz(lessonId, questionId));
          addedCount++;
        } catch (error: any) {
          // Question might already exist
          if (error?.error?.message?.includes('Ä‘Ă£ tá»“n táº¡i')) {
            skippedCount++;
          } else {
            throw error;
          }
        }
      }

      // Clear selection after successful addition
      this.clearQuestionSelection();

      // Refresh quiz questions display
      await this.loadQuizQuestions(lessonId);

      // Show success message
      if (addedCount > 0) {
        let msg = `âœ… ÄĂ£ thĂªm ${addedCount} cĂ¢u há»i vĂ o quiz!`;
        if (skippedCount > 0) {
          msg += `\nâ ï¸ ${skippedCount} cĂ¢u Ä‘Ă£ cĂ³ sáºµn trong quiz.`;
        }
        alert(msg);
      } else if (skippedCount > 0) {
        alert('â ï¸ Táº¥t cáº£ cĂ¢u há»i Ä‘Ă£ cĂ³ trong quiz rá»“i!');
      }

      console.log('âœ… Added:', addedCount, 'Skipped:', skippedCount);
    } catch (error: any) {
      console.error('âŒ Error adding selected questions to quiz:', error);
      alert('âŒ Lá»—i khi thĂªm cĂ¢u há»i vĂ o quiz: ' + (error?.message || 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh'));
    }
  }



  removeAttachmentFromLesson(lessonId: string, attachmentId: string) {
    this.lessonAttachmentApi.deleteAttachment(attachmentId).subscribe({
      next: () => {
        // Refresh lesson attachments
        this.loadLessonAttachments(lessonId);
      },
      error: (err) => this.opError.set(err?.message || 'XĂ³a file Ä‘Ă­nh kĂ¨m tháº¥t báº¡i')
    });
  }

  private loadLessonAttachments(lessonId: string) {
    console.log('đŸ“ loadLessonAttachments called for lesson:', lessonId);

    this.lessonAttachmentApi.getAttachments(lessonId).subscribe({
      next: (attachments) => {
        console.log('âœ… Attachments loaded:', attachments);
        console.log('đŸ“ Attachment details:', {
          count: attachments?.length || 0,
          attachments: attachments
        });

        // Update the selected lesson with attachments
        this.selected.update(lesson => {
          if (lesson && lesson.id === lessonId) {
            const updatedLesson = { ...lesson, attachments };
            console.log('đŸ”„ Updated selected lesson with attachments:', updatedLesson);
            return updatedLesson;
          }
          return lesson;
        });

        // Also update the lesson in the lessons list for future reference
        this.lessons.update(lessonList =>
          lessonList.map(l =>
            l.id === lessonId ? { ...l, attachments } : l
          )
        );
      },
      error: (err) => {
        console.error('âŒ Failed to load attachments for lesson', lessonId, ':', err);
        console.error('âŒ Error details:', {
          status: err?.status,
          message: err?.message,
          error: err?.error
        });
        // Show error in UI
        this.opError.set(`KhĂ´ng thá»ƒ táº£i attachments: ${err?.message || 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh'}`);
      }
    });
  }

  // Scanned Documents Methods - DEPRECATED (now using real lesson attachments)
  /*
  private loadScannedDocuments() {
    // No longer needed - using real lesson attachments
  }

  private fetchScannedDocumentsFromAPI() {
    // No longer needed - using real lesson attachments  
  }

  private loadFallbackScannedDocuments() {
    // No longer needed - using real lesson attachments
  }

  toggleScannedDocumentViewer(index: number) {
    // No longer needed - using togglePdfAttachmentViewer instead
  }

  openScannedDocumentFullscreen(doc: any) {
    // No longer needed - using openPdfAttachmentFullscreen instead
  }
  */

  // New methods for PDF attachments from lessons
  // Lesson PDF Methods (updated to use real attachments)
  getLessonPdfs(lessonId: string): any[] {
    const lesson = this.lessons().find(l => l.id === lessonId);
    if (!lesson || !lesson.attachments) return [];

    return lesson.attachments.filter((attachment: any) =>
      this.isPdfFile(attachment.originalFileName)
    );
  }

  // Assignment helper methods
  getAssignmentStatus(lesson: any): string {
    if (lesson.lessonType !== 'ASSIGNMENT' || !lesson.assignment) {
      return 'KhĂ´ng Ă¡p dá»¥ng';
    }

    const assignment = lesson.assignment;
    const now = new Date();
    const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;

    switch (assignment.status) {
      case 'DRAFT':
        return 'Äang soáº¡n tháº£o';
      case 'PUBLISHED':
        if (dueDate && now > dueDate) {
          return 'ÄĂ£ háº¿t háº¡n';
        }
        return 'Äang má»Ÿ';
      case 'CLOSED':
        return 'ÄĂ£ Ä‘Ă³ng';
      default:
        return 'KhĂ´ng xĂ¡c Ä‘á»‹nh';
    }
  }

  getAssignmentDueDate(lesson: any): string | null {
    if (lesson.lessonType !== 'ASSIGNMENT' || !lesson.assignment?.dueDate) {
      return null;
    }

    const dueDate = new Date(lesson.assignment.dueDate);
    return dueDate.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getAssignmentMaxScore(lesson: any): number | null {
    if (lesson.lessonType !== 'ASSIGNMENT' || !lesson.assignment?.maxScore) {
      return null;
    }

    return lesson.assignment.maxScore;
  }

  // Get assignment submission count (for teacher)
  getAssignmentSubmissionCount(lesson: any): string {
    if (lesson.lessonType !== 'ASSIGNMENT' || !lesson.assignment) {
      return '0';
    }

    const submissionCount = lesson.assignment.submissionCount || 0;
    const totalStudents = lesson.assignment.totalStudents || 0;

    return `${submissionCount}/${totalStudents}`;
  }

  // Assignment management methods
  viewAssignmentSubmissions(lesson: any): void {
    if (lesson.lessonType !== 'ASSIGNMENT') return;

    // TODO: Navigate to assignment submissions page
    // this.router.navigate(['/teacher/assignments', lesson.assignment.id, 'submissions']);
    console.log('Viewing submissions for assignment:', lesson.assignment?.id);

    // For now, show an alert with placeholder info
    alert(`Xem bĂ i ná»™p cho bĂ i táº­p: ${lesson.title}\n\nTĂ­nh nÄƒng nĂ y sáº½ Ä‘Æ°á»£c phĂ¡t triá»ƒn trong phase tiáº¿p theo.`);
  }

  // Load course questions for quiz creation
  async loadQuestionsByCourse(courseId: string): Promise<void> {
    try {
      this.courseQuestionsError.set('');

      console.log('đŸ” Loading questions for course:', courseId);

      const response = await firstValueFrom(
        this.questionApi.getQuestionsByCourse(courseId, 'ACTIVE')
      );

      console.log('đŸ“¦ API Response:', response);
      console.log('đŸ“¦ Response type:', typeof response);
      console.log('đŸ“¦ Response.data:', (response as any).data);

      // Backend tráº£ vá» {data: Question[], pagination: null, message: null}
      if (response && (response as any).data) {
        this.courseQuestions.set((response as any).data);
        console.log('âœ… Loaded', (response as any).data.length, 'questions for course');
      } else {
        console.log('âŒ No data in response:', response);
        this.courseQuestionsError.set('KhĂ´ng cĂ³ dá»¯ liá»‡u cĂ¢u há»i');
      }
    } catch (error: any) {
      console.error('âŒ Error loading course questions:', error);
      this.courseQuestionsError.set(
        error?.error?.message || error?.message || 'CĂ³ lá»—i xáº£y ra khi táº£i cĂ¢u há»i'
      );
    }
  }

  // Add question to quiz (single question) - Uses QuizQuestion table
  async addQuestionToQuiz(questionId: string, lessonId: string): Promise<void> {
    try {
      console.log('đŸ” Adding question', questionId, 'to quiz (lesson)', lessonId);

      // Use the correct API that adds to quiz_questions table
      await firstValueFrom(this.quizApi.addQuestionToQuiz(lessonId, questionId));

      // If question was in selected set, remove it
      this.selectedQuestionIds.update(selected => {
        const newSelected = new Set(selected);
        newSelected.delete(questionId);
        return newSelected;
      });

      // Refresh quiz questions display
      await this.loadQuizQuestions(lessonId);

      console.log('âœ… Successfully added question to quiz');
    } catch (error: any) {
      console.error('âŒ Error adding question to quiz:', error);
      const errorMsg = error?.error?.message || error?.message || 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh';
      if (errorMsg.includes('Ä‘Ă£ tá»“n táº¡i')) {
        alert('â ï¸ CĂ¢u há»i nĂ y Ä‘Ă£ cĂ³ trong quiz rá»“i!');
      } else {
        alert('âŒ Lá»—i khi thĂªm cĂ¢u há»i: ' + errorMsg);
      }
    }
  }

  toggleAssignmentStatus(lesson: any): void {
    if (lesson.lessonType !== 'ASSIGNMENT' || !lesson.assignment) return;

    const newStatus = lesson.assignment.status === 'PUBLISHED' ? 'CLOSED' : 'PUBLISHED';

    // TODO: Call API to update assignment status
    // this.lessonApi.updateAssignmentStatus(lesson.assignment.id, newStatus).subscribe({
    //   next: () => {
    //     lesson.assignment.status = newStatus;
    //   },
    //   error: (err) => this.opError.set(err?.message || 'Cáº­p nháº­t tráº¡ng thĂ¡i tháº¥t báº¡i')
    // });

    // For now, update locally
    lesson.assignment.status = newStatus;
    console.log('Assignment status updated:', newStatus);
  }

  editAssignment(lesson: any): void {
    if (lesson.lessonType !== 'ASSIGNMENT') return;

    // TODO: Open assignment edit modal or navigate to edit page
    console.log('Edit assignment:', lesson.assignment?.id);

    // For now, show an alert
    alert(`Chá»‰nh sá»­a bĂ i táº­p: ${lesson.title}\n\nTĂ­nh nÄƒng nĂ y sáº½ Ä‘Æ°á»£c phĂ¡t triá»ƒn trong phase tiáº¿p theo.`);
  }

  // Quiz Creation Modal Methods (DEPRECATED - using inline form now)
  openQuizCreationModal() {
    console.log('đŸ€ Opening quiz creation modal');
    if (this.quizCreationModal) {
      this.quizCreationModal.open();
    }
  }

  onQuizCreated(lessonId: string) {
    console.log('âœ… Quiz created successfully, lesson ID:', lessonId);
    // Reload lessons to show the new quiz
    this.refreshLessons();
    // Navigate to quiz preview/edit page
    this.router.navigate(['/teacher/quiz/preview', lessonId]);
  }

  onQuizCreationModalClosed() {
    console.log('Quiz creation modal closed');
  }

  // --- SECTION MANAGEMENT (Level 3) ---

  /**
   * Quick create section based on type
   */
  async addSection(lessonId: string, type: 'TEXT' | 'VIDEO' | 'QUIZ') {
    if (!lessonId) return;

    this.loading.set(true);
    try {
      if (type === 'TEXT') {
        const payload = {
          lessonId: lessonId,
          title: 'BĂ i Ä‘á»c má»›i',
          type: 'TEXT' as const,
          content: '<p>Ná»™i dung bĂ i Ä‘á»c...</p>',
          orderIndex: 0 // Backend should handle order
        };
        await firstValueFrom(this.sectionApi.createSection(lessonId, payload));
        this.showSuccessToast.set(true);
        setTimeout(() => this.showSuccessToast.set(false), 3000);
        await this.refreshLessons();
      } else if (type === 'VIDEO') {
        const url = prompt('Nháº­p URL Video (YouTube):');
        if (url) {
          const payload = {
            lessonId: lessonId,
            title: 'Video má»›i',
            type: 'VIDEO' as const,
            videoUrl: url,
            orderIndex: 0
          };
          await firstValueFrom(this.sectionApi.createSection(lessonId, payload));
          this.showSuccessToast.set(true);
          setTimeout(() => this.showSuccessToast.set(false), 3000);
          await this.refreshLessons();
        }
      }
    } catch (err: any) {
      console.error('Lá»—i khi táº¡o section:', err);
      alert('Lá»—i: ' + (err.error?.message || err.message));
    } finally {
      this.loading.set(false);
    }
  }

  async deleteSection(sectionId: string) {
    if (!confirm('Báº¡n cĂ³ cháº¯c muá»‘n xĂ³a ná»™i dung nĂ y?')) return;

    this.loading.set(true);
    try {
      const lessonId = this.activeLessonIdForEditor();
      if (!lessonId) return;
      await firstValueFrom(this.sectionApi.deleteSection(lessonId, sectionId));
      this.showSuccessToast.set(true);
      setTimeout(() => this.showSuccessToast.set(false), 3000);
      await this.refreshLessons();
    } catch (err: any) {
      console.error('Lá»—i khi xĂ³a section:', err);
      alert('Lá»—i: ' + (err.error?.message || err.message));
    } finally {
      this.loading.set(false);
    }
  }

  // --- SECTION SMART EDITOR ---
  openSmartEditor(lessonId: string) {
    this.activeLessonIdForEditor.set(lessonId);
    this.showSmartEditor.set(true);
  }

  closeSmartEditor() {
    this.showSmartEditor.set(false);
    this.activeLessonIdForEditor.set(null);
  }

  onSmartEditorSaved() {
    this.showSuccessToast.set(true);
    setTimeout(() => this.showSuccessToast.set(false), 3000);
    this.refreshLessons(); // Reload everything
  }
}

