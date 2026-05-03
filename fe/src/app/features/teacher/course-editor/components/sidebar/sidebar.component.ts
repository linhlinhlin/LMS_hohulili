import { Component, inject, signal, computed, effect, untracked, HostListener, ChangeDetectionStrategy, OnDestroy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CourseEditorStore } from '../../store/course-editor.store';
import { RouterModule, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { ChapterApi } from '../../../../../api/client/chapter.api';
import { LessonApi } from '../../../../../api/client/lesson.api';
import { SectionApi } from '../../../../../api/client/section.api';
import { ChapterDraftDTO, LessonDraftDTO, SectionDraftDTO } from '../../services/course-authoring.service';
import { CurriculumSelectionService } from '../../services/curriculum-selection.service';
import { CurriculumEditorService } from '../../services/curriculum-editor.service';

import { MatTooltipModule } from '@angular/material/tooltip';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { DialogComponent } from '../../../../../shared/components/dialog/dialog.component';
import { buildCurriculumLabel, stripCurriculumPrefix } from '../../utils/curriculum-labels';
import { getLessonReadinessState, lessonHasCanonicalContent } from '../../utils/lesson-readiness';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-editor-sidebar',
  imports: [
    RouterModule,
    FormsModule,
    DragDropModule,
    CdkScrollable,
    MatTooltipModule,
    LucideAngularModule,
    DialogComponent
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
  styles: [`
    /* ── Sidebar row system ── */
    .sidebar-row {
      display: flex;
      align-items: center;
      gap: 0.125rem;
      padding: 0 0.25rem 0 0;
      transition: background-color 160ms ease;
    }
    .sidebar-row:hover { background: rgb(248 250 252); }
    .sidebar-row--lesson { padding-left: 0.625rem; }
    .sidebar-row--selected {
      background: rgba(0, 86, 210, 0.06);
      border-left: 2px solid rgb(0 86 210);
    }
    .sidebar-row:not(.sidebar-row--selected) {
      border-left: 2px solid transparent;
    }

    /* Drag handle */
    .sidebar-drag-handle {
      flex-shrink: 0;
      width: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      align-self: stretch;
    }
    .sidebar-drag-handle:active { cursor: grabbing; }

    /* Expand arrow */
    .sidebar-expand {
      flex-shrink: 0;
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.25rem;
      color: rgb(148 163 184);
      transition: color 160ms ease, transform 160ms ease;
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
    }
    .sidebar-expand:hover { color: rgb(51 65 85); }
    .sidebar-expand--sm { width: 1.25rem; height: 1.25rem; }

    /* Kebab button */
    .sidebar-kebab {
      padding: 0.375rem;
      border-radius: 0.25rem;
      color: rgb(203 213 225);
      opacity: 0;
      transition: color 160ms ease, background 160ms ease, opacity 160ms ease;
      border: none;
      background: transparent;
      cursor: pointer;
    }
    .group\\/ch:hover .sidebar-kebab,
    .group\\/ls:hover .sidebar-kebab,
    .sidebar-row--selected .sidebar-kebab {
      opacity: 1;
    }
    .sidebar-kebab:hover {
      color: rgb(71 85 105);
      background: rgb(241 245 249);
    }

    /* Drag handles: hidden by default, appear on row hover */
    .sidebar-hover-reveal {
      opacity: 0;
      transition: opacity 160ms ease 300ms;
    }
    .group\\/ch:hover .sidebar-hover-reveal,
    .group\\/ls:hover .sidebar-hover-reveal {
      opacity: 0.6;
      transition-delay: 0ms;
    }
    @media (pointer: coarse) {
      .sidebar-hover-reveal {
        opacity: 0.35;
        transition-delay: 0ms;
      }
    }

    /* ── Section items (Mục) — indented one level deeper than Bài ── */
    .sidebar-sections {
      padding: 0.125rem 0.375rem 0.25rem 2.75rem;
    }
    .sidebar-section-row {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      width: 100%;
      padding: 0.25rem 0.375rem;
      border-radius: 0.25rem;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: left;
      font-size: 0.75rem; /* 12px */
      font-weight: 500;
      color: rgb(100 116 139);
      transition: background 160ms ease, color 160ms ease;
    }
    .sidebar-section-row:hover {
      background: rgb(241 245 249);
      color: rgb(51 65 85);
    }
    .sidebar-section-row--selected {
      background: rgba(0, 86, 210, 0.08);
      color: rgb(0 86 210);
    }
    .sidebar-section-row__num {
      flex-shrink: 0;
      font-size: 0.6875rem; /* 11px */
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: rgb(0 86 210);
      opacity: 0.5;
      min-width: 1.75rem;
    }
    .sidebar-section-row--selected .sidebar-section-row__num {
      opacity: 0.8;
    }
    .sidebar-section-row__title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sidebar-section-row__type {
      flex-shrink: 0;
      font-size: 0.625rem;
      opacity: 0.5;
    }
    /* Section drag handle: hidden grip that reveals on row hover (mirror lesson pattern) */
    .sidebar-section-row__handle {
      flex-shrink: 0;
      width: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      opacity: 0;
      transition: opacity 160ms ease 200ms;
      color: rgb(148 163 184);
    }
    .sidebar-section-row:hover .sidebar-section-row__handle,
    .sidebar-section-row--selected .sidebar-section-row__handle {
      opacity: 0.7;
      transition-delay: 0ms;
    }
    .sidebar-section-row__handle:active { cursor: grabbing; }
    @media (pointer: coarse) {
      .sidebar-section-row__handle { opacity: 0.45; transition-delay: 0ms; }
    }

    /* Empty drop zone for an expanded lesson with no sections — gives the user a target */
    .sidebar-sections__empty {
      margin: 0.25rem 0;
      padding: 0.5rem 0.625rem;
      font-size: 0.6875rem;
      color: rgb(148 163 184);
      font-style: italic;
      border: 1px dashed rgb(226 232 240);
      border-radius: 0.375rem;
      text-align: center;
    }
    .cdk-drop-list-receiving .sidebar-sections__empty {
      border-color: rgb(0 86 210);
      color: rgb(0 86 210);
      background: rgba(0, 86, 210, 0.04);
    }

    /* CDK Drag overrides */
    .cdk-drag-preview { border-radius: 0.5rem; }
    .cdk-drag-placeholder { opacity: 0.3; }

    /* ── Sidebar dialog form helpers (shared across chapter/lesson/section modals) ── */
    .sidebar-field-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 8px;
    }
    .sidebar-field-label--lg { margin-bottom: 10px; }

    .sidebar-field-input {
      width: 100%;
      padding: 10px 14px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      color: #0f172a;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .sidebar-field-input:focus {
      outline: none;
      border-color: #0056D2;
      box-shadow: 0 0 0 3px rgba(0, 86, 210, 0.15);
    }

    .sidebar-field-hint {
      margin-top: 10px;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.55;
    }

    .sidebar-section-form { display: flex; flex-direction: column; gap: 20px; }

    /* Section type chooser grid — kept the old 2-row-on-mobile feel via grid-cols-4 */
    .sidebar-type-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .sidebar-type-btn {
      padding: 12px 8px;
      border-radius: 8px;
      border: 2px solid #e2e8f0;
      background: #ffffff;
      color: #64748b;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
    }
    .sidebar-type-btn:hover { border-color: #cbd5e1; background: #f8fafc; }
    .sidebar-type-btn--active {
      border-color: #0056D2;
      background: #E8F0FE;
      color: #0056D2;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .sidebar-file-attach {
      margin-top: 12px;
      padding: 12px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
    }
    .sidebar-file-attach__label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #b45309;
      margin-bottom: 8px;
      letter-spacing: 0.02em;
    }

    /* Buttons — reused by all sidebar dialog footers */
    .sidebar-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease, opacity 0.15s ease;
    }
    .sidebar-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .sidebar-btn--ghost {
      padding: 10px 16px;
      background: transparent;
      color: #475569;
    }
    .sidebar-btn--ghost:hover:not(:disabled) { background: #e2e8f0; color: #0f172a; }

    .sidebar-btn--primary {
      padding: 10px 20px;
      background: #0056D2;
      color: #ffffff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
    }
    .sidebar-btn--primary:hover:not(:disabled) { background: #004BB5; }
  `],
  template: `
    <aside class="flex flex-col bg-white border-r border-slate-200 h-full overflow-hidden select-none"
           role="tree"
           aria-label="Cấu trúc khóa học">

        <!-- Header -->
        <div class="px-3 py-2.5 border-b border-slate-200">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nội dung</span>
              @if (store.chapters().length > 0) {
                <span class="text-[10px] text-slate-400 ml-1.5">{{ store.chapters().length }} chương · {{ totalCount() }} bài</span>
              }
            </div>
            <div class="flex items-center gap-1">
              @if (store.chapters().length > 1) {
                <button (click)="toggleAll()"
                        class="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        [matTooltip]="isAllExpanded() ? 'Thu gọn tất cả' : 'Mở rộng tất cả'">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    @if (isAllExpanded()) {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14l8-8 8 8"></path>
                    } @else {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 10l8 8 8-8"></path>
                    }
                  </svg>
                </button>
              }
              <button (click)="showAddChapterModal()"
                      class="p-1.5 rounded-md hover:bg-[#E8F0FE] text-slate-400 hover:text-[#0056D2] transition-colors"
                      matTooltip="Thêm chương">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
              </button>
            </div>
          </div>
          <!-- Search -->
          @if (store.chapters().length > 3) {
            <div class="mt-2">
              <input type="text"
                     [ngModel]="searchQuery()"
                     (ngModelChange)="searchQuery.set($event)"
                     class="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#0056D2]/30 focus:border-[#0056D2] transition-colors"
                     placeholder="Tìm chương hoặc bài học...">
            </div>
          }
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

            <!-- Search no-results -->
            @if (searchQuery() && filteredChapterCount() === 0) {
              <div class="flex flex-col items-center py-8 px-4 text-center">
                <p class="text-xs text-slate-400">Không tìm thấy kết quả cho "{{ searchQuery() }}"</p>
              </div>
            }

            <!-- Chapter Tree -->
            @for (chapter of store.chapters(); track chapter.id; let chapterIdx = $index) {
              @if (chapterMatchesSearch(chapter)) {
                  <div class="border-b border-slate-100 last:border-0"
                       role="treeitem"
                       [attr.aria-expanded]="isChapterExpanded(chapter.id)"
                       cdkDrag [cdkDragData]="chapter"
                       [cdkDragStartDelay]="isTouchDevice ? 150 : 0"
                       (cdkDragStarted)="onChapterDragStart(chapter.id)">

                      <!-- Drag Preview -->
                      <div *cdkDragPreview class="bg-white shadow-lg rounded-lg px-4 py-2 border border-[#0056D2] text-sm font-medium text-slate-800 max-w-[280px] line-clamp-2 break-words">
                        {{ chapterLabel(chapterIdx) }} · {{ getChapterDisplayTitle(chapter.title, chapterIdx) }}
                      </div>
                      <!-- Drag Placeholder (insertion line) -->
                      <div *cdkDragPlaceholder class="h-0.5 bg-[#0056D2] rounded-full mx-2 my-1"></div>

                      <!-- CHAPTER ROW -->
                      <div class="sidebar-row group/ch"
                           [class.sidebar-row--selected]="selectedChapterId() === chapter.id">

                          <!-- Drag Handle -->
                          <div cdkDragHandle class="sidebar-drag-handle sidebar-hover-reveal">
                            <svg class="w-3 h-4 text-slate-300" viewBox="0 0 6 10" fill="currentColor">
                              <circle cx="1.5" cy="1.5" r="1"/><circle cx="4.5" cy="1.5" r="1"/>
                              <circle cx="1.5" cy="5" r="1"/><circle cx="4.5" cy="5" r="1"/>
                              <circle cx="1.5" cy="8.5" r="1"/><circle cx="4.5" cy="8.5" r="1"/>
                            </svg>
                          </div>

                          <!-- Expand Arrow -->
                          <button (click)="toggleChapter(chapter.id); $event.stopPropagation()"
                                  class="sidebar-expand" [class.rotate-90]="isChapterExpanded(chapter.id)">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path>
                            </svg>
                          </button>

                          <!-- Title -->
                          <div class="flex-grow min-w-0 py-1.5 cursor-pointer"
                               (click)="toggleChapterSelection(chapter)">
                              @if (editingChapterId() === chapter.id) {
                                  <input [value]="editingValue"
                                         (input)="editingValue = $any($event.target).value"
                                         (blur)="confirmEditChapter(chapter.id)"
                                         (keydown)="onEditKeydown($event, 'chapter', chapter.id)"
                                         (click)="$event.stopPropagation()"
                                         class="w-full text-sm font-semibold text-slate-800 bg-white border border-[#0056D2] rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-[#0056D2]/30"
                                         #editInput>
                              } @else {
                                  <h4 class="text-[13px] font-semibold text-slate-800 leading-snug line-clamp-2 break-words"><span class="text-xs font-semibold text-[#0056D2]">{{ chapterLabel(chapterIdx) }}</span> · {{ getChapterDisplayTitle(chapter.title, chapterIdx) }}</h4>
                              }
                          </div>

                          <!-- Kebab -->
                          <div class="flex items-center flex-shrink-0" (click)="$event.stopPropagation()">
                            <div class="relative">
                              <button (click)="toggleMenu('chapter', chapter.id)"
                                      class="sidebar-kebab">
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
                                  <button (click)="requestAddLessonFromSidebar(chapter); closeMenu()"
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

                              <!-- Empty: no lessons in chapter -->
                              @if (chapter.lessons.length === 0) {
                                <button (click)="requestAddLessonFromSidebar(chapter)"
                                        class="flex items-center gap-2 w-full pl-8 pr-4 py-2.5 text-[12px] text-slate-400 hover:text-[#0056D2] hover:bg-slate-50 transition-colors text-left">
                                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                  </svg>
                                  Thêm bài học
                                </button>
                              }

                              @for (lesson of chapter.lessons; track lesson.id; let lessonIdx = $index) {
                                  <div class="relative group/ls"
                                       role="treeitem"
                                       cdkDrag [cdkDragData]="lesson"
                                       [cdkDragStartDelay]="isTouchDevice ? 150 : 0"
                                       (cdkDragStarted)="onLessonDragStart(lesson.id)">

                                      <!-- Drag Preview -->
                                      <div *cdkDragPreview class="bg-white shadow-lg rounded-lg px-4 py-2 border border-[#0056D2] text-xs font-medium text-slate-700 max-w-[260px] line-clamp-2 break-words">
                                        {{ lessonLabel(lessonIdx) }} · {{ getLessonDisplayTitle(lesson.title, lessonIdx) }}
                                      </div>
                                      <!-- Drag Placeholder (insertion line) -->
                                      <div *cdkDragPlaceholder class="h-0.5 bg-[#0056D2] rounded-full mx-2 my-1"></div>

                                      <!-- LESSON ROW -->
                                      <div class="sidebar-row sidebar-row--lesson group/ls"
                                           [class.sidebar-row--selected]="selectedLessonId() === lesson.id">

                                          <!-- Drag Handle -->
                                          <div cdkDragHandle class="sidebar-drag-handle sidebar-hover-reveal">
                                            <svg class="w-2.5 h-3.5 text-slate-300" viewBox="0 0 6 10" fill="currentColor">
                                              <circle cx="1.5" cy="1.5" r="1"/><circle cx="4.5" cy="1.5" r="1"/>
                                              <circle cx="1.5" cy="5" r="1"/><circle cx="4.5" cy="5" r="1"/>
                                              <circle cx="1.5" cy="8.5" r="1"/><circle cx="4.5" cy="8.5" r="1"/>
                                            </svg>
                                          </div>

                                          <!-- Expand Arrow -->
                                          <button (click)="toggleLesson(lesson.id); $event.stopPropagation()"
                                                  class="sidebar-expand sidebar-expand--sm" [class.rotate-90]="isLessonExpanded(lesson.id)">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path>
                                            </svg>
                                          </button>

                                          <!-- Title -->
                                          <div class="flex-grow min-w-0 py-1.5 cursor-pointer"
                                               (click)="toggleLessonSelection(chapter, lesson)">
                                            @if (editingLessonId() === lesson.id) {
                                                <input [value]="editingValue"
                                                       (input)="editingValue = $any($event.target).value"
                                                       (blur)="confirmEditLesson(lesson.id)"
                                                       (keydown)="onEditKeydown($event, 'lesson', lesson.id)"
                                                       (click)="$event.stopPropagation()"
                                                       class="w-full text-xs font-medium text-slate-700 bg-white border border-[#0056D2] rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-[#0056D2]/30"
                                                       #editInput>
                                            } @else {
                                                <p class="text-[13px] font-medium text-slate-600 leading-snug line-clamp-2 break-words group-hover/ls:text-slate-900"><span class="text-[11px] font-semibold text-[#0056D2]">{{ lessonLabel(lessonIdx) }}</span> {{ getLessonDisplayTitle(lesson.title, lessonIdx) }} <span class="inline-block w-1.5 h-1.5 rounded-full align-middle ml-1" [style.background]="getLessonReadinessColor(lesson)"></span></p>
                                            }
                                          </div>

                                          <!-- Kebab -->
                                          <div class="flex items-center flex-shrink-0" (click)="$event.stopPropagation()">
                                            <div class="relative">
                                              <button (click)="toggleMenu('lesson', lesson.id)"
                                                      class="sidebar-kebab">
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
                                                  <button (click)="selectLesson(chapter, lesson); closeMenu()"
                                                          class="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 text-[13px] text-slate-700 font-medium flex items-center gap-2.5">
                                                    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                                                    Mở vùng soạn chính
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

                                      <!-- SECTIONS (L3) — drag within lesson + cross-lesson via CDK connected drop lists
                                           (Notion blocks + Coursera Studio "Move To" patterns combined). -->
                                      @if (isLessonExpanded(lesson.id)) {
                                        <div class="sidebar-sections"
                                             [id]="sectionsDropListId(lesson.id)"
                                             cdkDropList
                                             cdkDropListLockAxis="y"
                                             [cdkDropListData]="lesson.sections"
                                             [cdkDropListConnectedTo]="otherExpandedSectionDropListIds(lesson.id)"
                                             (cdkDropListDropped)="dropSection($event, lesson.id)">
                                          @if (!lesson.sections.length) {
                                            <!-- Empty drop zone so user can drag a section IN to an empty lesson -->
                                            <p class="sidebar-sections__empty">Kéo mục vào đây để chuyển sang bài này</p>
                                          }
                                          @for (section of lesson.sections; track section.id; let secIdx = $index) {
                                            <div class="sidebar-section-row"
                                                 [class.sidebar-section-row--selected]="selectedSectionId() === section.id"
                                                 cdkDrag [cdkDragData]="section"
                                                 [cdkDragStartDelay]="isTouchDevice ? 150 : 0"
                                                 (click)="selectSection(chapter, lesson, section); $event.stopPropagation()"
                                                 [attr.role]="'button'"
                                                 [attr.tabindex]="0"
                                                 (keydown.enter)="selectSection(chapter, lesson, section); $event.stopPropagation()"
                                                 (keydown.space)="selectSection(chapter, lesson, section); $event.preventDefault(); $event.stopPropagation()">
                                              <div *cdkDragPreview class="bg-white shadow-lg rounded-md px-2 py-1 border border-[#0056D2] text-[11px] font-medium text-slate-700 max-w-[240px] line-clamp-1">
                                                {{ sectionLabel(secIdx) }} {{ getSectionDisplayTitle(section.title) }}
                                              </div>
                                              <div *cdkDragPlaceholder class="h-0.5 bg-[#0056D2] rounded-full mx-2 my-0.5"></div>
                                              <span cdkDragHandle class="sidebar-section-row__handle"
                                                    (click)="$event.stopPropagation()"
                                                    [attr.aria-label]="'Kéo để sắp xếp lại ' + getSectionDisplayTitle(section.title)">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
                                              </span>
                                              <span class="sidebar-section-row__num">{{ sectionLabel(secIdx) }}</span>
                                              <span class="sidebar-section-row__title">{{ getSectionDisplayTitle(section.title) }}</span>
                                              <span class="sidebar-section-row__type">{{ section.type === 'TEXT' ? 'văn bản' : section.type === 'VIDEO' ? 'video' : section.type === 'FILE' ? 'tệp' : section.type === 'QUIZ' ? 'trắc nghiệm' : section.type }}</span>
                                            </div>
                                          }
                                        </div>
                                      }
                                  </div>
                              }
                          </div>
                      }
                  </div>
              }
            }
        </div>

    </aside>

    <!-- Click-away overlay for menus -->
    @if (openMenuId()) {
      <div class="fixed inset-0 z-40" (click)="closeMenu()"></div>
    }

    <!-- Chapter Modal -->
    <app-dialog
      [open]="showChapterModal()"
      title="Tạo chương mới"
      size="sm"
      [busy]="isCreating()"
      (close)="closeModals()">
      <label class="sidebar-field-label">Tên chương</label>
      <input type="text" [(ngModel)]="newChapterTitle"
             (keydown.enter)="createChapter()"
             class="sidebar-field-input"
             placeholder="Nhập tên chương...">
      <div dialogFooter>
        <button type="button" (click)="closeModals()" class="sidebar-btn sidebar-btn--ghost">Hủy</button>
        <button type="button" (click)="createChapter()"
                [disabled]="isCreating()"
                class="sidebar-btn sidebar-btn--primary">
          @if (isCreating()) {
            <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          }
          Tạo chương
        </button>
      </div>
    </app-dialog>

    <!-- Move to Chapter Modal (Canvas "Move To" pattern - WCAG 2.5.7) -->
    <app-dialog
      [open]="showMoveToChapter()"
      title="Chuyển bài học sang chương khác"
      [subtitle]="moveToLessonTarget()?.title || ''"
      size="sm"
      (close)="closeMoveToChapter()">
      <label class="sidebar-field-label">Chọn chương đích</label>
      <div class="space-y-1.5 max-h-60 overflow-y-auto">
        @for (ch of store.chapters(); track ch.id) {
          @if (ch.id !== moveToFromChapterId()) {
            <button type="button" (click)="executeMoveToChapter(ch.id)"
                    class="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-[#0056D2] hover:bg-[#E8F0FE]/30 text-[13px] text-slate-700 font-medium transition-all flex items-center gap-2">
              <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
              <span class="line-clamp-2 break-words">{{ ch.title }}</span>
              <span class="text-[11px] text-slate-400 ml-auto flex-shrink-0">{{ ch.lessons.length }} bài</span>
            </button>
          }
        }
      </div>
      <div dialogFooter>
        <button type="button" (click)="closeMoveToChapter()" class="sidebar-btn sidebar-btn--ghost">Hủy</button>
      </div>
    </app-dialog>
  `
})

