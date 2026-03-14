import { Component, input, signal, computed, ChangeDetectionStrategy, effect, inject } from '@angular/core';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ContentIdentityService } from '../../../core/services/content-identity.service';
import katex from 'katex';

/**
 * SOTA 2025: Question Preview Component
 * 
 * Matches project's LMS design language (blue/white theme).
 * Features:
 * - Renders question content (text, images, formulas)
 * - Shows options A, B, C, D with clean styling
 * - Highlights correct answer (teacher view)
 * - Professional SVG icons
 * - OnPush change detection for performance
 * - Uses Angular Signals for efficient rendering (prevents infinite re-renders)
 */
@Component({
  selector: 'app-question-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
      <!-- Header -->
      <div class="bg-[#0056D2] px-4 py-3 flex justify-between items-center">
        <span class="text-white text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
          <!-- Eye Icon SVG -->
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          Xem trước câu hỏi
        </span>
        <div class="flex items-center gap-1">
          <button (click)="toggleView()" 
                  class="px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1"
                  [class.bg-white]="viewMode() === 'desktop'"
                  [class.text-[#0056D2]]="viewMode() === 'desktop'"
                  [class.bg-[#0056D2]]="viewMode() !== 'desktop'"
                  [class.text-white]="viewMode() !== 'desktop'">
            <!-- Desktop Icon SVG -->
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            Desktop
          </button>
          <button (click)="toggleView()" 
                  class="px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1"
                  [class.bg-white]="viewMode() === 'mobile'"
                  [class.text-[#0056D2]]="viewMode() === 'mobile'"
                  [class.bg-[#0056D2]]="viewMode() !== 'mobile'"
                  [class.text-white]="viewMode() !== 'mobile'">
            <!-- Mobile Icon SVG -->
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            Mobile
          </button>
        </div>
      </div>

      <!-- Question Container -->
      <div class="p-4" [class.max-w-[300px]]="viewMode() === 'mobile'" [class.mx-auto]="viewMode() === 'mobile'">
        
        <!-- Question Content Area -->
        <div class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100 min-h-[80px]">
          @if (!hasContent()) {
            <div class="text-gray-400 text-center py-4 italic text-sm">
              Nhập nội dung câu hỏi để xem trước...
            </div>
          }
          
          @if (hasContent()) {
            <div [innerHTML]="renderedQuestionSignal()" 
                 class="prose prose-sm max-w-none text-gray-800 leading-relaxed">
            </div>
          }
        </div>

        <!-- Options Area (Clean LMS Style) -->
        <div class="space-y-2">
          <!-- Iterate over COMPUTED options to avoid re-rendering HTML -->
          @for (option of renderedOptionsSignal(); track option.key; let i = $index) {
            <div class="relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md"
                 [class.border-green-500]="isCorrect(option.key)"
                 [class.bg-green-50]="isCorrect(option.key)"
                 [class.border-gray-200]="!isCorrect(option.key)"
                 [class.bg-white]="!isCorrect(option.key)"
                 [class.hover:border-[#0056D2]/30]="!isCorrect(option.key)">
              
              <!-- Option Key Badge -->
              <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                   [class.bg-green-500]="isCorrect(option.key)"
                   [class.text-white]="isCorrect(option.key)"
                   [class.bg-gray-200]="!isCorrect(option.key)"
                   [class.text-gray-700]="!isCorrect(option.key)">
                {{ option.key }}
              </div>

              <!-- Option Content (Pre-rendered HTML) -->
              <div [innerHTML]="option.html" 
                   class="flex-1 text-sm text-gray-700">
              </div>

              <!-- Correct Indicator -->
              @if (showCorrectAnswer() && isCorrect(option.key)) {
                <div class="flex-shrink-0">
                  <!-- Check Icon SVG -->
                  <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                </div>
              }
            </div>
          }

          <!-- Empty State for Options -->
          @if (options().length === 0) {
            <div class="text-gray-400 text-center py-4 italic text-sm border border-dashed border-gray-300 rounded-lg">
              Thêm đáp án để xem trước...
            </div>
          }
        </div>
      </div>

      <!-- Footer -->
      <div class="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
        <span>Preview Mode</span>
        @if (showCorrectAnswer()) {
          <span class="flex items-center gap-1 text-green-600">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Hiển thị đáp án đúng
          </span>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .prose img { max-height: 150px; border-radius: 8px; margin: 8px auto; display: block; }
  `]
})
export class QuestionPreviewComponent {
  private sanitizer = inject(DomSanitizer);
  private identityService = inject(ContentIdentityService);

  // Signal inputs - Angular v20+
  correctOption = input<string>('');
  showCorrectAnswer = input<boolean>(true);
  questionContent = input<string>('');
  optionsList = input<{ key: string; content: string }[]>([]);

  // Expose options as readonly signal for template
  options = this.optionsList;

  viewMode = signal<'desktop' | 'mobile'>('desktop');

  // Computed signals for efficient rendering
  renderedQuestionSignal = computed(() => this.renderContent(this.questionContent()));

  renderedOptionsSignal = computed(() => {
    return this.optionsList().map(opt => ({
      ...opt,
      html: this.renderContent(opt.content)
    }));
  });

  hasContent(): boolean {
    return !!this.questionContent() && this.questionContent().trim().length > 0;
  }

  toggleView() {
    this.viewMode.set(this.viewMode() === 'desktop' ? 'mobile' : 'desktop');
  }

  isCorrect(optionKey: string): boolean {
    return this.correctOption() === optionKey;
  }

  private renderContent(text: string): SafeHtml {
    if (!text) return '';

    let result = text;

    // Parse Images: [IMG:uuid/url] -> <img src="..."> 
    // Handled more robustly for both UUID and full URL
    result = result.replace(/\[IMG:([^\]]+)\]/g, (match, idOrUrl) => {
      // Determine if it's a UUID or URL. 
      // If simple UUID, use resolveUrl. If http/https, use as is.
      const isUrl = idOrUrl.startsWith('http');
      const url = isUrl ? idOrUrl : this.identityService.resolveUrl(idOrUrl);

      return `<img src="${url}" class="max-h-32 rounded-lg shadow-sm inline-block" alt="Image" onerror="this.src='/icons/icon-192x192.png'" />`;
    });

    // Parse Math using KaTeX
    try {
      result = result.replace(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g, (match) => {
        const isDisplay = match.startsWith('$$');
        const cleanTex = isDisplay ? match.slice(2, -2) : match.slice(1, -1);
        return katex.renderToString(cleanTex, {
          throwOnError: false,
          displayMode: isDisplay
        });
      });
    } catch (e) {
    }

    return this.sanitizer.bypassSecurityTrustHtml(result);
  }
}
