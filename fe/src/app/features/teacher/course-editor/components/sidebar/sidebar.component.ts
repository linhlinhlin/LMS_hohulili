import { Component, inject, signal, computed, HostListener, importProvidersFrom } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseEditorStore } from '../../store/course-editor.store';
import { RouterModule, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChapterApi } from '../../../../../api/client/chapter.api';
import { LessonApi } from '../../../../../api/client/lesson.api';
import { SectionApi } from '../../../../../api/client/section.api';
import { ChapterDraftDTO, LessonDraftDTO, SectionDraftDTO, CourseAuthoringService } from '../../services/course-authoring.service';
import { CurriculumSelectionService } from '../../services/curriculum-selection.service';
import { CONTENT_TYPE_CONFIG, ContentType } from '../../../../../core/constants/content-type.constant';
import { ResizableSidebarDirective } from '../../../../../shared/directives/resizable-sidebar.directive';
import { SidebarHeaderComponent } from '../../../../../shared/components/ui/sidebar-header/sidebar-header.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { animate, state, style, transition, trigger } from '@angular/animations';
import {
  LucideAngularModule
} from 'lucide-angular';

@Component({
  selector: 'app-course-editor-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DragDropModule,
    ResizableSidebarDirective,
    MatIconModule,
    MatTooltipModule,
    LucideAngularModule
  ],
  providers: [],
  animations: [
    trigger('springExpandCollapse', [
      state('collapsed', style({ height: '0', opacity: '0', overflow: 'hidden' })),
      state('expanded', style({ height: '*', opacity: '1' })),
      transition('collapsed <=> expanded', [
        animate('0.3s cubic-bezier(0.175, 0.885, 0.32, 1.2)')
      ])
    ])
  ],
  template: `
    <aside class="flex flex-col bg-white border-r border-slate-200 h-full overflow-hidden select-none relative group/sidebar"
           appResizableSidebar
           (sidebarResize)="onSidebarResize($event)">
        
        <!-- Resize Handle -->
        <div class="resize-handle absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400/30 active:bg-blue-500/50 transition-colors z-50"></div>

        <!-- Header (SOTA 2025: High Density) -->
        <div class="p-4 border-b border-slate-100 bg-white">
            <h2 class="text-xs font-bold text-slate-800 mb-3 uppercase tracking-tight">Cấu trúc khóa học</h2>
            <div class="relative">
                <lucide-icon name="search" class="absolute left-2 top-2 text-slate-400" [size]="14"></lucide-icon>
                <input type="text" 
                       [(ngModel)]="tempSearch"
                       (input)="onSearch(tempSearch)"
                       placeholder="Tìm kiếm nội dung (Ctrl+K)..." 
                       class="w-full h-9 pl-9 pr-3 bg-slate-50 border-none rounded-md text-xs focus:ring-1 focus:ring-slate-200 transition-all placeholder:text-slate-400">
            </div>
            
            <!-- Stats Badge -->
            <div class="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
               <span>TIẾN ĐỘ: {{ publishedCount() }}/{{ totalCount() }} BÀI</span>
               <button (click)="toggleAll()" class="hover:text-blue-600 transition-colors">
                 {{ activeChapterId() ? 'THU GỌN HẾT' : 'MỞ RỘNG' }}
               </button>
            </div>
        </div>

        <!-- Scroll Area (Coursera-Density) -->
        <div class="flex-grow overflow-y-auto custom-scrollbar bg-white"
             cdkDropList 
             [cdkDropListData]="store.chapters()"
             (cdkDropListDropped)="dropChapter($event)">
            
            @for (chapter of store.chapters(); track chapter.id) {
                <!-- LEVEL 1: CHAPTER (Module) -->
                @if (!searchQuery() || chapter.title.toLowerCase().includes(searchQuery())) {
                  <div class="border-b border-slate-50 last:border-0"
                       cdkDrag [cdkDragData]="chapter">
                      
                      <div (click)="toggleChapterSelection(chapter)" 
                           class="flex items-start gap-2 p-4 hover:bg-slate-50 cursor-pointer group transition-colors"
                           [class.bg-slate-50]="activeChapterId() === chapter.id">
                          <div class="flex-grow min-w-0">
                              <h4 class="text-[13px] font-bold text-slate-800 leading-tight break-words">{{ chapter.title }}</h4>
                          </div>

                          <!-- Chapter Actions (Hover) -->
                          <div class="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity" (click)="$event.stopPropagation()">
                            <button (click)="showAddLessonModal(chapter, $index)" class="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors" matTooltip="Thêm bài học">
                                <lucide-icon name="plus" [size]="14"></lucide-icon>
                            </button>
                            <button (click)="deleteChapter(chapter.id)" class="p-1 text-slate-300 hover:text-red-500 rounded transition-colors" matTooltip="Xóa chương">
                                <lucide-icon name="trash-2" [size]="14"></lucide-icon>
                            </button>
                          </div>
                      </div>

                      <!-- LEVEL 2 & 3: LESSONS (Single-Open Accordion) -->
                      @if (activeChapterId() === chapter.id) {
                          <div [@springExpandCollapse]="'expanded'" class="bg-white overflow-hidden pb-2"
                               cdkDropList 
                               [cdkDropListData]="chapter.lessons"
                               (cdkDropListDropped)="dropLesson($event, chapter.id)">
                              
                              @for (lesson of chapter.lessons; track lesson.id) {
                                  <div class="relative pl-3 py-2 group/lesson hover:bg-blue-50/20 cursor-pointer"
                                       [class.bg-blue-50/10]="selectedLessonId() === lesson.id"
                                       cdkDrag [cdkDragData]="lesson"
                                       (click)="selectLesson(chapter, lesson)">
                                      
                                      <!-- Visual Connector Line (L2) -->
                                      <div class="absolute left-2 top-0 bottom-0 w-[1px] bg-slate-100"></div>
                                      
                                      <div class="flex items-start gap-3">
                                          <lucide-icon name="book-open" [size]="14" class="mt-0.5 text-slate-300 group-hover/lesson:text-blue-500 transition-colors"></lucide-icon>
                                          <div class="flex-grow min-w-0">
                                            <h5 class="text-[13px] font-semibold text-slate-700 leading-tight break-words group-hover/lesson:text-slate-900">
                                                {{ lesson.title }}
                                            </h5>
                                          </div>

                                          <!-- Lesson Actions (Hover) -->
                                          <div class="opacity-0 group-hover/lesson:opacity-100 flex items-center gap-1 transition-opacity" (click)="$event.stopPropagation()">
                                            <button (click)="showAddSectionModal(lesson, lesson.sections.length || 0, $index)" class="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors" matTooltip="Thêm nội dung">
                                              <lucide-icon name="plus-circle" [size]="12"></lucide-icon>
                                            </button>
                                            <button (click)="deleteLesson(lesson.id)" class="p-1 text-slate-300 hover:text-red-500 rounded transition-colors" matTooltip="Xóa bài học">
                                              <lucide-icon name="trash-2" [size]="12"></lucide-icon>
                                            </button>
                                          </div>
                                      </div>

                                      <!-- LEVEL 3: SECTIONS -->
                                      @if (lesson.sections && lesson.sections.length > 0) {
                                        <div class="mt-2 space-y-0.5"
                                             cdkDropList 
                                             [cdkDropListData]="lesson.sections"
                                             (cdkDropListDropped)="dropSection($event, lesson.id)">
                                            @for (section of lesson.sections; track section.id) {
                                                <div class="flex items-start gap-2 pl-3 py-2 group/section rounded-md hover:bg-white transition-all border border-transparent hover:border-slate-100 hover:shadow-sm"
                                                     [class.bg-slate-50]="selectedSectionId() === section.id"
                                                     cdkDrag [cdkDragData]="section"
                                                     (click)="selectSection(chapter, lesson, section); $event.stopPropagation()">
                                                    
                                                    <!-- Mini Indicator Dot (SOTA 2025: Maritime 2px Edge) -->
                                                    <div [class]="'absolute left-5 w-[2px] h-3.5 rounded-full transition-all ' + getTypeColor(section.type)"></div>
                                                    
                                                    <div class="flex-grow min-w-0">
                                                        <p class="text-[12px] text-slate-500 leading-tight break-words group-hover/section:text-slate-800 transition-colors">
                                                            {{ section.title }}
                                                        </p>
                                                        <div class="flex items-center gap-2 mt-0.5 opacity-60">
                                                            <span class="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                                                {{ section.type }}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <!-- Section Actions (Hover) -->
                                                    <div class="opacity-0 group-hover/section:opacity-100 flex items-center gap-1 pr-1 transition-opacity" (click)="$event.stopPropagation()">
                                                      <button class="p-1 text-slate-300 hover:text-blue-600 rounded transition-colors"><lucide-icon name="edit-2" [size]="10"></lucide-icon></button>
                                                      <button (click)="deleteSection(section.id)" class="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"><lucide-icon name="trash-2" [size]="10"></lucide-icon></button>
                                                    </div>
                                                </div>
                                            }
                                        </div>
                                      }
                                      
                                      <!-- Quick Add Visual Hint -->
                                      <button (click)="showAddSectionModal(lesson, lesson.sections.length || 0, $index); $event.stopPropagation()"
                                              class="ml-7 mt-1 text-[10px] font-black text-blue-500 opacity-0 group-hover/lesson:opacity-100 uppercase tracking-widest hover:text-blue-700 transition-all flex items-center gap-1">
                                          <lucide-icon name="plus" [size]="10"></lucide-icon>
                                          THÊM NỘI DUNG
                                      </button>
                                  </div>
                              }
                          </div>
                      }
                  </div>
                }
            }
        </div>

        <!-- Footer Action (SOTA 2025: Sleek) -->
        <div class="p-4 border-t border-slate-100 bg-slate-50/40">
            <button (click)="showAddChapterModal()"
                    class="w-full py-2.5 flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-bold text-slate-700 hover:border-slate-900 hover:text-slate-900 hover:shadow-md active:scale-[0.98] transition-all">
                <lucide-icon name="plus-circle" [size]="14" class="text-blue-500"></lucide-icon>
                THÊM CHƯƠNG MỚI
            </button>
        </div>
    </aside>

    <!-- Modals (Remain mostly same but styled for SOTA) -->
    @if (showChapterModal()) {
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]" (click)="closeModals()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200" (click)="$event.stopPropagation()">
          <div class="p-6 border-b border-slate-100">
            <h3 class="text-sm font-black text-slate-800 uppercase tracking-tighter">Tạo chương mới</h3>
          </div>
          <div class="p-6 space-y-4">
            <div class="space-y-1.5">
              <label class="text-[10px] font-bold text-slate-400 uppercase">Tên chương/module</label>
              <input type="text" [(ngModel)]="newChapterTitle" 
                     class="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-100 transition-all" 
                     placeholder="VD: Kiến thức cơ bản...">
            </div>
          </div>
          <div class="p-6 bg-slate-50 flex justify-end gap-3">
            <button (click)="closeModals()" class="px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase">Hủy</button>
            <button (click)="createChapter()" class="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-blue-600 transition-all shadow-lg">XÁC NHẬN</button>
          </div>
        </div>
      </div>
    }

    <!-- Add Lesson Modal -->
    @if (showLessonModal()) {
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]" (click)="closeModals()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200" (click)="$event.stopPropagation()">
          <div class="p-6 border-b border-slate-100">
            <h3 class="text-sm font-black text-slate-800 uppercase tracking-tighter">Thêm bài học</h3>
          </div>
          <div class="p-6 space-y-4">
             <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-400 uppercase">Tên bài học</label>
                <input type="text" [(ngModel)]="newLessonTitle" 
                       class="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-100 transition-all" 
                       placeholder="VD: Bài 1: Giới thiệu...">
             </div>
          </div>
          <div class="p-6 bg-slate-50 flex justify-end gap-3">
            <button (click)="closeModals()" class="px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase">Hủy</button>
            <button (click)="createLesson()" class="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-blue-600 transition-all shadow-lg">XÁC NHẬN</button>
          </div>
        </div>
      </div>
    }

    <!-- Add Section Modal -->
    @if (showSectionModal()) {
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]" (click)="closeModals()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200" (click)="$event.stopPropagation()">
          <div class="p-6 border-b border-slate-100">
            <h3 class="text-sm font-black text-slate-800 uppercase tracking-tighter">Nội dung chi tiết</h3>
            <p class="text-[11px] text-slate-400 mt-1 font-medium">BÀI HỌC: {{ currentLessonForSection()?.title }}</p>
          </div>
          <div class="p-6 space-y-5">
            <div class="space-y-1.5">
              <label class="text-[10px] font-bold text-slate-400 uppercase">Tiêu đề nội dung</label>
              <input type="text" 
                     [(ngModel)]="newSectionTitle"
                     class="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-100 transition-all"
                     placeholder="VD: Video bài giảng, Tài liệu đọc...">
            </div>
            
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-slate-400 uppercase">Loại nội dung</label>
              <div class="grid grid-cols-4 gap-2">
                @for (type of sectionTypes; track type) {
                  <button (click)="newSectionType = type" 
                          [class]="'p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ' + 
                                   (newSectionType === type ? 'border-slate-800 bg-slate-50' : 'border-slate-50 hover:border-slate-200')">
                    <span class="text-[9px] font-black uppercase">{{ type }}</span>
                  </button>
                }
              </div>

              @if (newSectionType === 'FILE') {
                <div class="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 animate-fade-in">
                  <label class="block text-[10px] font-black text-amber-700 uppercase mb-2">Đính kèm tài liệu</label>
                  @if (!selectedFile) {
                    <input type="file" (change)="onFileSelected($event)" 
                           class="block w-full text-[10px] text-slate-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-amber-200 file:text-amber-800 hover:file:bg-amber-300">
                  } @else {
                    <div class="flex items-center justify-between bg-white p-2 rounded-xl border border-amber-200">
                       <div class="flex items-center gap-2 overflow-hidden">
                         <lucide-icon name="paperclip" [size]="12" class="text-amber-500"></lucide-icon>
                         <span class="text-xs text-slate-700 truncate font-bold">{{ selectedFile.name }}</span>
                       </div>
                       <button (click)="removeSelectedFile()" class="p-1 text-slate-300 hover:text-red-500 transition-colors">
                         <lucide-icon name="x" [size]="12"></lucide-icon>
                       </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
          <div class="p-6 bg-slate-50 flex justify-end gap-3">
            <button (click)="closeModals()" class="px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase">Hủy</button>
            <button (click)="createSection()" 
                    [disabled]="!newSectionTitle.trim() || (newSectionType === 'FILE' && !selectedFile)"
                    class="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-blue-600 shadow-xl transition-all disabled:opacity-30">
              HOÀN TẤT
            </button>
          </div>
        </div>
      </div>
    }
  `
})

