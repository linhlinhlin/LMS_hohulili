import { Component, inject, output , ChangeDetectionStrategy } from '@angular/core';

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SectionEditorState, LessonItem } from '../../state/section-editor.state';
import { QuizViewerComponent } from '../quiz-viewer/quiz-viewer.component';

@Component({
  selector: 'app-lesson-viewer',
  imports: [QuizViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    @if (state.selected(); as lesson) {
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 mt-6 overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-[#0056D2]/10 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-[#0056D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ lesson.title }}</h3>
              <p class="text-sm text-gray-500">Xem chi tiết bài học</p>
            </div>
          </div>
          <button (click)="close.emit()" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          @if (lesson.description) {
            <div class="text-sm text-gray-600 mb-3">{{ lesson.description }}</div>
          }

          <!-- Video Section -->
          @if (hasValidVideoUrl(lesson)) {
            <div class="mb-4">
              <div class="font-semibold mb-2">Video bài học</div>
              @if (isYouTube(lesson.videoUrl!)) {
                <div class="aspect-video w-full rounded overflow-hidden">
                  <iframe class="w-full h-full" [src]="getYouTubeEmbed(lesson.videoUrl!)" frameborder="0" allowfullscreen></iframe>
                </div>
              } @else {
                <video class="w-full rounded" controls [src]="lesson.videoUrl"></video>
              }
            </div>
          }

          <!-- Content by type -->
          <div class="mt-4">
            <!-- LECTURE Content -->
            @if (state.isLectureLesson()) {
              <div class="flex items-center justify-between mb-4">
                <h4 class="font-semibold text-gray-900">Nội dung bài học (Sections)</h4>
                <div class="flex gap-2">
                  <button type="button" (click)="openSmartEditor.emit(lesson.id)"
                          class="px-3 py-1.5 text-xs font-medium text-[#004BB5] bg-[#0056D2]/5 hover:bg-[#0056D2]/10 border border-[#0056D2]/20 rounded-lg transition-colors flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    Thêm nội dung
                  </button>
                </div>
              </div>

              <!-- Sections List -->
              <div class="space-y-3">
                @for (sec of lesson.sections || []; track sec.id) {
                  <div class="group bg-white border border-gray-200 rounded-lg p-3 hover:border-[#0056D2]/30 hover:shadow-sm transition-all flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center"
                           [class.bg-[#0056D2]/10]="sec.type === 'TEXT'"
                           [class.text-[#0056D2]]="sec.type === 'TEXT'"
                           [class.bg-[#0056D2]/10]="sec.type === 'VIDEO'"
                           [class.text-[#0056D2]]="sec.type === 'VIDEO'">
                        @if (sec.type === 'TEXT') {
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        } @else if (sec.type === 'VIDEO') {
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        }
                      </div>
                      <div>
                        <h5 class="text-sm font-medium text-gray-900">{{ sec.title }}</h5>
                        <p class="text-xs text-gray-500 flex items-center gap-2">
                          @if (sec.type === 'VIDEO') {
                            <span class="flex items-center gap-1">
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3"></path></svg>
                              Video
                            </span>
                          } @else if (sec.type === 'TEXT') {
                            <span class="flex items-center gap-1">
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                              Bài đọc
                            </span>
                          }
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button (click)="deleteSection.emit(sec.id)" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Xóa">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
                }

                <!-- Empty State for Sections -->
                @if (!lesson.sections || lesson.sections.length === 0) {
                  <div class="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                    <svg class="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    <p class="text-sm text-gray-500">Bài học chưa có nội dung</p>
                    <p class="text-xs text-gray-400 mt-1">Chọn "Thêm bài đọc" hoặc "Thêm Video" ở trên</p>
                  </div>
                }
              </div>
            }

            <!-- ASSIGNMENT Content -->
            @if (state.isAssignmentLesson()) {
              <ng-container>
                <div class="font-semibold mb-1">Thông tin bài tập</div>
                <div class="bg-[#0056D2]/5 border border-[#0056D2]/20 rounded-lg p-4 space-y-3">
                  <div class="bg-white rounded p-3 border border-[#0056D2]/30">
                    <h4 class="font-medium text-[#004BB5] mb-2">Mô tả bài tập</h4>
                    <div class="text-[#004BB5] whitespace-pre-line">{{ lesson.content || 'Chưa có mô tả.' }}</div>
                  </div>

                  @if (lesson.assignment?.instructions) {
                    <div class="bg-white rounded p-3 border border-[#0056D2]/30">
                      <h4 class="font-medium text-[#004BB5] mb-2">Hướng dẫn chi tiết</h4>
                      <div class="text-[#004BB5] whitespace-pre-line">{{ lesson.assignment.instructions }}</div>
                    </div>
                  }

                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="bg-white rounded p-3 text-center border border-[#0056D2]/30">
                      <div class="text-lg font-bold text-[#0056D2]">{{ getAssignmentStatus(lesson) }}</div>
                      <div class="text-xs text-[#0056D2]">Trạng thái</div>
                    </div>

                    @if (getAssignmentMaxScore(lesson)) {
                      <div class="bg-white rounded p-3 text-center border border-[#0056D2]/30">
                        <div class="text-lg font-bold text-green-600">{{ getAssignmentMaxScore(lesson) }}</div>
                        <div class="text-xs text-green-500">Điểm tối đa</div>
                      </div>
                    }

                    @if (getAssignmentDueDate(lesson)) {
                      <div class="bg-white rounded p-3 text-center border border-[#0056D2]/30">
                        <div class="text-sm font-bold text-orange-600">{{ getAssignmentDueDate(lesson) }}</div>
                        <div class="text-xs text-orange-500">Hạn nộp</div>
                      </div>
                    }

                    <div class="bg-white rounded p-3 text-center border border-[#0056D2]/30">
                      <div class="text-lg font-bold text-purple-600">{{ getAssignmentSubmissionCount(lesson) }}</div>
                      <div class="text-xs text-purple-500">Bài nộp</div>
                    </div>
                  </div>

                  <div class="flex gap-2 pt-2 border-t border-[#0056D2]/30">
                    <button class="px-3 py-2 bg-[#0056D2] text-white text-sm rounded hover:bg-[#004BB5] flex items-center gap-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                      Chỉnh sửa bài tập
                    </button>
                    <button class="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-2"
                            (click)="viewSubmissions.emit(lesson)">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      Xem bài nộp
                    </button>
                    <button class="px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 flex items-center gap-2"
                            (click)="toggleAssignmentStatus.emit(lesson)">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                      {{ lesson.assignment?.status === 'PUBLISHED' ? 'Đóng bài tập' : 'Mở bài tập' }}
                    </button>
                  </div>
                </div>
              </ng-container>
            }

            <!-- QUIZ Content -->
            @if (state.isQuizLesson()) {
              <app-quiz-viewer
                (previewQuiz)="previewQuiz.emit(lesson)"
                (refreshQuestions)="refreshQuestions.emit(lesson.id)"
                (addQuestions)="addQuestions.emit(lesson.id)"
                (removeQuestion)="removeQuestion.emit($event)">
              </app-quiz-viewer>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class LessonViewerComponent {
  readonly state = inject(SectionEditorState);
  private sanitizer = inject(DomSanitizer);

  close = output<void>();
  openSmartEditor = output<string>();
  deleteSection = output<string>();
  previewQuiz = output<LessonItem>();
  refreshQuestions = output<string>();
  addQuestions = output<string>();
  removeQuestion = output<string>();
  viewSubmissions = output<LessonItem>();
  toggleAssignmentStatus = output<LessonItem>();

  hasValidVideoUrl(lesson: LessonItem): boolean {
    const url = lesson?.videoUrl;
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return false;
    }
    const cleanUrl = url.trim().toLowerCase();
    if (cleanUrl === 'null' || cleanUrl === 'undefined' || cleanUrl === '') {
      return false;
    }
    try {
      new URL(url.trim());
      return true;
    } catch {
      return false;
    }
  }

  isYouTube(url: string): boolean {
    if (!url) return false;
    try {
      const u = new URL(url);
      return u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be');
    } catch {
      return false;
    }
  }

  getYouTubeEmbed(url: string): SafeResourceUrl {
    try {
      const u = new URL(url);
      let videoId = '';
      if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.replace('/', '');
      } else if (u.hostname.includes('youtube.com')) {
        videoId = u.searchParams.get('v') || '';
        if (!videoId) {
          const parts = u.pathname.split('/').filter(Boolean);
          const idx = parts.findIndex(p => p === 'embed' || p === 'shorts' || p === 'watch');
          if (idx >= 0 && parts[idx + 1]) videoId = parts[idx + 1];
        }
      }
      if (videoId) {
        return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`);
      }
    } catch {}
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getAssignmentStatus(lesson: LessonItem): string {
    if (lesson.lessonType !== 'ASSIGNMENT' || !lesson.assignment) {
      return 'Không áp dụng';
    }
    const assignment = lesson.assignment;
    const now = new Date();
    const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;

    switch (assignment.status) {
      case 'DRAFT': return 'Đang soạn thảo';
      case 'PUBLISHED':
        if (dueDate && now > dueDate) return 'Đã hết hạn';
        return 'Đang mở';
      case 'CLOSED': return 'Đã đóng';
      default: return 'Không xác định';
    }
  }

  getAssignmentDueDate(lesson: LessonItem): string | null {
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

  getAssignmentMaxScore(lesson: LessonItem): number | null {
    if (lesson.lessonType !== 'ASSIGNMENT' || !lesson.assignment?.maxScore) {
      return null;
    }
    return lesson.assignment.maxScore;
  }

  getAssignmentSubmissionCount(lesson: LessonItem): string {
    if (lesson.lessonType !== 'ASSIGNMENT' || !lesson.assignment) {
      return '0';
    }
    const submissionCount = lesson.assignment.submissionsCount || 0;
    const totalStudents = lesson.assignment.totalStudents || 0;
    return `${submissionCount}/${totalStudents}`;
  }
}
