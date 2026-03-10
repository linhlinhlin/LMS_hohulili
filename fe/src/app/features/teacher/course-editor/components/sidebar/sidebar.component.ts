import { Component, inject, signal, computed, effect, untracked, HostListener, ChangeDetectionStrategy, OnDestroy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CourseEditorStore } from '../../store/course-editor.store';
import { RouterModule, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { ChapterApi } from '../../../../../api/client/chapter.api';
import { LessonApi } from '../../../../../api/client/lesson.api';
import { SectionApi } from '../../../../../api/client/section.api';
import { ChapterDraftDTO, LessonDraftDTO, SectionDraftDTO, CourseAuthoringService } from '../../services/course-authoring.service';
import { CurriculumSelectionService } from '../../services/curriculum-selection.service';
import { CONTENT_TYPE_CONFIG, ContentType } from '../../../../../core/constants/content-type.constant';
import { ResizableSidebarDirective } from '../../../../../shared/directives/resizable-sidebar.directive';
import { MatTooltipModule } from '@angular/material/tooltip';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { firstValueFrom } from 'rxjs';
import { AssignmentApi } from '../../../../../api/client/assignment.api';
import { QuizApi } from '../../../../../api/endpoints/quiz.api';
import { getLessonReadinessState, lessonHasCanonicalContent } from '../../utils/lesson-readiness';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-editor-sidebar',
  imports: [
    RouterModule,
    FormsModule,
    DragDropModule,
    CdkScrollable,
    ResizableSidebarDirective,
    MatTooltipModule,
    LucideAngularModule
  ],
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0', opacity: '0', overflow: 'hidden' })),
      state('expanded', style({ height: '*', opacity: '1' })),
      transition('collapsed <=> expanded', [
        animate('0.25s cubic-bezier(0.4, 0, 0.2, 1)')
      ])
    ])
  ],
  template: `
    <aside class="flex flex-col bg-white border-r border-slate-200 h-full overflow-hidden select-none relative"
           role="tree"
           aria-label="Cấu trúc khóa học"
           appResizableSidebar
           (sidebarResize)="onSidebarResize($event)">

        <!-- Resize Handle -->
        <div class="resize-handle absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#0056D2]/40 active:bg-[#E8F0FE]/60 transition-colors z-50"></div>

        <!-- Header -->
        <div class="p-4 pb-3 border-b border-slate-200">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">Cấu trúc khóa học</h2>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-400">{{ publishedCount() }}/{{ totalCount() }}</span>
                <button (click)="toggleAll()"
                        class="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                        [matTooltip]="isAllExpanded() ? 'Thu gọn tất cả' : 'Mở rộng tất cả'">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    @if (isAllExpanded()) {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14h16M4 10h16"></path>
                    } @else {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                    }
                  </svg>
                </button>
              </div>
            </div>
            <!-- Search -->
            <div class="relative">
                <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <input type="text"
                       [(ngModel)]="tempSearch"
                       (input)="onSearch(tempSearch)"
                       placeholder="Tìm kiếm... (Ctrl+K)"
                       class="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-all placeholder:text-slate-400 shadow-sm">
            </div>
        </div>

        <!-- Scroll Area -->
        <div class="flex-grow overflow-y-auto"
             cdkScrollable
             cdkDropList
             cdkDropListLockAxis="y"
             [cdkDropListData]="store.chapters()"
             [cdkDropListConnectedTo]="[]"
             (cdkDropListDropped)="dropChapter($event)">

            <!-- Empty State: No chapters -->
            @if (store.chapters().length === 0 && !store.isLoading()) {
              <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div class="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                  <svg class="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                  </svg>
                </div>
                <p class="text-sm font-semibold text-slate-700 mb-1">Chưa có chương nào</p>
                <p class="text-xs text-slate-500 mb-4">Thêm chương đầu tiên để bắt đầu</p>
                <button (click)="showAddChapterModal()"
                        class="px-4 py-2 bg-[#0056D2] text-white text-xs font-medium rounded-lg hover:bg-[#004BB5] transition-colors inline-flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  Thêm chương
                </button>
              </div>
            }

            <!-- Empty State: Search no results -->
            @if (store.chapters().length > 0 && searchQuery() && filteredChapterCount() === 0) {
              <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
                <svg class="w-10 h-10 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <p class="text-sm font-medium text-slate-600 mb-1">Không tìm thấy kết quả</p>
                <p class="text-xs text-slate-400">Thử từ khóa khác</p>
              </div>
            }

            <!-- Chapter Tree -->
            @for (chapter of store.chapters(); track chapter.id; let chapterIdx = $index) {
                @if (!searchQuery() || chapterMatchesSearch(chapter)) {
                  <div class="border-b border-slate-100 last:border-0"
                       role="treeitem"
                       [attr.aria-expanded]="isChapterExpanded(chapter.id)"
                       cdkDrag [cdkDragData]="chapter"
                       [cdkDragStartDelay]="isTouchDevice ? 150 : 0">

                      <!-- Drag Preview -->
                      <div *cdkDragPreview class="bg-white shadow-lg rounded-lg px-4 py-2 border border-[#0056D2] text-sm font-medium text-slate-800 max-w-[280px] line-clamp-2 break-words">
                        {{ chapter.title }}
                      </div>
                      <!-- Drag Placeholder (insertion line) -->
                      <div *cdkDragPlaceholder class="h-0.5 bg-[#0056D2] rounded-full mx-2 my-1"></div>

                      <!-- CHAPTER ROW -->
                      <div class="flex items-center gap-1.5 pr-1 group/ch hover:bg-slate-50 transition-colors border-l-3"
                           [class.bg-[#E8F0FE]]="selectedChapterId() === chapter.id"
                           [class.border-l-[#0056D2]]="selectedChapterId() === chapter.id"
                           [class.border-l-transparent]="selectedChapterId() !== chapter.id">

                          <!-- Drag Handle (Teachable 6-dot) -->
                          <div cdkDragHandle
                               class="flex-shrink-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/ch:opacity-70 transition-opacity self-stretch">
                            <svg class="w-3.5 h-5 text-slate-400" viewBox="0 0 6 10" fill="currentColor">
                              <circle cx="1.5" cy="1.5" r="1"/>
                              <circle cx="4.5" cy="1.5" r="1"/>
                              <circle cx="1.5" cy="5" r="1"/>
                              <circle cx="4.5" cy="5" r="1"/>
                              <circle cx="1.5" cy="8.5" r="1"/>
                              <circle cx="4.5" cy="8.5" r="1"/>
                            </svg>
                          </div>

                          <!-- Expand/Collapse Arrow -->
                          <button (click)="toggleChapter(chapter.id)"
                                  class="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                                  [class.rotate-90]="isChapterExpanded(chapter.id)">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path>
                            </svg>
                          </button>

                          <!-- Status Dot -->
                          <div [class]="'w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white ' + getChapterStatusColor(chapter)"
                               [matTooltip]="getChapterStatus(chapter) === 'ready' ? 'Hoàn chỉnh' : getChapterStatus(chapter) === 'partial' ? 'Đang xây dựng' : 'Trống'"></div>

                          <!-- Title (click to expand + select) -->
                          <div class="flex-grow min-w-0 py-3 cursor-pointer"
                               (click)="toggleChapterSelection(chapter)">
                              @if (editingChapterId() === chapter.id) {
                                  <input [value]="editingValue"
                                         (input)="editingValue = $any($event.target).value"
                                         (blur)="confirmEditChapter(chapter.id)"
                                         (keydown)="onEditKeydown($event, 'chapter', chapter.id)"
                                         (click)="$event.stopPropagation()"
                                         class="w-full text-base font-bold text-slate-800 bg-white border border-[#0056D2] rounded px-2 py-1 outline-none focus:ring-2 focus:ring-[#0056D2]/30"
                                         #editInput>
                              } @else {
                                  <h4 class="text-base font-bold text-slate-800 leading-tight line-clamp-2 break-words"><span class="text-[#0056D2] font-extrabold">Chương {{ chapterIdx + 1 }}:</span> {{ getChapterDisplayTitle(chapter.title, chapterIdx) }}</h4>
                                  <span class="text-xs text-slate-500 font-medium">{{ chapter.lessons.length }} bài học</span>
                              }
                          </div>

                          <!-- Chapter Actions: Add + Kebab Menu (Teachable pattern) -->
                          <div class="flex items-center gap-0.5 flex-shrink-0" (click)="$event.stopPropagation()">
                            <!-- Add Lesson (always visible on hover) -->
                            <button (click)="showAddLessonModal(chapter, chapterIdx)"
                                    class="p-1.5 rounded text-slate-400 hover:text-[#0056D2] hover:bg-[#E8F0FE] transition-colors opacity-0 group-hover/ch:opacity-100"
                                    matTooltip="Thêm bài học">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                              </svg>
                            </button>
                            <!-- Kebab Menu -->
                            <div class="relative">
                              <button (click)="toggleMenu('chapter', chapter.id)"
                                      class="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                                  <circle cx="8" cy="3" r="1.5"/>
                                  <circle cx="8" cy="8" r="1.5"/>
                                  <circle cx="8" cy="13" r="1.5"/>
                                </svg>
                              </button>
                              <!-- Dropdown -->
                              @if (openMenuId() === 'chapter-' + chapter.id) {
                                <div class="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50"
                                     (click)="$event.stopPropagation()">
                                  <button (click)="startEditChapter(chapter, $event); closeMenu()"
                                          class="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 text-[13px] text-slate-700 font-medium flex items-center gap-2.5">
                                    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                    Đổi tên
                                  </button>
                                  <button (click)="showAddLessonModal(chapter, chapterIdx); closeMenu()"
                                          class="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 text-[13px] text-slate-700 font-medium flex items-center gap-2.5">
                                    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                                    Thêm bài học
                                  </button>
                                  <div class="border-t border-slate-100 my-1"></div>
                                  <!-- Move Up/Down (WCAG 2.5.7 - keyboard alternative to drag) -->
                                  @if (chapterIdx > 0) {
                                    <button (click)="moveChapterUp(chapterIdx); closeMenu()"
                                            class="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-[13px] text-slate-700 font-medium flex items-center gap-2.5">
                                      <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
                                      Di chuyển lên
                                    </button>
                                  }
                                  @if (chapterIdx < store.chapters().length - 1) {
                                    <button (click)="moveChapterDown(chapterIdx); closeMenu()"
                                            class="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-[13px] text-slate-700 font-medium flex items-center gap-2.5">
                                      <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                      Di chuyển xuống
                                    </button>
                                  }
                                  <div class="border-t border-slate-100 my-1"></div>
                                  <button (click)="deleteChapter(chapter.id); closeMenu()"
                                          class="w-full text-left px-3.5 py-2.5 hover:bg-red-50 text-[13px] text-red-600 font-medium flex items-center gap-2.5">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    Xóa chương
                                  </button>
                                </div>
                              }
                            </div>
                          </div>
                      </div>

                      <!-- LESSONS (Multi-expand, Moodle 4.x pattern) -->
                      @if (isChapterExpanded(chapter.id)) {
                          <div [@expandCollapse]="'expanded'"
                               class="bg-slate-50/50 border-t border-slate-100"
                               role="group"
                               cdkDropList
                               cdkDropListLockAxis="y"
                               [cdkDropListData]="chapter.lessons"
                               [cdkDropListConnectedTo]="[]"
                               (cdkDropListDropped)="dropLesson($event, chapter.id)">

                              <!-- Empty: no lessons in chapter (Canvas pattern) -->
                              @if (chapter.lessons.length === 0) {
                                <div class="py-6 px-4 text-center">
                                  <p class="text-xs text-slate-400 mb-2">Chưa có bài học nào</p>
                                  <button (click)="showAddLessonModal(chapter, chapterIdx)"
                                          class="text-xs font-medium text-[#0056D2] hover:text-[#004BB5] inline-flex items-center gap-1">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                    </svg>
                                    Thêm bài học đầu tiên
                                  </button>
                                </div>
                              }

                              @for (lesson of chapter.lessons; track lesson.id; let lessonIdx = $index) {
                                  <div class="relative group/ls"
                                       role="treeitem"
                                       cdkDrag [cdkDragData]="lesson"
                                       [cdkDragStartDelay]="isTouchDevice ? 150 : 0">

                                      <!-- Drag Preview -->
                                      <div *cdkDragPreview class="bg-white shadow-lg rounded-lg px-4 py-2 border border-[#0056D2] text-xs font-medium text-slate-700 max-w-[260px] line-clamp-2 break-words">
                                        {{ lesson.title }}
                                      </div>
                                      <!-- Drag Placeholder (insertion line) -->
                                      <div *cdkDragPlaceholder class="h-0.5 bg-[#0056D2] rounded-full mx-2 my-1"></div>

                                      <!-- LESSON ROW -->
                                      <div class="flex items-center gap-1 pl-4 pr-1 hover:bg-white transition-colors border-l-2"
                                           [class.bg-[#E8F0FE]]="selectedLessonId() === lesson.id"
                                           [class.border-l-[#0056D2]/60]="selectedLessonId() === lesson.id"
                                           [class.border-l-transparent]="selectedLessonId() !== lesson.id">

                                          <!-- Drag Handle -->
                                          <div cdkDragHandle
                                               class="flex-shrink-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/ls:opacity-70 transition-opacity self-stretch">
                                            <svg class="w-3 h-4 text-slate-400" viewBox="0 0 6 10" fill="currentColor">
                                              <circle cx="1.5" cy="1.5" r="1"/>
                                              <circle cx="4.5" cy="1.5" r="1"/>
                                              <circle cx="1.5" cy="5" r="1"/>
                                              <circle cx="4.5" cy="5" r="1"/>
                                              <circle cx="1.5" cy="8.5" r="1"/>
                                              <circle cx="4.5" cy="8.5" r="1"/>
                                            </svg>
                                          </div>

                                          <!-- Expand/Collapse Arrow (3-level tree) -->
                                          <button (click)="toggleLesson(lesson.id); $event.stopPropagation()"
                                                  class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                                  [class.rotate-90]="isLessonExpanded(lesson.id)">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path>
                                            </svg>
                                          </button>

                                          <!-- Status Dot -->
                                          <div [class]="'w-2 h-2 rounded-full flex-shrink-0 ' + getLessonStatusColor(lesson)"></div>

                                          <!-- Title -->
                                          <div class="flex-grow min-w-0 py-2.5 cursor-pointer"
                                               (click)="toggleLessonSelection(chapter, lesson)">
                                            @if (editingLessonId() === lesson.id) {
                                                <input [value]="editingValue"
                                                       (input)="editingValue = $any($event.target).value"
                                                       (blur)="confirmEditLesson(lesson.id)"
                                                       (keydown)="onEditKeydown($event, 'lesson', lesson.id)"
                                                       (click)="$event.stopPropagation()"
                                                       class="w-full text-sm font-medium text-slate-700 bg-white border border-[#0056D2] rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-[#0056D2]/30"
                                                       #editInput>
                                            } @else {
                                                <p class="text-sm font-semibold text-slate-700 leading-snug line-clamp-2 break-words group-hover/ls:text-slate-900"><span class="font-extrabold text-[#0056D2]">Bài {{ lessonIdx + 1 }}:</span> {{ getLessonDisplayTitle(lesson.title, lessonIdx) }}</p>
                                                @if (!isLessonExpanded(lesson.id) && lesson.sections.length) {
                                                  <span class="text-xs text-slate-500 font-medium">{{ lesson.sections.length }} nội dung</span>
                                                }
                                            }
                                          </div>

                                          <!-- Lesson Actions -->
                                          <div class="flex items-center gap-0.5 flex-shrink-0" (click)="$event.stopPropagation()">
                                            <button (click)="showAddSectionModal(lesson, lesson.sections.length || 0, lessonIdx)"
                                                    class="p-1 rounded text-slate-400 hover:text-[#0056D2] hover:bg-[#E8F0FE] transition-colors opacity-0 group-hover/ls:opacity-100"
                                                    matTooltip="Thêm nội dung">
                                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                              </svg>
                                            </button>
                                            <div class="relative">
                                              <button (click)="toggleMenu('lesson', lesson.id)"
                                                      class="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                                                  <circle cx="8" cy="3" r="1.5"/>
                                                  <circle cx="8" cy="8" r="1.5"/>
                                                  <circle cx="8" cy="13" r="1.5"/>
                                                </svg>
                                              </button>
                                              @if (openMenuId() === 'lesson-' + lesson.id) {
                                                <div class="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50"
                                                     (click)="$event.stopPropagation()">
                                                  <button (click)="startEditLesson(lesson, $event); closeMenu()"
                                                          class="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 text-[13px] text-slate-700 font-medium flex items-center gap-2.5">
                                                    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                    Đổi tên
                                                  </button>
                                                  <button (click)="showAddSectionModal(lesson, lesson.sections.length || 0, lessonIdx); closeMenu()"
                                                          class="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 text-[13px] text-slate-700 font-medium flex items-center gap-2.5">
                                                    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                                                    Thêm nội dung
                                                  </button>
                                                  <div class="border-t border-slate-100 my-1"></div>
                                                  <!-- Move Up/Down + Move To Chapter (WCAG 2.5.7) -->
                                                  @if (lessonIdx > 0) {
                                                    <button (click)="moveLessonUp(chapter.id, lessonIdx); closeMenu()"
                                                            class="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-[13px] text-slate-700 font-medium flex items-center gap-2.5">
                                                      <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
                                                      Di chuyển lên
                                                    </button>
                                                  }
                                                  @if (lessonIdx < chapter.lessons.length - 1) {
                                                    <button (click)="moveLessonDown(chapter.id, lessonIdx); closeMenu()"
                                                            class="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-[13px] text-slate-700 font-medium flex items-center gap-2.5">
                                                      <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                                      Di chuyển xuống
                                                    </button>
                                                  }
                                                  @if (store.chapters().length > 1) {
                                                    <button (click)="showMoveToChapterModal(chapter.id, lesson); closeMenu()"
                                                            class="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-[13px] text-slate-700 font-medium flex items-center gap-2.5">
                                                      <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                                                      Chuyển sang chương...
                                                    </button>
                                                  }
                                                  <div class="border-t border-slate-100 my-1"></div>
                                                  <button (click)="deleteLesson(lesson.id); closeMenu()"
                                                          class="w-full text-left px-3.5 py-2.5 hover:bg-red-50 text-[13px] text-red-600 font-medium flex items-center gap-2.5">
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    Xóa bài học
                                                  </button>
                                                </div>
                                              }
                                            </div>
                                          </div>
                                      </div>

                                      <!-- SECTIONS (L3) - Only visible when lesson expanded -->
                                      @if (isLessonExpanded(lesson.id)) {
                                        @if (lesson.sections && lesson.sections.length > 0) {
                                          <div class="pl-10 pr-2 pb-1 border-l-2 border-l-slate-100 ml-6"
                                               cdkDropList
                                               cdkDropListLockAxis="y"
                                               [cdkDropListData]="lesson.sections"
                                               [cdkDropListConnectedTo]="[]"
                                               (cdkDropListDropped)="dropSection($event, lesson.id)">
                                              @for (section of lesson.sections; track section.id; let secIdx = $index) {
                                                  <div class="flex items-center gap-1.5 py-1.5 px-1.5 rounded-md group/sec hover:bg-white transition-colors cursor-pointer"
                                                       [class.bg-[#E8F0FE]/80]="selectedSectionId() === section.id"
                                                       cdkDrag [cdkDragData]="section"
                                                       [cdkDragStartDelay]="isTouchDevice ? 150 : 0"
                                                       (click)="selectSection(chapter, lesson, section); $event.stopPropagation()">

                                                      <!-- Drag Preview -->
                                                      <div *cdkDragPreview class="bg-white shadow-lg rounded-lg px-3 py-1.5 border border-[#0056D2] text-xs font-medium text-slate-700 max-w-[220px] line-clamp-2 break-words">
                                                        {{ section.title }}
                                                      </div>
                                                      <!-- Drag Placeholder -->
                                                      <div *cdkDragPlaceholder class="h-0.5 bg-[#0056D2] rounded-full mx-1 my-0.5"></div>

                                                      <!-- Drag Handle -->
                                                      <div cdkDragHandle
                                                           class="flex-shrink-0 w-4 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/sec:opacity-60 transition-opacity self-stretch">
                                                        <svg class="w-2.5 h-3.5 text-slate-400" viewBox="0 0 6 10" fill="currentColor">
                                                          <circle cx="1.5" cy="1.5" r="1"/><circle cx="4.5" cy="1.5" r="1"/>
                                                          <circle cx="1.5" cy="5" r="1"/><circle cx="4.5" cy="5" r="1"/>
                                                          <circle cx="1.5" cy="8.5" r="1"/><circle cx="4.5" cy="8.5" r="1"/>
                                                        </svg>
                                                      </div>

                                                      <!-- Type Color Bar -->
                                                      <div [class]="'w-1 h-4 rounded-full flex-shrink-0 ' + getTypeColor(section.type)"></div>

                                                      <div class="flex-grow min-w-0">
                                                          <p class="text-[13px] text-slate-600 leading-snug line-clamp-2 break-words group-hover/sec:text-slate-900 font-medium">
                                                              {{ section.title }}
                                                          </p>
                                                          <span class="text-[11px] text-slate-400 uppercase tracking-widest font-bold">{{ section.type }}</span>
                                                      </div>

                                                      <!-- Section Actions -->
                                                      <div class="flex items-center gap-0.5 opacity-0 group-hover/sec:opacity-100 transition-opacity" (click)="$event.stopPropagation()">
                                                        @if (secIdx > 0) {
                                                          <button (click)="moveSectionUp(lesson.id, secIdx)"
                                                                  class="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                                                                  matTooltip="Di chuyển lên">
                                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
                                                          </button>
                                                        }
                                                        @if (secIdx < (lesson.sections.length || 0) - 1) {
                                                          <button (click)="moveSectionDown(lesson.id, secIdx)"
                                                                  class="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                                                                  matTooltip="Di chuyển xuống">
                                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                                          </button>
                                                        }
                                                        <button (click)="editSection(chapter, lesson, section)"
                                                                class="p-1 text-slate-400 hover:text-[#0056D2] hover:bg-[#E8F0FE] rounded-md transition-colors"
                                                                matTooltip="Chỉnh sửa">
                                                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                        </button>
                                                        <button (click)="deleteSection(lesson.id, section.id)"
                                                                class="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                                matTooltip="Xóa">
                                                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                        </button>
                                                      </div>
                                                  </div>
                                              }
                                          </div>
                                        } @else {
                                          <!-- Empty: no sections in lesson -->
                                          <div class="py-3 pl-12 pr-4">
                                            <p class="text-[11px] text-slate-400 italic">Chưa có nội dung</p>
                                          </div>
                                        }

                                        <!-- Add Content Button (visible when lesson expanded) -->
                                        <button (click)="showAddSectionModal(lesson, lesson.sections.length || 0, lessonIdx); $event.stopPropagation()"
                                                class="ml-10 mb-1 text-[11px] font-semibold text-[#0056D2] hover:text-[#004BB5] transition-colors flex items-center gap-1 py-1 opacity-60 hover:opacity-100">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                            </svg>
                                            Thêm nội dung
                                        </button>
                                      }
                                  </div>
                              }

                              <!-- Add Lesson inline (Udemy pattern) -->
                              <button (click)="showAddLessonModal(chapter, chapterIdx)"
                                      class="w-full py-2.5 text-[13px] font-semibold text-slate-400 hover:text-[#0056D2] hover:bg-[#E8F0FE]/50 transition-colors flex items-center justify-center gap-1.5 border-t border-slate-100">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                </svg>
                                Thêm bài học
                              </button>
                          </div>
                      }
                  </div>
                }
            }
        </div>

        <!-- Footer -->
        <div class="p-3.5 border-t border-slate-200 bg-slate-50/80">
            <button (click)="showAddChapterModal()"
                    class="w-full py-2.5 flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-700 hover:border-[#0056D2] hover:text-[#0056D2] hover:bg-[#E8F0FE]/30 hover:shadow-sm active:scale-[0.98] transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Thêm chương mới
            </button>
        </div>
    </aside>

    <!-- Click-away overlay for menus -->
    @if (openMenuId()) {
      <div class="fixed inset-0 z-40" (click)="closeMenu()"></div>
    }

    <!-- Chapter Modal -->
    @if (showChapterModal()) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]"
           (click)="closeModals()" (keydown.escape)="closeModals()">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden" (click)="$event.stopPropagation()">
          <div class="px-5 py-4 border-b border-slate-200">
            <h3 class="text-base font-bold text-slate-900">Tạo chương mới</h3>
          </div>
          <div class="px-5 py-5">
            <label class="text-[13px] font-semibold text-slate-700 mb-2 block">Tên chương</label>
            <input type="text" [(ngModel)]="newChapterTitle"
                   (keydown.enter)="createChapter()"
                   class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-all"
                   placeholder="VD: Kiến thức cơ bản...">
          </div>
          <div class="px-5 py-3.5 bg-slate-50 flex justify-end gap-2.5 border-t border-slate-100">
            <button (click)="closeModals()" class="px-4 py-2.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors">Hủy</button>
            <button (click)="createChapter()"
                    [disabled]="isCreating()"
                    class="px-5 py-2.5 bg-[#0056D2] text-white text-[13px] font-semibold rounded-lg hover:bg-[#004BB5] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm">
              @if (isCreating()) {
                <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              }
              Tạo chương
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Lesson Modal -->
    @if (showLessonModal()) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]"
           (click)="closeModals()" (keydown.escape)="closeModals()">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden" (click)="$event.stopPropagation()">
          <div class="px-5 py-4 border-b border-slate-200">
            <h3 class="text-base font-bold text-slate-900">Thêm bài học</h3>
            <p class="text-xs text-slate-500 mt-0.5">Chương: {{ currentChapterForLesson()?.title }}</p>
          </div>
          <div class="px-5 py-5">
            <label class="text-[13px] font-semibold text-slate-700 mb-2 block">Tên bài học</label>
            <input type="text" [(ngModel)]="newLessonTitle"
                   (keydown.enter)="createLesson()"
                   class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-all"
                   placeholder="VD: Bài 1: Giới thiệu...">
          </div>
          <div class="px-5 py-3.5 bg-slate-50 flex justify-end gap-2.5 border-t border-slate-100">
            <button (click)="closeModals()" class="px-4 py-2.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors">Hủy</button>
            <button (click)="createLesson()"
                    [disabled]="isCreating()"
                    class="px-5 py-2.5 bg-[#0056D2] text-white text-[13px] font-semibold rounded-lg hover:bg-[#004BB5] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm">
              @if (isCreating()) {
                <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              }
              Thêm bài học
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Section Modal -->
    @if (showSectionModal()) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]"
           (click)="closeModals()" (keydown.escape)="closeModals()">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden" (click)="$event.stopPropagation()">
          <div class="px-5 py-4 border-b border-slate-200">
            <h3 class="text-base font-bold text-slate-900">Thêm nội dung</h3>
            <p class="text-xs text-slate-500 mt-0.5">Bài học: {{ currentLessonForSection()?.title }}</p>
          </div>
          <div class="px-5 py-5 space-y-5">
            <div>
              <label class="text-[13px] font-semibold text-slate-700 mb-2 block">Tiêu đề</label>
              <input type="text"
                     [(ngModel)]="newSectionTitle"
                     (keydown.enter)="createSection()"
                     class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-all"
                     placeholder="VD: Video bài giảng, Tài liệu đọc...">
            </div>

            <div>
              <label class="text-[13px] font-semibold text-slate-700 mb-2.5 block">Loại nội dung</label>
              <div class="grid grid-cols-4 gap-2.5">
                @for (type of sectionTypes; track type) {
                  <button (click)="newSectionType = type"
                          [class]="'py-3 px-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 text-center ' +
                                   (newSectionType === type ? 'border-[#0056D2] bg-[#E8F0FE] text-[#0056D2] shadow-sm' : 'border-slate-200 hover:border-slate-300 text-slate-500 hover:bg-slate-50')">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      @switch (type) {
                        @case ('TEXT') {
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        }
                        @case ('VIDEO') {
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        }
                        @case ('QUIZ') {
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                        }
                        @case ('FILE') {
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                        }
                      }
                    </svg>
                    <span class="text-[11px] font-bold uppercase">{{ type }}</span>
                  </button>
                }
              </div>

              @if (newSectionType === 'FILE') {
                <div class="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <label class="block text-[11px] font-bold text-amber-700 uppercase mb-2">Đính kèm tài liệu</label>
                  @if (!selectedFile) {
                    <input type="file" (change)="onFileSelected($event)"
                           class="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-amber-200 file:text-amber-800 hover:file:bg-amber-300 cursor-pointer">
                  } @else {
                    <div class="flex items-center justify-between bg-white p-2 rounded-lg border border-amber-200">
                       <div class="flex items-center gap-2 overflow-hidden">
                         <svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                         <span class="text-xs text-slate-700 truncate font-medium">{{ selectedFile.name }}</span>
                       </div>
                       <button (click)="removeSelectedFile()" class="p-1 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                         <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                       </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
          <div class="px-5 py-3.5 bg-slate-50 flex justify-end gap-2.5 border-t border-slate-100">
            <button (click)="closeModals()" class="px-4 py-2.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors">Hủy</button>
            <button (click)="createSection()"
                    [disabled]="!newSectionTitle.trim() || (newSectionType === 'FILE' && !selectedFile) || isCreating()"
                    class="px-5 py-2.5 bg-[#0056D2] text-white text-[13px] font-semibold rounded-lg hover:bg-[#004BB5] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm">
              @if (isCreating()) {
                <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              }
              Tạo nội dung
            </button>
          </div>
        </div>
      </div>
    }
    <!-- Move to Chapter Modal (Canvas "Move To" pattern - WCAG 2.5.7) -->
    @if (showMoveToChapter()) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]"
           (click)="closeMoveToChapter()" (keydown.escape)="closeMoveToChapter()">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden" (click)="$event.stopPropagation()">
          <div class="px-5 py-4 border-b border-slate-200">
            <h3 class="text-base font-bold text-slate-900">Chuyển bài học sang chương khác</h3>
            <p class="text-xs text-slate-500 mt-0.5">{{ moveToLessonTarget()?.title }}</p>
          </div>
          <div class="px-5 py-5">
            <label class="text-[13px] font-semibold text-slate-700 mb-2 block">Chọn chương đích</label>
            <div class="space-y-1.5 max-h-60 overflow-y-auto">
              @for (ch of store.chapters(); track ch.id) {
                @if (ch.id !== moveToFromChapterId()) {
                  <button (click)="executeMoveToChapter(ch.id)"
                          class="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-[#0056D2] hover:bg-[#E8F0FE]/30 text-[13px] text-slate-700 font-medium transition-all flex items-center gap-2">
                    <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                    <span class="line-clamp-2 break-words">{{ ch.title }}</span>
                    <span class="text-[11px] text-slate-400 ml-auto flex-shrink-0">{{ ch.lessons.length }} bài</span>
                  </button>
                }
              }
            </div>
          </div>
          <div class="px-5 py-3.5 bg-slate-50 flex justify-end border-t border-slate-100">
            <button (click)="closeMoveToChapter()" class="px-4 py-2.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors">Hủy</button>
          </div>
        </div>
      </div>
    }
  `
})

