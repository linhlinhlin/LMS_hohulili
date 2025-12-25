import { Component, inject, signal, computed, effect, ViewEncapsulation, OnDestroy, importProvidersFrom } from '@angular/core';
import { CommonModule } from '@angular/common';
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

@Component({
  selector: 'app-course-curriculum',
  standalone: true,
  imports: [CommonModule, FormsModule, CKEditorModule, LucideAngularModule, VideoUploadComponent, QuestionCreateComponent],
  styleUrl: './course-curriculum.component.scss',
  providers: [],
  template: `
    <div class="min-h-full flex flex-col pb-20">
      <!-- Empty State - Maritime Theme -->
      @if (!selectedChapterId() && !selectedLessonId()) {
        <div class="bg-white shadow-sm border border-gray-200 flex-grow flex items-center justify-center">
          <div class="text-center p-8 max-w-md">
            <div class="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-6 rounded-2xl shadow-inner">
              <lucide-icon name="layout" [size]="40" class="text-slate-400"></lucide-icon>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Chọn nội dung để chỉnh sửa</h3>
            <p class="text-gray-500 text-sm mb-6">Chọn chương, bài học hoặc mục nội dung từ sidebar để bắt đầu chỉnh sửa</p>
            <div class="flex items-center justify-center gap-4 text-xs text-gray-400">
                <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span>Video</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span>Tài liệu</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-rose-500"></div>
                    <span>Trắc nghiệm</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-slate-400"></div>
                    <span>Văn bản</span>
                </div>
            </div>
          </div>
        </div>
      }

      <!-- Chapter Editor -->
      @if (selectedChapterId() && !selectedLessonId()) {
        <div class="bg-white shadow-sm border border-gray-200 flex-grow overflow-hidden">
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
          <div class="p-6 space-y-4">
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
              @if (isSaving()) { <span class="animate-spin">?</span> }
              Lưu thay đổi
            </button>
          </div>
        </div>
      }

      <!-- Section Editor (Level 3) -->
      @if (selectedSectionId()) {
        <div class="bg-white shadow-sm border border-gray-200 flex-grow overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          <div class="overflow-y-auto flex-grow h-full custom-scrollbar">
          <!-- Header với Maritime Theme -->
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-white to-slate-50">
             <div class="flex items-center gap-3">
               <!-- Maritime Theme Colors - Indicator Bar -->
               <div class="relative">
                   <div class="w-10 h-10 rounded-lg flex items-center justify-center" 
                        [class.bg-blue-100]="newSectionType === 'VIDEO'" 
                        [class.bg-slate-100]="newSectionType === 'TEXT'"
                        [class.bg-amber-100]="newSectionType === 'FILE'"
                        [class.bg-rose-100]="newSectionType === 'QUIZ'">
                     @if (newSectionType === 'VIDEO') {
                        <lucide-icon name="play-circle" [size]="20" class="text-blue-500"></lucide-icon>
                     } @else if (newSectionType === 'QUIZ') {
                        <lucide-icon name="clipboard-check" [size]="20" class="text-rose-500"></lucide-icon>
                     } @else if (newSectionType === 'FILE') {
                        <lucide-icon name="file-text" [size]="20" class="text-amber-500"></lucide-icon>
                     } @else {
                        <lucide-icon name="file-text" [size]="20" class="text-slate-600"></lucide-icon>
                     }
                   </div>
                   <!-- Maritime Indicator Line -->
                   <div class="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full"
                        [class.bg-blue-500]="newSectionType === 'VIDEO'"
                        [class.bg-slate-400]="newSectionType === 'TEXT'"
                        [class.bg-amber-500]="newSectionType === 'FILE'"
                        [class.bg-rose-500]="newSectionType === 'QUIZ'"></div>
               </div>
               <div>
                 <h2 class="text-lg font-semibold text-gray-900">
                    {{ newSectionType === 'TEXT' ? 'Nội dung bài giảng' : newSectionType === 'VIDEO' ? 'Video bài giảng' : newSectionType === 'FILE' ? 'Tài liệu không thuần' : 'Chính sách nâng cấp' }}
                 </h2>
                 <p class="text-sm text-gray-500">{{ sectionTitle || 'Chưa có tiêu đề' }}</p>
               </div>
             </div>
             <!-- Type Badge -->
             <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                   [class.bg-blue-100]="newSectionType === 'VIDEO'"
                   [class.text-blue-700]="newSectionType === 'VIDEO'"
                   [class.bg-slate-100]="newSectionType === 'TEXT'"
                   [class.text-slate-700]="newSectionType === 'TEXT'"
                   [class.bg-amber-100]="newSectionType === 'FILE'"
                   [class.text-amber-700]="newSectionType === 'FILE'"
                   [class.bg-rose-100]="newSectionType === 'QUIZ'"
                   [class.text-rose-700]="newSectionType === 'QUIZ'">
                {{ newSectionType }}
             </span>
          </div>

          <div class="p-6 space-y-6">
             <!-- Reuse Form Logic -->
             <div>
               <label class="block text-sm font-medium text-gray-700 mb-2">Tiêu đề mục <span class="text-red-500">*</span></label>
               <input type="text" [(ngModel)]="sectionTitle" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
             </div>

             <div class="flex items-center gap-2">
                <input type="checkbox" [(ngModel)]="sectionIsRequired" id="reqSec" class="rounded text-blue-600 focus:ring-blue-500 w-4 h-4">
                <label for="reqSec" class="text-sm text-gray-700 font-medium select-none cursor-pointer">Bắt buộc hoàn thành (Học viên phải xem nội dung này)</label>
             </div>

             @if (newSectionType === 'VIDEO') {
               <div class="space-y-4">
                    <!-- Upload Video to R2 Storage -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Upload Video lên Cloudflare R2 <span class="text-blue-600">(Khuyến nghị)</span>
                        </label>
                        <app-video-upload 
                            [initialVideoUrl]="sectionVideoUrl"
                            [maxFileSize]="500 * 1024 * 1024"
                            (videoUploaded)="onVideoUploaded($event)"
                            (videoRemoved)="onVideoRemoved()">
                        </app-video-upload>
                        <p class="text-xs text-gray-500 mt-2">
                            Video sẽ được lưu trữ trực tiếp trên Cloudflare R2 (10GB miễn phí). 
                            Hỗ trợ MP4, AVI, MOV, MKV tối đa 500MB.
                        </p>
                    </div>

                    <!-- Hoặc nhập URL từ nơi khác -->
                    <div class="relative">
                        <div class="absolute inset-0 flex items-center" aria-hidden="true">
                            <div class="w-full border-t border-gray-300"></div>
                        </div>
                        <div class="relative flex justify-center text-xs">
                            <span class="bg-white px-2 text-gray-500">Hoặc nhập URL video từ YouTube/Vimeo</span>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <label class="block text-sm font-medium text-gray-700">Video URL</label>
                            <button type="button" (click)="toggleVideoPreview()" 
                                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                    [class.bg-blue-100]="isVideoPreviewVisible()"
                                    [class.text-blue-700]="isVideoPreviewVisible()"
                                    [class.bg-slate-100]="!isVideoPreviewVisible()"
                                    [class.text-slate-600]="!isVideoPreviewVisible()"
                                    [class.hover:bg-blue-50]="!isVideoPreviewVisible()">
                                <lucide-icon [name]="isVideoPreviewVisible() ? 'eye-off' : 'eye'" [size]="14"></lucide-icon>
                                {{ isVideoPreviewVisible() ? 'Ẩn xem trước' : 'Xem trước' }}
                            </button>
                        </div>
                        <input type="text" [(ngModel)]="sectionVideoUrl" (blur)="updateVideoPreview(sectionVideoUrl)"
                               class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                               placeholder="https://youtube.com/watch?v=... hoặc https://vimeo.com/...">
                        
                        <!-- VIDEO PREVIEW - Căn giữa + Rounded -->
                        @if (isVideoPreviewVisible() && safeVideoUrl()) {
                            <div class="flex justify-center">
                                <div class="w-full max-w-2xl aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-200">
                                    <iframe class="w-full h-full" [src]="safeVideoUrl()" frameborder="0" allowfullscreen></iframe>
                                </div>
                            </div>
                        }
                    </div>
                </div>
             }

             @if (newSectionType === 'TEXT') {
               <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nội dung bài giảng</label>
                  <div class="editor-container-wrapper border border-gray-300 rounded-lg bg-white relative shadow-sm" [style.height.px]="editorHeight()">
                      @if (isDataLoaded()) {
                        <ckeditor [editor]="Editor" [(ngModel)]="sectionContent" 
                                  [config]="editorConfig" (ready)="onEditorReady($event)"
                                  (change)="onEditorChange($event)">
                        </ckeditor>
                      } @else {
                        <div class="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                          <div class="w-8 h-8 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                          <span class="text-sm font-medium">Đang tải trình soạn thảo...</span>
                        </div>
                      }
                  </div>
                  <!-- Word Count Footer -->
                  <div class="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{{ wordCount() }} từ</span>
                      <span class="text-gray-400">Ctrl+S lưu nhanh</span>
                  </div>
               </div>
             }

              @if (newSectionType === 'FILE') {
               <div class="space-y-4 p-5 bg-amber-50 rounded-xl border border-amber-200">
                   <div class="flex items-center justify-between">
                       <label class="block text-xs font-black text-amber-800 uppercase">Tập tin kèm theo</label>
                       @if (sectionFileUrl()) {
                           <a [href]="sectionFileUrl()" target="_blank" class="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                               <lucide-icon name="download" [size]="12"></lucide-icon> Tải xuống hiện tại
                           </a>
                       }
                   </div>

                   <!-- Upload Area -->
                   <div class="border-2 border-dashed border-amber-300 rounded-xl p-6 flex flex-col items-center justify-center bg-white hover:bg-amber-50 cursor-pointer transition-colors relative">
                       <input type="file" (change)="onFileSelected($event)" 
                              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                       
                       @if (!selectedFile) {
                           <div class="text-center pointer-events-none">
                               <div class="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                   <lucide-icon name="upload-cloud" [size]="20"></lucide-icon>
                               </div>
                               <p class="text-sm font-bold text-slate-700">Nhấn để tải lên tài liệu</p>
                               <p class="text-xs text-slate-400 mt-1">PDF, Word, Excel, PowerPoint (Max 50MB)</p>
                           </div>
                       } @else {
                           <div class="flex items-center gap-3 w-full max-w-xs bg-amber-100 p-3 rounded-lg border border-amber-200 pointer-events-none">
                               <lucide-icon name="file" [size]="20" class="text-amber-600 flex-shrink-0"></lucide-icon>
                               <div class="flex-grow min-w-0">
                                   <p class="text-xs font-bold text-slate-800 truncate">{{ selectedFile.name }}</p>
                                   <p class="text--[10px] text-slate-500">{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB</p>
                               </div>
                               <button (click)="$event.stopPropagation(); selectedFile = null" class="pointer-events-auto p-1 hover:bg-amber-200 rounded text-amber-700">
                                   <lucide-icon name="x" [size]="14"></lucide-icon>
                               </button>
                           </div>
                       }
                   </div>

                   <!-- Current File Display -->
                   @if (sectionFileUrl() && !selectedFile) {
                       <div class="flex items-center gap-3 p-3 bg-white border border-amber-100 rounded-lg">
                           <lucide-icon name="check-circle" [size]="16" class="text-green-500"></lucide-icon>
                           <div class="flex-grow min-w-0">
                               <p class="text-xs font-bold text-slate-700">Đã chọn tệp kèm:</p>
                               <a [href]="sectionFileUrl()" target="_blank" class="text-xs text-blue-600 hover:underline truncate block max-w-full">
                                   {{ getFileNameFromUrl(sectionFileUrl()!) }}
                               </a>
                           </div>
                       </div>
                   }

                   <!-- PDF Preview (Condition: Safe URL Exists) -->
                   @if (safePdfUrl()) {
                      <div class="mt-4">
                         <div class="flex items-center justify-between mb-2">
                             <label class="text-xs font-bold text-slate-600">Xem trước PDF (SOTA Stream)</label>
                         </div>
                         <div class="w-full h-[500px] border border-slate-200 rounded-lg overflow-hidden bg-slate-800 shadow-inner">
                             <iframe [src]="safePdfUrl()" class="w-full h-full" frameborder="0"></iframe>
                         </div>
                      </div>
                   }
               </div>
              }

             @if (newSectionType === 'QUIZ') {
                <div class="space-y-6">
                    <!-- Quiz Type Selection -->
                    <div class="flex gap-3">
                        <button (click)="sectionQuizType = 'ASSESSMENT'" 
                                class="flex-1 p-4 rounded-xl border-2 transition-all"
                                [class.border-emerald-500]="sectionQuizType === 'ASSESSMENT'"
                                [class.bg-emerald-50]="sectionQuizType === 'ASSESSMENT'"
                                [class.border-gray-200]="sectionQuizType !== 'ASSESSMENT'">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                                     [class.bg-emerald-100]="sectionQuizType === 'ASSESSMENT'"
                                     [class.bg-gray-100]="sectionQuizType !== 'ASSESSMENT'">
                                    <lucide-icon name="check-circle" [size]="20" 
                                                 [class.text-emerald-600]="sectionQuizType === 'ASSESSMENT'"
                                                 [class.text-gray-400]="sectionQuizType !== 'ASSESSMENT'"></lucide-icon>
                                </div>
                                <div class="text-left">
                                    <p class="text-sm font-bold" [class.text-emerald-800]="sectionQuizType === 'ASSESSMENT'" [class.text-gray-700]="sectionQuizType !== 'ASSESSMENT'">Bài kiểm tra</p>
                                    <p class="text-xs text-gray-500">Chọn bài kiểm tra</p>
                                </div>
                            </div>
                        </button>
                        <button (click)="sectionQuizType = 'EXAM'" 
                                class="flex-1 p-4 rounded-xl border-2 transition-all"
                                [class.border-rose-500]="sectionQuizType === 'EXAM'"
                                [class.bg-rose-50]="sectionQuizType === 'EXAM'"
                                [class.border-gray-200]="sectionQuizType !== 'EXAM'">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                                     [class.bg-rose-100]="sectionQuizType === 'EXAM'"
                                     [class.bg-gray-100]="sectionQuizType !== 'EXAM'">
                                    <lucide-icon name="file-check" [size]="20" 
                                                 [class.text-rose-600]="sectionQuizType === 'EXAM'"
                                                 [class.text-gray-400]="sectionQuizType !== 'EXAM'"></lucide-icon>
                                </div>
                                <div class="text-left">
                                    <p class="text-sm font-bold" [class.text-rose-800]="sectionQuizType === 'EXAM'" [class.text-gray-700]="sectionQuizType !== 'EXAM'">B�i ki?m tra</p>
                                </div>
                            </div>
                        </button>
                    </div>

                    <!-- Quiz Settings Card -->
                    <div class="rounded-xl p-5"
                         [class.bg-emerald-50]="sectionQuizType === 'ASSESSMENT'"
                         [class.border-emerald-100]="sectionQuizType === 'ASSESSMENT'"
                         [class.bg-rose-50]="sectionQuizType === 'EXAM'"
                         [class.border-rose-100]="sectionQuizType === 'EXAM'"
                         [class.border]="true">
                        <div class="flex items-center gap-2 mb-4">
                            <lucide-icon name="settings" [size]="18" 
                                         [class.text-emerald-600]="sectionQuizType === 'ASSESSMENT'"
                                         [class.text-rose-600]="sectionQuizType === 'EXAM'"></lucide-icon>
                            <h4 class="text-sm font-black uppercase tracking-wide"
                                [class.text-emerald-800]="sectionQuizType === 'ASSESSMENT'"
                                [class.text-rose-800]="sectionQuizType === 'EXAM'">
                                {{ sectionQuizType === 'ASSESSMENT' ? 'Thiết lập bài đánh giá' : 'Thiết lập bài kiểm tra' }}
                            </h4>
                        </div>
                        
                        <div class="grid gap-4" [class.grid-cols-2]="sectionQuizType === 'ASSESSMENT'" [class.grid-cols-3]="sectionQuizType === 'EXAM'">
                            <!-- Time Limit -->
                            <div class="bg-white rounded-lg p-4 border"
                                 [class.border-emerald-100]="sectionQuizType === 'ASSESSMENT'"
                                 [class.border-rose-100]="sectionQuizType === 'EXAM'">
                                <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Thời gian (phút)</label>
                                <div class="flex items-center gap-2">
                                    <lucide-icon name="clock" [size]="16" 
                                                 [class.text-emerald-400]="sectionQuizType === 'ASSESSMENT'"
                                                 [class.text-rose-400]="sectionQuizType === 'EXAM'"></lucide-icon>
                                    <input type="number" [(ngModel)]="sectionQuizTimeLimit" min="1" max="180"
                                           class="flex-1 text-lg font-bold text-gray-900 border-none p-0 focus:ring-0 bg-transparent w-full"
                                           placeholder="30">
                                </div>
                            </div>

                            <!-- Passing Score -->
                            <div class="bg-white rounded-lg p-4 border"
                                 [class.border-emerald-100]="sectionQuizType === 'ASSESSMENT'"
                                 [class.border-rose-100]="sectionQuizType === 'EXAM'">
                                <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Điểm đạt (%)</label>
                                <div class="flex items-center gap-2">
                                    <lucide-icon name="target" [size]="16" 
                                                 [class.text-emerald-400]="sectionQuizType === 'ASSESSMENT'"
                                                 [class.text-rose-400]="sectionQuizType === 'EXAM'"></lucide-icon>
                                    <input type="number" [(ngModel)]="sectionQuizPassingScore" min="0" max="100"
                                           class="flex-1 text-lg font-bold text-gray-900 border-none p-0 focus:ring-0 bg-transparent w-full"
                                           placeholder="60">
                                </div>
                            </div>

                            <!-- Max Attempts - Only for EXAM type -->
                            @if (sectionQuizType === 'EXAM') {
                                <div class="bg-white rounded-lg p-4 border border-rose-100">
                                    <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Số lần làm</label>
                                    <div class="flex items-center gap-2">
                                        <lucide-icon name="repeat" [size]="16" class="text-rose-400"></lucide-icon>
                                        <input type="number" [(ngModel)]="sectionQuizMaxAttempts" min="1" max="10"
                                               class="flex-1 text-lg font-bold text-gray-900 border-none p-0 focus:ring-0 bg-transparent w-full"
                                               placeholder="1">
                                    </div>
                                </div>
                            }
                        </div>

                        <!-- Quiz Options -->
                        <div class="mt-4 flex flex-wrap gap-4">
                            <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                <input type="checkbox" [(ngModel)]="sectionQuizShuffleQuestions" class="rounded focus:ring-offset-0"
                                       [class.text-emerald-600]="sectionQuizType === 'ASSESSMENT'"
                                       [class.focus:ring-emerald-500]="sectionQuizType === 'ASSESSMENT'"
                                       [class.text-rose-600]="sectionQuizType === 'EXAM'"
                                       [class.focus:ring-rose-500]="sectionQuizType === 'EXAM'">
                                <span>Xáo trộn câu hỏi</span>
                            </label>
                            <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                <input type="checkbox" [(ngModel)]="sectionQuizShuffleOptions" class="rounded focus:ring-offset-0"
                                       [class.text-emerald-600]="sectionQuizType === 'ASSESSMENT'"
                                       [class.focus:ring-emerald-500]="sectionQuizType === 'ASSESSMENT'"
                                       [class.text-rose-600]="sectionQuizType === 'EXAM'"
                                       [class.focus:ring-rose-500]="sectionQuizType === 'EXAM'">
                                <span>Xáo trộn đáp án</span>
                            </label>
                            <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                <input type="checkbox" [(ngModel)]="sectionQuizShowResults" class="rounded focus:ring-offset-0"
                                       [class.text-emerald-600]="sectionQuizType === 'ASSESSMENT'"
                                       [class.focus:ring-emerald-500]="sectionQuizType === 'ASSESSMENT'"
                                       [class.text-rose-600]="sectionQuizType === 'EXAM'"
                                       [class.focus:ring-rose-500]="sectionQuizType === 'EXAM'">
                                <span>Hiển thị kết quả ngay</span>
                            </label>
                        </div>
                    </div>

                    <!-- Question Selection Card -->
                    <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div class="flex items-center gap-2">
                                <lucide-icon name="list-checks" [size]="18" class="text-gray-600"></lucide-icon>
                                <h4 class="text-sm font-bold text-gray-800">Câu hỏi đã chọn</h4>
                                <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                                      [class.bg-emerald-100]="sectionQuizType === 'ASSESSMENT'"
                                      [class.text-emerald-700]="sectionQuizType === 'ASSESSMENT'"
                                      [class.bg-rose-100]="sectionQuizType === 'EXAM'"
                                      [class.text-rose-700]="sectionQuizType === 'EXAM'">
                                    {{ sectionQuizSelectedQuestions().length }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <button (click)="showCreateQuestionModal.set(true)"
                                        class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                                    <lucide-icon name="plus" [size]="14"></lucide-icon>
                                    <span>Tạo mới</span>
                                </button>
                                <button (click)="openSectionQuizRandomModal()" 
                                        class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-gray-300 transition-colors">
                                    <lucide-icon name="shuffle" [size]="14"></lucide-icon>
                                    <span>Ngẫu nhiên</span>
                                </button>
                                <button (click)="openSectionQuizBankModal()" 
                                        class="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-bold transition-colors"
                                        [class.bg-emerald-600]="sectionQuizType === 'ASSESSMENT'"
                                        [class.hover:bg-emerald-700]="sectionQuizType === 'ASSESSMENT'"
                                        [class.bg-rose-600]="sectionQuizType === 'EXAM'"
                                        [class.hover:bg-rose-700]="sectionQuizType === 'EXAM'">
                                    <lucide-icon name="plus" [size]="14"></lucide-icon>
                                    <span>Chọn từ ngân hàng</span>
                                </button>
                            </div>
                        </div>

                        <!-- Question List -->
                        <div class="max-h-[300px] overflow-y-auto">
                            @if (sectionQuizSelectedQuestions().length === 0) {
                                <div class="py-12 text-center">
                                    <lucide-icon name="clipboard-list" [size]="40" class="mx-auto text-gray-300 mb-3"></lucide-icon>
                                    <p class="text-sm font-medium text-gray-500">Chưa có câu hỏi nào</p>
                                    <p class="text-xs text-gray-400 mt-1 mb-4">Chọn từ ngân hàng hoặc tạo ngẫu nhiên</p>
                                    <button (click)="showCreateQuestionModal.set(true)"
                                            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors mx-auto">
                                        <lucide-icon name="plus" [size]="16"></lucide-icon>
                                        <span>Tạo câu hỏi mới</span>
                                    </button>
                                </div>
                            } @else {
                                <div class="divide-y divide-gray-50">
                                    @for (q of sectionQuizSelectedQuestions(); track q.id; let i = $index) {
                                        <div class="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 group">
                                            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                                  [class.bg-emerald-100]="sectionQuizType === 'ASSESSMENT'"
                                                  [class.text-emerald-700]="sectionQuizType === 'ASSESSMENT'"
                                                  [class.bg-rose-100]="sectionQuizType === 'EXAM'"
                                                  [class.text-rose-700]="sectionQuizType === 'EXAM'">
                                                {{ i + 1 }}
                                            </span>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm text-gray-800 line-clamp-2">{{ q.content }}</p>
                                                <div class="flex items-center gap-2 mt-1">
                                                    <span class="text-[10px] px-1.5 py-0.5 rounded font-bold"
                                                          [class.bg-green-100]="q.difficulty === 'EASY'"
                                                          [class.text-green-700]="q.difficulty === 'EASY'"
                                                          [class.bg-yellow-100]="q.difficulty === 'MEDIUM'"
                                                          [class.text-yellow-700]="q.difficulty === 'MEDIUM'"
                                                          [class.bg-red-100]="q.difficulty === 'HARD'"
                                                          [class.text-red-700]="q.difficulty === 'HARD'">
                                                        {{ q.difficulty === 'EASY' ? 'Dễ' : q.difficulty === 'MEDIUM' ? 'Trung bình' : 'Khó' }}
                                                    </span>
                                                </div>
                                            </div>
                                            <button (click)="removeSectionQuizQuestion(q.id)" 
                                                    class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all">
                                                <lucide-icon name="x" [size]="14"></lucide-icon>
                                            </button>
                                        </div>
                                    }
                                </div>
                            }
                        </div>
                    </div>
                </div>
             }
          </div>

          <div class="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0 bg-slate-50">
             <button (click)="editingSectionId() && deleteSection(editingSectionId()!)" 
                     class="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <lucide-icon name="trash-2" [size]="16"></lucide-icon>
                <span class="text-sm font-medium">Xóa mục này</span>
             </button>

             <div class="flex items-center gap-3">
                 <button (click)="clearSectionSelection()" 
                         class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium">
                    Hủy
                 </button>
                 <button (click)="saveSection()" [disabled]="isSaving() || !sectionTitle.trim()" 
                         class="px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm">
                   @if (isSaving()) { 
                     <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                   }
                   <span class="font-medium">Lưu thay đổi</span>
                 </button>
             </div>
          </div>
        </div>
        </div>
      }

      <!-- Lesson Editor -->
      @if (selectedLessonId() && !selectedSectionId()) {
        <div class="bg-white shadow-sm border border-gray-200 flex-grow overflow-hidden">
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

          <div class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tiêu đề <span class="text-red-500">*</span></label>
              <input type="text" [(ngModel)]="lessonTitle" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>

            <!-- LECTURE fields (Refactored for Level 3 Topics) -->
            @if (getLessonType(selectedLesson()) === 'LECTURE') {
              <!-- Trigger Rebuild -->
              <div class="space-y-4">
                <!-- Topic List -->
                <div class="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="font-medium text-gray-900">Nội dung bài học ({{ selectedLesson()?.sections?.length || 0 }} sections)</h3>
                    <div class="flex gap-2">
                       <button (click)="openSectionEditor('TEXT')" class="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1">
                         <span>+ Text</span>
                       </button>
                       <button (click)="openSectionEditor('VIDEO')" class="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1">
                         <span>+ Video</span>
                       </button>
                    </div>
                  </div>
                  
                  @if (selectedLesson()?.sections?.length === 0) {
                     <div class="text-center py-8 text-gray-500 text-sm">
                        <lucide-icon name="inbox" [size]="32" class="mx-auto mb-2 text-gray-300"></lucide-icon>
                        <p>Chưa có nội dung. Hãy thêm bài giảng, video hoặc tài liệu.</p>
                     </div>
                  } @else {
                     <div class="space-y-2" cdkDropList (cdkDropListDropped)="dropSection($event)">
                        @for (section of selectedLesson()?.sections; track section.id) {
                           <div class="relative bg-white p-3 rounded-lg border border-gray-200 flex items-center gap-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all group"
                                (click)="editSection(section)" cdkDrag>
                              <!-- Maritime Indicator Line -->
                              <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                                   [class.bg-blue-500]="section.type === 'VIDEO'"
                                   [class.bg-amber-500]="section.type === 'FILE'"
                                   [class.bg-rose-500]="section.type === 'QUIZ'"
                                   [class.bg-slate-400]="section.type === 'TEXT'"></div>
                              
                              <div class="text-gray-400 cursor-move ml-2" cdkDragHandle>
                                <lucide-icon name="grip-vertical" [size]="16"></lucide-icon>
                              </div>
                              <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" 
                                   [class.bg-blue-100]="section.type === 'VIDEO'" 
                                   [class.bg-amber-100]="section.type === 'FILE'" 
                                   [class.bg-rose-100]="section.type === 'QUIZ'"
                                   [class.bg-slate-100]="section.type === 'TEXT'">
                                 @if (section.type === 'VIDEO') {
                                   <lucide-icon name="play-circle" [size]="16" class="text-blue-600"></lucide-icon>
                                 } @else if (section.type === 'FILE') {
                                   <lucide-icon name="file-text" [size]="16" class="text-amber-600"></lucide-icon>
                                 } @else if (section.type === 'QUIZ') {
                                   <lucide-icon name="clipboard-check" [size]="16" class="text-rose-600"></lucide-icon>
                                 } @else {
                                   <lucide-icon name="file-text" [size]="16" class="text-slate-600"></lucide-icon>
                                 }
                              </div>
                              <div class="flex-1 min-w-0">
                                 <h4 class="text-sm font-medium text-gray-900 truncate">{{ section.title }}</h4>
                                 <p class="text-xs text-gray-400 truncate">{{ section.type }}</p>
                              </div>
                              <button (click)="deleteSection(section.id); $event.stopPropagation()" 
                                      class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                 <lucide-icon name="trash-2" [size]="14"></lucide-icon>
                              </button>
                           </div>
                        }
                     </div>
                  }
                </div>
              </div>
            }

            <!-- Actions -->
            <div class="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-blue-50 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors border border-slate-200 hover:border-blue-200"
                        (click)="openSectionEditor('TEXT'); $event.stopPropagation()">
                    <lucide-icon name="plus" [size]="14"></lucide-icon>
                    <span>Bài giảng</span>
                </button>
                <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-blue-50 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors border border-slate-200 hover:border-blue-200"
                        (click)="openSectionEditor('VIDEO'); $event.stopPropagation()">
                    <lucide-icon name="video" [size]="14"></lucide-icon>
                    <span>Video</span>
                </button>
                <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-amber-50 text-xs font-bold text-slate-600 hover:text-amber-600 transition-colors border border-slate-200 hover:border-amber-200"
                        (click)="openSectionEditor('FILE'); $event.stopPropagation()">
                    <lucide-icon name="file-text" [size]="14"></lucide-icon>
                    <span>Tài liệu</span>
                </button>
                <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-rose-50 text-xs font-bold text-slate-600 hover:text-rose-600 transition-colors border border-slate-200 hover:border-rose-200"
                        (click)="openSectionEditor('QUIZ'); $event.stopPropagation()">
                    <lucide-icon name="clipboard-check" [size]="14"></lucide-icon>
                    <span>Trắc nghiệm</span>
                </button>
            </div>

            <!-- QUIZ fields -->
            @if (getLessonType(selectedLesson()) === 'QUIZ') {
              <div class="flex flex-col gap-6 animate-fade-in">
                
                <!-- SECTION 1: CÂU HỎI LUẬT THI (SETTINGS) -->
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
                        <span class="text-sm text-gray-500 font-medium">ph�t</span>
                      </div>
                    </div>

                    <!-- Passing Score -->
                    <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-purple-300 transition-colors group">
                      <div class="flex justify-between items-start mb-2">
                        <label class="text-xs font-semibold text-gray-500 uppercase">Điểm tối thiểu</label>
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
                               placeholder="8">
                        <span class="text-sm text-gray-500 font-medium">lần</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- SECTION 2: QU?N L? C�U H?I (QUESTIONS MANAGER) -->
                <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
                  
                  <!-- TOOLBAR: Header ch?a Actions -->
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
                      <!-- N�t Random M?i -->
                      <button (click)="openRandomizeModal()" 
                              class="group flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:border-purple-400 hover:text-purple-700 hover:bg-purple-50 transition-all shadow-sm">
                        <svg class="w-4 h-4 text-gray-400 group-hover:text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        <span>Tạo ngẫu nhiên</span>
                      </button>

                      <!-- Nút Thêm Thêm Câu Hỏi -->
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
                           <button (click)="showCreateQuestionModal.set(true)" class="text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
                             <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                             Tạo mới
                           </button>
                           <button (click)="openRandomizeModal()" class="text-purple-600 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                             Thêm ngẫu nhiên
                           </button>
                           <button (click)="showAddQuestionsModal.set(true)" class="text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                             Thêm từ ngân hàng
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
                                  {{ q.difficulty === 'EASY' ? 'D?' : q.difficulty === 'MEDIUM' ? 'Trung b?nh' : 'Kh�' }}
                                </span>
                                <!-- Type Badge (Optional) -->
                                <span class="text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 rounded border border-gray-100">
                                   TR?C NGHI?M
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
                                      title="X�a kh?i b�i thi">
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
                    <span>T�ng th?i gian l�m b�i: {{ quizQuestions().length * 1.5 }} ph�t (tham kh?o)</span>
                    <button (click)="loadQuizQuestions()" class="hover:text-purple-700 flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      L�m m?i danh s�ch
                    </button>
                  </div>
                </div>
              </div>
            }

            <!-- ASSIGNMENT fields -->
            @if (getLessonType(selectedLesson()) === 'ASSIGNMENT') {
              <div class="space-y-4">
                <div class="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 class="font-medium text-green-900 mb-3">Th�ng tin b�i t?p</h4>
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-green-700 mb-1">M� t?</label>
                      <textarea [(ngModel)]="assignmentDescription" rows="3" class="w-full px-3 py-2 border border-green-200 rounded-lg bg-white resize-none"></textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block text-sm font-medium text-green-700 mb-1">H?n n?p</label>
                        <input type="datetime-local" [(ngModel)]="assignmentDueDate" class="w-full px-3 py-2 border border-green-200 rounded-lg bg-white">
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-green-700 mb-1">�i?m t?i �a</label>
                        <input type="number" [(ngModel)]="assignmentMaxScore" class="w-full px-3 py-2 border border-green-200 rounded-lg bg-white">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          <div class="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
            <button (click)="clearSelection()" class="text-gray-600 hover:text-gray-800 text-sm">Quay l?i</button>
            <button (click)="saveLesson()" [disabled]="isSaving()" class="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              @if (isSaving()) { <span class="animate-spin">?</span> }
              L�u thay �?i
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
          <p class="text-sm text-gray-500 mt-1">Chọn gói câu hỏi và số lượng câu hỏi cần lấy.</p>
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
          
          <!-- Option n?ng cao (n?u c?n) -->
          <div class="flex gap-2">
             <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" class="rounded text-purple-600 focus:ring-purple-500" [(ngModel)]="randomUnique">
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
            @if (quizQuestionsLoading()) { <span class="animate-spin text-white">?</span> }
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
            <button (click)="showAddQuestionsModal.set(false)" class="p-1 text-gray-400 hover:text-gray-600 rounded">?</button>
          </div>
          <div class="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Chọn gói câu hỏi</label>
              <select [(ngModel)]="selectedPackageId" (change)="loadPackageQuestions()" class="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white">
                <option value="">-- Chọn gói câu hỏi --</option>
                @for (pkg of quizPackages(); track pkg.id) {
                  <option [value]="pkg.id">{{ pkg.name }} ({{ pkg.questionCount || 0 }} c�u)</option>
                }
              </select>
            </div>
            @if (packageQuestions().length > 0) {
              <div class="border border-gray-200 rounded-lg overflow-hidden">
                <div class="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                  <span class="text-sm font-medium">Danh sách câu hỏi</span>
                  <div class="flex items-center gap-2">
                    <button (click)="selectAllQuestions()" class="text-xs text-blue-600">Chá»n t?t c?</button>
                    <button (click)="clearQuestionSelection()" class="text-xs text-gray-600">B? ch?n</button>
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
            <button (click)="showAddQuestionsModal.set(false)" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Há»§y b?</button>
            <button (click)="addSelectedQuestionsToQuiz()" [disabled]="selectedQuestionIds().size === 0" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
              Thêm {{ selectedQuestionIds().size }} câu hỏi
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Section Quiz Bank Modal -->
    @if (showSectionQuizBankModal()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showSectionQuizBankModal.set(false)">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" (click)="$event.stopPropagation()">
          <div class="p-5 border-b border-gray-200 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">Chọn câu hỏi từ ngân hàng</h3>
            <button (click)="showSectionQuizBankModal.set(false)" class="p-1 text-gray-400 hover:text-gray-600 rounded">?</button>
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
                    <button (click)="selectAllQuestions()" class="text-xs text-rose-600">Chọn tất cả</button>
                    <button (click)="clearQuestionSelection()" class="text-xs text-gray-600">Bỏ chọn</button>
                  </div>
                </div>
                <div class="max-h-64 overflow-y-auto p-3 space-y-2">
                  @for (q of packageQuestions(); track q.id) {
                    <label class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer" [class.border-rose-500]="selectedQuestionIds().has(q.id)" [class.bg-rose-50]="selectedQuestionIds().has(q.id)">
                      <input type="checkbox" [checked]="selectedQuestionIds().has(q.id)" (change)="toggleQuestionSelection(q.id)" class="mt-1 h-4 w-4 text-rose-600 rounded">
                      <div class="flex-1">
                        <p class="text-sm text-gray-900">{{ q.content }}</p>
                        <span class="text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block"
                              [class.bg-green-100]="q.difficulty === 'EASY'"
                              [class.text-green-700]="q.difficulty === 'EASY'"
                              [class.bg-yellow-100]="q.difficulty === 'MEDIUM'"
                              [class.text-yellow-700]="q.difficulty === 'MEDIUM'"
                              [class.bg-red-100]="q.difficulty === 'HARD'"
                              [class.text-red-700]="q.difficulty === 'HARD'">
                          {{ q.difficulty === 'EASY' ? 'D?' : q.difficulty === 'MEDIUM' ? 'TB' : 'Kh�' }}
                        </span>
                      </div>
                    </label>
                  }
                </div>
              </div>
            }
          </div>
          <div class="p-5 border-t border-gray-200 flex justify-end gap-3">
            <button (click)="showSectionQuizBankModal.set(false)" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Há»§y</button>
            <button (click)="addSectionQuizQuestionsFromBank()" [disabled]="selectedQuestionIds().size === 0" class="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50">
              Thêm {{ selectedQuestionIds().size }} câu hỏi
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Section Quiz Random Modal -->
    @if (showSectionQuizRandomModal()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showSectionQuizRandomModal.set(false)">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4" (click)="$event.stopPropagation()">
          <div class="p-5 border-b border-gray-100">
            <h3 class="text-lg font-bold text-gray-900">Tạo câu hỏi ngẫu nhiên</h3>
            <p class="text-sm text-gray-500 mt-1">Chọn gói câu hỏi</p>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nguồn câu hỏi</label>
              <select [(ngModel)]="selectedPackageId" class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                <option value="">-- Chọn gói câu hỏi --</option>
                @for (pkg of quizPackages(); track pkg.id) {
                  <option [value]="pkg.id">{{ pkg.name }} ({{ pkg.questionCount || 0 }} câu)</option>
                }
              </select>
            </div>
            <div [class.opacity-50]="!selectedPackageId">
              <label class="block text-sm font-medium text-gray-700 mb-1">Số lượng câu hỏi</label>
              <div class="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button class="px-3 py-2 bg-gray-50 hover:bg-gray-100 border-r" (click)="decreaseSectionQuizRandomCount()">-</button>
                <input type="number" [ngModel]="sectionQuizRandomCount()" (ngModelChange)="sectionQuizRandomCount.set($event)" class="w-full text-center border-none focus:ring-0 p-2" min="1">
                <button class="px-3 py-2 bg-gray-50 hover:bg-gray-100 border-l" (click)="increaseSectionQuizRandomCount()">+</button>
              </div>
            </div>
          </div>
          <div class="p-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
            <button (click)="showSectionQuizRandomModal.set(false)" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Há»§y</button>
            <button (click)="generateSectionQuizRandomQuestions()" [disabled]="!selectedPackageId" class="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50">
              T?o ngay
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
            <h3 class="text-lg font-semibold text-gray-900">{{ editingSectionId() ? 'Chỉnh sửa Mục' : 'Thêm Mục Mới' }}</h3>
            <button (click)="showSectionModal.set(false)" class="text-gray-400 hover:text-gray-600">?</button>
          </div>
          <div class="p-6 space-y-4 overflow-y-auto">
             <div>
               <label class="block text-sm font-medium text-gray-700 mb-2">Tiêu đề mục <span class="text-red-500">*</span></label>
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
                         <span class="font-medium">{{ wordCount() }} t?</span>
                      </div>
                      <div class="absolute bottom-0 right-0 w-6 h-6 cursor-ns-resize flex items-center justify-center hover:bg-gray-200 z-20 rounded-br-lg"
                           (mousedown)="startResize($event)">
                        <svg class="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z"/></svg>
                      </div>
                  </div>
               </div>
             }
             
             <!-- FILE Type [NEW] -->
             @if (newSectionType === 'FILE') {
               <div class="space-y-4 p-5 bg-amber-50 rounded-xl border border-amber-200">
                   <div class="flex items-center justify-between">
                       <label class="block text-xs font-black text-amber-800 uppercase">Tệp đính kèm</label>
                       @if (sectionFileUrl()) {
                           <a [href]="sectionFileUrl()" target="_blank" class="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                               <lucide-icon name="download" [size]="12"></lucide-icon> T?i xu?ng hi?n t?i
                           </a>
                       }
                   </div>

                   <!-- Upload Area -->
                   <div class="border-2 border-dashed border-amber-300 rounded-xl p-6 flex flex-col items-center justify-center bg-white hover:bg-amber-50 cursor-pointer transition-colors relative">
                       <input type="file" (change)="onFileSelected($event)" 
                              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                       
                       @if (!selectedFile) {
                           <div class="text-center pointer-events-none">
                               <div class="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                   <lucide-icon name="upload-cloud" [size]="20"></lucide-icon>
                               </div>
                               <p class="text-sm font-bold text-slate-700">Nhấn để tải lên tài liệu</p>
                               <p class="text-xs text-slate-400 mt-1">PDF, Word, Excel, PowerPoint (Max 50MB)</p>
                           </div>
                       } @else {
                           <div class="flex items-center gap-3 w-full max-w-xs bg-amber-100 p-3 rounded-lg border border-amber-200 pointer-events-none">
                               <lucide-icon name="file" [size]="20" class="text-amber-600 flex-shrink-0"></lucide-icon>
                               <div class="flex-grow min-w-0">
                                   <p class="text-xs font-bold text-slate-800 truncate">{{ selectedFile.name }}</p>
                                   <p class="text--[10px] text-slate-500">{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB</p>
                               </div>
                               <button (click)="$event.stopPropagation(); selectedFile = null" class="pointer-events-auto p-1 hover:bg-amber-200 rounded text-amber-700">
                                   <lucide-icon name="x" [size]="14"></lucide-icon>
                               </button>
                           </div>
                       }
                   </div>

                   <!-- Current File Display -->
                   @if (sectionFileUrl() && !selectedFile) {
                       <div class="flex items-center gap-3 p-3 bg-white border border-amber-100 rounded-lg">
                           <lucide-icon name="check-circle" [size]="16" class="text-green-500"></lucide-icon>
                           <div class="flex-grow min-w-0">
                               <p class="text-xs font-bold text-slate-700">Đã chọn tệp đính kèm:</p>
                               <a [href]="sectionFileUrl()" target="_blank" class="text-xs text-blue-600 hover:underline truncate block max-w-full">
                                   {{ getFileNameFromUrl(sectionFileUrl()!) }}
                               </a>
                           </div>
                       </div>
                   }

                   <!-- PDF Preview (Condition: Safe URL Exists) -->
                   @if (safePdfUrl()) {
                      <div class="mt-4">
                         <div class="flex items-center justify-between mb-2">
                             <label class="text-xs font-bold text-slate-600">Xem trước PDF (SOTA Stream)</label>
                         </div>
                         <div class="w-full h-[500px] border border-slate-200 rounded-lg overflow-hidden bg-slate-800 shadow-inner">
                             <iframe [src]="safePdfUrl()" class="w-full h-full" frameborder="0"></iframe>
                         </div>
                      </div>
                   }
               </div>
                  

             }
          </div>
          <div class="p-5 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
            <button (click)="showSectionModal.set(false)" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Há»§y</button>
            <button (click)="saveSection()" [disabled]="isSaving() || !sectionTitle.trim() || (newSectionType === 'FILE' && !selectedFile && !sectionFileUrl())" 
                    class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              @if (isSaving()) { <span class="animate-spin">?</span> }
              {{ editingSectionId() ? 'Cập nhật' : 'Tạo mới' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- In-Context Question Creator Modal -->
    <div *ngIf="showCreateQuestionModal()" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
       <div class="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col relative" (click)="$event.stopPropagation()">
          <div class="absolute top-4 right-4 z-10">
             <button (click)="showCreateQuestionModal.set(false)" class="bg-white/80 p-1 rounded-full hover:bg-gray-100 text-gray-500">
               <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
          <div class="flex-1 overflow-y-auto bg-gray-50">
             <app-question-create
                 [isDialog]="true"
                 (created)="onQuestionCreated($event)"
                 (cancel)="showCreateQuestionModal.set(false)">
             </app-question-create>
          </div>
       </div>
    </div>
  `,
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
    } catch (err) {
      console.error('Failed to link new question to quiz', err);
    }
  }

  // CKEditor
  public Editor = ClassicEditor;
  public editorHeight = signal(450);
  public editorInstance: any;

  public editorConfig = {
    licenseKey: 'GPL',
    // [QUAN TR?NG] Ph?i n?p Plugins v�o ��y th? Toolbar m?i hi?n
    plugins: [
      Essentials, Paragraph, Heading,
      Bold, Italic, Underline, Strikethrough, Subscript, Superscript, RemoveFormat,
      Font, FontFamily, FontSize, FontColor, FontBackgroundColor,
      Alignment, List, Indent, IndentBlock, BlockQuote,
      Link, Image, ImageUpload, ImageToolbar, ImageStyle, ImageResize, ImageCaption,
      Table, TableToolbar, MediaEmbed,
      SourceEditing, Autoformat,

      // Plugin Upload ?nh Base64 c?a b?n
      Base64UploadAdapterPlugin
    ],

    // C?u h?nh Toolbar (Thi?t l?p n�t b?m)
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
      shouldNotGroupWhenFull: true // T�ng nh�m n�t n?u m�n h?nh nh?
    },

    // C?u h?nh Font (C�i �?t Arial l�m m?c �?nh)
    fontFamily: {
      options: [
        'default', // M?c �?nh c?a theme
        'Arial, Helvetica, sans-serif',
        'Times New Roman, Times, serif',
        'Courier New, Courier, monospace',
        'Verdana, Geneva, sans-serif'
      ],
      supportAllValues: true
    },

    // C?u h?nh ?nh (Thanh cung khi click vào ảnh)
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
      if (newHeight > 200) { // Giá»›i háº¡n chi?u cao t?i thi?u
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
  randomUnique = false; // [NEW] Fix build error

  // Section Quiz Fields (for QUIZ type sections) [NEW]
  sectionQuizType: 'ASSESSMENT' | 'EXAM' = 'ASSESSMENT'; // B�i ��nh gi� vs B�i ki?m tra
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
        // Reset isDataLoaded tr�?c khi load data m?i
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

        // Handle PDF Secure Streaming [SOTA 2025]
        if (this.newSectionType === 'FILE') {
          if (this.isPdfFile(section)) { // FIXED: Pass the section object, not just URL string
            this.pdfService.getSafePdfUrl(section.fileUrl).subscribe(url => {
              this.safePdfUrl.set(url);
            });
          } else {
            this.safePdfUrl.set(null);
          }
          this.isDataLoaded.set(true);
        } else if (this.newSectionType === 'TEXT') {
          // Delay �? CKEditor c� th?i gian kh?i t?o
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

  // Trong Component Class
  isVideoPreviewVisible = signal(false);

  toggleVideoPreview() {
    this.isVideoPreviewVisible.update(v => !v);
  }

  // [NEW] Video Upload Handlers for R2 Storage
  onVideoUploaded(result: VideoUploadResult) {
    console.log('Video uploaded to R2:', result);
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
    console.log('Video removed');
    this.sectionVideoUrl = '';
    this.sectionVideoType = null;
    this.sectionCfObjectKey = null;
    this.safeVideoUrl.set(null);
    this.isVideoPreviewVisible.set(false);
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
      await firstValueFrom(this.chapterApi.updateChapter(chapterId, {
        title: this.chapterTitle.trim(),
        description: this.chapterDescription.trim()
      }));
      const courseId = this.store.courseTree()?.id;
      if (courseId) this.store.loadCourse(courseId, true);
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
      if (courseId) this.store.loadCourse(courseId, true);
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
    if (!confirm('Bạn chắc chắn muốn xóa câu hỏi này?')) return;

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
      alert('Lỗi xảy ra khi tạo câu hỏi ngẫu nhiên.');
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
          console.log('[CourseCurriculum] Section is identified as PDF, requesting secure stream:', section.fileUrl);
          this.pdfService.getSafePdfUrl(section.fileUrl).subscribe((url: SafeResourceUrl | null) => {
            console.log('[CourseCurriculum] Received safeUrl for preview:', url ? 'SUCCESS' : 'NULL');
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
      // [NEW] If URL doesn't look like YouTube and not R2, assume external source
      if (!this.sectionCfObjectKey) {
        this.sectionVideoType = 'YOUTUBE'; // Default to YOUTUBE for any external video URL
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
      const formData = new FormData();
      formData.append('title', this.sectionTitle.trim());
      formData.append('type', this.newSectionType);
      formData.append('isRequired', String(this.sectionIsRequired));

      if (this.newSectionType === 'TEXT') {
        formData.append('content', this.sectionContent);
      } else if (this.newSectionType === 'VIDEO') {
        formData.append('videoUrl', this.sectionVideoUrl);
        // [NEW] Include Cloudflare metadata if available
        if (this.sectionVideoType) {
          formData.append('videoType', this.sectionVideoType);
        }
        if (this.sectionCfObjectKey) {
          formData.append('cfObjectKey', this.sectionCfObjectKey);
        }
      } else if (this.newSectionType === 'FILE') {
        if (this.selectedFile) {
          formData.append('file', this.selectedFile);
        }
      } else if (this.newSectionType === 'QUIZ') {
        // Quiz settings
        formData.append('quizType', this.sectionQuizType);
        formData.append('quizTimeLimit', String(this.sectionQuizTimeLimit));
        formData.append('quizPassingScore', String(this.sectionQuizPassingScore));
        // Ch? g?i maxAttempts n?u l� EXAM, ASSESSMENT kh�ng gi?i h?n
        formData.append('quizMaxAttempts', this.sectionQuizType === 'EXAM' ? String(this.sectionQuizMaxAttempts) : '999');
        formData.append('quizShuffleQuestions', String(this.sectionQuizShuffleQuestions));
        formData.append('quizShuffleOptions', String(this.sectionQuizShuffleOptions));
        formData.append('quizShowResults', String(this.sectionQuizShowResults));
        // Question IDs
        const questionIds = this.sectionQuizSelectedQuestions().map(q => q.id);
        formData.append('questionIds', JSON.stringify(questionIds));
      }

      if (this.editingSectionId()) {
        // Update - Send FormData (Multipart)
        const res: any = await firstValueFrom(this.sectionApi.updateSection(this.editingSectionId()!, formData));
        const updatedSection = res.data || res;
        if (updatedSection?.fileUrl && this.newSectionType === 'FILE') {
          this.sectionFileUrl.set(updatedSection.fileUrl);
        }
      } else {
        // Create - Send FormData (Multipart)
        formData.append('lessonId', lesson.id);
        await firstValueFrom(this.sectionApi.createSection(formData));
      }

      // Clear staged file after successful save
      this.selectedFile = null;

      // Reload course to refresh tree
      const courseId = this.store.courseTree()?.id;
      if (courseId) this.store.loadCourse(courseId, true);
      this.showSectionModal.set(false);
    } catch (e: any) {
      console.error('Error saving section:', e);
      alert('L?i khi l�u M?c: ' + (e?.error?.message || e.message));
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteSection(sectionId: string) {
    if (!confirm('B?n ch?c ch?n mu?n x�a M?c n�y?')) return;
    this.isSaving.set(true);
    try {
      await firstValueFrom(this.sectionApi.deleteSection(sectionId));
      const courseId = this.store.courseTree()?.id;
      if (courseId) this.store.loadCourse(courseId, true);
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

  // [NEW] File selection handler for FILE type sections
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
    }
  }

  // [NEW] Extract filename from URL for display
  getFileNameFromUrl(url: string): string {
    if (!url) return 'T?p ��nh k�m';
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);
      return decodeURIComponent(fileName) || 'T?p ��nh k�m';
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
      console.warn('No lesson selected to navigate to quiz builder');
      return;
    }

    const courseId = this.store.courseTree()?.id;
    if (!courseId) {
      console.warn('No course ID found');
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
    } catch (error) {
      console.error('Error adding questions:', error);
    }
  }

  async generateSectionQuizRandomQuestions() {
    if (!this.selectedPackageId) return;

    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(this.selectedPackageId));
      if (!questions || questions.length === 0) {
        alert('Gói câu hỏi này không có dữ liệu!');
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
    } catch (error) {
      console.error('Error generating random questions:', error);
      alert('Lỗi khi tạo câu hỏi ngẫu nhiên.');
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
