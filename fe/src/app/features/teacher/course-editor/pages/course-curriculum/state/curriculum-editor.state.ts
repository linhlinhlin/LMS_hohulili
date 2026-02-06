import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { CourseEditorStore } from '../../../store/course-editor.store';
import { CurriculumSelectionService } from '../../../services/curriculum-selection.service';
import { LessonDraftDTO, SectionDraftDTO } from '../../../services/course-authoring.service';
import { LessonApi } from '../../../../../../api/client/lesson.api';
import { ChapterApi } from '../../../../../../api/client/chapter.api';
import { SectionApi } from '../../../../../../api/client/section.api';
import { QuizApi } from '../../../../../../api/endpoints/quiz.api';
import { PackageApi } from '../../../../../../api/endpoints/package.api';

export type SectionType = 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE';
export type QuizType = 'ASSESSMENT' | 'EXAM';

/**
 * Signal-based State Management for Course Curriculum Editor
 * Extracted from course-curriculum.component.ts (1150 LOC)
 */
@Injectable()
export class CurriculumEditorState {
  private destroyRef = inject(DestroyRef);
  private sanitizer = inject(DomSanitizer);

  // External Dependencies (injected)
  readonly store = inject(CourseEditorStore);
  readonly selectionService = inject(CurriculumSelectionService);
  private lessonApi = inject(LessonApi);
  private chapterApi = inject(ChapterApi);
  private sectionApi = inject(SectionApi);
  private quizApi = inject(QuizApi);
  private packageApi = inject(PackageApi);

  // Selection State (delegated to service)
  selectedChapterId = this.selectionService.selectedChapterId;
  selectedLessonId = this.selectionService.selectedLessonId;
  selectedLesson = this.selectionService.selectedLesson;
  selectedSectionId = this.selectionService.selectedSectionId;
  selectedSection = this.selectionService.selectedSection;

  // Loading States
  isSaving = signal(false);
  isLoadingLesson = signal(false);
  isDataLoaded = signal(false);

  // Chapter Form
  chapterTitle = signal('');
  chapterDescription = signal('');

  // Lesson Form
  lessonTitle = signal('');
  lessonContent = signal('');
  lessonVideoUrl = signal('');

  // Section Form
  sectionTitle = signal('');
  sectionContent = signal('');
  sectionVideoUrl = signal('');
  sectionFileUrl = signal<string | null>(null);
  sectionIsRequired = signal(false);
  sectionType = signal<SectionType>('TEXT');
  selectedFile = signal<File | null>(null);

  // Video State
  sectionVideoType = signal<'YOUTUBE' | 'CLOUDFLARE' | null>(null);
  sectionCfObjectKey = signal<string | null>(null);
  safeVideoUrl = signal<SafeResourceUrl | null>(null);
  safePdfUrl = signal<SafeResourceUrl | null>(null);
  isVideoPreviewVisible = signal(false);

  // Quiz State (Lesson-level)
  quizTimeLimit = signal(30);
  quizPassingScore = signal(60);
  quizMaxAttempts = signal(1);
  quizQuestions = signal<any[]>([]);
  quizQuestionsLoading = signal(false);

  // Quiz Packages
  quizPackages = signal<any[]>([]);
  selectedPackageId = signal('');
  packageQuestions = signal<any[]>([]);
  selectedQuestionIds = signal<Set<string>>(new Set());
  showAddQuestionsModal = signal(false);
  showRandomModal = signal(false);
  randomCount = signal(10);

  // Section Quiz Fields
  sectionQuizType = signal<QuizType>('ASSESSMENT');
  sectionQuizTimeLimit = signal(30);
  sectionQuizPassingScore = signal(60);
  sectionQuizMaxAttempts = signal(1);
  sectionQuizShuffleQuestions = signal(true);
  sectionQuizShuffleOptions = signal(true);
  sectionQuizShowResults = signal(true);
  sectionQuizSelectedQuestions = signal<any[]>([]);
  showSectionQuizBankModal = signal(false);
  showSectionQuizRandomModal = signal(false);
  sectionQuizRandomCount = signal(5);

  // Assignment Fields
  assignmentDescription = signal('');
  assignmentInstructions = signal('');
  assignmentDueDate = signal('');
  assignmentMaxScore = signal(100);

  // Section Modal
  showSectionModal = signal(false);
  editingSectionId = signal<string | null>(null);

  // Question Creation Modal
  showCreateQuestionModal = signal(false);

  // Editor State
  editorHeight = signal(450);
  wordCount = signal(0);

  // Computed
  selectedChapterLessons = computed(() => {
    const chapterId = this.selectedChapterId();
    if (!chapterId) return [];
    const chapter = this.store.chapters().find(c => c.id === chapterId);
    return chapter?.lessons || [];
  });

