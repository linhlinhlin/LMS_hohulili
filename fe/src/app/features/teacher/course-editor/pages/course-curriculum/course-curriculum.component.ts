import { Component, inject, signal, computed, effect, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CourseEditorStore } from '../../store/course-editor.store';
import { LessonDraftDTO, SectionDraftDTO } from '../../services/course-authoring.service';
import { CurriculumSelectionService } from '../../services/curriculum-selection.service';
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

@Component({
  selector: 'app-course-curriculum',
  standalone: true,
  imports: [CommonModule, FormsModule, CKEditorModule],
  styleUrl: './course-curriculum.component.scss',
  // encapsulation: ViewEncapsulation.None, // Optimization: Removed per expert advice
  template: `
    <div class="h-full">
      <!-- Empty State -->
      @if (!selectedChapterId() && !selectedLessonId()) {
        <div class="bg-white shadow-sm border border-gray-200 h-full flex items-center justify-center">
          <div class="text-center p-8">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Chọn nội dung để chỉnh sửa</h3>
            <p class="text-gray-500 text-sm">Chọn một chương hoặc bài học từ sidebar bên trái</p>
          </div>
        </div>
      }

      <!-- Chapter Editor -->
      @if (selectedChapterId() && !selectedLessonId()) {
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto h-full">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Chỉnh sửa chương</h2>
              <p class="text-sm text-gray-500">Cập nhật thông tin chương</p>
            </div>
          </div>
          <div class="p-6 space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tên chương <span class="text-red-500">*</span></label>
              <input type="text" [(ngModel)]="chapterTitle" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
              <textarea [(ngModel)]="chapterDescription" rows="3" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"></textarea>
            </div>
            <div class="border-t border-gray-200 pt-6">
              <h3 class="font-medium text-gray-900 mb-4">Bài học ({{ selectedChapterLessons().length }})</h3>
              @if (selectedChapterLessons().length > 0) {
                <div class="space-y-2">
                  @for (lesson of selectedChapterLessons(); track lesson.id; let i = $index) {
                    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer" (click)="selectLessonFromChapter(lesson)">
                      <span class="text-sm text-gray-500 w-6">{{ i + 1 }}.</span>
                      <span class="text-sm text-gray-900 flex-1">{{ lesson.title }}</span>
                      <span class="text-xs px-2 py-0.5 rounded-full" [class.bg-blue-100]="getLessonType(lesson) === 'LECTURE'" [class.text-blue-700]="getLessonType(lesson) === 'LECTURE'" [class.bg-purple-100]="getLessonType(lesson) === 'QUIZ'" [class.text-purple-700]="getLessonType(lesson) === 'QUIZ'" [class.bg-green-100]="getLessonType(lesson) === 'ASSIGNMENT'" [class.text-green-700]="getLessonType(lesson) === 'ASSIGNMENT'">
                        {{ getLessonTypeLabel(getLessonType(lesson)) }}
                      </span>
                    </div>
                  }
                </div>
              } @else {
                <div class="text-center py-8 bg-gray-50 rounded-lg"><p class="text-gray-500 text-sm">Chưa có bài học</p></div>
              }
            </div>
          </div>
          <div class="px-6 py-4 border-t border-gray-200 flex justify-end flex-shrink-0">
            <button (click)="saveChapter()" [disabled]="isSaving()" class="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              @if (isSaving()) { <span class="animate-spin">⏳</span> }
              Lưu thay đổi
            </button>
          </div>
        </div>
      }

      <!-- Section Editor (Level 3) -->
      @if (selectedSectionId()) {
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto h-full">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
             <div class="flex items-center gap-3">
               <!-- Icon based on type -->
               <div class="w-10 h-10 rounded-lg flex items-center justify-center" 
                    [class.bg-blue-100]="newSectionType === 'VIDEO'" 
                    [class.bg-gray-100]="newSectionType === 'TEXT'"
                    [class.bg-purple-100]="newSectionType === 'QUIZ'">
                 @if (newSectionType === 'VIDEO') {
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>
                 } @else if (newSectionType === 'QUIZ') {
                    <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 } @else {
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                 }
               </div>
               <div>
                 <h2 class="text-lg font-semibold text-gray-900">
                    {{ newSectionType === 'TEXT' ? 'Văn bản' : newSectionType === 'VIDEO' ? 'Video' : 'Trắc nghiệm' }}
                 </h2>
                 <p class="text-sm text-gray-500">{{ sectionTitle || 'Chưa có tiêu đề' }}</p>
               </div>
             </div>
          </div>

          <div class="p-6 space-y-6">
             <!-- Reuse Form Logic -->
             <div>
               <label class="block text-sm font-medium text-gray-700 mb-2">Tiêu đề Section <span class="text-red-500">*</span></label>
               <input type="text" [(ngModel)]="sectionTitle" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
             </div>

             <div class="flex items-center gap-2">
                <input type="checkbox" [(ngModel)]="sectionIsRequired" id="reqSec" class="rounded text-blue-600 focus:ring-blue-500 w-4 h-4">
                <label for="reqSec" class="text-sm text-gray-700 font-medium select-none cursor-pointer">Bắt buộc hoàn thành (Học viên phải xem nội dung này)</label>
             </div>

             @if (newSectionType === 'VIDEO') {
               <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Video URL <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="sectionVideoUrl" 
                         (blur)="updateVideoPreview(sectionVideoUrl)"
                         (keydown.enter)="updateVideoPreview(sectionVideoUrl); $event.preventDefault()"
                         class="w-full px-4 py-2.5 border border-gray-300 rounded-lg" placeholder="https://youtube.com/...">
                  @if (safeVideoUrl()) {
                      <div class="mt-2 aspect-video bg-black rounded-lg overflow-hidden">
                          <iframe class="w-full h-full" [src]="safeVideoUrl()" frameborder="0" allowfullscreen></iframe>
                      </div>
                  }
               </div>
             }

             @if (newSectionType === 'TEXT') {
               <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nội dung</label>
                  <div class="editor-container-wrapper border border-gray-300 rounded-lg bg-white relative shadow-sm" [style.height.px]="editorHeight()">
                      <ckeditor [editor]="Editor" [(ngModel)]="sectionContent" 
                                [config]="editorConfig" (ready)="onEditorReady($event)"
                                (change)="onEditorChange($event)">
                      </ckeditor>
                  </div>
               </div>
             }
          </div>

          <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0 bg-gray-50">
             <button (click)="editingSectionId() && deleteSection(editingSectionId()!)" 
                     class="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mr-auto">
                Xóa
             </button>

             <button (click)="saveSection()" [disabled]="isSaving() || !sectionTitle.trim()" class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
               @if (isSaving()) { <span class="animate-spin">⏳</span> }
               Lưu thay đổi
             </button>
          </div>
        </div>
      }

      <!-- Lesson Editor -->
      @if (selectedLessonId() && !selectedSectionId()) {
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto h-full">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center" [class.bg-blue-100]="getLessonType(selectedLesson()) === 'LECTURE'" [class.bg-purple-100]="getLessonType(selectedLesson()) === 'QUIZ'" [class.bg-green-100]="getLessonType(selectedLesson()) === 'ASSIGNMENT'">
                <svg class="w-5 h-5" [class.text-blue-600]="getLessonType(selectedLesson()) === 'LECTURE'" [class.text-purple-600]="getLessonType(selectedLesson()) === 'QUIZ'" [class.text-green-600]="getLessonType(selectedLesson()) === 'ASSIGNMENT'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                </svg>
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900">{{ getLessonTypeLabel(getLessonType(selectedLesson())) }}</h2>
                <p class="text-sm text-gray-500">{{ selectedLesson()?.title }}</p>
              </div>
            </div>
          </div>

          <div class="p-6 space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tiêu đề <span class="text-red-500">*</span></label>
              <input type="text" [(ngModel)]="lessonTitle" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>

            <!-- LECTURE fields (Refactored for Level 3 Topics) -->
            @if (getLessonType(selectedLesson()) === 'LECTURE') {
              <div class="space-y-6">
                <!-- Topic List -->
                <div class="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="font-medium text-gray-900">Nội dung bài học ({{ selectedLesson()?.sections?.length || 0 }} sections)</h3>
                    <div class="flex gap-2">
                       <!-- Buttons removed as per user request -->
                    </div>
                  </div>
                  
                  @if (selectedLesson()?.sections?.length === 0) {
                     <div class="text-center py-6 text-gray-500 text-sm italic">
                        Chưa có nội dung. Hãy thêm Text hoặc Video.
                     </div>
                  } @else {
                     <div class="space-y-2" cdkDropList (cdkDropListDropped)="dropSection($event)">
                        @for (section of selectedLesson()?.sections; track section.id) {
                           <div class="bg-white p-3 rounded-lg border border-gray-200 flex items-center gap-3 cursor-pointer hover:border-blue-300 transition-all group"
                                (click)="editSection(section)" cdkDrag>
                              <div class="text-gray-400 cursor-move" cdkDragHandle>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path></svg>
                              </div>
                              <div class="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" [class.bg-blue-100]="section.type === 'VIDEO'" [class.bg-gray-100]="section.type === 'TEXT'">
                                 @if (section.type === 'VIDEO') {
                                   <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>
                                 } @else {
                                   <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                 }
                              </div>
                              <div class="flex-1">
                                 <h4 class="text-sm font-medium text-gray-900">{{ section.title }}</h4>
                                 <p class="text-xs text-gray-500 truncate max-w-md">{{ section.content || section.videoUrl || 'No content' }}</p>
                              </div>
                              <button (click)="deleteSection(section.id); $event.stopPropagation()" class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 rounded">
                                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                              </button>
                           </div>
                        }
                     </div>
                  }
                </div>
              </div>
            }

            <!-- QUIZ fields -->
            @if (getLessonType(selectedLesson()) === 'QUIZ') {
              <div class="flex flex-col gap-6 animate-fade-in">
                
                <!-- SECTION 1: CẤU HÌNH LUẬT THI (SETTINGS) -->
                <div>
                  <h4 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg class="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Thiết lập chung
                  </h4>
                  
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- Time Limit -->
                    <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-purple-300 transition-colors group">
                      <div class="flex justify-between items-start mb-2">
                        <label class="text-xs font-semibold text-gray-500 uppercase">Thời gian làm bài</label>
                        <span class="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                      </div>
                      <div class="flex items-baseline gap-2">
                        <input type="number" [(ngModel)]="quizTimeLimit" min="1"
                               class="flex-1 text-2xl font-bold text-gray-900 border-none p-0 focus:ring-0 placeholder-gray-300 w-full"
                               placeholder="0">
                        <span class="text-sm text-gray-500 font-medium">phút</span>
                      </div>
                    </div>

                    <!-- Passing Score -->
                    <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-purple-300 transition-colors group">
                      <div class="flex justify-between items-start mb-2">
                        <label class="text-xs font-semibold text-gray-500 uppercase">Điểm đạt tối thiểu</label>
                        <span class="p-1.5 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition-colors">
                          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                      </div>
                      <div class="flex items-baseline gap-2">
                        <input type="number" [(ngModel)]="quizPassingScore" min="0" max="100"
                               class="flex-1 text-2xl font-bold text-gray-900 border-none p-0 focus:ring-0 placeholder-gray-300 w-full"
                               placeholder="0">
                        <span class="text-sm text-gray-500 font-medium">%</span>
                      </div>
                    </div>

                    <!-- Max Attempts -->
                    <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-purple-300 transition-colors group">
                      <div class="flex justify-between items-start mb-2">
                        <label class="text-xs font-semibold text-gray-500 uppercase">Số lần làm lại</label>
                        <span class="p-1.5 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-100 transition-colors">
                          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </span>
                      </div>
                      <div class="flex items-baseline gap-2">
                        <input type="number" [(ngModel)]="quizMaxAttempts" min="1"
                               class="flex-1 text-2xl font-bold text-gray-900 border-none p-0 focus:ring-0 placeholder-gray-300 w-full"
                               placeholder="∞">
                        <span class="text-sm text-gray-500 font-medium">lần</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- SECTION 2: QUẢN LÝ CÂU HỎI (QUESTIONS MANAGER) -->
                <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
                  
                  <!-- TOOLBAR: Header chứa Actions -->
                  <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div>
                      <h4 class="text-base font-bold text-gray-800 flex items-center gap-2">
                        Danh sách câu hỏi
                        <span class="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
                          {{ quizQuestions().length }}
                        </span>
                      </h4>
                      <p class="text-xs text-gray-500 mt-0.5">Quản lý các câu hỏi cho bài kiểm tra này</p>
                    </div>

                    <div class="flex items-center gap-2">
                      <!-- NÚT RANDOM MỚI -->
                      <button (click)="openRandomizeModal()" 
                              class="group flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:border-purple-400 hover:text-purple-700 hover:bg-purple-50 transition-all shadow-sm">
                        <svg class="w-4 h-4 text-gray-400 group-hover:text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        <span>Tạo ngẫu nhiên</span>
                      </button>

                      <!-- NÚT THÊM THỦ CÔNG -->
                      <button (click)="showAddQuestionsModal.set(true)" 
                              class="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 shadow-md shadow-purple-200 transition-all active:scale-95">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Chọn từ ngân hàng</span>
                      </button>
                    </div>
                  </div>

                  <!-- QUESTION LIST AREA -->
                  <div class="flex-1 overflow-y-auto bg-gray-50/50 p-2 relative">
                    @if (quizQuestionsLoading()) {
                      <div class="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                        <div class="flex flex-col items-center gap-3">
                          <div class="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
                          <span class="text-sm text-gray-500 font-medium">Đang tải dữ liệu...</span>
                        </div>
                      </div>
                    } 
                    
                    @if (quizQuestions().length === 0) {
                      <!-- Empty State -->
                      <div class="h-full flex flex-col items-center justify-center text-center p-8">
                        <div class="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                          <svg class="w-10 h-10 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        </div>
                        <h5 class="text-gray-900 font-medium mb-1">Chưa có câu hỏi nào</h5>
                        <p class="text-gray-500 text-sm max-w-xs mb-6">Bắt đầu bằng cách chọn câu hỏi từ ngân hàng hoặc tạo danh sách ngẫu nhiên.</p>
                        <div class="flex gap-3">
                           <button (click)="openRandomizeModal()" class="text-purple-600 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                             Thêm ngẫu nhiên
                           </button>
                           <button (click)="showAddQuestionsModal.set(true)" class="text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                             Thêm thủ công
                           </button>
                        </div>
                      </div>
                    } @else {
                      <!-- List Items -->
                      <div class="space-y-2">
                        @for (q of quizQuestions(); track q.id; let i = $index) {
                          <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group flex items-start gap-4">
                            <!-- Question Number -->
                            <div class="flex flex-col items-center gap-1 min-w-[32px]">
                               <span class="w-8 h-8 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center text-sm font-bold group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                 {{ i + 1 }}
                               </span>
                            </div>

                            <!-- Content -->
                            <div class="flex-1 min-w-0 pt-1">
                              <div class="flex items-center gap-2 mb-1.5">
                                <!-- Difficulty Badge -->
                                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border"
                                      [class.bg-green-50]="q.difficulty === 'EASY'" 
                                      [class.text-green-700]="q.difficulty === 'EASY'"
                                      [class.border-green-200]="q.difficulty === 'EASY'"
                                      [class.bg-yellow-50]="q.difficulty === 'MEDIUM'" 
                                      [class.text-yellow-700]="q.difficulty === 'MEDIUM'"
                                      [class.border-yellow-200]="q.difficulty === 'MEDIUM'"
                                      [class.bg-red-50]="q.difficulty === 'HARD'" 
                                      [class.text-red-700]="q.difficulty === 'HARD'"
                                      [class.border-red-200]="q.difficulty === 'HARD'">
                                  {{ q.difficulty === 'EASY' ? 'Dễ' : q.difficulty === 'MEDIUM' ? 'Trung bình' : 'Khó' }}
                                </span>
                                <!-- Type Badge (Optional) -->
                                <span class="text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 rounded border border-gray-100">
                                   TRẮC NGHIỆM
                                </span>
                              </div>
                              <p class="text-sm text-gray-800 font-medium line-clamp-2 leading-relaxed group-hover:text-purple-900 transition-colors">
                                {{ q.content }}
                              </p>
                            </div>

                            <!-- Action -->
                            <div class="flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button (click)="removeQuestionFromQuiz(q.id)" 
                                      class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                      title="Xóa khỏi bài thi">
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                  
                  <!-- List Footer -->
                  <div class="bg-gray-50 px-4 py-2 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
                    <span>Tổng thời gian dự kiến: {{ quizQuestions().length * 1.5 }} phút (tham khảo)</span>
                    <button (click)="loadQuizQuestions()" class="hover:text-purple-700 flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Làm mới danh sách
                    </button>
                  </div>
                </div>
              </div>
            }

            <!-- ASSIGNMENT fields -->
            @if (getLessonType(selectedLesson()) === 'ASSIGNMENT') {
              <div class="space-y-4">
                <div class="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 class="font-medium text-green-900 mb-3">Thông tin bài tập</h4>
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-green-700 mb-1">Mô tả</label>
                      <textarea [(ngModel)]="assignmentDescription" rows="3" class="w-full px-3 py-2 border border-green-200 rounded-lg bg-white resize-none"></textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block text-sm font-medium text-green-700 mb-1">Hạn nộp</label>
                        <input type="datetime-local" [(ngModel)]="assignmentDueDate" class="w-full px-3 py-2 border border-green-200 rounded-lg bg-white">
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-green-700 mb-1">Điểm tối đa</label>
                        <input type="number" [(ngModel)]="assignmentMaxScore" class="w-full px-3 py-2 border border-green-200 rounded-lg bg-white">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          <div class="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
            <button (click)="clearSelection()" class="text-gray-600 hover:text-gray-800 text-sm">← Quay lại</button>
            <button (click)="saveLesson()" [disabled]="isSaving()" class="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              @if (isSaving()) { <span class="animate-spin">⏳</span> }
              Lưu thay đổi
            </button>
          </div>
        </div>
      }
    </div>

    <!-- Random Modal -->
    <!-- Random Modal -->
    @if (showRandomModal()) {
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
        <div class="p-5 border-b border-gray-100">
          <h3 class="text-lg font-bold text-gray-900">Tạo câu hỏi ngẫu nhiên</h3>
          <p class="text-sm text-gray-500 mt-1">Chọn gói câu hỏi và số lượng cần lấy.</p>
        </div>
        
        <div class="p-5 space-y-4">
          <!-- Select Package -->
          <div>
             <label class="block text-sm font-medium text-gray-700 mb-1">Nguồn câu hỏi</label>
             <select [(ngModel)]="selectedPackageId" (change)="onRandomPackageChange()" class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500">
                <option value="">-- Chọn gói câu hỏi --</option>
                @for (pkg of quizPackages(); track pkg.id) {
                  <option [value]="pkg.id">{{ pkg.name }} ({{ pkg.questionCount || 0 }} câu)</option>
                }
             </select>
          </div>

          <!-- Quantity -->
          <div [class.opacity-50]="!selectedPackageId" [class.pointer-events-none]="!selectedPackageId">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Số lượng câu hỏi 
              @if(selectedPackageId) {
                <span class="text-xs font-normal text-gray-500">(Tối đa: {{ getSelectedPackageCount() }})</span>
              }
            </label>
            <div class="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500">
               <button class="px-3 py-2 bg-gray-50 hover:bg-gray-100 border-r" (click)="updateRandomCount(-1)">-</button>
               <input type="number" [ngModel]="randomCount()" (ngModelChange)="validateRandomCount($event)" class="w-full text-center border-none focus:ring-0 p-2">
               <button class="px-3 py-2 bg-gray-50 hover:bg-gray-100 border-l" (click)="updateRandomCount(1)">+</button>
            </div>
          </div>
          
          <!-- Option nâng cao (nếu cần) -->
          <div class="flex gap-2">
             <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" class="rounded text-purple-600 focus:ring-purple-500">
                <span>Ưu tiên câu hỏi chưa từng sử dụng</span>
             </label>
          </div>
        </div>

        <div class="p-4 bg-gray-50 flex justify-end gap-3">
          <button (click)="showRandomModal.set(false)" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Hủy bỏ
          </button>
          <button (click)="generateRandomQuestions()" [disabled]="!selectedPackageId || quizQuestionsLoading()" 
                  class="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            @if (quizQuestionsLoading()) { <span class="animate-spin text-white">⏳</span> }
            Tạo ngay
          </button>
        </div>
      </div>
    </div>
    }

    <!-- Add Questions Modal -->
    @if (showAddQuestionsModal()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showAddQuestionsModal.set(false)">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" (click)="$event.stopPropagation()">
          <div class="p-5 border-b border-gray-200 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">Thêm câu hỏi từ ngân hàng</h3>
            <button (click)="showAddQuestionsModal.set(false)" class="p-1 text-gray-400 hover:text-gray-600 rounded">✕</button>
          </div>
          <div class="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Chọn gói câu hỏi</label>
              <select [(ngModel)]="selectedPackageId" (change)="loadPackageQuestions()" class="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white">
                <option value="">-- Chọn gói câu hỏi --</option>
                @for (pkg of quizPackages(); track pkg.id) {
                  <option [value]="pkg.id">{{ pkg.name }} ({{ pkg.questionCount || 0 }} câu)</option>
                }
              </select>
            </div>
            @if (packageQuestions().length > 0) {
              <div class="border border-gray-200 rounded-lg overflow-hidden">
                <div class="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                  <span class="text-sm font-medium">Danh sách câu hỏi</span>
                  <div class="flex items-center gap-2">
                    <button (click)="selectAllQuestions()" class="text-xs text-blue-600">Chọn tất cả</button>
                    <button (click)="clearQuestionSelection()" class="text-xs text-gray-600">Bỏ chọn</button>
                  </div>
                </div>
                <div class="max-h-64 overflow-y-auto p-3 space-y-2">
                  @for (q of packageQuestions(); track q.id) {
                    <label class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer" [class.border-purple-500]="selectedQuestionIds().has(q.id)" [class.bg-purple-50]="selectedQuestionIds().has(q.id)">
                      <input type="checkbox" [checked]="selectedQuestionIds().has(q.id)" (change)="toggleQuestionSelection(q.id)" class="mt-1 h-4 w-4 text-purple-600 rounded">
                      <div class="flex-1"><p class="text-sm text-gray-900">{{ q.content }}</p></div>
                    </label>
                  }
                </div>
              </div>
            }
          </div>
          <div class="p-5 border-t border-gray-200 flex justify-end gap-3">
            <button (click)="showAddQuestionsModal.set(false)" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Hủy</button>
            <button (click)="addSelectedQuestionsToQuiz()" [disabled]="selectedQuestionIds().size === 0" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
              Thêm {{ selectedQuestionIds().size }} câu hỏi
            </button>
          </div>
        </div>
      </div>
    }
    <!-- Section Editor Modal (Level 3) -->
    @if (showSectionModal()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto" (click)="showSectionModal.set(false)">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 my-8 flex flex-col max-h-[90vh]" (click)="$event.stopPropagation()">
          <div class="p-5 border-b border-gray-200 flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">{{ editingSectionId() ? 'Chỉnh sửa Section' : 'Thêm Section Mới' }}</h3>
            <button (click)="showSectionModal.set(false)" class="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div class="p-6 space-y-6 overflow-y-auto">
             <div>
               <label class="block text-sm font-medium text-gray-700 mb-2">Tiêu đề Section <span class="text-red-500">*</span></label>
               <input type="text" [(ngModel)]="sectionTitle" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
             </div>

             <div class="flex items-center gap-2">
                <input type="checkbox" [(ngModel)]="sectionIsRequired" id="reqSec" class="rounded text-blue-600 focus:ring-blue-500 w-4 h-4">
                <label for="reqSec" class="text-sm text-gray-700 font-medium select-none cursor-pointer">Bắt buộc hoàn thành (Học viên phải xem nội dung này)</label>
             </div>

             @if (newSectionType === 'VIDEO') {
               <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Video URL <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="sectionVideoUrl" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg" placeholder="https://youtube.com/...">
                  @if (sectionVideoUrl) {
                      <div class="mt-2 aspect-video bg-black rounded-lg overflow-hidden">
                          <iframe class="w-full h-full" [src]="getSafeUrl(sectionVideoUrl)" frameborder="0" allowfullscreen></iframe>
                      </div>
                  }
               </div>
             }

             @if (newSectionType === 'TEXT') {
               <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nội dung</label>
                  <div class="editor-container-wrapper border border-gray-300 rounded-lg bg-white relative shadow-sm" [style.height.px]="editorHeight()">
                      <ckeditor [editor]="Editor" [(ngModel)]="sectionContent" 
                                [config]="editorConfig" (ready)="onEditorReady($event)"
                                (change)="onEditorChange($event)">
                      </ckeditor>
                      <!-- Word count similar to previous -->
                      <div class="absolute bottom-0 left-0 right-0 h-8 bg-gray-50 border-t border-gray-200 flex items-center justify-between px-4 text-xs text-gray-500 z-10 select-none">
                         <span class="font-medium">{{ wordCount() }} từ</span>
                      </div>
                      <div class="absolute bottom-0 right-0 w-6 h-6 cursor-ns-resize flex items-center justify-center hover:bg-gray-200 z-20 rounded-br-lg"
                           (mousedown)="startResize($event)">
                        <svg class="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z"/></svg>
                      </div>
                  </div>
               </div>
             }
          </div>
          <div class="p-5 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
            <button (click)="showSectionModal.set(false)" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Hủy</button>
            <button (click)="saveSection()" [disabled]="isSaving() || !sectionTitle.trim()" class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              @if (isSaving()) { <span class="animate-spin">⏳</span> }
              {{ editingSectionId() ? 'Cập nhật' : 'Tạo mới' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CourseCurriculumComponent {
  readonly store = inject(CourseEditorStore);
  readonly selectionService = inject(CurriculumSelectionService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private lessonApi = inject(LessonApi);
  private chapterApi = inject(ChapterApi);
  private sectionApi = inject(SectionApi);
  private quizApi = inject(QuizApi);
  private packageApi = inject(PackageApi);
  private sanitizer = inject(DomSanitizer);

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

    // Cấu hình Toolbar (Thứ tự nút bấm)
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
      shouldNotGroupWhenFull: true // Tự động gom nhóm nếu màn hình nhỏ
    },

    // Cấu hình Font (Đưa Arial lên đầu để làm mặc định)
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

    // Cấu hình Ảnh (Thanh công cụ khi click vào ảnh)
    image: {
      toolbar: [
        'imageTextAlternative', // Alt text
        'toggleImageCaption',   // Chú thích
        '|',
        'imageStyle:inline',    // Căn dòng
        'imageStyle:block',     // Xuống dòng
        'imageStyle:side',      // Đẩy sang bên
        '|',
        'resizeImage'           // Kéo giãn ảnh
      ]
    },

    // Cấu hình Bảng
    table: {
      contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells']
    },

    // Placeholder hướng dẫn
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

  // Selection signals
  selectedChapterId = this.selectionService.selectedChapterId;
  selectedLessonId = this.selectionService.selectedLessonId;
  selectedLesson = this.selectionService.selectedLesson;
  selectedSectionId = this.selectionService.selectedSectionId; // [NEW]
  selectedSection = this.selectionService.selectedSection; // [NEW]

  // Section Logic (L3)
  editingSectionId = signal<string | null>(null);
  showSectionModal = signal(false);
  newSectionType: 'TEXT' | 'VIDEO' | 'QUIZ' = 'TEXT';

  // Section Form
  sectionTitle = '';
  sectionContent = '';
  sectionVideoUrl = '';
  sectionIsRequired = false;
  safeVideoUrl = signal<SafeResourceUrl | null>(null); // [NEW]

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
        this.editingSectionId.set(section.id);
        this.sectionTitle = section.title;
        this.newSectionType = (section.type as any) || 'TEXT';
        this.sectionContent = section.content || '';
        this.sectionVideoUrl = section.videoUrl || '';
        this.sectionIsRequired = (section as any).isRequired || false;
        this.updateVideoPreview(this.sectionVideoUrl); // [NEW] Init preview
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
  }

  // Optimisation: Helper method mainly for internal use or simple checks, but template uses signal
  getWordCount(): number {
    if (!this.editorInstance) return 0;
    const data = this.editorInstance.getData();
    const plainText = data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return plainText ? plainText.split(' ').length : 0;
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
      error: () => this.isLoadingLesson.set(false)
    });
  }

  // YouTube helpers
  isYouTubeUrl(url: string): boolean {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  getYouTubeEmbedUrl(): SafeResourceUrl {
    const videoId = this.extractYouTubeId(this.lessonVideoUrl);
    if (videoId) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`);
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl('');
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

  // Save methods
  async saveChapter() {
    const chapterId = this.selectedChapterId();
    if (!chapterId || !this.chapterTitle.trim()) return;

    this.isSaving.set(true);
    try {
      await firstValueFrom(this.chapterApi.updateChapter(chapterId, {
        title: this.chapterTitle.trim(),
        description: this.chapterDescription.trim()
      }));
      const courseId = this.store.courseTree()?.id;
      if (courseId) this.store.loadCourse(courseId);
    } catch (error) {
      console.error('Error saving chapter:', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  async saveLesson() {
    const lesson = this.selectedLesson();
    if (!lesson || !this.lessonTitle.trim()) return;

    this.isSaving.set(true);
    try {
      const lessonType = this.getLessonType(lesson);
      const updateData: any = { title: this.lessonTitle.trim() };

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
      const courseId = this.store.courseTree()?.id;
      if (courseId) this.store.loadCourse(courseId);
    } catch (error) {
      console.error('Error saving lesson:', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  // Quiz methods
  async loadQuizPackages() {
    try {
      const packages = await firstValueFrom(this.packageApi.getMyPackages());
      this.quizPackages.set(packages || []);
    } catch (error) {
      console.error('Error loading packages:', error);
      this.quizPackages.set([]);
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
    } catch (error) {
      console.error('Error loading quiz questions:', error);
      this.quizQuestions.set([]);
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
    } catch (error) {
      console.error('Error loading package questions:', error);
      this.packageQuestions.set([]);
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
    } catch (error) {
      console.error('Error adding questions to quiz:', error);
    }
  }

  async removeQuestionFromQuiz(questionId: string) {
    const lesson = this.selectedLesson();
    if (!lesson) return;
    if (!confirm('Bạn có chắc muốn xóa câu hỏi này?')) return;

    try {
      await firstValueFrom(this.quizApi.removeQuestionFromQuiz(lesson.id, questionId));
      await this.loadQuizQuestions();
    } catch (error) {
      console.error('Error removing question:', error);
    }
  }

  // Random Questions & Modal
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
        alert('Gói câu hỏi này không có dữ liệu!');
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
          console.warn(`Could not add question ${q.id}:`, e);
        }
      }

      this.showRandomModal.set(false);
      await this.loadQuizQuestions();
      this.selectedPackageId = ''; // Reset
    } catch (error) {
      console.error('Error generating random questions:', error);
      alert('Có lỗi xảy ra khi tạo câu hỏi ngẫu nhiên.');
    } finally {
      this.quizQuestionsLoading.set(false);
    }
  }
  // Section Methods (L3)
  openSectionEditor(type: 'TEXT' | 'VIDEO' | 'QUIZ') {
    this.editingSectionId.set(null);
    this.newSectionType = type;
    this.sectionTitle = '';
    this.sectionContent = '';
    this.sectionVideoUrl = '';
    this.sectionIsRequired = false;
    this.showSectionModal.set(true);
  }

  editSection(section: SectionDraftDTO) {
    this.editingSectionId.set(section.id);
    this.newSectionType = (section.type as any) || 'TEXT';
    this.sectionTitle = section.title;
    this.sectionContent = section.content || '';
    this.sectionVideoUrl = section.videoUrl || '';
    this.sectionIsRequired = section.isRequired || false;
    this.showSectionModal.set(true);
  }

  // Video Preview Logic [NEW]
  updateVideoPreview(url: string) {
    if (!url) {
      this.safeVideoUrl.set(null);
      return;
    }
    const videoId = this.extractYouTubeId(url);
    if (videoId) {
      this.safeVideoUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`));
    } else {
      this.safeVideoUrl.set(null);
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
      if (this.editingSectionId()) {
        // Update - build FormData to match backend multipart/form-data expectation
        const formData = new FormData();
        formData.append('title', this.sectionTitle.trim());
        formData.append('type', this.newSectionType);

        if (this.newSectionType === 'TEXT' && this.sectionContent) {
          formData.append('content', this.sectionContent);
        } else if (this.newSectionType === 'VIDEO' && this.sectionVideoUrl) {
          formData.append('content', this.sectionVideoUrl);
        }

        // Note: File update not implemented yet (would need file upload UI)

        await firstValueFrom(this.sectionApi.updateSection(this.editingSectionId()!, formData));
      } else {
        // Create
        await firstValueFrom(this.sectionApi.createSection({
          lessonId: lesson.id,
          title: this.sectionTitle.trim(),
          type: this.newSectionType,
          content: this.sectionContent,
          videoUrl: this.sectionVideoUrl,
          isRequired: this.sectionIsRequired
        }));
      }
      // Reload course to refresh tree
      const courseId = this.store.courseTree()?.id;
      if (courseId) this.store.loadCourse(courseId);
      this.showSectionModal.set(false);
    } catch (e: any) {
      console.error('Error saving section:', e);
      alert('Lỗi khi lưu Section: ' + (e?.error?.message || e.message));
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteSection(sectionId: string) {
    if (!confirm('Bạn có chắc muốn xóa Section này?')) return;
    this.isSaving.set(true);
    try {
      await firstValueFrom(this.sectionApi.deleteSection(sectionId));
      const courseId = this.store.courseTree()?.id;
      if (courseId) this.store.loadCourse(courseId);
    } catch (e) {
      console.error(e);
    } finally {
      this.isSaving.set(false);
    }
  }

  dropSection(event: any) {
    // Reorder logic for Sections (Topic)
    // ...
  }
}
