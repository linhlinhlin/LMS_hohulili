import { Component, DestroyRef, inject, signal, computed, effect, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CourseEditorStore } from '../../store/course-editor.store';
import { ChapterDraftDTO, LessonDraftDTO, SectionDraftDTO } from '../../services/course-authoring.service';
import { CurriculumSelectionService } from '../../services/curriculum-selection.service';
import { CONTENT_TYPE_CONFIG } from '../../../../../core/constants/content-type.constant';
import { LessonApi } from '../../../../../api/client/lesson.api';
import { ChapterApi } from '../../../../../api/client/chapter.api';
import { SectionApi } from '../../../../../api/client/section.api';
import { VideoAssetApi, type VideoAssetResponse } from '../../../../../api/client/video-asset.api';
import { AssignmentApi } from '../../../../../api/client/assignment.api';
import { QuizApi } from '../../../../../api/endpoints/quiz.api';
import { PackageApi } from '../../../../../api/endpoints/package.api';
import { firstValueFrom } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { PresignedUploadService, type UploadEvent } from '../../../../../core/services/presigned-upload.service';
import { PdfViewerService } from '../../../../../shared/services/pdf-viewer.service';
import {
  LucideAngularModule
} from 'lucide-angular';
import { ToastService } from '../../../../../core/services/toast.service';
import { WiiiContextService } from '../../../../ai-chat/infrastructure/api/wiii-context.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { isOfflineVideoProfileId, type OfflineVideoProfileDescriptor } from '../../../../../core/models/video-quality';
import { LectureSectionsPanelComponent } from './components/lecture-sections-panel/lecture-sections-panel.component';
import { CurriculumAssessmentSummaryComponent } from './components/curriculum-assessment-summary/curriculum-assessment-summary.component';
import { CurriculumAssignmentDetailsComponent } from './components/curriculum-assignment-details/curriculum-assignment-details.component';
import { CurriculumQuizManagerComponent } from './components/curriculum-quiz-manager/curriculum-quiz-manager.component';
import { ChapterEditorComponent } from './components/chapter-editor/chapter-editor.component';
import { LessonEditorComponent } from './components/lesson-editor/lesson-editor.component';
import { CurriculumEditorService } from '../../services/curriculum-editor.service';
import { QuizPackageModalsComponent } from './components/quiz-package-modals/quiz-package-modals.component';