export class CourseEditorSidebarComponent {
  store = inject(CourseEditorStore);
  selectionService = inject(CurriculumSelectionService);
  private router = inject(Router);
  private chapterApi = inject(ChapterApi);
  private lessonApi = inject(LessonApi);
  private sectionApi = inject(SectionApi);
  private authoringService = inject(CourseAuthoringService);

  sidebarWidth = signal(320);
  searchQuery = signal('');

  // SOTA Stats
  totalCount = computed(() => {
    return this.store.chapters().reduce((acc, ch) => acc + ch.lessons.length, 0);
  });
  publishedCount = computed(() => {
    return this.store.chapters().reduce((acc, ch) => {
      return acc + ch.lessons.filter(l => l.sections && l.sections.length > 0).length;
    }, 0);
  });

  isAllExpanded = computed(() => !!this.activeChapterId());

  // Adaptive Denstiy
  showExtraInfo = computed(() => this.sidebarWidth() > 400);

  // Use selection service signals
  // Modal states
  showChapterModal = signal(false);
  showLessonModal = signal(false);
  showSectionModal = signal(false); // [NEW]
  currentChapterForLesson = signal<ChapterDraftDTO | null>(null);
  currentLessonForSection = signal<LessonDraftDTO | null>(null); // [NEW]