  isLectureType = computed(() => {
    const lesson = this.selectedLesson();
    const type = lesson?.type || 'LECTURE';
    return type === 'LECTURE';
  });

  isQuizType = computed(() => {
    const lesson = this.selectedLesson();
    return lesson?.type === 'QUIZ';
  });

  isAssignmentType = computed(() => {
    const lesson = this.selectedLesson();
    return lesson?.type === 'ASSIGNMENT';
  });

  // Methods
  getLessonType(lesson: LessonDraftDTO | null): string {
    return lesson?.type || 'LECTURE';
  }

  getLessonTypeLabel(type: string): string {
    switch (type) {
      case 'LECTURE': return 'Bài giảng';
      case 'QUIZ': return 'Trắc nghiệm';
      case 'ASSIGNMENT': return 'Bài tập';
      default: return 'Bài giảng';
    }
  }

  // Chapter Operations
  async saveChapter(): Promise<boolean> {
    const chapterId = this.selectedChapterId();
    if (!chapterId || !this.chapterTitle().trim()) return false;

    this.isSaving.set(true);
    try {
      const courseId = this.store.courseTree()?.id;
      if (!courseId) return false;

      await firstValueFrom(this.chapterApi.updateChapter(chapterId, {
        courseId,
        title: this.chapterTitle().trim(),
        description: this.chapterDescription().trim()
      }));
      this.store.loadCourse(courseId, true);
      return true;
    } catch {
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  // Lesson Operations
  loadLessonData(lesson: LessonDraftDTO): void {
    this.lessonTitle.set(lesson.title || '');
    this.lessonContent.set(lesson.content || lesson.contentText || '');
    this.lessonVideoUrl.set(lesson.videoUrl || lesson.contentUrl || '');
    this.quizTimeLimit.set(lesson.quizTimeLimit || 30);
    this.quizPassingScore.set(lesson.quizPassingScore || 60);
    this.quizMaxAttempts.set(lesson.quizMaxAttempts || 1);
    this.assignmentDescription.set(lesson.assignmentDescription || '');
    this.assignmentInstructions.set(lesson.assignmentInstructions || '');
    this.assignmentDueDate.set(lesson.assignmentDueDate || '');
    this.assignmentMaxScore.set(lesson.assignmentMaxScore || 100);
  }

  async saveLesson(): Promise<boolean> {
    const lesson = this.selectedLesson();
    if (!lesson || !this.lessonTitle().trim()) return false;

    this.isSaving.set(true);
    try {
      const courseId = this.store.courseTree()?.id;
      const chapterId = this.selectedChapterId();
      if (!courseId || !chapterId) return false;

      const lessonType = this.getLessonType(lesson);
      const updateData: any = {
        courseId,
        chapterId,
        lessonType,
        title: this.lessonTitle().trim()
      };

      if (lessonType === 'LECTURE') {
        updateData.content = this.lessonContent();
        updateData.videoUrl = this.lessonVideoUrl();
      } else if (lessonType === 'QUIZ') {
        updateData.quizTimeLimit = this.quizTimeLimit();
        updateData.quizPassingScore = this.quizPassingScore();
        updateData.quizMaxAttempts = this.quizMaxAttempts();
      } else if (lessonType === 'ASSIGNMENT') {
        updateData.assignmentDescription = this.assignmentDescription();
        updateData.assignmentDueDate = this.assignmentDueDate();
        updateData.assignmentMaxScore = this.assignmentMaxScore();
      }

      await firstValueFrom(this.lessonApi.updateLesson(lesson.id, updateData));
      this.store.loadCourse(courseId, true);
      return true;
    } catch {
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  // Section Operations
  openSectionEditor(type: SectionType): void {
    this.editingSectionId.set(null);
    this.sectionType.set(type);
    this.sectionTitle.set('');
    this.sectionContent.set('');
    this.sectionVideoUrl.set('');
    this.sectionVideoType.set(null);
    this.sectionCfObjectKey.set(null);
    this.sectionFileUrl.set(null);
    this.selectedFile.set(null);
    this.sectionIsRequired.set(false);
    this.resetSectionQuizFields();
    this.showSectionModal.set(true);
  }

  editSection(section: SectionDraftDTO): void {
    this.isDataLoaded.set(false);
    this.showSectionModal.set(true);
    this.editingSectionId.set(section.id);
    this.sectionTitle.set(section.title);
    this.sectionType.set(section.type as SectionType);
    this.sectionIsRequired.set(section.isRequired || false);
    this.sectionContent.set('');
    this.sectionVideoUrl.set('');
    this.sectionVideoType.set(null);
    this.sectionCfObjectKey.set(null);
    this.safeVideoUrl.set(null);
    this.selectedFile.set(null);
    this.sectionFileUrl.set(null);

    if (section.type === 'TEXT') {
      this.sectionContent.set(section.content || '');
      setTimeout(() => this.isDataLoaded.set(true), 50);
    } else if (section.type === 'VIDEO') {
      if (section.videoUrl) {
        this.sectionVideoUrl.set(section.videoUrl);
        this.safeVideoUrl.set(this.getSafeUrl(section.videoUrl));
      }
      this.isDataLoaded.set(true);
    } else if (section.type === 'FILE') {
      if (section.fileUrl) {
        this.sectionFileUrl.set(section.fileUrl);
      }
      this.isDataLoaded.set(true);
    } else {
      this.isDataLoaded.set(true);
    }
  }

  async saveSection(): Promise<boolean> {
    const lesson = this.selectedLesson();
    if (!lesson || !this.sectionTitle().trim()) return false;

    this.isSaving.set(true);
    try {
      const payload: any = {
        lessonId: lesson.id,
        title: this.sectionTitle().trim(),
        type: this.sectionType(),
        isRequired: this.sectionIsRequired()
      };

      if (this.sectionType() === 'TEXT') {
        payload.content = this.sectionContent();
      } else if (this.sectionType() === 'VIDEO') {
        payload.videoUrl = this.sectionVideoUrl();
        payload.videoType = this.sectionVideoType();
        payload.cfObjectKey = this.sectionCfObjectKey();
      } else if (this.sectionType() === 'QUIZ') {
        payload.quizData = {
          quizType: this.sectionQuizType(),
          timeLimitMinutes: this.sectionQuizTimeLimit(),
          passingScore: this.sectionQuizPassingScore(),
          maxAttempts: this.sectionQuizType() === 'EXAM' ? this.sectionQuizMaxAttempts() : 999,
          shuffleQuestions: this.sectionQuizShuffleQuestions(),
          shuffleOptions: this.sectionQuizShuffleOptions(),
          showResultsImmediately: this.sectionQuizShowResults(),
          questionIds: this.sectionQuizSelectedQuestions().map(q => q.id)
        };
      }

      const formData = new FormData();
      formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

      if (this.sectionType() === 'FILE' && this.selectedFile()) {
        formData.append('file', this.selectedFile()!);
      }

      if (this.editingSectionId()) {
        await firstValueFrom(this.sectionApi.updateSection(lesson.id, this.editingSectionId()!, formData));
      } else {
        await firstValueFrom(this.sectionApi.createSection(lesson.id, formData));
      }

      this.selectedFile.set(null);
      const courseId = this.store.courseTree()?.id;
      if (courseId) this.store.loadCourse(courseId, true);
      this.showSectionModal.set(false);
      return true;
    } catch {
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteSection(sectionId: string): Promise<boolean> {
    const lesson = this.selectedLesson();
    if (!lesson) return false;

    this.isSaving.set(true);
    try {
      await firstValueFrom(this.sectionApi.deleteSection(lesson.id, sectionId));
      const courseId = this.store.courseTree()?.id;
      if (courseId) this.store.loadCourse(courseId, true);
      return true;
    } catch {
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  // Video Helpers
  updateVideoPreview(url: string): void {
    if (!url) {
      this.safeVideoUrl.set(null);
      if (!this.sectionCfObjectKey()) {
        this.sectionVideoType.set(null);
      }
      return;
    }
    const videoId = this.extractYouTubeId(url);
    if (videoId) {
      this.safeVideoUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`));
      if (!this.sectionCfObjectKey()) {
        this.sectionVideoType.set('YOUTUBE');
      }
    } else {
      this.safeVideoUrl.set(null);
      if (!this.sectionCfObjectKey()) {
        this.sectionVideoType.set('YOUTUBE');
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

  toggleVideoPreview(): void {
    this.isVideoPreviewVisible.update(v => !v);
  }

  // Quiz Operations
  async loadQuizPackages(): Promise<void> {
    try {
      const packages = await firstValueFrom(this.packageApi.getMyPackages());
      this.quizPackages.set(packages || []);
    } catch {
      this.quizPackages.set([]);
    }
  }

  async loadQuizQuestions(): Promise<void> {
    const lesson = this.selectedLesson();
    if (!lesson) return;

    this.quizQuestionsLoading.set(true);
    try {
      const response = await firstValueFrom(this.quizApi.getQuizQuestions(lesson.id));
      const questions = Array.isArray(response) ? response : (response as any).data || [];
      this.quizQuestions.set(questions.map((q: any) => ({
        id: q.id,
        content: q.content,
        difficulty: q.difficulty,
        tags: q.tags,
        correctOption: q.correctOption,
        options: q.options || []
      })));
    } catch {
      this.quizQuestions.set([]);
    } finally {
      this.quizQuestionsLoading.set(false);
    }
  }

  async loadPackageQuestions(): Promise<void> {
    if (!this.selectedPackageId()) {
      this.packageQuestions.set([]);
      return;
    }
    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(this.selectedPackageId()));
      this.packageQuestions.set(questions || []);
      this.selectedQuestionIds.set(new Set());
    } catch {
      this.packageQuestions.set([]);
    }
  }

  selectAllQuestions(): void {
    const allIds = new Set(this.packageQuestions().map((q: any) => q.id));
    this.selectedQuestionIds.set(allIds);
  }

  clearQuestionSelection(): void {
    this.selectedQuestionIds.set(new Set());
  }

  toggleQuestionSelection(questionId: string): void {
    const current = this.selectedQuestionIds();
    const newSet = new Set(current);
    if (newSet.has(questionId)) {
      newSet.delete(questionId);
    } else {
      newSet.add(questionId);
    }
    this.selectedQuestionIds.set(newSet);
  }

  async addSelectedQuestionsToQuiz(): Promise<boolean> {
    const lesson = this.selectedLesson();
    if (!lesson || this.selectedQuestionIds().size === 0) return false;

    try {
      const questionIds = Array.from(this.selectedQuestionIds());
      for (const questionId of questionIds) {
        await firstValueFrom(this.quizApi.addQuestionToQuiz(lesson.id, questionId));
      }
      await this.loadQuizQuestions();
      this.showAddQuestionsModal.set(false);
      this.selectedQuestionIds.set(new Set());
      this.selectedPackageId.set('');
      this.packageQuestions.set([]);
      return true;
    } catch {
      return false;
    }
  }

  async removeQuestionFromQuiz(questionId: string): Promise<boolean> {
    const lesson = this.selectedLesson();
    if (!lesson) return false;

    try {
      await firstValueFrom(this.quizApi.removeQuestionFromQuiz(lesson.id, questionId));
      await this.loadQuizQuestions();
      return true;
    } catch {
      return false;
    }
  }

  // Section Quiz Helpers
  private resetSectionQuizFields(): void {
    this.sectionQuizType.set('ASSESSMENT');
    this.sectionQuizTimeLimit.set(30);
    this.sectionQuizPassingScore.set(60);
    this.sectionQuizMaxAttempts.set(1);
    this.sectionQuizShuffleQuestions.set(true);
    this.sectionQuizShuffleOptions.set(true);
    this.sectionQuizShowResults.set(true);
    this.sectionQuizSelectedQuestions.set([]);
  }

  openSectionQuizBankModal(): void {
    this.showSectionQuizBankModal.set(true);
    this.selectedPackageId.set('');
    this.packageQuestions.set([]);
    this.selectedQuestionIds.set(new Set());
  }

  async addSectionQuizQuestionsFromBank(): Promise<void> {
    if (this.selectedQuestionIds().size === 0) return;

    const questionIds = Array.from(this.selectedQuestionIds());
    const allQuestions = this.packageQuestions();
    const selectedQuestions = allQuestions.filter(q => questionIds.includes(q.id));
    const currentIds = new Set(this.sectionQuizSelectedQuestions().map(q => q.id));
    const newQuestions = selectedQuestions.filter(q => !currentIds.has(q.id));

    this.sectionQuizSelectedQuestions.update(current => [...current, ...newQuestions]);
    this.showSectionQuizBankModal.set(false);
    this.selectedQuestionIds.set(new Set());
  }

  removeSectionQuizQuestion(questionId: string): void {
    this.sectionQuizSelectedQuestions.update(current =>
      current.filter(q => q.id !== questionId)
    );
  }

  // Utility
  getFileNameFromUrl(url: string): string {
    if (!url) return 'Tệp đính kèm';
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);
      return decodeURIComponent(fileName) || 'Tệp đính kèm';
    } catch {
      const lastSlash = url.lastIndexOf('/');
      return lastSlash >= 0 ? url.substring(lastSlash + 1) : url;
    }
  }

  // Selection Helpers
  selectLessonFromChapter(lesson: LessonDraftDTO): void {
    const chapter = this.store.chapters().find(c => c.id === this.selectedChapterId());
    if (chapter) {
      this.selectionService.selectLesson(chapter, lesson);
    }
  }

  clearSelection(): void {
    this.selectionService.clearSelection();
  }

  clearSectionSelection(): void {
    this.selectionService.clearSectionSelection();
    this.isDataLoaded.set(false);
  }
}