type SectionQuizAssessmentType = 'PRACTICE' | 'ASSESSMENT' | 'EXAM';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-curriculum',
  imports: [
    FormsModule,
    LucideAngularModule,
    DragDropModule,
    LectureSectionsPanelComponent,
    CurriculumAssessmentSummaryComponent,
    CurriculumAssignmentDetailsComponent,
    CurriculumQuizManagerComponent,
    ChapterEditorComponent,
    LessonEditorComponent,
    QuizPackageModalsComponent
  ],
  styleUrl: './course-curriculum.component.scss',
  providers: [],
  templateUrl: './course-curriculum.component.html'
})
export class CourseCurriculumComponent implements OnDestroy {
  readonly store = inject(CourseEditorStore);
  readonly selectionService = inject(CurriculumSelectionService);
  readonly editorSvc = inject(CurriculumEditorService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private lessonApi = inject(LessonApi);
  private pdfService = inject(PdfViewerService);
  private chapterApi = inject(ChapterApi);
  private sectionApi = inject(SectionApi);
  private videoAssetApi = inject(VideoAssetApi);
  private assignmentApi = inject(AssignmentApi);
  private quizApi = inject(QuizApi);
  private packageApi = inject(PackageApi);
  private presignedUpload = inject(PresignedUploadService);
  private sanitizer = inject(DomSanitizer);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private destroyRef = inject(DestroyRef);
  private currentUrl = toSignal(this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map(() => this.router.url)
  ), {
    initialValue: this.router.url
  });
  private hydratedQuerySelectionKey: string | null = null;
  private hydratedSectionComposerKey: string | null = null;
  private inFlightSectionHydrationKey: string | null = null;
  private lessonDetailRequestToken = 0;
  private sectionSurfaceMode = signal<'closed' | 'create' | 'edit'>('closed');
  private sectionSurfaceId = signal<string | null>(null);
  private sectionSurfaceHydrationKey: string | null = null;
  private readonly handleWindowKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || this.confirmDialog.isOpen()) {
      return;
    }

    if (this.showSectionQuizBankModal()) {
      event.preventDefault();
      event.stopPropagation();
      this.showSectionQuizBankModal.set(false);
      return;
    }

    if (this.showSectionQuizRandomModal()) {
      event.preventDefault();
      event.stopPropagation();
      this.showSectionQuizRandomModal.set(false);
      return;
    }

    if (!this.showSectionModal()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
      void this.closeSectionModal();
  };
  private resizeCleanup: (() => void) | null = null;

  public editorHeight = signal(380);



  startResize(event: MouseEvent) {
    event.preventDefault();
    this.resizeCleanup?.();
    const startY = event.clientY;
    const startHeight = this.editorHeight();

    const onMouseMove = (e: MouseEvent) => {
      const newHeight = startHeight + (e.clientY - startY);
      if (newHeight > 200) { // Giới hạn chiều cao tối thiểu
        this.editorHeight.set(newHeight);
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.resizeCleanup = null;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    this.resizeCleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.resizeCleanup = null;
    };
  }



  // Constants
  readonly TYPE_CONFIG = CONTENT_TYPE_CONFIG;

  // Selection signals
  selectedChapterId = this.selectionService.selectedChapterId;
  selectedLessonId = this.selectionService.selectedLessonId;
  selectedLesson = this.selectionService.selectedLesson;
  selectedSectionId = this.selectionService.selectedSectionId; // [NEW]
  selectedSection = this.selectionService.selectedSection; // [NEW]

  // Section Logic (L3)
  editingSectionId = signal<string | null>(null);
  showSectionModal = signal(false);
  newSectionType: 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE' = 'TEXT';

  // Section Form
  sectionTitle = '';
  sectionContent = '';
  sectionVideoAssetId: string | null = null;
  sectionVideoProcessingStatus: string | null = null;
  sectionVideoAvailableOfflineProfiles: VideoAssetResponse['availableOfflineProfiles'] = [];
  sectionVideoUrl = '';
  sectionIsRequired = false;
  sectionFileUrl = signal<string | null>(null); // [NEW] For FILE type sections
  sectionVideoType: 'YOUTUBE' | 'CLOUDFLARE' | null = null; // [NEW] Video source type
  sectionStreamVideoUid: string | null = null;
  sectionCfObjectKey: string | null = null; // [NEW] Cloudflare R2 object key
  selectedFile: File | null = null; // [NEW] For FILE upload
  selectedSectionVideoFile: File | null = null;
  safePdfUrl = signal<SafeResourceUrl | null>(null); // [NEW] SOTA 2025 Secure PDF

  // State
  isSaving = signal(false);
  isLoadingLesson = signal(false);
  showVideoPreview = signal(false);
  wordCount = signal(0); // Optimisation: Signal based word count
  private editorBaselineSignature = signal('');
  private editorDirty = signal(false);

  // Chapter form
  chapterTitle = '';
  chapterDescription = '';

  // Lesson form
  lessonTitle = '';
  lessonContent = '';
  lessonVideoUrl = '';

  // Quiz fields
  quizTimeLimit = signal(30);
  quizPassingScore = signal(60);
  quizMaxAttempts = signal(1);
  quizQuestions = signal<any[]>([]);
  quizQuestionsLoading = signal(false);
  private activeLessonQuizId = signal<string | null>(null);
  private activeLessonQuizLessonId = signal<string | null>(null);
  private lastHydratedLessonKey: string | null = null;
  private inFlightLessonDetailId: string | null = null;
  private sectionVideoPollTimer: ReturnType<typeof setTimeout> | null = null;

  // Quiz packages — now managed by QuizPackageModalsComponent
  quizPackages = signal<any[]>([]);
  selectedPackageId = '';
  packageQuestions = signal<any[]>([]);
  selectedQuestionIds = signal<Set<string>>(new Set());

  // Section Quiz Fields — legacy sync (used by hydrateSectionState/effects, will be removed in Phase 3)
  sectionQuizType: SectionQuizAssessmentType = 'PRACTICE';
  sectionQuizCountsTowardCertificate = false;
  sectionQuizTimeLimit = signal(30);
  sectionQuizPassingScore = signal(60);
  sectionQuizMaxAttempts = signal(1);
  sectionQuizShuffleQuestions = true;
  sectionQuizShuffleOptions = true;
  sectionQuizShowResults = true;
  sectionQuizSelectedQuestions = signal<any[]>([]);
  showSectionQuizBankModal = signal(false);
  showSectionQuizRandomModal = signal(false);
  sectionQuizRandomCount = signal(5);

  // Assignment fields
  assignmentDescription = '';
  assignmentInstructions = '';
  assignmentDueDate = '';
  assignmentMaxScore = 100;

  // Computed
  selectedChapterLessons = computed(() => {
    const chapterId = this.selectedChapterId();
    if (!chapterId) return [];
    const chapter = this.store.chapters().find(c => c.id === chapterId);
    return chapter?.lessons || [];
  });

  hasLegacyLessonLevelVideo(): boolean {
    const lesson = this.selectedLesson();
    return !!lesson && !!(lesson.videoUrl || lesson.streamVideoUid);
  }

  hasVideoSections(lesson?: LessonDraftDTO | null): boolean {
    const targetLesson = lesson ?? this.selectedLesson();
    return !!targetLesson?.sections?.some(section => section.type === 'VIDEO');
  }

  getLegacyLessonVideoPolicyCopy(): string {
    const lesson = this.selectedLesson();
    if (!lesson) {
      return '';
    }

    if (lesson.streamVideoUid) {
      return this.hasVideoSections(lesson)
        ? 'Bài học này vẫn đang giữ một video legacy ở cấp bài để tương thích dữ liệu cũ. Luồng tạo mới chuẩn production nên đi qua mục video riêng ở bên dưới.'
        : 'Bài học này vẫn đang dùng video legacy ở cấp bài. Để chuẩn hóa playback online/offline theo kiến trúc mới, hãy tạo một mục video riêng trong lesson.';
    }

    if (this.isYouTubeUrl(lesson.videoUrl || '')) {
      return 'Bài học này vẫn đang dùng YouTube hoặc nguồn ngoài ở cấp bài. Learner chỉ xem trực tuyến được và không thể tải offline theo pipeline video mới.';
    }

    return 'Bài học này vẫn đang dùng URL video legacy ở cấp bài. Nên chuyển sang mục video tải lên nội bộ để hệ thống tạo video asset, playback online, và profile offline đúng chuẩn.';
  }

  getLegacyLessonVideoReference(): string | null {
    const lesson = this.selectedLesson();
    if (!lesson) {
      return null;
    }

    if (lesson.videoUrl) {
      return lesson.videoUrl;
    }

    return lesson.streamVideoUid ? `UID: ${lesson.streamVideoUid}` : null;
  }

  constructor() {
    this.loadQuizPackages();
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleWindowKeydown, true);
    }

    effect(() => {
      const chapter = this.selectionService.selectedChapter();
      if (chapter) {
        this.chapterTitle = chapter.title;
        this.chapterDescription = chapter.description || '';
      }
    });

    effect(() => {
      const tree = this.store.courseTree();
      const currentUrl = this.currentUrl();

      if (!tree || currentUrl === null) {
        return;
      }

      const queryParams = this.getCurrentQueryParams(currentUrl);

      const chapterId = queryParams.get('chapterId');
      const lessonId = queryParams.get('lessonId');
      const sectionId = queryParams.get('sectionId');
      const requestedSelection = this.resolveSelectionFromQuery(
        tree,
        chapterId,
        lessonId,
        sectionId
      );
      const requestKey = `${tree.id}|${chapterId ?? ''}|${lessonId ?? ''}|${sectionId ?? ''}`;

      if (this.hydratedQuerySelectionKey === requestKey) {
        return;
      }

      if (requestedSelection) {
        if (sectionId && requestedSelection.lesson && !requestedSelection.section) {
          const requestedLesson = requestedSelection.lesson;
          const currentChapterId = untracked(() => this.selectionService.selectedChapterId());
          const currentLessonId = untracked(() => this.selectionService.selectedLessonId());
          const currentSectionId = untracked(() => this.selectionService.selectedSectionId());
          const sectionHydrationKey = `${tree.id}|${requestedLesson.id}|${sectionId}`;

          if (
            currentChapterId !== requestedSelection.chapter.id
            || currentLessonId !== requestedLesson.id
            || currentSectionId !== sectionId
          ) {
            untracked(() => this.selectionService.primeSectionSelection(
              requestedSelection.chapter,
              requestedLesson,
              sectionId
            ));
          }

          if (this.inFlightSectionHydrationKey !== sectionHydrationKey) {
            this.inFlightSectionHydrationKey = sectionHydrationKey;
            untracked(() => void this.hydrateMissingSectionSelection(
              tree.id,
              requestedSelection.chapter.id,
              requestedLesson.id,
              sectionId,
              requestKey
            ));
          }

          return;
        }

        const matchesCurrentSelection = untracked(() => this.matchesCurrentSelection(
          requestedSelection.chapter.id,
          requestedSelection.lesson?.id ?? null,
          requestedSelection.section?.id ?? null
        ));

        if (!matchesCurrentSelection) {
          untracked(() => {
            if (requestedSelection.section && requestedSelection.lesson) {
              this.selectionService.selectSection(
                requestedSelection.chapter,
                requestedSelection.lesson,
                requestedSelection.section
              );
              return;
            }

            if (requestedSelection.lesson) {
              this.selectionService.selectLesson(
                requestedSelection.chapter,
                requestedSelection.lesson
              );
              return;
            }

            this.selectionService.selectChapter(requestedSelection.chapter);
          });
        }

        this.hydratedQuerySelectionKey = requestKey;
        return;
      }

      const hasSelection = untracked(() =>
        !!this.selectionService.selectedChapterId()
        || !!this.selectionService.selectedLessonId()
        || !!this.selectionService.selectedSectionId()
      );

      if (hasSelection) {
        this.hydratedQuerySelectionKey = requestKey;
        return;
      }

      const defaultSelectionKey = `${tree.id}|default`;
      if (this.hydratedQuerySelectionKey === defaultSelectionKey) {
        return;
      }

      const firstChapter = tree.chapters?.[0];
      const firstLesson = firstChapter?.lessons?.[0];

      if (firstChapter && firstLesson) {
        untracked(() => this.selectionService.selectLesson(firstChapter, firstLesson));
      } else if (firstChapter) {
        untracked(() => this.selectionService.selectChapter(firstChapter));
      }

      this.hydratedQuerySelectionKey = defaultSelectionKey;
    });

    effect(() => {
      const lesson = this.selectionService.selectedLesson();
      if (lesson) {
        const lessonKey = this.buildLessonHydrationKey(lesson);
        if (lessonKey === this.lastHydratedLessonKey) {
          return;
        }

        this.lastHydratedLessonKey = lessonKey;
        this.resetActiveLessonQuiz();
        this.loadLessonData(lesson);
        this.fetchLessonDetails(lesson.id);
        if (this.getLessonType(lesson) === 'QUIZ') {
          this.loadQuizQuestions(lesson.id);
        } else {
          this.quizQuestions.set([]);
        }
      } else {
        this.lastHydratedLessonKey = null;
        this.quizQuestions.set([]);
      }
    });

    effect(() => {
      const currentUrl = this.currentUrl();
      const selectedLesson = this.selectedLesson();

      if (!currentUrl || !selectedLesson) {
        return;
      }

      const queryParams = this.getCurrentQueryParams(currentUrl);
      const shouldOpenComposer = queryParams.get('openSectionComposer') === '1';
      const composeType = queryParams.get('composeSectionType');
      const requestedLessonId = queryParams.get('lessonId');

      if (!shouldOpenComposer || requestedLessonId !== selectedLesson.id) {
        return;
      }

      const normalizedComposeType = composeType === 'TEXT'
        || composeType === 'VIDEO'
        || composeType === 'QUIZ'
        || composeType === 'FILE'
        ? composeType
        : null;

      if (!normalizedComposeType) {
        return;
      }

      const composerKey = `${currentUrl}|${selectedLesson.id}|${normalizedComposeType}`;
      if (this.hydratedSectionComposerKey === composerKey) {
        return;
      }

      this.hydratedSectionComposerKey = composerKey;
      untracked(() => this.openSectionEditor(normalizedComposeType));
    });

    // Canonical section surface: every selected section opens in the modal editor.
    // Re-hydration is keyed by section ID, so tree refreshes can swap object
    // references silently without flashing or reopening the same modal.
    effect(() => {
      const surfaceMode = this.sectionSurfaceMode();
      const selectedSectionId = this.selectedSectionId();
      const sectionContext = selectedSectionId ? this.findSectionContext(selectedSectionId) : null;

      if (!selectedSectionId) {
        if (surfaceMode === 'edit') {
          this.resetSectionSurfaceController();
          this.closeSectionQuizChildSurfaces();
          this.showSectionModal.set(false);
        }
        return;
      }

      if (!sectionContext || sectionContext.section.id !== selectedSectionId) {
        return;
      }

      if (surfaceMode === 'create') {
        return;
      }

      const nextHydrationKey = `edit|${selectedSectionId}`;
      if (
        surfaceMode === 'edit'
        && this.sectionSurfaceId() === selectedSectionId
        && this.sectionSurfaceHydrationKey === nextHydrationKey
      ) {
        if (!this.showSectionModal()) {
          this.showSectionModal.set(true);
        }
        return;
      }

      this.sectionSurfaceMode.set('edit');
      this.sectionSurfaceId.set(selectedSectionId);
      this.sectionSurfaceHydrationKey = nextHydrationKey;
      this.closeSectionQuizChildSurfaces();
      this.showSectionModal.set(true);
      this.hydrateSectionState(sectionContext.section);
    });

    // Validates that the currently selected lesson is updated from the new tree.
    // Uses untracked() for writes to prevent cascading into downstream effects
    // (lesson data effect, section surface effect) within the same microtask.
    effect(() => {
      const tree = this.store.courseTree();
      const currentLessonId = this.selectionService.selectedLessonId();
      const currentSectionId = this.selectionService.selectedSectionId();
      const preserveVisibleLessonState = this.editorDirty() || this.isSaving();

      if (!tree || !currentLessonId) {
        return;
      }

      const selectedLesson = untracked(() => this.selectionService.selectedLesson());
      const selectedSection = untracked(() => this.selectionService.selectedSection());

      for (const chapter of tree.chapters) {
        const found = chapter.lessons.find(l => l.id === currentLessonId);
        if (!found) {
          continue;
        }

        if (selectedLesson !== found && !(preserveVisibleLessonState && selectedLesson?.id === currentLessonId)) {
          untracked(() => this.selectionService.syncLessonReference(chapter, found));
        }

        if (!currentSectionId || !found.sections) {
          return;
        }

        const foundSection = found.sections.find((section: SectionDraftDTO) => section.id === currentSectionId);
        if (foundSection && selectedSection !== foundSection) {
          untracked(() => this.selectionService.syncSectionReference(chapter, found, foundSection));
        }
        return;
      }
    });
  }

  getLessonType(lesson: LessonDraftDTO | null): string {
    return lesson?.type || (lesson as any)?.lessonType || 'LECTURE';
  }

  getLessonTypeLabel(type: string): string {
    switch (type) {
      case 'LECTURE': return 'Bài giảng';
      case 'QUIZ': return 'Trắc nghiệm';
      case 'ASSIGNMENT': return 'Bài tập';
      default: return 'Bài giảng';
    }
  }

  getSectionTypeLabel(type: string): string {
    switch (type) {
      case 'TEXT': return 'Bài giảng';
      case 'VIDEO': return 'Video';
      case 'FILE': return 'Tài liệu';
      case 'QUIZ': return 'Trắc nghiệm';
      default: return type;
    }
  }

  onChapterTitleChange(value: string) {
    this.chapterTitle = value;
    this.markEditorUnsaved();
  }

  onChapterDescriptionChange(value: string) {
    this.chapterDescription = value;
    this.markEditorUnsaved();
  }

  onLessonTitleChange(value: string) {
    this.lessonTitle = value;
    this.markEditorUnsaved();
  }

  onSectionTitleChange(value: string) {
    this.sectionTitle = value;
    this.markEditorUnsaved();
  }

  onSectionRequiredChange(value: boolean) {
    this.sectionIsRequired = value;
    this.markEditorUnsaved();
  }

  onSectionContentModelChange(value: string) {
    this.sectionContent = value;
  }

  onSectionVideoUrlChange(value: string) {
    this.sectionVideoUrl = value;
    if (!value) {
      this.sectionStreamVideoUid = null;
    } else if (!value.includes('videodelivery.net')) {
      this.sectionStreamVideoUid = null;
      this.selectedSectionVideoFile = null;
    }
    this.syncSectionVideoMetadata(value);
    this.markEditorUnsaved();
  }

  onSectionVideoAssetIdChange(value: string | null) {
    this.sectionVideoAssetId = value;
    if (!value) {
      this.sectionVideoProcessingStatus = null;
      this.sectionVideoAvailableOfflineProfiles = [];
    }
    this.syncSectionVideoMetadata(this.sectionVideoUrl);
    this.markEditorUnsaved();
  }

  onSectionVideoProcessingStatusChange(value: string | null) {
    this.sectionVideoProcessingStatus = value;
    if (this.sectionVideoAssetId && value && !['READY', 'FAILED'].includes(value.toUpperCase())) {
      this.scheduleSectionVideoPoll(this.sectionVideoAssetId);
    }
    this.markEditorUnsaved();
  }

  onSectionStreamVideoUidChange(value: string | null) {
    this.sectionStreamVideoUid = value;
    if (value) {
      this.sectionVideoType = 'CLOUDFLARE';
    }
    this.markEditorUnsaved();
  }

  onSectionVideoFileSelected(file: File | null) {
    this.selectedSectionVideoFile = file;
    if (file) {
      this.sectionVideoAssetId = null;
      this.sectionVideoProcessingStatus = null;
      this.sectionVideoAvailableOfflineProfiles = [];
      this.sectionVideoType = 'CLOUDFLARE';
    }
    this.markEditorUnsaved();
  }

  onClearSelectedSectionVideoFile() {
    this.selectedSectionVideoFile = null;
    if (!this.sectionStreamVideoUid && !this.sectionVideoUrl && !this.sectionVideoAssetId) {
      this.sectionVideoType = null;
    }
    this.markEditorUnsaved();
  }

  onAssignmentDescriptionChange(value: string) {
    this.assignmentDescription = value;
    this.markEditorUnsaved();
  }

  onAssignmentInstructionsChange(value: string) {
    this.assignmentInstructions = value;
    this.markEditorUnsaved();
  }

  onAssignmentDueDateChange(value: string) {
    this.assignmentDueDate = value;
    this.markEditorUnsaved();
  }

  onAssignmentMaxScoreChange(value: number | string) {
    const next = this.coerceNumber(value, this.assignmentMaxScore);
    this.assignmentMaxScore = Math.max(1, next);
    this.markEditorUnsaved();
  }

  onSectionQuizTypeChange(type: SectionQuizAssessmentType) {
    if (this.sectionQuizType === type) {
      return;
    }

    this.sectionQuizType = type;
    if (type !== 'EXAM') {
      this.sectionQuizCountsTowardCertificate = false;
    }
    this.markEditorUnsaved();
  }

  onSectionQuizCountsTowardCertificateChange(value: boolean) {
    this.sectionQuizCountsTowardCertificate = this.sectionQuizType === 'EXAM' && value;
    this.markEditorUnsaved();
  }

  onSectionQuizShuffleQuestionsChange(value: boolean) {
    this.sectionQuizShuffleQuestions = value;
    this.markEditorUnsaved();
  }

  onSectionQuizShuffleOptionsChange(value: boolean) {
    this.sectionQuizShuffleOptions = value;
    this.markEditorUnsaved();
  }

  onSectionQuizShowResultsChange(value: boolean) {
    this.sectionQuizShowResults = value;
    this.markEditorUnsaved();
  }

  canDeactivate(): Promise<boolean> {
    return this.confirmDiscardChangesIfNeeded();
  }

  markEditorUnsaved() {
    if (this.isSaving()) {
      return;
    }

    this.syncEditorDirtyState();
  }

  private async confirmDiscardChangesIfNeeded(): Promise<boolean> {
    if (!this.hasPendingChanges()) {
      return true;
    }

    const shouldLeave = await this.confirmDialog.confirm({
      title: 'Rời nội dung đang chỉnh sửa',
      message: 'Bạn có thay đổi chưa lưu trong chương trình học. Nếu rời màn này, các chỉnh sửa hiện tại sẽ bị mất.',
      variant: 'warning',
      confirmText: 'Rời màn này',
      cancelText: 'Ở lại'
    });
    if (shouldLeave) {
      this.restoreCurrentEditorState();
      this.syncEditorDirtyState();
    }

    return shouldLeave;
  }

  private hasPendingChanges(): boolean {
    return this.editorDirty() || this.isSaving();
  }
  async selectLessonFromChapter(lesson: LessonDraftDTO) {
    if (!(await this.confirmDiscardChangesIfNeeded())) {
      return;
    }

    const chapter = this.findLessonContext(lesson.id)?.chapter
      ?? this.store.chapters().find(c => c.id === this.selectedChapterId());
    if (chapter) {
      this.selectionService.selectLesson(chapter, lesson);
    }
  }

  private findLessonContext(lessonId: string): { chapter: ChapterDraftDTO; lesson: LessonDraftDTO } | null {
    for (const chapter of this.store.chapters()) {
      const lesson = chapter.lessons.find(item => item.id === lessonId);
      if (lesson) {
        return { chapter, lesson };
      }
    }

    return null;
  }

  private findSectionContext(sectionId: string): {
    chapter: ChapterDraftDTO;
    lesson: LessonDraftDTO;
    section: SectionDraftDTO;
  } | null {
    for (const chapter of this.store.chapters()) {
      for (const lesson of chapter.lessons || []) {
        const section = lesson.sections?.find(item => item.id === sectionId);
        if (section) {
          return { chapter, lesson, section };
        }
      }
    }

    return null;
  }

  private resolveSelectionFromQuery(
    tree: NonNullable<ReturnType<CourseEditorStore['courseTree']>>,
    chapterId: string | null,
    lessonId: string | null,
    sectionId: string | null
  ): {
    chapter: ChapterDraftDTO;
    lesson?: LessonDraftDTO;
    section?: SectionDraftDTO;
  } | null {
    if (!chapterId && !lessonId && !sectionId) {
      return null;
    }

    for (const chapter of tree.chapters) {
      if (chapterId && chapter.id === chapterId && !lessonId && !sectionId) {
        return { chapter };
      }

      for (const lesson of chapter.lessons || []) {
        if (sectionId) {
          const section = (lesson.sections || []).find(item => item.id === sectionId);
          if (section) {
            return { chapter, lesson, section };
          }
        }

        if (lessonId && lesson.id === lessonId) {
          return { chapter, lesson };
        }
      }
    }

    return null;
  }

  private async hydrateMissingSectionSelection(
    courseId: string,
    chapterId: string,
    lessonId: string,
    sectionId: string,
    requestKey: string
  ): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.lessonApi.getLessonById(lessonId));
      const lessonDetail = response?.data || response;
      const fetchedSections = lessonDetail?.sections || [];
      const fetchedSection = fetchedSections.find((section: any) => section.id === sectionId);
      if (!fetchedSection) {
        return;
      }

      const currentTree = this.store.courseTree();
      if (!currentTree || currentTree.id !== courseId) {
        return;
      }

      this.store.updateLessonLocal(chapterId, lessonId, {
        sections: fetchedSections
      } as Partial<LessonDraftDTO>);

      const refreshedContext = this.findLessonContext(lessonId);
      const refreshedSection = refreshedContext?.lesson.sections?.find(section => section.id === sectionId);
      if (!refreshedContext || !refreshedSection) {
        return;
      }

      this.selectionService.selectSection(
        refreshedContext.chapter,
        refreshedContext.lesson,
        refreshedSection
      );
      this.hydratedQuerySelectionKey = requestKey;
    } catch {
      // Keep the lesson selection path if section hydration fails.
    } finally {
      this.inFlightSectionHydrationKey = null;
    }
  }

  private getCurrentQueryParams(url: string): URLSearchParams {
    return new URLSearchParams(this.router.parseUrl(url).queryParams as Record<string, string>);
  }

  private matchesCurrentSelection(
    chapterId: string | null,
    lessonId: string | null,
    sectionId: string | null
  ): boolean {
    return this.selectionService.selectedChapterId() === chapterId
      && this.selectionService.selectedLessonId() === lessonId
      && this.selectionService.selectedSectionId() === sectionId;
  }

  private loadLessonData(lesson: LessonDraftDTO) {
    this.lessonTitle = lesson.title || '';
    this.lessonContent = lesson.content || lesson.contentText || '';
    this.lessonVideoUrl = lesson.videoUrl || lesson.contentUrl || '';
    this.quizTimeLimit.set(lesson.quizTimeLimit || 30);
    this.quizPassingScore.set(lesson.quizPassingScore || 60);
    this.quizMaxAttempts.set(lesson.quizMaxAttempts || 1);
    this.assignmentDescription = lesson.assignmentDescription || '';
    this.assignmentInstructions = lesson.assignmentInstructions || '';
    this.assignmentDueDate = this.toDateTimeLocalValue(lesson.assignmentDueDate);
    this.assignmentMaxScore = lesson.assignmentMaxScore || 100;
    this.refreshEditorBaseline();
  }

  private loadChapterData(chapter: ChapterDraftDTO) {
    this.chapterTitle = chapter.title;
    this.chapterDescription = chapter.description || '';
    this.refreshEditorBaseline();
  }

  private resetSectionModalTransientState() {
    this.clearSectionVideoPollTimer();
    this.sectionContent = '';
    this.sectionVideoAssetId = null;
    this.sectionVideoProcessingStatus = null;
    this.sectionVideoAvailableOfflineProfiles = [];
    this.sectionVideoUrl = '';
    this.sectionVideoType = null;
    this.sectionStreamVideoUid = null;
    this.sectionCfObjectKey = null;
    this.sectionFileUrl.set(null);
    this.sectionIsRequired = false;
    this.selectedFile = null;
    this.selectedSectionVideoFile = null;
    this.safePdfUrl.set(null);
    this.wordCount.set(0);
  }

  private closeSectionQuizChildSurfaces() {
    this.showSectionQuizBankModal.set(false);
    this.showSectionQuizRandomModal.set(false);
  }

  private resetSectionSurfaceController() {
    this.sectionSurfaceMode.set('closed');
    this.sectionSurfaceId.set(null);
    this.sectionSurfaceHydrationKey = null;
  }

  private hydrateSectionState(section: SectionDraftDTO) {
    this.isDataLoaded.set(false);
    this.resetSectionModalTransientState();

    this.editingSectionId.set(section.id);
    this.sectionTitle = section.title;
    this.newSectionType = (section.type as any) || 'TEXT';
    this.sectionContent = section.content || '';
    this.sectionVideoAssetId = (section as any).videoAssetId || null;
    this.sectionVideoProcessingStatus = (section as any).videoProcessingStatus || null;
    this.sectionVideoAvailableOfflineProfiles = this.normalizeSectionVideoProfiles(
      (section as any).availableOfflineProfiles,
    );
    this.sectionVideoUrl = section.videoUrl || '';
    this.sectionVideoType = (section as any).videoType || null;
    this.sectionStreamVideoUid = (section as any).streamVideoUid || null;
    this.sectionCfObjectKey = (section as any).cfObjectKey || null;
    this.sectionFileUrl.set(section.fileUrl || null);
    this.sectionIsRequired = (section as any).isRequired || false;
    this.syncSectionVideoMetadata(this.sectionVideoUrl);
    if (
      this.sectionVideoAssetId
      && !['READY', 'FAILED'].includes((this.sectionVideoProcessingStatus || '').toUpperCase())
    ) {
      this.scheduleSectionVideoPoll(this.sectionVideoAssetId);
    }

    if (this.newSectionType === 'QUIZ') {
      const quizData = (section as any).quizData;
      if (quizData) {
        this.sectionQuizType = quizData.quizType === 'PRACTICE'
          ? 'PRACTICE'
          : (quizData.quizType === 'EXAM' ? 'EXAM' : 'ASSESSMENT');
        this.sectionQuizCountsTowardCertificate = this.sectionQuizType === 'EXAM'
          && quizData.countsTowardCertificate === true;
        this.sectionQuizTimeLimit.set(quizData.timeLimitMinutes || 30);
        this.sectionQuizPassingScore.set(quizData.passingScore || 60);
        this.sectionQuizMaxAttempts.set(quizData.maxAttempts || 1);
        this.sectionQuizShuffleQuestions = quizData.shuffleQuestions ?? true;
        this.sectionQuizShuffleOptions = quizData.shuffleOptions ?? true;
        this.sectionQuizShowResults = quizData.showResultsImmediately ?? true;
        if (quizData.questions && quizData.questions.length > 0) {
          this.sectionQuizSelectedQuestions.set(quizData.questions.map((q: any) => ({
            id: q.id,
            content: q.content,
            difficulty: q.difficulty ?? 'MEDIUM'
          })));
        } else {
          this.sectionQuizSelectedQuestions.set([]);
        }
      } else {
        this.resetSectionQuizFields();
      }
      this.isDataLoaded.set(true);
      this.refreshEditorBaseline();
      return;
    }

    if (this.newSectionType === 'FILE') {
      if (this.isPdfFile(section) && section.fileUrl) {
        this.pdfService.getSafePdfUrl(section.fileUrl).subscribe(url => {
          this.safePdfUrl.set(url);
        });
      } else {
        this.safePdfUrl.set(null);
      }
      this.isDataLoaded.set(true);
      this.refreshEditorBaseline();
      return;
    }

    this.safePdfUrl.set(null);
    if (this.newSectionType === 'TEXT') {
      setTimeout(() => {
        this.isDataLoaded.set(true);
        this.refreshEditorBaseline();
      }, 100);
      return;
    }

    this.isDataLoaded.set(true);
    this.refreshEditorBaseline();
  }

  private restoreCurrentEditorState() {
    const chapter = this.selectionService.selectedChapter();
    const lesson = this.selectedLesson();
    const section = this.selectedSection();

    if (chapter) {
      this.loadChapterData(chapter);
    }

    if (lesson) {
      this.loadLessonData(lesson);
    }

    if (section) {
      this.hydrateSectionState(section);
      return;
    }

    if (!this.showSectionModal()) {
      this.isDataLoaded.set(false);
    }

    this.syncEditorDirtyState();
  }

  private refreshEditorBaseline() {
    this.refreshEditorBaselineWithOptions();
  }

  private refreshEditorBaselineWithOptions(forceSaved = false) {
    this.editorBaselineSignature.set(this.buildCurrentEditorSignature());
    this.editorDirty.set(false);
    if (forceSaved || !this.isSaving()) {
      this.store.markSaved();
    }
  }

  private syncEditorDirtyState() {
    const isDirty = this.buildCurrentEditorSignature() !== this.editorBaselineSignature();
    this.editorDirty.set(isDirty);
    if (this.isSaving()) {
      return;
    }

    if (isDirty) {
      this.store.markUnsaved();
    } else {
      this.store.markSaved();
    }
  }

  private buildCurrentEditorSignature(): string {
    if (this.showSectionModal()) {
      return this.buildSectionEditorSignature();
    }

    const lesson = this.selectedLesson();
    if (lesson) {
      return this.buildLessonEditorSignature(lesson);
    }

    const chapter = this.selectionService.selectedChapter();
    if (chapter) {
      return [
        'chapter',
        chapter.id,
        this.chapterTitle.trim(),
        this.chapterDescription.trim()
      ].join('|');
    }

    return 'none';
  }

  private buildLessonEditorSignature(lesson: LessonDraftDTO): string {
    const lessonType = this.getLessonType(lesson);
    const base = ['lesson', lesson.id, lessonType, this.lessonTitle.trim()];

    if (lessonType === 'LECTURE') {
      return [
        ...base,
        this.lessonContent.trim(),
        this.lessonVideoUrl.trim()
      ].join('|');
    }

    if (lessonType === 'QUIZ') {
      return [
        ...base,
        String(this.quizTimeLimit()),
        String(this.quizPassingScore()),
        String(this.quizMaxAttempts())
      ].join('|');
    }

    if (lessonType === 'ASSIGNMENT') {
      return [
        ...base,
        this.assignmentDescription.trim(),
        this.assignmentInstructions.trim(),
        this.assignmentDueDate,
        String(this.assignmentMaxScore)
      ].join('|');
    }

    return base.join('|');
  }

  private buildSectionEditorSignature(): string {
    const selectedQuestionIds = this.sectionQuizSelectedQuestions()
      .map(question => question.id)
      .sort()
      .join(',');
    const selectedFileSignature = this.selectedFile
      ? `${this.selectedFile.name}:${this.selectedFile.size}`
      : '';

    return [
      'section',
      this.editingSectionId() ?? 'new',
      this.newSectionType,
      this.sectionTitle.trim(),
      String(this.sectionIsRequired),
      this.sectionContent.trim(),
      this.sectionVideoAssetId ?? '',
      this.sectionVideoProcessingStatus ?? '',
      this.sectionVideoUrl.trim(),
      this.sectionVideoType ?? '',
      this.sectionStreamVideoUid ?? '',
      this.sectionCfObjectKey ?? '',
      this.sectionFileUrl() ?? '',
      selectedFileSignature,
      this.selectedSectionVideoFile
        ? `${this.selectedSectionVideoFile.name}:${this.selectedSectionVideoFile.size}`
        : '',
      this.sectionQuizType,
      String(this.sectionQuizTimeLimit()),
      String(this.sectionQuizPassingScore()),
      String(this.sectionQuizMaxAttempts()),
      String(this.sectionQuizShuffleQuestions),
      String(this.sectionQuizShuffleOptions),
      String(this.sectionQuizShowResults),
      selectedQuestionIds
    ].join('|');
  }

  private buildLessonHydrationKey(lesson: LessonDraftDTO): string {
    // NOTE: Intentionally excludes section signatures to prevent re-hydration
    // cascades when hydrateMissingSectionSelection updates the tree with fetched
    // sections.  Section data is managed by the section surface effect, not here.
    const lessonType = this.getLessonType(lesson);
    return [
      lesson.id,
      lesson.title,
      lessonType,
      lesson.quizTimeLimit ?? '',
      lesson.quizPassingScore ?? '',
      lesson.quizMaxAttempts ?? '',
      lesson.assignmentId ?? '',
      lesson.assignmentDescription ?? '',
      lesson.assignmentInstructions ?? '',
      lesson.assignmentDueDate ?? '',
      lesson.assignmentMaxScore ?? ''
    ].join('|');
  }

  private fetchLessonDetails(lessonId: string) {
    if (this.inFlightLessonDetailId === lessonId) {
      return;
    }

    const requestToken = ++this.lessonDetailRequestToken;
    this.inFlightLessonDetailId = lessonId;
    this.isLoadingLesson.set(true);
    this.lessonApi.getLessonById(lessonId).subscribe({
      next: (response: any) => {
        if (requestToken !== this.lessonDetailRequestToken) {
          return;
        }

        const detail = response.data || response;
        const lessonStillSelected = this.selectedLesson()?.id === lessonId;
        const preserveVisibleEditorState = this.editorDirty() || this.isSaving();
        if (lessonStillSelected && !preserveVisibleEditorState) {
          this.lessonTitle = detail.title || this.lessonTitle;
          this.lessonContent = detail.content || detail.description || this.lessonContent;
          this.lessonVideoUrl = detail.videoUrl || this.lessonVideoUrl;
        }
        if (detail.assignment?.id) {
          this.cacheAssignmentMetadata(lessonId, {
            id: detail.assignment.id,
            description: detail.assignment.description,
            instructions: detail.assignment.instructions,
            dueDate: detail.assignment.dueDate,
            maxScore: detail.assignment.maxScore,
            status: detail.assignment.status
          }, preserveVisibleEditorState);
        }
        this.inFlightLessonDetailId = null;
        this.isLoadingLesson.set(false);
      },
      error: () => {
        if (requestToken !== this.lessonDetailRequestToken) {
          return;
        }
        this.toast.error('Không thể tải chi tiết bài học');
        this.inFlightLessonDetailId = null;
        this.isLoadingLesson.set(false);
      }
    });
  }

  private toDateTimeLocalValue(value?: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const pad = (input: number) => input.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private toIsoInstantOrUndefined(value?: string | null): string | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return date.toISOString();
  }

  private coerceNumber(value: string | number | null | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  updateQuizTimeLimit(value: string | number | null | undefined) {
    this.quizTimeLimit.set(Math.max(1, this.coerceNumber(value, this.quizTimeLimit())));
    this.markEditorUnsaved();
  }

  updateQuizPassingScore(value: string | number | null | undefined) {
    const next = this.coerceNumber(value, this.quizPassingScore());
    this.quizPassingScore.set(Math.min(100, Math.max(0, next)));
    this.markEditorUnsaved();
  }

  updateQuizMaxAttempts(value: string | number | null | undefined) {
    this.quizMaxAttempts.set(Math.max(1, this.coerceNumber(value, this.quizMaxAttempts())));
    this.markEditorUnsaved();
  }

  updateSectionQuizTimeLimit(value: string | number | null | undefined) {
    this.sectionQuizTimeLimit.set(Math.max(1, this.coerceNumber(value, this.sectionQuizTimeLimit())));
    this.markEditorUnsaved();
  }

  updateSectionQuizPassingScore(value: string | number | null | undefined) {
    const next = this.coerceNumber(value, this.sectionQuizPassingScore());
    this.sectionQuizPassingScore.set(Math.min(100, Math.max(0, next)));
    this.markEditorUnsaved();
  }

  updateSectionQuizMaxAttempts(value: string | number | null | undefined) {
    this.sectionQuizMaxAttempts.set(Math.max(1, this.coerceNumber(value, this.sectionQuizMaxAttempts())));
    this.markEditorUnsaved();
  }

  // YouTube helpers
  isYouTubeUrl(url: string): boolean {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  private extractYouTubeId(url: string): string | null {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  // Navigation
  async clearSelection() {
    if (!(await this.confirmDiscardChangesIfNeeded())) {
      return;
    }

    this.selectionService.clearSelection();
  }

  onSectionSaved(): void {
    const courseId = this.store.courseTree()?.id;
    if (courseId) this.store.loadCourse(courseId, true);
    this.refreshEditorBaselineWithOptions(true);
  }

  onSectionClosed(): void {
    this.editorSvc.closeSectionSurface();
  }

  async closeSectionModal() {
    if (!(await this.confirmDiscardChangesIfNeeded())) {
      return;
    }

    this.closeSectionSurface();
  }

  private closeSectionSurface() {
    this.closeSectionQuizChildSurfaces();
    this.clearSectionVideoPollTimer();
    this.resetSectionSurfaceController();
    this.showSectionModal.set(false);
    this.editingSectionId.set(null);
    this.isDataLoaded.set(false);
    this.selectionService.clearSectionSelection();
    this.refreshEditorBaseline();
  }

  onClearSelectedFile() {
    this.selectedFile = null;
    this.markEditorUnsaved();
  }

  // Save methods
  async saveChapter() {
    const chapterId = this.selectedChapterId();
    if (!chapterId || !this.chapterTitle.trim()) return;

    this.isSaving.set(true);
    this.store.markSaving();
    try {
      const courseId = this.store.courseTree()?.id;
      if (!courseId) {
        this.store.markUnsaved();
        return;
      }
      await firstValueFrom(this.chapterApi.updateChapter(chapterId, {
        courseId: courseId,
        title: this.chapterTitle.trim(),
        description: this.chapterDescription.trim()
      }));
      this.refreshEditorBaselineWithOptions(true);
      this.store.loadCourse(courseId, true);
    } catch (err: any) {
      this.store.markUnsaved();
      this.toast.error('Cập nhật chương thất bại: ' + (err?.error?.message || err?.message || ''));
    } finally {
      this.isSaving.set(false);
    }
  }

  async saveLesson() {
    const lesson = this.selectedLesson();
    if (!lesson || !this.lessonTitle.trim()) return;

    // Validate: quiz must have at least 1 question
    if (this.getLessonType(lesson) === 'QUIZ' && this.quizQuestions().length === 0) {
      this.toast.error('Bài kiểm tra phải có ít nhất 1 câu hỏi trước khi lưu');
      return;
    }

    if (this.getLessonType(lesson) === 'ASSIGNMENT' && this.assignmentMaxScore < 1) {
      this.toast.error('Điểm tối đa của bài tập phải lớn hơn 0');
      return;
    }

    this.isSaving.set(true);
    this.store.markSaving();
    try {
      const courseId = this.store.courseTree()?.id;
      const lessonContext = this.findLessonContext(lesson.id);
      if (!courseId || !lessonContext) {
        this.isSaving.set(false);
        this.store.markUnsaved();
        return;
      }
      const chapterId = lessonContext.chapter.id;
      const lessonType = this.getLessonType(lesson);
      const updateData: any = {
        courseId: courseId,
        chapterId: chapterId,
        lessonType: lessonType,
        title: this.lessonTitle.trim()
      };

      if (lessonType === 'LECTURE') {
        updateData.content = this.lessonContent;
        updateData.videoUrl = this.lessonVideoUrl;
      }

      await firstValueFrom(this.lessonApi.updateLesson(lesson.id, updateData));

      if (lessonType === 'QUIZ') {
        const quizId = await this.resolveQuizIdForLesson(lesson.id);
        await firstValueFrom(this.quizApi.updateQuizSettings(quizId, {
          title: this.lessonTitle.trim(),
          timeLimitMinutes: this.quizTimeLimit() || null,
          passingScore: this.quizPassingScore(),
          maxAttempts: this.quizMaxAttempts()
        }));
      } else if (lessonType === 'ASSIGNMENT') {
        const assignmentId = await this.ensureAssignmentIdForLesson(lesson, courseId);
        await firstValueFrom(this.assignmentApi.updateAssignment(assignmentId, {
          title: this.lessonTitle.trim(),
          description: this.assignmentDescription,
          instructions: this.assignmentInstructions,
          dueDate: this.toIsoInstantOrUndefined(this.assignmentDueDate),
          maxScore: this.assignmentMaxScore
        }));
      }

      this.refreshEditorBaselineWithOptions(true);
      this.store.loadCourse(courseId, true);
    } catch (err: any) {
      this.store.markUnsaved();
      this.toast.error('Cập nhật bài học thất bại: ' + (err?.error?.message || err?.message || ''));
    } finally {
      this.isSaving.set(false);
    }
  }

  // Quiz methods
  async loadQuizPackages() {
    try {
      const packages = await firstValueFrom(this.packageApi.getMyPackages());
      this.quizPackages.set(packages || []);
    } catch (err: any) {
      this.quizPackages.set([]);
      this.toast.error('Tải ngân hàng câu hỏi thất bại');
    }
  }

  private resetActiveLessonQuiz() {
    this.activeLessonQuizId.set(null);
    this.activeLessonQuizLessonId.set(null);
  }

  private async resolveQuizIdForLesson(lessonId: string): Promise<string> {
    if (this.activeLessonQuizLessonId() === lessonId && this.activeLessonQuizId()) {
      return this.activeLessonQuizId()!;
    }

    let quizId: string;
    try {
      quizId = await firstValueFrom(this.quizApi.resolveQuizIdByLessonId(lessonId));
    } catch (originalError) {
      const lesson = this.findLessonContext(lessonId)?.lesson
        ?? (this.selectedLesson()?.id === lessonId ? this.selectedLesson() : null);
      if (!lesson) {
        throw originalError;
      }

      await firstValueFrom(this.quizApi.createLessonQuizV3(lessonId, {
        title: this.lessonTitle.trim() || lesson.title || 'Bai kiem tra moi',
        description: '',
        timeLimitMinutes: this.quizTimeLimit() || 30,
        maxAttempts: this.quizMaxAttempts(),
        passingScore: this.quizPassingScore(),
        shuffleQuestions: true,
        shuffleOptions: true,
        showResultsImmediately: true,
        showCorrectAnswers: false,
        questionIds: [],
        publishImmediately: false
      }));
      quizId = await firstValueFrom(this.quizApi.resolveQuizIdByLessonId(lessonId));
    }

    if (this.selectedLesson()?.id === lessonId) {
      this.activeLessonQuizLessonId.set(lessonId);
      this.activeLessonQuizId.set(quizId);
    }
    return quizId;
  }

  private async ensureAssignmentIdForLesson(lesson: LessonDraftDTO, courseId: string): Promise<string> {
    if (lesson.assignmentId) {
      return lesson.assignmentId;
    }

    const existing = await this.resolveExistingAssignmentForLesson(lesson.id);
    if (existing?.id) {
      this.cacheAssignmentMetadata(lesson.id, existing);
      return existing.id;
    }

    try {
      const response = await firstValueFrom(this.assignmentApi.createAssignment(courseId, {
        lessonId: lesson.id,
        title: this.lessonTitle.trim() || lesson.title || 'Bai tap moi',
        description: this.assignmentDescription,
        instructions: this.assignmentInstructions,
        dueDate: this.toIsoInstantOrUndefined(this.assignmentDueDate),
        maxScore: this.assignmentMaxScore,
        distributionType: 'ALL_STUDENTS'
      }));

      const assignment = response?.data;
      if (!assignment?.id) {
        throw new Error('Khong the khoi tao assignment cho lesson nay');
      }

      this.cacheAssignmentMetadata(lesson.id, assignment);
      return assignment.id;
    } catch (error: any) {
      if (error?.status === 409) {
        const fallback = await this.resolveExistingAssignmentForLesson(lesson.id);
        if (fallback?.id) {
          this.cacheAssignmentMetadata(lesson.id, fallback);
          return fallback.id;
        }
      }

      throw error;
    }
  }

  private async resolveExistingAssignmentForLesson(lessonId: string): Promise<{
    id: string;
    description?: string;
    instructions?: string;
    dueDate?: string;
    maxScore?: number;
    status?: string;
  } | null> {
    try {
      const response = await firstValueFrom(this.assignmentApi.getAssignmentByLessonId(lessonId));
      return response?.data ?? null;
    } catch {
      return null;
    }
  }

  private cacheAssignmentMetadata(lessonId: string, assignment: {
    id: string;
    description?: string;
    instructions?: string;
    dueDate?: string;
    maxScore?: number;
    status?: string;
  }, preserveVisibleSelection = false): void {
    const context = this.findLessonContext(lessonId);
    if (!context) {
      return;
    }

    this.store.updateLessonLocal(context.chapter.id, lessonId, {
      assignmentId: assignment.id,
      assignmentDescription: assignment.description ?? context.lesson.assignmentDescription,
      assignmentInstructions: assignment.instructions ?? context.lesson.assignmentInstructions,
      assignmentDueDate: assignment.dueDate ?? context.lesson.assignmentDueDate,
      assignmentMaxScore: assignment.maxScore ?? context.lesson.assignmentMaxScore,
      assignmentStatus: assignment.status ?? context.lesson.assignmentStatus
    });

    // Refresh the selected lesson reference without clearing section selection.
    // Using selectLesson() would set sectionId/section to null, closing the modal
    // and triggering a re-hydration flash cycle via URL hydration.
    if (this.selectedLesson()?.id === lessonId && !preserveVisibleSelection) {
      const refreshedContext = this.findLessonContext(lessonId);
      if (refreshedContext) {
        const currentSectionId = this.selectionService.selectedSectionId();
        if (currentSectionId) {
          const refreshedSection = refreshedContext.lesson.sections?.find(
            (s: any) => s.id === currentSectionId
          );
          if (refreshedSection) {
            this.selectionService.syncSectionReference(
              refreshedContext.chapter, refreshedContext.lesson, refreshedSection
            );
          } else {
            this.selectionService.syncLessonReference(refreshedContext.chapter, refreshedContext.lesson);
          }
        } else {
          this.selectionService.syncLessonReference(refreshedContext.chapter, refreshedContext.lesson);
        }
      }
    }
  }

  async loadQuizQuestions(lessonId?: string) {
    const targetLessonId = lessonId || this.selectedLesson()?.id;
    if (!targetLessonId) return;

    this.quizQuestionsLoading.set(true);
    try {
      const quizId = await this.resolveQuizIdForLesson(targetLessonId);
      const questions = await firstValueFrom(this.quizApi.getQuizQuestions(quizId));
      this.quizQuestions.set(questions.map((q: any) => ({
        id: q.id,
        content: q.content,
        difficulty: q.difficulty,
        tags: q.tags,
        correctOption: q.correctOption,
        options: q.options || []
      })));
    } catch (err: any) {
      this.quizQuestions.set([]);
      this.toast.error('Tải danh sách câu hỏi thất bại');
    } finally {
      this.quizQuestionsLoading.set(false);
    }
  }

  isInstructorLedCourse(): boolean {
    return this.store.courseTree()?.deliveryMode === 'INSTRUCTOR_LED';
  }

  getLessonFlowLabel(): string {
    return this.isInstructorLedCourse() ? 'Lớp học' : 'Khóa học';
  }

  getLessonPlacementLabel(): string {
    return 'Bài học trong chương trình';
  }

  getLessonAudienceLabel(): string {
    if (this.isInstructorLedCourse()) {
      return 'Lớp học hoặc nhóm học viên';
    }

    return 'Toàn bộ học viên đã ghi danh';
  }

  getLessonDistributionManagementLabel(type: 'QUIZ' | 'ASSIGNMENT'): string {
    if (!this.isInstructorLedCourse()) {
      return 'Không cần phân phối riêng';
    }

    return type === 'QUIZ' ? 'Quản lý ở trang bài kiểm tra' : 'Quản lý ở cài đặt bài tập';
  }

  getQuizFlowDescription(): string {
    if (this.isInstructorLedCourse()) {
      return 'Bạn đang chỉnh lesson shell và thiết lập cốt lõi của bài kiểm tra. Việc giao theo lớp hoặc nhóm học viên được tách riêng, còn ngân hàng câu hỏi được quản lý ở builder chi tiết.';
    }

    return 'Bài kiểm tra này áp dụng cho toàn bộ học viên đã ghi danh trong khóa học tự học. Hãy dùng builder chi tiết để thêm, tái sử dụng hoặc sắp xếp câu hỏi.';
  }

  getAssignmentFlowDescription(): string {
    if (this.isInstructorLedCourse()) {
      return 'Bạn đang chỉnh phần nội dung và tiêu chí mặc định của bài tập. Việc giao theo lớp hoặc theo học viên được tách riêng khỏi bài học này.';
    }

    return 'Bài tập này áp dụng cho toàn bộ học viên đã ghi danh trong khóa học tự học.';
  }

  async loadPackageQuestions() {
    if (!this.selectedPackageId) {
      this.packageQuestions.set([]);
      return;
    }
    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(this.selectedPackageId));
      this.packageQuestions.set(questions || []);
      this.selectedQuestionIds.set(new Set());
    } catch (err: any) {
      this.packageQuestions.set([]);
      this.toast.error('Tải câu hỏi từ gói thất bại');
    }
  }

  selectAllQuestions() {
    const allIds = new Set(this.packageQuestions().map((q: any) => q.id));
    this.selectedQuestionIds.set(allIds);
  }

  clearQuestionSelection() {
    this.selectedQuestionIds.set(new Set());
  }

  toggleQuestionSelection(questionId: string) {
    const current = this.selectedQuestionIds();
    const newSet = new Set(current);
    if (newSet.has(questionId)) {
      newSet.delete(questionId);
    } else {
      newSet.add(questionId);
    }
    this.selectedQuestionIds.set(newSet);
  }

  // Section Methods (L3)
  async openSectionEditor(type: 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE') {
    if (!(await this.confirmDiscardChangesIfNeeded())) {
      return;
    }

    // New: delegate to CurriculumEditorService
    this.editorSvc.openSectionCreate(type as any);

    // Legacy: keep old state in sync until full migration
    this.selectionService.clearSectionSelection();
    this.closeSectionQuizChildSurfaces();
    this.sectionSurfaceMode.set('create');
    this.sectionSurfaceId.set(null);
    this.sectionSurfaceHydrationKey = `create|${type}`;
    this.isDataLoaded.set(false);
    this.editingSectionId.set(null);
    this.newSectionType = type as any;
    this.sectionTitle = '';
    this.resetSectionModalTransientState();
    this.resetSectionQuizFields();
    this.showSectionModal.set(true);

    if (type === 'TEXT') {
      setTimeout(() => {
        this.isDataLoaded.set(true);
        this.refreshEditorBaseline();
      }, 50);
      return;
    }

    this.isDataLoaded.set(true);
    this.refreshEditorBaseline();
  }

  // Flag to control editor loading timing
  isDataLoaded = signal<boolean>(false);

  async editSection(section: SectionDraftDTO) {
    if (!(await this.confirmDiscardChangesIfNeeded())) {
      return;
    }

    // New: delegate to CurriculumEditorService
    this.editorSvc.openSectionEdit(section);

    const lesson = this.selectedLesson();
    if (!lesson) {
      return;
    }

    const context = this.findLessonContext(lesson.id);
    if (context) {
      this.selectionService.selectSection(context.chapter, context.lesson, section);
      return;
    }

    // Legacy sync
    this.sectionSurfaceMode.set('edit');
    this.sectionSurfaceId.set(section.id);
    this.sectionSurfaceHydrationKey = `edit|${section.id}`;
    this.closeSectionQuizChildSurfaces();
    this.showSectionModal.set(true);
    this.hydrateSectionState(section);
  }

  // AI Course Generation: subscribe to progress events
  private wiiiContextService = inject(WiiiContextService);
  private courseProgressSub = this.wiiiContextService.courseProgress$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(progress => {
      const courseId = this.store.courseTree()?.id;
      if (!courseId || progress.courseId !== courseId) return;

      if (progress.phase === 'CHAPTER_GENERATED') {
        this.store.loadCourse(courseId, true); // Force refresh
        this.toast.info(
          `Đã tạo chương ${(progress.chapterIndex ?? 0) + 1}/${progress.totalChapters ?? '?'}`
        );
      }
      if (progress.phase === 'COMPLETED') {
        this.store.loadCourse(courseId, true);
        this.toast.success('Tạo khóa học bằng AI hoàn tất!');
      }
    });

  /** Open Wiii AI sidebar for course generation from document */
  openAiCourseGeneration(): void {
    // Dispatch custom event that the ChatWidgetComponent listens for
    // to open the Wiii sidebar with course generation context
    window.dispatchEvent(new CustomEvent('wiii:open-sidebar', {
      detail: { action: 'generate_lesson', courseId: this.store.courseTree()?.id }
    }));
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleWindowKeydown, true);
    }
    this.resizeCleanup?.();
    this.clearSectionVideoPollTimer();
    this.pdfService.cleanup();
  }

  // Video Preview Logic [NEW]
  private syncSectionVideoMetadata(url: string) {
    if (this.sectionVideoAssetId || this.sectionStreamVideoUid || this.selectedSectionVideoFile) {
      this.sectionVideoType = 'CLOUDFLARE';
      return;
    }

    if (!url) {
      if (!this.sectionCfObjectKey) {
        this.sectionVideoType = null;
      }
      return;
    }
    const videoId = this.extractYouTubeId(url);
    if (videoId) {
      if (!this.sectionCfObjectKey) {
        this.sectionVideoType = 'YOUTUBE';
      }
    } else {
      if (!this.sectionCfObjectKey) {
        this.sectionVideoType = null;
      }
    }
  }

  getSafeUrl(url: string): SafeResourceUrl {
    const videoId = this.extractYouTubeId(url);
    if (videoId) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`);
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  async saveSection() {
    const lesson = this.selectedLesson();
    if (!lesson || !this.sectionTitle.trim()) return;

    if (
      this.newSectionType === 'VIDEO'
      && !this.sectionVideoAssetId
      && !this.sectionStreamVideoUid
      && !this.selectedSectionVideoFile
      && !this.sectionVideoUrl.trim()
    ) {
      this.toast.error('Mục video mới cần một video tải lên nội bộ trước khi lưu');
      return;
    }

    if (this.newSectionType === 'QUIZ' && this.sectionQuizSelectedQuestions().length === 0) {
      this.toast.error('Mục trắc nghiệm phải có ít nhất 1 câu hỏi trước khi lưu');
      return;
    }

    this.isSaving.set(true);
    this.store.markSaving();
    try {
      if (this.newSectionType === 'VIDEO' && this.selectedSectionVideoFile) {
        const asset = await this.uploadSectionVideoAsset(this.selectedSectionVideoFile);
        this.applySectionVideoAssetResponse(asset);
        this.scheduleSectionVideoPoll(asset.id);
      }

      // Construction of DTO Payload
      const payload: any = {
        lessonId: lesson.id,
        title: this.sectionTitle.trim(),
        type: this.newSectionType,
        isRequired: this.sectionIsRequired
      };

      if (this.newSectionType === 'TEXT') {
        payload.content = this.sectionContent;
      } else if (this.newSectionType === 'VIDEO') {
        if (this.sectionVideoAssetId) {
          payload.videoAssetId = this.sectionVideoAssetId;
        } else {
          payload.videoUrl = this.sectionVideoUrl;
          payload.videoType = this.sectionVideoType;
          payload.streamVideoUid = this.sectionStreamVideoUid;
          payload.cfObjectKey = this.sectionCfObjectKey;
        }
      } else if (this.newSectionType === 'QUIZ') {
        payload.quizData = {
          // Mapping variables to DTO fields
          quizType: this.sectionQuizType,
          countsTowardCertificate: this.sectionQuizType === 'EXAM' && this.sectionQuizCountsTowardCertificate,
          timeLimitMinutes: this.sectionQuizTimeLimit(),
          passingScore: this.sectionQuizPassingScore(),
          maxAttempts: this.sectionQuizMaxAttempts(),
          shuffleQuestions: this.sectionQuizShuffleQuestions,
          shuffleOptions: this.sectionQuizShuffleOptions,
          showResultsImmediately: this.sectionQuizShowResults,
          questionIds: this.sectionQuizSelectedQuestions().map(q => q.id)
        };
      }

      const formData = new FormData();
      // append JSON data as a Blob with application/json type
      formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

      // append File if existing
      if (this.newSectionType === 'FILE' && this.selectedFile) {
        formData.append('file', this.selectedFile);
      }





      if (this.editingSectionId()) {
        const res: any = await firstValueFrom(this.sectionApi.updateSection(lesson.id, this.editingSectionId()!, formData));
        const updatedSection = res.data || res;
        if (updatedSection?.fileUrl && this.newSectionType === 'FILE') {
          this.sectionFileUrl.set(updatedSection.fileUrl);
        }
      } else {
        const res: any = await firstValueFrom(this.sectionApi.createSection(lesson.id, formData));
        const createdSection = res.data || res;
        this.editingSectionId.set(createdSection?.id ?? null);
      }

      // Clear staged file after successful save
      this.selectedFile = null;
      this.selectedSectionVideoFile = null;

      // Reload course to refresh tree
      const courseId = this.store.courseTree()?.id;
      if (courseId) this.store.loadCourse(courseId, true);
      this.refreshEditorBaselineWithOptions(true);
      this.closeSectionSurface();
    } catch (e: any) {
      this.store.markUnsaved();
      this.toast.error('Lỗi khi lưu mục: ' + (e?.message || 'Không rõ lỗi'));
    } finally {
      this.isSaving.set(false);
    }
  }

  private async uploadSectionVideoAsset(file: File): Promise<VideoAssetResponse> {
    const uploadResult = await firstValueFrom(
      this.presignedUpload.upload(file, 'videos').pipe(
        filter((event: UploadEvent): event is Extract<UploadEvent, { type: 'complete' }> => event.type === 'complete'),
      ),
    );

    const response: any = await firstValueFrom(
      this.videoAssetApi.createFromUpload(uploadResult.id, file.name),
    );
    return response?.data || response;
  }

  async retrySectionVideoAsset() {
    const assetId = this.sectionVideoAssetId;
    if (!assetId) {
      return;
    }

    try {
      const response = await firstValueFrom(this.videoAssetApi.retry(assetId));
      this.applySectionVideoAssetResponse(response.data);
      this.scheduleSectionVideoPoll(response.data.id);
      this.toast.success('Đã đưa video mục bài giảng vào hàng đợi xử lý lại');
    } catch (error: any) {
      const message = error?.error?.message || error?.message || 'Không thể xử lý lại video mục bài giảng.';
      this.toast.error(message);
    }
  }

  private applySectionVideoAssetResponse(asset: VideoAssetResponse | null | undefined) {
    if (!asset) {
      return;
    }

    this.sectionVideoAssetId = asset.id;
    this.sectionVideoProcessingStatus = asset.status;
    this.sectionStreamVideoUid = asset.streamVideoUid ?? null;
    this.sectionVideoUrl = asset.playbackUrl ?? '';
    this.sectionCfObjectKey = null;
    this.sectionVideoAvailableOfflineProfiles = this.normalizeSectionVideoProfiles(
      asset.availableOfflineProfiles,
    );
    this.sectionVideoType = asset.streamVideoUid ? 'CLOUDFLARE' : this.sectionVideoType;
  }

  private scheduleSectionVideoPoll(assetId: string | null, delayMs = 5000) {
    this.clearSectionVideoPollTimer();

    if (!assetId) {
      return;
    }

    const status = (this.sectionVideoProcessingStatus || '').toUpperCase();
    if (status === 'READY' || status === 'FAILED') {
      return;
    }

    this.sectionVideoPollTimer = setTimeout(async () => {
      try {
        const response = await firstValueFrom(this.videoAssetApi.getById(assetId));
        this.applySectionVideoAssetResponse(response.data);
        this.scheduleSectionVideoPoll(assetId);
      } catch {
        this.scheduleSectionVideoPoll(assetId, 10000);
      }
    }, delayMs);
  }

  private clearSectionVideoPollTimer() {
    if (!this.sectionVideoPollTimer) {
      return;
    }

    clearTimeout(this.sectionVideoPollTimer);
    this.sectionVideoPollTimer = null;
  }

  private normalizeSectionVideoProfiles(
    profiles: Array<{
      id: string;
      label: string;
      actualResolution?: string | null;
      sizeBytes?: number | null;
      downloadUrl?: string | null;
    }> | null | undefined,
  ): Array<OfflineVideoProfileDescriptor & { downloadUrl?: string | null }> {
    return (profiles ?? [])
      .filter((profile): profile is VideoAssetResponse['availableOfflineProfiles'][number] =>
        isOfflineVideoProfileId(profile.id))
      .map((profile) => ({
        ...profile,
        id: profile.id,
      }));
  }

  private async safeRollbackCreatedSection(lessonId: string, sectionId: string): Promise<void> {
    try {
      await firstValueFrom(this.sectionApi.deleteSection(lessonId, sectionId));
    } catch {
      // Best-effort rollback. The user still gets the upload error, but we avoid masking it.
    }
  }

  async deleteSection(sectionId: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa mục',
      message: 'Bạn chắc chắn muốn xóa mục này?',
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;
    this.isSaving.set(true);
    const lesson = this.selectedLesson();
    if (!lesson) {
      this.isSaving.set(false);
      return;
    }

    try {
      this.store.markSaving();
      await firstValueFrom(this.sectionApi.deleteSection(lesson.id, sectionId));
      const courseId = this.store.courseTree()?.id;
      if (courseId) this.store.loadCourse(courseId, true);
      if (this.selectedSectionId() === sectionId) {
        this.closeSectionSurface();
        this.refreshEditorBaselineWithOptions(true);
      }
      this.store.markSaved();
    } catch (err: any) {
      this.store.markUnsaved();
      this.toast.error('Xóa nội dung thất bại: ' + (err?.error?.message || err?.message || ''));
    } finally {
      this.isSaving.set(false);
    }
  }

  dropSection(event: CdkDragDrop<SectionDraftDTO[]>) {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const lesson = this.selectedLesson();
    if (!lesson?.sections?.length) {
      return;
    }

    const sections = [...lesson.sections];
    moveItemInArray(sections, event.previousIndex, event.currentIndex);
    requestAnimationFrame(() => {
      this.store.reorderSectionsOptimistic(lesson.id, sections.map(section => section.id));

      const context = this.findLessonContext(lesson.id);
      if (!context) {
        return;
      }

      const selectedSectionId = this.selectedSectionId();
      if (selectedSectionId) {
        const updatedSection = context.lesson.sections?.find(section => section.id === selectedSectionId);
        if (updatedSection) {
          this.selectionService.selectSection(context.chapter, context.lesson, updatedSection);
          return;
        }
      }

      this.selectionService.selectLesson(context.chapter, context.lesson);
    });
  }

  // [NEW] File selection handler for FILE type sections
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      this.markEditorUnsaved();
    }
  }

  // [NEW] Extract filename from URL for display
  getFileNameFromUrl(url: string): string {
    if (!url) return 'Tập đính kèm';
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);
      return decodeURIComponent(fileName) || 'Tệp đính kèm';
    } catch {
      // If URL parsing fails, try simple approach
      const lastSlash = url.lastIndexOf('/');
      return lastSlash >= 0 ? url.substring(lastSlash + 1) : url;
    }
  }

  // [NEW] Navigate to Quiz Builder for the selected lesson
  async goToQuizBuilder() {
    if (!(await this.confirmDiscardChangesIfNeeded())) {
      return;
    }

    const lesson = this.selectedLesson();
    if (!lesson) {
      return;
    }

    try {
      const quizId = await this.resolveQuizIdForLesson(lesson.id);
      this.router.navigate(['/teacher/quiz', quizId, 'edit']);
    } catch {
      this.toast.error('Không thể mở trình quản lý bài kiểm tra');
    }
  }

  async goToAssignmentSettings() {
    if (!(await this.confirmDiscardChangesIfNeeded())) {
      return;
    }

    const lesson = this.selectedLesson();
    const courseId = this.store.courseTree()?.id;
    if (!lesson || !courseId) {
      return;
    }

    try {
      const assignmentId = await this.ensureAssignmentIdForLesson(lesson, courseId);
      this.router.navigate(['/teacher/assessments/classes/assignments', assignmentId, 'settings']);
    } catch {
      this.toast.error('Không thể mở cài đặt bài tập');
    }
  }

  // [NEW] Check if file is a PDF [SOTA 2025 Refined Logic]
  isPdfFile(sectionOrUrl: any): boolean {
    if (!sectionOrUrl) return false;

    // Case 1: Input is a string (URL)
    if (typeof sectionOrUrl === 'string') {
      return sectionOrUrl.toLowerCase().endsWith('.pdf') || sectionOrUrl.includes('/stream');
    }

    // Case 2: Input is a Section object
    const section = sectionOrUrl;

    // Priority 1: Check defined type (SOTA)
    if (section.type === 'PDF' || section.type === 'DOCUMENT') return true;

    // Priority 2: Check contentType metadata from Backend (if available)
    if (section.attachment?.contentType === 'application/pdf') return true;

    // Priority 3: Fallback for legacy URLs or stream naming convention
    const url = section.fileUrl || '';
    return (url && typeof url === 'string') ? (url.toLowerCase().endsWith('.pdf') || url.includes('/stream')) : false;
  }

  // [NEW] Get safe PDF URL for embed (bypass Angular security)
  getSafePdfUrl(url: string | null): any {
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // ============================================
  // Section Quiz Methods (for QUIZ type sections)
  // ============================================

  openSectionQuizBankModal() {
    if (!this.showSectionModal()) {
      return;
    }

    this.showSectionQuizRandomModal.set(false);
    this.showSectionQuizBankModal.set(true);
    this.selectedPackageId = '';
    this.packageQuestions.set([]);
    this.selectedQuestionIds.set(new Set());
  }

  openSectionQuizRandomModal() {
    if (!this.showSectionModal()) {
      return;
    }

    this.showSectionQuizBankModal.set(false);
    this.showSectionQuizRandomModal.set(true);
    this.selectedPackageId = '';
    this.sectionQuizRandomCount.set(5);
  }

  async addSectionQuizQuestionsFromBank() {
    if (this.selectedQuestionIds().size === 0) return;

    try {
      const questionIds = Array.from(this.selectedQuestionIds());
      const allQuestions = this.packageQuestions();
      const selectedQuestions = allQuestions.filter(q => questionIds.includes(q.id));

      // Add to current selection (avoid duplicates)
      const currentIds = new Set(this.sectionQuizSelectedQuestions().map(q => q.id));
      const newQuestions = selectedQuestions.filter(q => !currentIds.has(q.id));

      if (newQuestions.length === 0) {
        this.toast.warning('Các câu hỏi đã chọn đã có trong mục này.');
        return;
      }

      this.sectionQuizSelectedQuestions.update(current => [...current, ...newQuestions]);
      this.markEditorUnsaved();
      this.showSectionQuizBankModal.set(false);
      this.selectedQuestionIds.set(new Set());
    } catch (err: any) {
      this.toast.error('Thêm câu hỏi từ ngân hàng thất bại');
    }
  }

  async generateSectionQuizRandomQuestions() {
    if (!this.selectedPackageId) return;

    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(this.selectedPackageId));
      if (!questions || questions.length === 0) {
        this.toast.warning('Gói câu hỏi này không có dữ liệu!');
        return;
      }

      // Add to current selection (avoid duplicates)
      const currentIds = new Set(this.sectionQuizSelectedQuestions().map(q => q.id));
      const availableQuestions = questions.filter((q: any) => !currentIds.has(q.id));
      if (availableQuestions.length === 0) {
        this.toast.warning('Gói câu hỏi này không còn câu hỏi mới để thêm vào mục này.');
        return;
      }

      const count = this.sectionQuizRandomCount();
      const selectionCount = Math.min(count, availableQuestions.length);
      const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
      const newQuestions = shuffled.slice(0, selectionCount);

      this.sectionQuizSelectedQuestions.update(current => [...current, ...newQuestions]);
      this.markEditorUnsaved();
      this.showSectionQuizRandomModal.set(false);
      if (newQuestions.length < count) {
        this.toast.info(`Chỉ còn ${newQuestions.length} câu hỏi mới trong gói này, hệ thống đã thêm toàn bộ câu khả dụng.`);
      }
    } catch {
      this.toast.error('Lỗi khi tạo câu hỏi ngẫu nhiên.');
    }
  }

  removeSectionQuizQuestion(questionId: string) {
    this.sectionQuizSelectedQuestions.update(current =>
      current.filter(q => q.id !== questionId)
    );
    this.markEditorUnsaved();
  }

  // Helper methods for template (Angular doesn't support arrow functions in templates)
  decreaseSectionQuizRandomCount() {
    const current = this.sectionQuizRandomCount();
    if (current > 1) {
      this.sectionQuizRandomCount.set(current - 1);
    }
  }

  increaseSectionQuizRandomCount() {
    this.sectionQuizRandomCount.update(v => v + 1);
  }

  // Reset section quiz fields when opening new section
  private resetSectionQuizFields() {
    this.sectionQuizType = 'PRACTICE';
    this.sectionQuizCountsTowardCertificate = false;
    this.sectionQuizTimeLimit.set(30);
    this.sectionQuizPassingScore.set(60);
    this.sectionQuizMaxAttempts.set(1);
    this.sectionQuizShuffleQuestions = true;
    this.sectionQuizShuffleOptions = true;
    this.sectionQuizShowResults = true;
    this.sectionQuizSelectedQuestions.set([]);
  }
}