export class CourseEditorSidebarComponent implements OnDestroy {
  store = inject(CourseEditorStore);
  selectionService = inject(CurriculumSelectionService);
  private editorSvc = inject(CurriculumEditorService);
  private router = inject(Router);
  private chapterApi = inject(ChapterApi);
  private lessonApi = inject(LessonApi);
  private sectionApi = inject(SectionApi);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

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

  // Form data
  newChapterTitle = '';
  newChapterDescription = '';

  // Inline editing
  editingChapterId = signal<string | null>(null);
  editingLessonId = signal<string | null>(null);
  editingValue = '';

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

    // Title click = select only (show chapter editor).
    // Expand/collapse is handled separately by the chevron arrow.
    // Auto-expand if collapsed so lessons are visible after selecting.
    if (!this.isChapterExpanded(chapter.id)) {
      this.expandedChapters.update(set => {
        const next = new Set(set);
        next.add(chapter.id);
        return next;
      });
    }
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
    this.autoCollapseSidebarOnMobile();
  }

  async requestAddLessonFromSidebar(chapter: ChapterDraftDTO) {
    if (!(await this.canChangeSelection())) {
      return;
    }

    this.selectionService.selectChapter(chapter);
    this.navigateToCurriculum();
    this.editorSvc.pendingLessonCreateForChapter.set(chapter);
    this.autoCollapseSidebarOnMobile();
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
    this.autoCollapseSidebarOnMobile();
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

  // Collapse expanded content before drag to prevent CDK DOM duplication.
  // CDK clones the cdkDrag element (incl. children). If lessons are rendered
  // inside the chapter's cdkDrag, both the clone and re-rendered DOM show
  // lessons → duplicate. Collapsing removes children from the clone source.
  onChapterDragStart(chapterId: string) {
    this.expandedChapters.set(new Set());
    this.expandedLessons.set(new Set());
  }

  onLessonDragStart(lessonId: string) {
    this.expandedLessons.update(set => {
      const next = new Set(set);
      next.delete(lessonId);
      return next;
    });
  }

  dropChapter(event: CdkDragDrop<ChapterDraftDTO[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const chapters = [...this.store.chapters()];
    moveItemInArray(chapters, event.previousIndex, event.currentIndex);
    const courseId = this.store.courseTree()?.id;
    if (courseId) {
      // Collapse all first, reorder, then restore the moved chapter as expanded
      const movedChapterId = chapters[event.currentIndex]?.id;
      this.expandedChapters.set(new Set());
      this.expandedLessons.set(new Set());
      requestAnimationFrame(() => {
        this.store.reorderChapters(courseId, chapters.map(c => c.id));
        // Re-expand the moved chapter after store updates
        if (movedChapterId) {
          requestAnimationFrame(() => {
            this.expandedChapters.set(new Set([movedChapterId]));
          });
        }
      });
    }
  }

  dropLesson(event: CdkDragDrop<LessonDraftDTO[]>, chapterId: string) {
    if (event.previousIndex === event.currentIndex) return;
    const chapter = this.store.chapters().find(c => c.id === chapterId);
    if (!chapter) return;
    const lessons = [...chapter.lessons];
    moveItemInArray(lessons, event.previousIndex, event.currentIndex);
    // Collapse lessons to prevent CDK duplicate during reorder
    this.expandedLessons.set(new Set());
    requestAnimationFrame(() => {
      this.store.reorderLessonsOptimistic(chapterId, lessons.map(l => l.id));
    });
  }

  /**
   * Drop handler for sidebar sections. Routes to:
   * - within-lesson reorder when both containers match (existing behavior)
   * - cross-lesson move when the drop target is a different lesson's drop list
   *   (CDK connected drop lists — IDs encoded by `sectionsDropListId`)
   */
  dropSection(event: CdkDragDrop<SectionDraftDTO[]>, lessonId: string) {
    const sameContainer = event.previousContainer === event.container;

    if (sameContainer) {
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
      return;
    }

    // Cross-lesson move
    const fromLessonId = this.parseLessonIdFromDropListId(event.previousContainer.id);
    const sectionId = (event.item.data as SectionDraftDTO | undefined)?.id;
    if (!fromLessonId || !sectionId || fromLessonId === lessonId) return;
    const targetIndex = event.currentIndex;
    requestAnimationFrame(() => {
      this.store.moveSectionToLessonOptimistic(sectionId, fromLessonId, lessonId, targetIndex);
    });
  }

  sectionsDropListId(lessonId: string): string {
    return 'sidebar-sections-' + lessonId;
  }

  /**
   * Drop list IDs for all OTHER lessons currently expanded in the sidebar.
   * Collapsed lessons aren't connectable because their drop list isn't rendered —
   * teacher must expand the target lesson first to drop into it.
   */
  otherExpandedSectionDropListIds(currentLessonId: string): string[] {
    const ids: string[] = [];
    for (const chapter of this.store.chapters()) {
      for (const lesson of chapter.lessons) {
        if (lesson.id === currentLessonId) continue;
        if (!this.isLessonExpanded(lesson.id)) continue;
        ids.push(this.sectionsDropListId(lesson.id));
      }
    }
    return ids;
  }

  private parseLessonIdFromDropListId(dropListId: string | null | undefined): string | null {
    if (!dropListId || !dropListId.startsWith('sidebar-sections-')) return null;
    return dropListId.slice('sidebar-sections-'.length);
  }

  // --- Modal handlers ---
  showAddChapterModal() {
    this.newChapterTitle = '';
    this.newChapterDescription = '';
    this.showChapterModal.set(true);
  }

  closeModals() {
    this.showChapterModal.set(false);
  }

  createChapter() {
    const courseId = this.store.courseTree()?.id;
    if (!courseId || !this.newChapterTitle.trim()) return;
    this.isCreating.set(true);

    this.chapterApi.createChapter(courseId, {
      title: this.newChapterTitle.trim(),
      description: this.newChapterDescription.trim(),
      orderIndex: this.store.chapters().length
    }).subscribe({
      next: (res: any) => {
        const created = res?.data || res;
        const chapterId = typeof created === 'string' ? created : created?.id;
        if (chapterId) {
          this.store.addChapterLocal({
            id: chapterId,
            title: (typeof created === 'object' ? created?.title : null) || this.newChapterTitle.trim(),
            description: (typeof created === 'object' ? created?.description : null) || this.newChapterDescription.trim(),
            orderIndex: (typeof created === 'object' ? created?.orderIndex : null) ?? this.store.chapters().length,
            lessons: []
          });
        } else {
          this.store.invalidateCache(courseId);
          this.store.loadCourse(courseId, true);
        }
        this.closeModals();
        this.toast.success('Đã tạo chương mới');
        this.isCreating.set(false);
      },
      error: (err: any) => {
        this.toast.error('Tạo chương thất bại: ' + (err?.error?.message || ''));
        this.isCreating.set(false);
      }
    });
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
        this.store.removeChapterLocal(chapterId);
        this.toast.success('Đã xóa chương');
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
        this.store.removeLessonLocal(lessonId);
        this.toast.success('Đã xóa bài học');
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
        this.store.removeSectionLocal(lessonId, sectionId);
        this.toast.success('Đã xóa nội dung');
      },
      error: (err: any) => this.toast.error('Xóa nội dung thất bại: ' + (err?.error?.message || ''))
    });
  }
  chapterLabel(index: number): string {
    return buildCurriculumLabel('chapter', index);
  }

  lessonLabel(index: number): string {
    return buildCurriculumLabel('lesson', index);
  }

  sectionLabel(index: number): string {
    return buildCurriculumLabel('section', index);
  }

  // Helper to strip chapter prefix if already present in title
  getChapterDisplayTitle(title: string, _index: number): string {
    return stripCurriculumPrefix(title, 'chapter');
  }

  // Helper to strip section prefix (e.g. "1.2: ", "2.1: ", "2.1:") from title
  getSectionDisplayTitle(title: string): string {
    return stripCurriculumPrefix(title, 'section');
  }

  // Helper to strip lesson prefix if already present in title
  getLessonDisplayTitle(title: string, _index: number): string {
    return stripCurriculumPrefix(title, 'lesson');
  }

  private autoCollapseSidebarOnMobile(): void {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.store.sidebarCollapsed.set(true);
    }
  }

  getLessonReadinessColor(lesson: LessonDraftDTO): string {
    const state = getLessonReadinessState(lesson);
    switch (state) {
      case 'ready': return 'rgb(16 185 129)';
      case 'draft': return 'rgb(245 158 11)';
      default: return 'rgb(203 213 225)';
    }
  }

  ngOnDestroy() {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
  }

  // --- Keyboard & Resize ---
  @HostListener('window:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent) {
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
      next: () => {
        this.store.updateChapterLocal(chapterId, { title: trimmed });
        this.store.invalidateCache(courseId);
      },
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
      next: () => {
        this.store.updateLessonLocal(chapterId, lessonId, { title: trimmed });
        this.store.invalidateCache(courseId);
      },
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
        this.store.moveLessonToChapter(lesson.id, fromChapterId, toChapterId);
        this.store.invalidateCache(courseId);
        this.expandedChapters.update(set => new Set([...set, toChapterId]));
        this.toast.success('Đã chuyển bài học sang chương khác');
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