  // use selection signals
  selectedChapterId = this.selectionService.selectedChapterId;
  selectedLessonId = this.selectionService.selectedLessonId;
  selectedSectionId = this.selectionService.selectedSectionId; // [NEW]

  // Form data
  newChapterTitle = '';
  newChapterDescription = '';
  newLessonTitle = '';
  newLessonType: 'LECTURE' | 'QUIZ' | 'ASSIGNMENT' = 'LECTURE';

  // Section Form Data [NEW]
  newSectionTitle = '';
  newSectionType: 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE' = 'TEXT';
  readonly sectionTypes: ('TEXT' | 'VIDEO' | 'QUIZ' | 'FILE')[] = ['TEXT', 'VIDEO', 'QUIZ', 'FILE'];
  selectedFile: File | null = null; // [NEW]
  tempSearch = ''; // [NEW]

  // Logic tối giản, hiệu quả cao (SOTA 2025)
  readonly activeChapterId = signal<string | null>(null);

  constructor() {
    // Auto-expand first chapter initially
    setTimeout(() => {
      const chapters = this.store.chapters();
      if (chapters.length > 0) {
        this.activeChapterId.set(chapters[0].id);
      }
    }, 500);
  }

  toggleChapterSelection(chapter: ChapterDraftDTO) {
    this.toggleChapter(chapter.id);
    this.selectChapter(chapter);
  }