export class CourseEditorSidebarComponent implements OnDestroy {
  store = inject(CourseEditorStore);
  selectionService = inject(CurriculumSelectionService);
  private router = inject(Router);
  private chapterApi = inject(ChapterApi);
  private lessonApi = inject(LessonApi);
  private sectionApi = inject(SectionApi);
  private assignmentApi = inject(AssignmentApi);
  private quizApi = inject(QuizApi);
  private authoringService = inject(CourseAuthoringService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  sidebarWidth = signal(320);
  searchQuery = signal('');

  // Multi-expand chapters (Moodle 4.x pattern - replaces single-accordion)
  expandedChapters = signal<Set<string>>(new Set());

  // Multi-expand lessons (3-level tree: Chapter → Lesson → Section)
  expandedLessons = signal<Set<string>>(new Set());

  // Kebab menu state
  openMenuId = signal<string | null>(null);

  // Loading state for create operations
  isCreating = signal(false);

  // Stats
  totalCount = computed(() =>
    this.store.chapters().reduce((acc, ch) => acc + ch.lessons.length, 0)
  );
  publishedCount = computed(() =>
    this.store.chapters().reduce((acc, ch) =>
      acc + ch.lessons.filter(lesson => lessonHasCanonicalContent(lesson)).length, 0)
  );

  isAllExpanded = computed(() => {
    const chapters = this.store.chapters();
    if (chapters.length === 0) return false;
    return chapters.every(ch => this.expandedChapters().has(ch.id));
  });

  // Search no-results counter
  filteredChapterCount = computed(() => {
    const q = this.searchQuery();
    if (!q) return this.store.chapters().length;
    return this.store.chapters().filter(ch => this.chapterMatchesSearch(ch)).length;
  });

  // Selection service signals
  selectedChapterId = this.selectionService.selectedChapterId;
  selectedLessonId = this.selectionService.selectedLessonId;
  selectedSectionId = this.selectionService.selectedSectionId;

  // Modal states
  showChapterModal = signal(false);
  showLessonModal = signal(false);
  showSectionModal = signal(false);
  currentChapterForLesson = signal<ChapterDraftDTO | null>(null);
  currentLessonForSection = signal<LessonDraftDTO | null>(null);

  // Form data
  newChapterTitle = '';
  newChapterDescription = '';
  newLessonTitle = '';
  newLessonType: 'LECTURE' | 'QUIZ' | 'ASSIGNMENT' = 'LECTURE';
  newSectionTitle = '';
  newSectionType: 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE' = 'TEXT';
  readonly sectionTypes: ('TEXT' | 'VIDEO' | 'QUIZ' | 'FILE')[] = ['TEXT', 'VIDEO', 'QUIZ', 'FILE'];
  selectedFile: File | null = null;
  tempSearch = '';

  // Inline editing
  editingChapterId = signal<string | null>(null);
  editingLessonId = signal<string | null>(null);
  editingValue = '';

  // Pending new lesson for auto-opening section modal
  private pendingNewLessonChapterId = signal<string | null>(null);

  // Touch device detection (Phase C)
  readonly isTouchDevice = 'ontouchstart' in globalThis || navigator.maxTouchPoints > 0;

  // Move to Chapter modal state (Phase B - WCAG 2.5.7)
  showMoveToChapter = signal(false);
  moveToFromChapterId = signal<string | null>(null);
  moveToLessonTarget = signal<LessonDraftDTO | null>(null);

  constructor() {
    // Auto-expand first chapter when data loads
    effect(() => {
      const chapters = this.store.chapters();
      if (chapters.length > 0) {
        const expanded = untracked(() => this.expandedChapters());
        if (expanded.size === 0) {
          untracked(() => this.expandedChapters.set(new Set([chapters[0].id])));
        }
      }
    });

    // Auto-expand and open section modal when new lesson appears
    effect(() => {
      const chapters = this.store.chapters();
      const pendingChapterId = this.pendingNewLessonChapterId();
      if (!pendingChapterId) return;

      const chapter = chapters.find(ch => ch.id === pendingChapterId);
      if (chapter && chapter.lessons.length > 0) {
        const lastLesson = chapter.lessons[chapter.lessons.length - 1];
        const chapterIndex = chapters.indexOf(chapter);
        untracked(() => {
          this.pendingNewLessonChapterId.set(null);
          // Auto-expand the new lesson
          this.expandedLessons.update(set => {
            const next = new Set(set);
            next.add(lastLesson.id);
            return next;
          });
          this.showAddSectionModal(lastLesson, 0, chapterIndex);
        });
      }
    });
  }

  // --- Chapter expand/collapse (multi-expand) ---
  isChapterExpanded(chapterId: string): boolean {
    return this.expandedChapters().has(chapterId);
  }

  toggleChapter(chapterId: string) {
    this.expandedChapters.update(set => {
      const next = new Set(set);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  }

  toggleAll() {
    const chapters = this.store.chapters();
    if (this.isAllExpanded()) {
      this.expandedChapters.set(new Set());
      this.expandedLessons.set(new Set());
    } else {
      this.expandedChapters.set(new Set(chapters.map(ch => ch.id)));
      const allLessonIds = chapters.flatMap(ch => ch.lessons.map(l => l.id));
      this.expandedLessons.set(new Set(allLessonIds));
    }
  }

  async toggleChapterSelection(chapter: ChapterDraftDTO) {
    if (!(await this.canChangeSelection())) {
      return;
    }

    this.toggleChapter(chapter.id);
    this.selectionService.selectChapter(chapter);
    this.navigateToCurriculum();
  }

  // --- Lesson expand/collapse (3-level tree) ---
  isLessonExpanded(lessonId: string): boolean {
    return this.expandedLessons().has(lessonId);
  }

  toggleLesson(lessonId: string) {
    this.expandedLessons.update(set => {
      const next = new Set(set);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });
  }

  async toggleLessonSelection(chapter: ChapterDraftDTO, lesson: LessonDraftDTO) {
    if (!(await this.canChangeSelection())) {
      return;
    }

    this.toggleLesson(lesson.id);
    this.selectionService.selectLesson(chapter, lesson);
    this.expandedLessons.update(set => {
      const next = new Set(set);
      next.add(lesson.id);
      return next;
    });
    this.navigateToCurriculum();
  }

  // --- Kebab Menu ---
  toggleMenu(type: string, id: string) {
    const menuId = `${type}-${id}`;
    this.openMenuId.update(current => current === menuId ? null : menuId);
  }

  closeMenu() {
    this.openMenuId.set(null);
  }

  // --- Selection ---
  async selectChapter(chapter: ChapterDraftDTO) {
    if (!(await this.canChangeSelection())) {
      return;
    }

    this.selectionService.selectChapter(chapter);
    this.navigateToCurriculum();
  }

  async selectLesson(chapter: ChapterDraftDTO, lesson: LessonDraftDTO) {
    if (!(await this.canChangeSelection())) {
      return;
    }

    this.selectionService.selectLesson(chapter, lesson);
    // Auto-expand lesson to show sections
    this.expandedLessons.update(set => {
      const next = new Set(set);
      next.add(lesson.id);
      return next;
    });
    this.navigateToCurriculum();
  }

  async selectSection(chapter: ChapterDraftDTO, lesson: LessonDraftDTO, section: SectionDraftDTO) {
    if (!(await this.canChangeSelection())) {
      return;
    }

    this.selectionService.selectSection(chapter, lesson, section);
    this.navigateToCurriculum();
  }

  async editSection(chapter: ChapterDraftDTO, lesson: LessonDraftDTO, section: SectionDraftDTO) {
    await this.selectSection(chapter, lesson, section);
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

  // --- Drag & Drop ---
  // IMPORTANT: Use requestAnimationFrame to defer store mutation until AFTER
  // CDK DragDrop finishes its internal cleanup. Without this, updating courseTree
  // immediately destroys DOM nodes that CDK still references, causing stale
  // registry entries that break expand/collapse after a few drags (CDK #16671).

  dropChapter(event: CdkDragDrop<ChapterDraftDTO[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const chapters = [...this.store.chapters()];
    moveItemInArray(chapters, event.previousIndex, event.currentIndex);
    const courseId = this.store.courseTree()?.id;
    if (courseId) {
      requestAnimationFrame(() => {
        this.store.reorderChapters(courseId, chapters.map(c => c.id));
      });
    }
  }

  dropLesson(event: CdkDragDrop<LessonDraftDTO[]>, chapterId: string) {
    if (event.previousIndex === event.currentIndex) return;
    const chapter = this.store.chapters().find(c => c.id === chapterId);
    if (!chapter) return;
    const lessons = [...chapter.lessons];
    moveItemInArray(lessons, event.previousIndex, event.currentIndex);
    requestAnimationFrame(() => {
      this.store.reorderLessonsOptimistic(chapterId, lessons.map(l => l.id));
    });
  }

  dropSection(event: CdkDragDrop<SectionDraftDTO[]>, lessonId: string) {
    if (event.previousIndex === event.currentIndex) return;
    let lesson: LessonDraftDTO | undefined;
    for (const ch of this.store.chapters()) {
      const l = ch.lessons.find(ls => ls.id === lessonId);
      if (l) { lesson = l; break; }
    }
    if (!lesson?.sections) return;
    const sections = [...lesson.sections];
    moveItemInArray(sections, event.previousIndex, event.currentIndex);
    requestAnimationFrame(() => {
      this.store.reorderSectionsOptimistic(lessonId, sections.map(s => s.id));
    });
  }

  // --- Modal handlers ---
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
    this.newLessonType = 'LECTURE';
    this.showLessonModal.set(true);
  }

  showAddSectionModal(lesson: LessonDraftDTO, sectionIndex: number, lessonIndex: number) {
    this.currentLessonForSection.set(lesson);
    this.newSectionTitle = `${lessonIndex + 1}.${sectionIndex + 1}: `;
    this.newSectionType = 'TEXT';
    this.selectedFile = null;
    this.showSectionModal.set(true);
  }

  closeModals() {
    this.showChapterModal.set(false);
    this.showLessonModal.set(false);
    this.showSectionModal.set(false);
    this.currentChapterForLesson.set(null);
    this.currentLessonForSection.set(null);
  }

  createChapter() {
    const courseId = this.store.courseTree()?.id;
    if (!courseId || !this.newChapterTitle.trim()) return;
    this.isCreating.set(true);

    this.chapterApi.createChapter(courseId, {
      title: this.newChapterTitle.trim(),
      description: this.newChapterDescription.trim()
    }).subscribe({
      next: () => {
        this.closeModals();
        this.toast.success('Đã tạo chương mới');
        this.store.loadCourse(courseId, true);
        this.isCreating.set(false);
      },
      error: (err: any) => {
        this.toast.error('Tạo chương thất bại: ' + (err?.error?.message || ''));
        this.isCreating.set(false);
      }
    });
  }

  async createLesson() {
    const chapter = this.currentChapterForLesson();
    const courseId = this.store.courseTree()?.id;
    const title = this.newLessonTitle.trim();
    if (!chapter || !courseId || !title) return;
    this.isCreating.set(true);

    try {
      if (this.newLessonType === 'LECTURE') {
        await firstValueFrom(this.lessonApi.createLesson(chapter.id, {
          title,
          type: 'LECTURE',
          content: undefined
        }));
      } else if (this.newLessonType === 'QUIZ') {
        await firstValueFrom(this.quizApi.createChapterQuiz(chapter.id, {
          title,
          description: '',
          timeLimitMinutes: 30,
          maxAttempts: 1,
          passingScore: 60,
          shuffleQuestions: true,
          shuffleOptions: true,
          showResultsImmediately: true,
          showCorrectAnswers: true,
          questionIds: [],
          publishImmediately: false
        }));
      } else {
        const lessonResponse: any = await firstValueFrom(this.lessonApi.createLesson(chapter.id, {
          title,
          type: 'ASSIGNMENT',
          content: undefined
        }));
        const lessonId = lessonResponse?.data?.id ?? lessonResponse?.data;
        if (!lessonId) {
          throw new Error('Khong the khoi tao lesson assignment');
        }

        try {
          await firstValueFrom(this.assignmentApi.createAssignment(courseId, {
            lessonId,
            title,
            description: '',
            instructions: '',
            maxScore: 100,
            distributionType: 'ALL_STUDENTS'
          }));
        } catch (assignmentError) {
          await this.rollbackLessonCreation(lessonId, courseId);
          throw assignmentError;
        }
      }

      this.closeModals();
      this.toast.success('Đã tạo bài học mới');
      this.expandedChapters.update(set => {
        const next = new Set(set);
        next.add(chapter.id);
        return next;
      });
      this.pendingNewLessonChapterId.set(chapter.id);
      await this.store.loadCourse(courseId, true);
    } catch (err: any) {
      this.toast.error('Tạo bài học thất bại: ' + (err?.error?.message || err?.message || ''));
    } finally {
      this.isCreating.set(false);
    }
  }

  private async canChangeSelection(): Promise<boolean> {
    if (this.store.saveStatus() !== 'unsaved') {
      return true;
    }

    const shouldDiscard = await this.confirmDialog.confirm({
      title: 'Rời nội dung đang chỉnh sửa',
      message: 'Bạn có thay đổi chưa lưu trong chương trình học. Nếu chuyển sang mục khác, các chỉnh sửa sẽ bị mất.',
      variant: 'warning',
      confirmText: 'Chuyển mục',
      cancelText: 'Ở lại'
    });
    if (shouldDiscard) {
      this.store.markSaved();
    }

    return shouldDiscard;
  }

  private async rollbackLessonCreation(lessonId: string, courseId: string): Promise<void> {
    try {
      await firstValueFrom(this.lessonApi.deleteLesson(lessonId, courseId));
    } catch {
      this.toast.error('Không thể hoàn tác lesson trung gian sau khi tạo assignment thất bại');
    }
  }

  createSection() {
    const lesson = this.currentLessonForSection();
    if (!lesson || !this.newSectionTitle.trim()) return;
    this.isCreating.set(true);

    const formData = new FormData();
    const payload = {
      title: this.newSectionTitle.trim(),
      type: this.newSectionType,
      orderIndex: lesson.sections.length || 0
    };
    formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (this.newSectionType === 'FILE' && this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    this.sectionApi.createSection(lesson.id, formData).subscribe({
      next: () => {
        this.closeModals();
        this.toast.success('Đã tạo nội dung mới');
        // Auto-expand lesson to show new section
        this.expandedLessons.update(set => {
          const next = new Set(set);
          next.add(lesson.id);
          return next;
        });
        const courseId = this.store.courseTree()?.id;
        if (courseId) this.store.loadCourse(courseId, true);
        this.isCreating.set(false);
      },
      error: (err: any) => {
        this.toast.error('Tạo nội dung thất bại: ' + (err?.error?.message || ''));
        this.isCreating.set(false);
      }
    });
  }

  // --- Delete handlers ---
  async deleteChapter(chapterId: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa chương',
      message: 'Tất cả bài học và nội dung trong chương sẽ bị xóa vĩnh viễn. Bạn có chắc chắn?',
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    const courseId = this.store.courseTree()?.id;
    if (!courseId) return;
    this.chapterApi.deleteChapter(chapterId, courseId).subscribe({
      next: () => {
        if (this.selectedChapterId() === chapterId) this.selectionService.clearSelection();
        this.expandedChapters.update(set => { const next = new Set(set); next.delete(chapterId); return next; });
        this.toast.success('Đã xóa chương');
        this.store.loadCourse(courseId, true);
      },
      error: (err: any) => this.toast.error('Xóa chương thất bại: ' + (err?.error?.message || ''))
    });
  }

  async deleteLesson(lessonId: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa bài học',
      message: 'Tất cả nội dung trong bài học sẽ bị xóa. Bạn có chắc chắn?',
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    const courseId = this.store.courseTree()?.id;
    if (!courseId) return;
    this.lessonApi.deleteLesson(lessonId, courseId).subscribe({
      next: () => {
        if (this.selectedLessonId() === lessonId) this.selectionService.clearLessonSelection();
        this.expandedLessons.update(set => { const next = new Set(set); next.delete(lessonId); return next; });
        this.toast.success('Đã xóa bài học');
        this.store.loadCourse(courseId, true);
      },
      error: (err: any) => this.toast.error('Xóa bài học thất bại: ' + (err?.error?.message || ''))
    });
  }

  async deleteSection(lessonId: string, sectionId: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa nội dung',
      message: 'Nội dung này sẽ bị xóa vĩnh viễn. Bạn có chắc chắn?',
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    const courseId = this.store.courseTree()?.id;
    if (!courseId) return;
    this.sectionApi.deleteSection(lessonId, sectionId).subscribe({
      next: () => {
        this.toast.success('Đã xóa nội dung');
        this.store.loadCourse(courseId, true);
      },
      error: (err: any) => this.toast.error('Xóa nội dung thất bại: ' + (err?.error?.message || ''))
    });
  }

  // --- File Handler ---
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024;
  private readonly ALLOWED_FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'video/mp4'];

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > this.MAX_FILE_SIZE) {
      this.toast.error('File quá lớn. Kích thước tối đa: 50MB');
      event.target.value = '';
      return;
    }
    if (!this.ALLOWED_FILE_TYPES.includes(file.type)) {
      this.toast.error('Định dạng không hỗ trợ. Chỉ chấp nhận: PDF, DOCX, JPG, PNG, MP4');
      event.target.value = '';
      return;
    }
    this.selectedFile = file;
  }

  removeSelectedFile() {
    this.selectedFile = null;
  }

  // --- Type color helper ---
  getTypeColor(type: string): string {
    const key = (type || 'TEXT').toUpperCase() as ContentType;
    return CONTENT_TYPE_CONFIG[key]?.color || 'bg-slate-300';
  }

  // Helper to strip chapter prefix if already present in title
  getChapterDisplayTitle(title: string, index: number): string {
    // If title already starts with "Chương X:" or "Chương X.", strip it to avoid duplication
    // Match patterns like "Chương 1:", "Chương 1.", "CHƯƠNG 1:" etc.
    const chapterPattern = /^chương\s+\d+[.:.]/i;
    if (chapterPattern.test(title)) {
      // Find where the prefix ends and return the rest
      const match = title.match(/^chương\s+\d+[.:.]\s*/i);
      if (match) {
        return title.slice(match[0].length).trim();
      }
    }
    return title;
  }

  // Helper to strip lesson prefix if already present in title
  getLessonDisplayTitle(title: string, index: number): string {
    // If title already starts with "Bài X:" or "Bài X.", strip it to avoid duplication
    // Match patterns like "Bài 1:", "Bài 1.", "BÀI 1:" etc.
    const lessonPattern = /^bài\s+\d+[.:.]/i;
    if (lessonPattern.test(title)) {
      const match = title.match(/^bài\s+\d+[.:.]\s*/i);
      if (match) {
        return title.slice(match[0].length).trim();
      }
    }
    return title;
  }

  ngOnDestroy() {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
  }

  // --- Keyboard & Resize ---
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
    // Close menu on Escape
    if (event.key === 'Escape' && this.openMenuId()) {
      this.closeMenu();
    }
  }

  // --- Search ---
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(query: string) {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.searchQuery.set(query.toLowerCase());
      // Auto-expand chapters and lessons that match search
      if (query.trim()) {
        const q = query.toLowerCase();
        const matching = this.store.chapters().filter(ch => this.chapterMatchesSearch(ch));
        this.expandedChapters.update(set => {
          const next = new Set(set);
          matching.forEach(ch => next.add(ch.id));
          return next;
        });
        // Also expand lessons whose sections match search
        this.expandedLessons.update(set => {
          const next = new Set(set);
          matching.forEach(ch => {
            ch.lessons?.forEach(l => {
              if (l.title.toLowerCase().includes(q) || l.sections?.some(s => s.title.toLowerCase().includes(q))) {
                next.add(l.id);
              }
            });
          });
          return next;
        });
      }
    }, 300);
  }

  chapterMatchesSearch(chapter: ChapterDraftDTO): boolean {
    const q = this.searchQuery();
    if (!q) return true;
    if (chapter.title.toLowerCase().includes(q)) return true;
    return chapter.lessons?.some(l =>
      l.title.toLowerCase().includes(q) ||
      l.sections?.some(s => s.title.toLowerCase().includes(q))
    ) ?? false;
  }

  // --- Inline Title Editing ---
  startEditChapter(chapter: ChapterDraftDTO, event: Event) {
    event.stopPropagation();
    this.editingChapterId.set(chapter.id);
    this.editingLessonId.set(null);
    this.editingValue = chapter.title;
  }

  startEditLesson(lesson: LessonDraftDTO, event: Event) {
    event.stopPropagation();
    this.editingLessonId.set(lesson.id);
    this.editingChapterId.set(null);
    this.editingValue = lesson.title;
  }

  confirmEditChapter(chapterId: string) {
    const trimmed = this.editingValue.trim();
    if (!trimmed) { this.cancelEdit(); return; }
    this.editingChapterId.set(null);
    const courseId = this.store.courseTree()?.id;
    if (!courseId) return;

    this.chapterApi.updateChapter(chapterId, { courseId, title: trimmed }).subscribe({
      next: () => this.store.loadCourse(courseId, true),
      error: (err: any) => this.toast.error('Đổi tên chương thất bại: ' + (err?.error?.message || ''))
    });
  }

  confirmEditLesson(lessonId: string) {
    const trimmed = this.editingValue.trim();
    if (!trimmed) { this.cancelEdit(); return; }
    this.editingLessonId.set(null);
    const courseId = this.store.courseTree()?.id;
    if (!courseId) return;

    let chapterId = '';
    for (const ch of this.store.chapters()) {
      if (ch.lessons.some(l => l.id === lessonId)) { chapterId = ch.id; break; }
    }
    if (!chapterId) {
      this.toast.error('Không tìm thấy chương chứa bài học này');
      return;
    }

    this.lessonApi.updateLesson(lessonId, { courseId, chapterId, title: trimmed }).subscribe({
      next: () => this.store.loadCourse(courseId, true),
      error: (err: any) => this.toast.error('Đổi tên bài học thất bại: ' + (err?.error?.message || ''))
    });
  }

  cancelEdit() {
    this.editingChapterId.set(null);
    this.editingLessonId.set(null);
    this.editingValue = '';
  }

  onEditKeydown(event: KeyboardEvent, type: 'chapter' | 'lesson', id: string) {
    if (event.key === 'Enter') {
      event.preventDefault();
      type === 'chapter' ? this.confirmEditChapter(id) : this.confirmEditLesson(id);
    } else if (event.key === 'Escape') {
      this.cancelEdit();
    }
  }

  // --- Keyboard Reorder (WCAG 2.5.7 single-pointer alternative) ---

  moveChapterUp(index: number) {
    if (index <= 0) return;
    const chapters = [...this.store.chapters()];
    const courseId = this.store.courseTree()?.id;
    if (!courseId) return;
    moveItemInArray(chapters, index, index - 1);
    this.store.reorderChapters(courseId, chapters.map(c => c.id));
  }

  moveChapterDown(index: number) {
    const chapters = [...this.store.chapters()];
    if (index >= chapters.length - 1) return;
    const courseId = this.store.courseTree()?.id;
    if (!courseId) return;
    moveItemInArray(chapters, index, index + 1);
    this.store.reorderChapters(courseId, chapters.map(c => c.id));
  }

  moveLessonUp(chapterId: string, index: number) {
    if (index <= 0) return;
    const chapter = this.store.chapters().find(c => c.id === chapterId);
    if (!chapter) return;
    const lessons = [...chapter.lessons];
    moveItemInArray(lessons, index, index - 1);
    this.store.reorderLessonsOptimistic(chapterId, lessons.map(l => l.id));
  }

  moveLessonDown(chapterId: string, index: number) {
    const chapter = this.store.chapters().find(c => c.id === chapterId);
    if (!chapter || index >= chapter.lessons.length - 1) return;
    const lessons = [...chapter.lessons];
    moveItemInArray(lessons, index, index + 1);
    this.store.reorderLessonsOptimistic(chapterId, lessons.map(l => l.id));
  }

  moveSectionUp(lessonId: string, index: number) {
    if (index <= 0) return;
    let lesson: LessonDraftDTO | undefined;
    for (const ch of this.store.chapters()) {
      const l = ch.lessons.find(ls => ls.id === lessonId);
      if (l) { lesson = l; break; }
    }
    if (!lesson?.sections) return;
    const sections = [...lesson.sections];
    moveItemInArray(sections, index, index - 1);
    this.store.reorderSectionsOptimistic(lessonId, sections.map(s => s.id));
  }

  moveSectionDown(lessonId: string, index: number) {
    let lesson: LessonDraftDTO | undefined;
    for (const ch of this.store.chapters()) {
      const l = ch.lessons.find(ls => ls.id === lessonId);
      if (l) { lesson = l; break; }
    }
    if (!lesson?.sections || index >= lesson.sections.length - 1) return;
    const sections = [...lesson.sections];
    moveItemInArray(sections, index, index + 1);
    this.store.reorderSectionsOptimistic(lessonId, sections.map(s => s.id));
  }

  // --- Move to Chapter (Canvas "Move To" pattern) ---

  showMoveToChapterModal(fromChapterId: string, lesson: LessonDraftDTO) {
    this.moveToFromChapterId.set(fromChapterId);
    this.moveToLessonTarget.set(lesson);
    this.showMoveToChapter.set(true);
  }

  executeMoveToChapter(toChapterId: string) {
    const lesson = this.moveToLessonTarget();
    const fromChapterId = this.moveToFromChapterId();
    if (!lesson || !fromChapterId) return;

    const courseId = this.store.courseTree()?.id;
    if (!courseId) return;

    this.closeMoveToChapter();
    if (toChapterId === fromChapterId) {
      return;
    }

    this.lessonApi.updateLesson(lesson.id, {
      courseId,
      chapterId: toChapterId
    }).subscribe({
      next: () => {
        this.expandedChapters.update(set => new Set([...set, toChapterId]));
        this.toast.success('Đã chuyển bài học sang chương khác');
        this.store.loadCourse(courseId, true);
        if (this.selectedLessonId() === lesson.id) {
          void this.router.navigate(
            ['/teacher/courses', courseId, 'editor', 'curriculum'],
            { queryParams: { chapterId: toChapterId, lessonId: lesson.id } }
          );
        }
      },
      error: (err: any) => this.toast.error('Không thể di chuyển bài học: ' + (err?.error?.message || ''))
    });
  }

  closeMoveToChapter() {
    this.showMoveToChapter.set(false);
    this.moveToFromChapterId.set(null);
    this.moveToLessonTarget.set(null);
  }

  // --- Status Badges ---
  getLessonStatus(lesson: LessonDraftDTO): 'ready' | 'draft' | 'empty' {
    return getLessonReadinessState(lesson);
  }

  getLessonStatusColor(lesson: LessonDraftDTO): string {
    switch (this.getLessonStatus(lesson)) {
      case 'ready': return 'bg-green-500';
      case 'draft': return 'bg-amber-400';
      case 'empty': return 'bg-slate-300';
    }
  }

  getChapterStatus(chapter: ChapterDraftDTO): 'ready' | 'partial' | 'empty' {
    if (!chapter.lessons || chapter.lessons.length === 0) return 'empty';
    const allReady = chapter.lessons.every(l => this.getLessonStatus(l) === 'ready');
    const someReady = chapter.lessons.some(l => this.getLessonStatus(l) !== 'empty');
    if (allReady) return 'ready';
    if (someReady) return 'partial';
    return 'empty';
  }

  getChapterStatusColor(chapter: ChapterDraftDTO): string {
    switch (this.getChapterStatus(chapter)) {
      case 'ready': return 'bg-green-500';
      case 'partial': return 'bg-amber-400';
      case 'empty': return 'bg-slate-300';
    }
  }
}
