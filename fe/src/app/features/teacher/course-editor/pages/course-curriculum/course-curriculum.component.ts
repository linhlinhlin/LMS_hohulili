import { Component, inject, signal, computed, effect, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CourseEditorStore } from '../../store/course-editor.store';
import { LessonDraftDTO, SectionDraftDTO } from '../../services/course-authoring.service';
import { CurriculumSelectionService } from '../../services/curriculum-selection.service';
import { CONTENT_TYPE_CONFIG } from '../../../../../core/constants/content-type.constant';
import { LessonApi } from '../../../../../api/client/lesson.api';
import { ChapterApi } from '../../../../../api/client/chapter.api';
import { SectionApi } from '../../../../../api/client/section.api';
import { QuizApi } from '../../../../../api/endpoints/quiz.api';
import { PackageApi } from '../../../../../api/endpoints/package.api';
import { firstValueFrom } from 'rxjs';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import {
  ClassicEditor,
  // Essentials
  Essentials, Paragraph,
  // Styling
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript, RemoveFormat,
  // Font
  Font, FontFamily, FontSize, FontColor, FontBackgroundColor,
  // Layout & Structure
  Alignment, List, Indent, IndentBlock, BlockQuote, Heading,
  // Media & Insert
  Link, Image, ImageUpload, ImageToolbar, ImageStyle, ImageResize, ImageCaption,
  Table, TableToolbar, MediaEmbed,
  // Utils
  SourceEditing, Autoformat,
  // Helper classes
  EventInfo
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import { Base64UploadAdapterPlugin } from '../../../../../core/utils/base64-upload-adapter';
import { PdfViewerService } from '../../../../../shared/services/pdf-viewer.service';
import {
  LucideAngularModule
} from 'lucide-angular';
import { VideoUploadComponent, VideoUploadResult } from '../../../../../shared/components/video-upload/video-upload.component';
import { QuestionCreateComponent } from '../../../quiz/question-create.component';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-curriculum',
  imports: [FormsModule, CKEditorModule, LucideAngularModule, VideoUploadComponent, QuestionCreateComponent],
  styleUrl: './course-curriculum.component.scss',
  providers: [],
  templateUrl: './course-curriculum.component.html'
})
export class CourseCurriculumComponent implements OnDestroy {
  readonly store = inject(CourseEditorStore);
  readonly selectionService = inject(CurriculumSelectionService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private lessonApi = inject(LessonApi);
  private pdfService = inject(PdfViewerService);
  private chapterApi = inject(ChapterApi);
  private sectionApi = inject(SectionApi);
  private quizApi = inject(QuizApi);
  private packageApi = inject(PackageApi);
  private sanitizer = inject(DomSanitizer);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  // [NEW] In-Context Question Creation
  showCreateQuestionModal = signal(false);

  async onQuestionCreated(question: any) {
    this.showCreateQuestionModal.set(false);

    // Case 1: Active Section Modal (Section Quiz)
    if (this.showSectionModal()) {
      this.sectionQuizSelectedQuestions.update(prev => [...prev, question]);
      return;
    }

    // Case 2: Lesson Quiz
    const lesson = this.selectedLesson();
    if (!lesson) return;

    try {
      // Link question to quiz immediately
      await firstValueFrom(this.quizApi.addQuestionToQuiz(lesson.id, question.id));
      this.quizQuestions.update(prev => [...prev, question]);
    } catch {
      this.toast.error('Thêm câu hỏi vào bài kiểm tra thất bại');
    }
  }

  // CKEditor
  public Editor = ClassicEditor;
  public editorHeight = signal(450);
  public editorInstance: any;

  public editorConfig = {
    licenseKey: 'GPL',
    // [QUAN TRỌNG] Phải nạp Plugins vào đây thì Toolbar mới hiện
    plugins: [
      Essentials, Paragraph, Heading,
      Bold, Italic, Underline, Strikethrough, Subscript, Superscript, RemoveFormat,
      Font, FontFamily, FontSize, FontColor, FontBackgroundColor,
      Alignment, List, Indent, IndentBlock, BlockQuote,
      Link, Image, ImageUpload, ImageToolbar, ImageStyle, ImageResize, ImageCaption,
      Table, TableToolbar, MediaEmbed,
      SourceEditing, Autoformat,

      // Plugin Upload ảnh Base64 của bạn
      Base64UploadAdapterPlugin
    ],

    // Cấu hình Toolbar (Thiết lập nút bấm)
    toolbar: {
      items: [
        'undo', 'redo', '|',
        'heading', '|',
        'fontFamily', 'fontSize', 'fontColor', 'fontBackgroundColor', '|',
        'bold', 'italic', 'underline', 'strikethrough', 'removeFormat', '|',
        'alignment', 'bulletedList', 'numberedList', 'outdent', 'indent', '|',
        'link', 'uploadImage', 'insertTable', 'mediaEmbed', 'blockQuote', '|',
        'sourceEditing'
      ],
      shouldNotGroupWhenFull: true // Tổng nhóm nút nếu màn hình nhỏ
    },

    // Cấu hình Font (Cài đặt Arial làm mặc định)
    fontFamily: {
      options: [
        'default', // Mặc định của theme
        'Arial, Helvetica, sans-serif',
        'Times New Roman, Times, serif',
        'Courier New, Courier, monospace',
        'Verdana, Geneva, sans-serif'
      ],
      supportAllValues: true
    },

    // Cấu hình ảnh (Thanh công cụ khi click vào ảnh)
    image: {
      toolbar: [
        'imageTextAlternative', // Alt text
        'toggleImageCaption',   // Chú thích
        '|',
        'imageStyle:inline',    // Căn dòng
        'imageStyle:block',     // Xuống dòng
        'imageStyle:side',
        '|',
        'resizeImage'           // Kích thước ảnh
      ]
    },

    // C?u h?nh B?ng
    table: {
      contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells']
    },

    // Placeholder
    placeholder: 'Nhập nội dung bài học chi tiết tại đây (văn bản, hình ảnh, video)...'
  };



  startResize(event: MouseEvent) {
    event.preventDefault();
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
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
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
  sectionVideoUrl = '';
  sectionIsRequired = false;
  sectionFileUrl = signal<string | null>(null); // [NEW] For FILE type sections
  sectionVideoType: 'YOUTUBE' | 'CLOUDFLARE' | null = null; // [NEW] Video source type
  sectionCfObjectKey: string | null = null; // [NEW] Cloudflare R2 object key
  selectedFile: File | null = null; // [NEW] For FILE upload
  safeVideoUrl = signal<SafeResourceUrl | null>(null); // [NEW]
  safePdfUrl = signal<SafeResourceUrl | null>(null); // [NEW] SOTA 2025 Secure PDF

  // State
  isSaving = signal(false);
  isLoadingLesson = signal(false);
  showVideoPreview = signal(false);
  wordCount = signal(0); // Optimisation: Signal based word count

  // Chapter form
  chapterTitle = '';
  chapterDescription = '';

  // Lesson form
  lessonTitle = '';
  lessonContent = '';
  lessonVideoUrl = '';

  // Quiz fields
  quizTimeLimit = 30;
  quizPassingScore = 60;
  quizMaxAttempts = 1;
  quizQuestions = signal<any[]>([]);
  quizQuestionsLoading = signal(false);

  // Quiz packages
  quizPackages = signal<any[]>([]);
  selectedPackageId = '';
  packageQuestions = signal<any[]>([]);
  selectedQuestionIds = signal<Set<string>>(new Set());
  showAddQuestionsModal = signal(false);

  // Random Questions
  showRandomModal = signal(false);
  randomCount = signal(10);

  // Section Quiz Fields (for QUIZ type sections)
  sectionQuizType: 'ASSESSMENT' | 'EXAM' = 'ASSESSMENT';
  sectionQuizTimeLimit = 30;
  sectionQuizPassingScore = 60;
  sectionQuizMaxAttempts = 1;
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

  constructor() {
    this.loadQuizPackages();

    effect(() => {
      const chapter = this.selectionService.selectedChapter();
      if (chapter) {
        this.chapterTitle = chapter.title;
        this.chapterDescription = chapter.description || '';
      }
    });

    effect(() => {
      const lesson = this.selectionService.selectedLesson();
      if (lesson) {
        this.loadLessonData(lesson);
        this.fetchLessonDetails(lesson.id);
        if (this.getLessonType(lesson) === 'QUIZ') {
          this.loadQuizQuestions();
        }
      }
    });

    // Effect for Section Selection [NEW]
    effect(() => {
      const section = this.selectedSection();
      if (section) {
        // Reset isDataLoaded trước khi load data mới
        this.isDataLoaded.set(false);

        this.editingSectionId.set(section.id);
        this.sectionTitle = section.title;
        this.newSectionType = (section.type as any) || 'TEXT';
        this.sectionContent = section.content || '';
        this.sectionVideoUrl = section.videoUrl || '';
        this.sectionVideoType = (section as any).videoType || null; // [NEW] Load videoType
        this.sectionCfObjectKey = (section as any).cfObjectKey || null; // [NEW] Load R2 object key
        this.sectionFileUrl.set(section.fileUrl || null); // [NEW]
        this.sectionIsRequired = (section as any).isRequired || false;
        this.updateVideoPreview(this.sectionVideoUrl); // [NEW] Init preview

        // [NEW] Hydrate Quiz Data for QUIZ type sections - SOTA 2025
        if (this.newSectionType === 'QUIZ') {
          const quizData = (section as any).quizData;
          if (quizData) {
            // Hydrate quiz settings
            this.sectionQuizTimeLimit = quizData.timeLimitMinutes || 30;
            this.sectionQuizPassingScore = quizData.passingScore || 60;
            this.sectionQuizMaxAttempts = quizData.maxAttempts || 1;
            this.sectionQuizShuffleQuestions = quizData.shuffleQuestions ?? true;
            this.sectionQuizShuffleOptions = quizData.shuffleOptions ?? true;
            this.sectionQuizShowResults = quizData.showResultsImmediately ?? true;

            // Hydrate questions list
            if (quizData.questions && quizData.questions.length > 0) {
              this.sectionQuizSelectedQuestions.set(quizData.questions.map((q: any) => ({
                id: q.id,
                content: q.content
              })));
            } else {
              this.sectionQuizSelectedQuestions.set([]);
            }
          } else {
            // Reset to defaults if no quiz data
            this.sectionQuizTimeLimit = 30;
            this.sectionQuizPassingScore = 60;
            this.sectionQuizMaxAttempts = 1;
            this.sectionQuizShuffleQuestions = true;
            this.sectionQuizShuffleOptions = true;
            this.sectionQuizShowResults = true;
            this.sectionQuizSelectedQuestions.set([]);
          }
          this.isDataLoaded.set(true);
        }
        // Handle PDF Secure Streaming [SOTA 2025]
        else if (this.newSectionType === 'FILE') {
          if (this.isPdfFile(section) && section.fileUrl) {
            this.pdfService.getSafePdfUrl(section.fileUrl).subscribe(url => {
              this.safePdfUrl.set(url);
            });
          } else {
            this.safePdfUrl.set(null);
          }
          this.isDataLoaded.set(true);
        } else if (this.newSectionType === 'TEXT') {
          // Delay để CKEditor có thời gian khởi tạo
          setTimeout(() => {
            this.isDataLoaded.set(true);
          }, 100);
        } else {
          this.safePdfUrl.set(null);
          this.isDataLoaded.set(true);
        }
      }
    });

    // Validates that the currently selected lesson is updated from the new tree
    effect(() => {
      const tree = this.store.courseTree();
      const currentLessonId = this.selectionService.selectedLessonId();

      if (tree && currentLessonId) {
        for (const chapter of tree.chapters) {
          const found = chapter.lessons.find(l => l.id === currentLessonId);
          if (found) {
            // Update the service with the new object reference to refresh UI
            this.selectionService.selectedLesson.set(found);

            // Also sync section if selected
            const currentSectionId = this.selectionService.selectedSectionId();
            if (currentSectionId && found.sections) {
              const foundSection = found.sections.find((s: any) => s.id === currentSectionId);
              if (foundSection) {
                this.selectionService.selectedSection.set(foundSection);
              }
            }
            break;
          }
        }
      }
    });
  }

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
  onEditorReady(editor: any) {
    this.editorInstance = editor;
    // FIX: Set data after editor is ready if content already exists (for edit mode)
    if (this.sectionContent && this.editingSectionId()) {
      // Use setTimeout to ensure Angular change detection has completed
      setTimeout(() => {
        editor.setData(this.sectionContent);
      }, 0);
    }
  }

  onEditorChange(event: any) {
    const editor = event.editor;
    if (editor) {
      const data = editor.getData();
      const plainText = data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const count = plainText ? plainText.split(' ').length : 0;
      this.wordCount.set(count);
    }
  }
  selectLessonFromChapter(lesson: LessonDraftDTO) {
    const chapter = this.store.chapters().find(c => c.id === this.selectedChapterId());
    if (chapter) {
      this.selectionService.selectLesson(chapter, lesson);
    }
  }

  private loadLessonData(lesson: LessonDraftDTO) {
    this.lessonTitle = lesson.title || '';
    this.lessonContent = lesson.content || lesson.contentText || '';
    this.lessonVideoUrl = lesson.videoUrl || lesson.contentUrl || '';
    this.quizTimeLimit = lesson.quizTimeLimit || 30;
    this.quizPassingScore = lesson.quizPassingScore || 60;
    this.quizMaxAttempts = lesson.quizMaxAttempts || 1;
    this.assignmentDescription = lesson.assignmentDescription || '';
    this.assignmentInstructions = lesson.assignmentInstructions || '';
    this.assignmentDueDate = lesson.assignmentDueDate || '';
    this.assignmentMaxScore = lesson.assignmentMaxScore || 100;
  }

  private fetchLessonDetails(lessonId: string) {
    this.isLoadingLesson.set(true);
    this.lessonApi.getLessonById(lessonId).subscribe({
      next: (response: any) => {
        const detail = response.data || response;
        this.lessonTitle = detail.title || this.lessonTitle;
        this.lessonContent = detail.content || detail.description || this.lessonContent;
        this.lessonVideoUrl = detail.videoUrl || this.lessonVideoUrl;
        this.isLoadingLesson.set(false);
      },
      error: () => {
        this.toast.error('Không thể tải chi tiết bài học');
        this.isLoadingLesson.set(false);
      }
    });
  }

  // YouTube helpers
  isYouTubeUrl(url: string): boolean {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  // Trong Component Class
  isVideoPreviewVisible = signal(false);

  toggleVideoPreview() {
    this.isVideoPreviewVisible.update(v => !v);
  }

  // [NEW] Video Upload Handlers for R2 Storage
  onVideoUploaded(result: VideoUploadResult) {
    // Set the public URL from R2 as the video URL
    this.sectionVideoUrl = result.publicUrl;
    // Store Cloudflare metadata
    this.sectionVideoType = 'CLOUDFLARE';
    this.sectionCfObjectKey = result.objectKey;
    // Update preview
    this.updateVideoPreview(result.publicUrl);
    // Show preview automatically
    this.isVideoPreviewVisible.set(true);
  }

  onVideoRemoved() {
    this.sectionVideoUrl = '';
    this.sectionVideoType = null;
    this.sectionCfObjectKey = null;
    this.safeVideoUrl.set(null);
    this.isVideoPreviewVisible.set(false);
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
  clearSelection() {
    this.selectionService.clearSelection();
  }

  clearSectionSelection() {
    this.selectionService.clearSectionSelection();
    this.isDataLoaded.set(false);
  }

  // Save methods
  async saveChapter() {
    const chapterId = this.selectedChapterId();
    if (!chapterId || !this.chapterTitle.trim()) return;

    this.isSaving.set(true);
    try {
      const courseId = this.store.courseTree()?.id;
      if (!courseId) {
        return;
      }
      await firstValueFrom(this.chapterApi.updateChapter(chapterId, {
        courseId: courseId,
        title: this.chapterTitle.trim(),
        description: this.chapterDescription.trim()
      }));
      this.store.loadCourse(courseId, true);
    } catch (err: any) {
      this.toast.error('Cập nhật chương thất bại: ' + (err?.error?.message || err?.message || ''));
    } finally {
      this.isSaving.set(false);
    }
  }

  async saveLesson() {
    const lesson = this.selectedLesson();
    if (!lesson || !this.lessonTitle.trim()) return;

    this.isSaving.set(true);
    try {
      const courseId = this.store.courseTree()?.id;
      const chapterId = this.selectedChapterId();
      if (!courseId || !chapterId) {
        this.isSaving.set(false);
        return;
      }
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
      } else if (lessonType === 'QUIZ') {
        updateData.quizTimeLimit = this.quizTimeLimit;
        updateData.quizPassingScore = this.quizPassingScore;
        updateData.quizMaxAttempts = this.quizMaxAttempts;
      } else if (lessonType === 'ASSIGNMENT') {
        updateData.assignmentDescription = this.assignmentDescription;
        updateData.assignmentDueDate = this.assignmentDueDate;
        updateData.assignmentMaxScore = this.assignmentMaxScore;
      }

      await firstValueFrom(this.lessonApi.updateLesson(lesson.id, updateData));
      this.store.loadCourse(courseId, true);
    } catch (err: any) {
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



  async loadQuizQuestions() {
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
    } catch (err: any) {
      this.quizQuestions.set([]);
      this.toast.error('Tải danh sách câu hỏi thất bại');
    } finally {
      this.quizQuestionsLoading.set(false);
    }
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

  async addSelectedQuestionsToQuiz() {
    const lesson = this.selectedLesson();
    if (!lesson || this.selectedQuestionIds().size === 0) return;

    try {
      const questionIds = Array.from(this.selectedQuestionIds());
      for (const questionId of questionIds) {
        await firstValueFrom(this.quizApi.addQuestionToQuiz(lesson.id, questionId));
      }
      await this.loadQuizQuestions();
      this.showAddQuestionsModal.set(false);
      this.selectedQuestionIds.set(new Set());
      this.selectedPackageId = '';
      this.packageQuestions.set([]);
    } catch (err: any) {
      this.toast.error('Thêm câu hỏi thất bại: ' + (err?.error?.message || err?.message || ''));
    }
  }

  async removeQuestionFromQuiz(questionId: string) {
    const lesson = this.selectedLesson();
    if (!lesson) return;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa câu hỏi',
      message: 'Bạn chắc chắn muốn xóa câu hỏi này?',
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    try {
      await firstValueFrom(this.quizApi.removeQuestionFromQuiz(lesson.id, questionId));
      await this.loadQuizQuestions();
    } catch (err: any) {
      this.toast.error('Xóa câu hỏi thất bại: ' + (err?.error?.message || err?.message || ''));
    }
  }

  // Random Questions & Modal
  openRandomizeModal() {
    this.showRandomModal.set(true);
    this.selectedPackageId = '';
    this.randomCount.set(1);
  }

  onRandomPackageChange() {
    this.randomCount.set(1);
  }

  getSelectedPackageCount(): number {
    const pkg = this.quizPackages().find(p => p.id === this.selectedPackageId);
    return pkg?.questionCount || 0;
  }

  updateRandomCount(delta: number) {
    const max = this.getSelectedPackageCount();
    let newVal = this.randomCount() + delta;
    if (newVal < 1) newVal = 1;
    if (newVal > max) newVal = max;
    this.randomCount.set(newVal);
  }

  validateRandomCount(value: number) {
    const max = this.getSelectedPackageCount();
    if (value < 1) value = 1;
    if (value > max) value = max;
    this.randomCount.set(value);
  }

  async generateRandomQuestions() {
    const lesson = this.selectedLesson();
    if (!lesson || !this.selectedPackageId) return;

    this.quizQuestionsLoading.set(true);
    try {
      // 1. Get all questions from the selected package
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(this.selectedPackageId));
      if (!questions || questions.length === 0) {
        this.toast.warning('Gói câu hỏi này không có dữ liệu!');
        return;
      }

      // 2. Shuffle and pick N
      const count = this.randomCount();
      const shuffled = questions.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count);

      // 3. Add to quiz
      // Note: Ideal if backend has bulk add. Using loop for now.
      for (const q of selected) {
        try {
          await firstValueFrom(this.quizApi.addQuestionToQuiz(lesson.id, q.id));
        } catch (e) {
          // Ignore duplicates or specific errors to continue adding others
          // Ignore duplicates or specific errors
        }
      }

      this.showRandomModal.set(false);
      await this.loadQuizQuestions();
      this.selectedPackageId = ''; // Reset
    } catch {
      this.toast.error('Lỗi xảy ra khi tạo câu hỏi ngẫu nhiên.');
    } finally {
      this.quizQuestionsLoading.set(false);
    }
  }
  // Section Methods (L3)
  openSectionEditor(type: 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE') {
    this.editingSectionId.set(null);
    this.newSectionType = type as any;
    this.sectionTitle = '';
    this.sectionContent = '';
    this.sectionVideoUrl = '';
    this.sectionVideoType = null; // [NEW] Reset video type
    this.sectionCfObjectKey = null; // [NEW] Reset R2 object key
    this.sectionFileUrl.set(null);
    this.selectedFile = null;
    this.sectionIsRequired = false;
    this.resetSectionQuizFields(); // Reset quiz fields for new section
    this.showSectionModal.set(true);
  }

  // Flag to control editor loading timing
  isDataLoaded = signal<boolean>(false);

  editSection(section: SectionDraftDTO) {
    this.isDataLoaded.set(false); // Reset before loading
    this.showSectionModal.set(true);
    // this.isEditingSection.set(true); // Removed as property doesn't exist
    this.editingSectionId.set(section.id);
    this.sectionTitle = section.title;
    this.newSectionType = section.type as any;
    this.sectionIsRequired = section.isRequired || false;

    // Reset content fields
    this.sectionContent = '';
    this.sectionVideoUrl = '';
    this.sectionVideoType = null; // [NEW] Reset video type
    this.sectionCfObjectKey = null; // [NEW] Reset R2 object key
    this.safeVideoUrl.set(null);
    this.selectedFile = null;
    this.sectionFileUrl.set(null); // Ensure file URL is also reset

    if (section.type === 'TEXT') {
      // Load content and delay flag set
      this.sectionContent = section.content || '';
      setTimeout(() => {
        this.isDataLoaded.set(true);
      }, 50);
    } else if (section.type === 'VIDEO') {
      // ... existing video logic
      if (section.videoUrl) {
        this.sectionVideoUrl = section.videoUrl;
        this.safeVideoUrl.set(this.getSafeUrl(section.videoUrl));
      }
      this.isDataLoaded.set(true);
    } else if (section.type === 'FILE') {
      // ... file logic
      if (section.fileUrl) {
        this.sectionFileUrl.set(section.fileUrl);
        // Handle PDF secure streaming for preview in modal
        if (this.isPdfFile(section)) {
          this.pdfService.getSafePdfUrl(section.fileUrl).subscribe((url: SafeResourceUrl | null) => {
            this.safePdfUrl.set(url);
          });
        }
      }
      this.isDataLoaded.set(true);
    } else {
      this.isDataLoaded.set(true);
    }
  }

  ngOnDestroy() {
    this.pdfService.cleanup();
  }

  // Video Preview Logic [NEW]
  updateVideoPreview(url: string) {
    if (!url) {
      this.safeVideoUrl.set(null);
      // Reset video type if URL is cleared manually
      if (!this.sectionCfObjectKey) {
        this.sectionVideoType = null;
      }
      return;
    }
    const videoId = this.extractYouTubeId(url);
    if (videoId) {
      this.safeVideoUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`));
      // [NEW] If manually entering YouTube URL and not already R2, set as YOUTUBE
      if (!this.sectionCfObjectKey) {
        this.sectionVideoType = 'YOUTUBE';
      }
    } else {
      this.safeVideoUrl.set(null);
      // Non-YouTube, non-R2 external URL — leave videoType as null
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

    this.isSaving.set(true);
    try {
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
        payload.videoUrl = this.sectionVideoUrl;
        payload.videoType = this.sectionVideoType;
        payload.cfObjectKey = this.sectionCfObjectKey;
      } else if (this.newSectionType === 'QUIZ') {
        payload.quizData = {
          // Mapping variables to DTO fields
          quizType: this.sectionQuizType,
          timeLimitMinutes: this.sectionQuizTimeLimit,
          passingScore: this.sectionQuizPassingScore,
          maxAttempts: this.sectionQuizType === 'EXAM' ? this.sectionQuizMaxAttempts : 999,
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
        await firstValueFrom(this.sectionApi.createSection(lesson.id, formData));
      }

      // Clear staged file after successful save
      this.selectedFile = null;

      // Reload course to refresh tree
      const courseId = this.store.courseTree()?.id;
      if (courseId) this.store.loadCourse(courseId, true);
      this.showSectionModal.set(false);
    } catch (e: any) {
      this.toast.error('Lỗi khi lưu Mục: ' + (e?.message || 'Không rõ lỗi'));
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteSection(sectionId: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa mục',
      message: 'Bạn chắc chắn muốn xóa Mục này?',
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
      await firstValueFrom(this.sectionApi.deleteSection(lesson.id, sectionId));
      const courseId = this.store.courseTree()?.id;
      if (courseId) this.store.loadCourse(courseId, true);
    } catch (err: any) {
      this.toast.error('Xóa nội dung thất bại: ' + (err?.error?.message || err?.message || ''));
    } finally {
      this.isSaving.set(false);
    }
  }

  dropSection(event: any) {
    // Reorder logic for Sections (Topic)
    // ...
  }

  // [NEW] File selection handler for FILE type sections
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
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
  goToQuizBuilder() {
    const lesson = this.selectedLesson();
    if (!lesson) {
      return;
    }

    const courseId = this.store.courseTree()?.id;
    if (!courseId) {
      return;
    }

    // Navigate to the quiz builder page
    this.router.navigate(['/teacher/courses', courseId, 'lessons', lesson.id, 'quiz']);
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
    this.showSectionQuizBankModal.set(true);
    this.selectedPackageId = '';
    this.packageQuestions.set([]);
    this.selectedQuestionIds.set(new Set());
  }

  openSectionQuizRandomModal() {
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

      this.sectionQuizSelectedQuestions.update(current => [...current, ...newQuestions]);
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

      const count = this.sectionQuizRandomCount();
      const shuffled = questions.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count);

      // Add to current selection (avoid duplicates)
      const currentIds = new Set(this.sectionQuizSelectedQuestions().map(q => q.id));
      const newQuestions = selected.filter((q: any) => !currentIds.has(q.id));

      this.sectionQuizSelectedQuestions.update(current => [...current, ...newQuestions]);
      this.showSectionQuizRandomModal.set(false);
    } catch {
      this.toast.error('Lỗi khi tạo câu hỏi ngẫu nhiên.');
    }
  }

  removeSectionQuizQuestion(questionId: string) {
    this.sectionQuizSelectedQuestions.update(current =>
      current.filter(q => q.id !== questionId)
    );
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
    this.sectionQuizType = 'ASSESSMENT';
    this.sectionQuizTimeLimit = 30;
    this.sectionQuizPassingScore = 60;
    this.sectionQuizMaxAttempts = 1;
    this.sectionQuizShuffleQuestions = true;
    this.sectionQuizShuffleOptions = true;
    this.sectionQuizShowResults = true;
    this.sectionQuizSelectedQuestions.set([]);
  }
}