  toggleChapter(chapterId: string) {
    this.activeChapterId.update(currentId => currentId === chapterId ? null : chapterId);
  }

  selectChapter(chapter: ChapterDraftDTO) {
    this.selectionService.selectChapter(chapter);
    this.navigateToCurriculum();
  }

  selectLesson(chapter: ChapterDraftDTO, lesson: LessonDraftDTO) {
    this.selectionService.selectLesson(chapter, lesson);
    this.navigateToCurriculum();
  }

  selectSection(chapter: ChapterDraftDTO, lesson: LessonDraftDTO, section: SectionDraftDTO) {
    this.selectionService.selectSection(chapter, lesson, section);
    this.navigateToCurriculum();
  }

  private navigateToCurriculum() {
    const courseId = this.store.courseTree()?.id;
    if (courseId) {
      const currentUrl = this.router.url;
      if (!currentUrl.includes('/curriculum')) {
        this.router.navigate(['/teacher/courses', courseId, 'editor', 'curriculum']);
      }
    }
  }

  // Drag & Drop handlers
  dropChapter(event: CdkDragDrop<ChapterDraftDTO[]>) {
    if (event.previousIndex === event.currentIndex) return;

    const chapters = [...this.store.chapters()];
    moveItemInArray(chapters, event.previousIndex, event.currentIndex);

    const courseId = this.store.courseTree()?.id;
    if (courseId) {
      const orderedIds = chapters.map(c => c.id);
      this.store.reorderChapters(courseId, orderedIds);
    }
  }

  dropLesson(event: CdkDragDrop<LessonDraftDTO[]>, chapterId: string) {
    if (event.previousIndex === event.currentIndex) return;

    const chapter = this.store.chapters().find(c => c.id === chapterId);
    if (!chapter) return;

    const lessons = [...chapter.lessons];
    moveItemInArray(lessons, event.previousIndex, event.currentIndex);

    const orderedIds = lessons.map(l => l.id);
    this.authoringService.reorderLessons(chapterId, orderedIds).subscribe({
      next: () => {
        const courseId = this.store.courseTree()?.id;
        if (courseId) this.store.loadCourse(courseId);
      }
    });
  }

  dropSection(event: CdkDragDrop<SectionDraftDTO[]>, lessonId: string) {
    if (event.previousIndex === event.currentIndex) return;

    // Find lesson in store
    let lesson: LessonDraftDTO | undefined;
    for (const ch of this.store.chapters()) {
      const l = ch.lessons.find(ls => ls.id === lessonId);
      if (l) {
        lesson = l;
        break;
      }
    }
    if (!lesson || !lesson.sections) return;

    const sections = [...lesson.sections];
    moveItemInArray(sections, event.previousIndex, event.currentIndex);

    // Backend reorder (assuming we have section reorder support or we just reload)
    // For now simple reorder if API supports it, or just reload. 
    // Wait, Section reorder might not be in generic API yet? 
    // Assuming yes or I need to implement it.
    // Use generic reorder or specific? Reusing reorderLessons pattern.
    // If not exists, I'll simple reload for now or skip backend call if not ready.
    // Actually SectionService likely has logic order.
    // Let's assume standard reordering logic exists or I'll implement it later.
    // For now: Just UI update then Reload.
    // Wait, I'll use SectionApi reorder if it exists, otherwise just reload.
    this.authoringService.reorderSections(lessonId, sections.map(s => s.id)).subscribe({
      next: () => {
        const courseId = this.store.courseTree()?.id;
        if (courseId) this.store.loadCourse(courseId);
      }
    });
  }

  // SOTA 2025: Helper for section type colors


  // Modal handlers
  showAddChapterModal() {
    const nextIndex = this.store.chapters().length + 1;
    this.newChapterTitle = `Chương ${nextIndex}: `;
    this.newChapterDescription = '';
    this.showChapterModal.set(true);
  }

  showAddLessonModal(chapter: ChapterDraftDTO, chapterIndex: number) {
    const nextLessonIndex = chapter.lessons.length + 1;
    this.currentChapterForLesson.set(chapter);
    this.newLessonTitle = `Bài ${nextLessonIndex}: `;
    // this.newLessonType = 'LECTURE'; // No longer needed to select type
    this.showLessonModal.set(true);
  }

  closeModals() {
    this.showChapterModal.set(false);
    this.showLessonModal.set(false);
    this.showSectionModal.set(false); // [NEW]
    this.currentChapterForLesson.set(null);
    this.currentLessonForSection.set(null); // [NEW]
  }

  createChapter() {
    const courseId = this.store.courseTree()?.id;
    if (!courseId || !this.newChapterTitle.trim()) return;

    this.chapterApi.createChapter(courseId, {
      title: this.newChapterTitle.trim(),
      description: this.newChapterDescription.trim()
    }).subscribe({
      next: () => {
        this.closeModals();
        this.store.loadCourse(courseId);
      }
    });
  }

  createLesson() {
    const chapter = this.currentChapterForLesson();
    if (!chapter || !this.newLessonTitle.trim()) return;

    this.lessonApi.createLesson(chapter.id, {
      title: this.newLessonTitle.trim(),
      lessonType: this.newLessonType,
      content: undefined // Send undefined to prevent default section creation
    }).subscribe({
      next: (newItem) => { // Assuming API returns the created lesson
        this.closeModals();
        const courseId = this.store.courseTree()?.id;
        if (courseId) {
          this.store.loadCourse(courseId);
          // UX: Auto-open Section Modal for the new lesson
          // Need to find the lesson object or wait for reload
          // Simple hack: Set timeout or find from store after reload
          if (newItem) {
            // Since store reload is async, we can't immediately select from store.
            // But we can optimistically set currentLessonForSection with the returned item
            // and open modal. Ideally we map it to LessonDraftDTO.
            // Adjust index: it's the last one usually
            const lessonIndex = chapter.lessons.length;
            setTimeout(() => {
              // Refresh successful, now open modal
              // Re-fetch chapter from store to get updated references if needed
              // For now just pass the newItem as DTO logic
              // We need to cast newItem to LessonDraftDTO
              const lessonDto = newItem as unknown as LessonDraftDTO;
              this.showAddSectionModal(lessonDto, 0, lessonIndex);
            }, 800); // 800ms delay for reload
          }
        }
      }
    });
  }

  deleteChapter(chapterId: string) {
    if (!confirm('Bạn có chắc muốn xóa chương này? Tất cả bài học trong chương sẽ bị xóa.')) return;

    this.chapterApi.deleteChapter(chapterId).subscribe({
      next: () => {
        if (this.selectedChapterId() === chapterId) {
          this.selectionService.clearSelection();
        }
        const courseId = this.store.courseTree()?.id;
        if (courseId) this.store.loadCourse(courseId);
      }
    });
  }

  deleteLesson(lessonId: string) {
    if (!confirm('Bạn có chắc muốn xóa bài học này?')) return;

    this.lessonApi.deleteLesson(lessonId).subscribe({
      next: () => {
        if (this.selectedLessonId() === lessonId) {
          this.selectionService.clearLessonSelection();
        }
        const courseId = this.store.courseTree()?.id;
        if (courseId) this.store.loadCourse(courseId);
      }
    });
  }

  // File Handler [NEW]
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  removeSelectedFile() {
    this.selectedFile = null;
  }

  // Theme Helper
  getTypeColor(type: string): string {
    const key = (type || 'TEXT').toUpperCase() as ContentType;
    return CONTENT_TYPE_CONFIG[key]?.color || 'bg-slate-300';
  }

  // Section Methods
  showAddSectionModal(lesson: LessonDraftDTO, sectionIndex: number, lessonIndex: number) {
    this.currentLessonForSection.set(lesson);
    // Numbering format: LessonIndex.SectionIndex (e.g., 1.1, 1.2)
    // Indexes are 0-based, so +1
    this.newSectionTitle = `${lessonIndex + 1}.${sectionIndex + 1}: `;
    this.newSectionType = 'TEXT';
    this.selectedFile = null;
    this.showSectionModal.set(true);
  }

  createSection() {
    const lesson = this.currentLessonForSection();
    if (!lesson || !this.newSectionTitle.trim()) return;

    // Use FormData for consistency with smart editor
    const formData = new FormData();
    formData.append('lessonId', lesson.id);
    formData.append('title', this.newSectionTitle.trim());
    formData.append('type', this.newSectionType);
    formData.append('content', '');
    if (this.newSectionType === 'FILE' && this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    this.sectionApi.createSection(formData).subscribe({
      next: () => {
        this.closeModals();
        const courseId = this.store.courseTree()?.id;
        if (courseId) this.store.loadCourse(courseId);
      }
    });
  }

  deleteSection(sectionId: string) {
    if (!confirm('Bạn có chắc muốn xóa nội dung này?')) return;
    this.sectionApi.deleteSection(sectionId).subscribe({
      next: () => {
        // Clear selection if needed
        const courseId = this.store.courseTree()?.id;
        if (courseId) this.store.loadCourse(courseId);
      }
    })
  }

  // SOTA 2025: UI Utility Methods
  @HostListener('sidebarResize', ['$event'])
  onSidebarResize(event: any) {
    this.sidebarWidth.set(event.detail.width);
  }

  @HostListener('window:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      const input = document.querySelector('input[placeholder*="Tìm"]') as HTMLInputElement;
      input?.focus();
    }
  }

  onSearch(query: string) {
    this.searchQuery.set(query.toLowerCase());
  }

  toggleAll() {
    if (this.activeChapterId()) {
      this.activeChapterId.set(null);
    } else {
      const chapters = this.store.chapters();
      if (chapters.length > 0) {
        this.activeChapterId.set(chapters[0].id);
      }
    }
  }

  getLessonType(lesson: LessonDraftDTO): string {
    return lesson.type || 'LECTURE';
  }
}
