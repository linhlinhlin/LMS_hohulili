import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  forwardRef,
  input,
  signal,
  computed,
  ElementRef,
  viewChild,
} from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { TiptapEditorDirective, TiptapBubbleMenuDirective } from 'ngx-tiptap';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { CharacterCount } from '@tiptap/extension-character-count';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

const COLOR_PRESETS = [
  '#1F2937', '#6B7280', '#DC2626', '#EA580C',
  '#D97706', '#16A34A', '#0891B2', '#0056D2',
  '#7C3AED', '#DB2777', '#FFFFFF', '#000000',
];

@Component({
  selector: 'app-tiptap-editor',
  imports: [TiptapEditorDirective, TiptapBubbleMenuDirective, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TiptapEditorComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ═══════════ TOOLBAR ═══════════ -->
    <div class="tt-toolbar">

      <!-- Headings -->
      <div class="tt-group">
        <button type="button" (click)="exec('toggleHeading', { level: 2 })"
          [class.tt-active]="editor?.isActive('heading', { level: 2 })"
          class="tt-btn" title="Tiêu đề H2">H2</button>
        <button type="button" (click)="exec('toggleHeading', { level: 3 })"
          [class.tt-active]="editor?.isActive('heading', { level: 3 })"
          class="tt-btn" title="Tiêu đề H3">H3</button>
      </div>

      <span class="tt-sep"></span>

      <!-- Text formatting -->
      <div class="tt-group">
        <button type="button" (click)="exec('toggleBold')"
          [class.tt-active]="editor?.isActive('bold')"
          class="tt-btn" title="Đậm (Ctrl+B)">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"/><path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/></svg>
        </button>
        <button type="button" (click)="exec('toggleItalic')"
          [class.tt-active]="editor?.isActive('italic')"
          class="tt-btn" title="Nghiêng (Ctrl+I)">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
        </button>
        <button type="button" (click)="exec('toggleUnderline')"
          [class.tt-active]="editor?.isActive('underline')"
          class="tt-btn" title="Gạch chân (Ctrl+U)">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
        </button>
        <button type="button" (click)="exec('toggleStrike')"
          [class.tt-active]="editor?.isActive('strike')"
          class="tt-btn" title="Gạch ngang">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4H9a3 3 0 00-3 3v0a3 3 0 003 3h6a3 3 0 013 3v0a3 3 0 01-3 3H8"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
        </button>
      </div>

      <span class="tt-sep"></span>

      <!-- Colors -->
      <div class="tt-group">
        <div class="tt-dropdown-wrap">
          <button type="button" class="tt-btn tt-color-btn" title="Màu chữ"
            (click)="toggleDropdown('textColor')">
            <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16"/><path d="M9.5 4h5l4 12H5.5z" fill="none"/></svg>
            <span class="tt-color-bar" [style.background]="activeTextColor()"></span>
          </button>
          @if (openDropdown() === 'textColor') {
            <div class="tt-color-dropdown" (mousedown)="$event.preventDefault()">
              <div class="tt-color-grid">
                @for (c of colorPresets; track c) {
                  <button type="button" class="tt-color-swatch"
                    [style.background]="c"
                    [class.tt-swatch-active]="activeTextColor() === c"
                    [class.tt-swatch-light]="c === '#FFFFFF'"
                    (click)="setColor(c)"
                    [title]="c"></button>
                }
              </div>
              <button type="button" class="tt-color-reset" (click)="exec('unsetColor'); closeDropdown()">
                Xóa màu
              </button>
            </div>
          }
        </div>

        <div class="tt-dropdown-wrap">
          <button type="button" class="tt-btn" title="Tô nền"
            [class.tt-active]="editor?.isActive('highlight')"
            (click)="toggleDropdown('highlight')">
            <svg class="tt-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M15.24 2.29a1 1 0 011.41 0l5.06 5.06a1 1 0 010 1.41l-8.49 8.49a1 1 0 01-.7.29H7.76a1 1 0 01-.71-.29l-3.54-3.54a1 1 0 010-1.41l11.73-9.01zM4 19h16v2H4z"/></svg>
          </button>
          @if (openDropdown() === 'highlight') {
            <div class="tt-color-dropdown" (mousedown)="$event.preventDefault()">
              <div class="tt-color-grid">
                @for (c of colorPresets; track c) {
                  <button type="button" class="tt-color-swatch"
                    [style.background]="c"
                    [class.tt-swatch-light]="c === '#FFFFFF'"
                    (click)="setHighlight(c)"
                    [title]="c"></button>
                }
              </div>
              <button type="button" class="tt-color-reset" (click)="exec('unsetHighlight'); closeDropdown()">
                Xóa tô nền
              </button>
            </div>
          }
        </div>
      </div>

      <span class="tt-sep"></span>

      <!-- Sub/Superscript -->
      <div class="tt-group">
        <button type="button" (click)="exec('toggleSubscript')"
          [class.tt-active]="editor?.isActive('subscript')"
          class="tt-btn" title="Chỉ số dưới">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11h4a1 1 0 011 1v1h-2v-1h-2v3h4v1a1 1 0 01-1 1h-4a1 1 0 01-1-1v-1h2v1h2v-3h-4v-1a1 1 0 011-1zM3 4l5.5 7.5L3 19h3l3.5-5 3.5 5h3l-5.5-7.5L16 4h-3l-3.5 5L6 4H3z"/></svg>
        </button>
        <button type="button" (click)="exec('toggleSuperscript')"
          [class.tt-active]="editor?.isActive('superscript')"
          class="tt-btn" title="Chỉ số trên">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3h4a1 1 0 011 1v1h-2V4h-2v3h4v1a1 1 0 01-1 1h-4a1 1 0 01-1-1V4a1 1 0 011-1zM3 7l5.5 7.5L3 22h3l3.5-5 3.5 5h3l-5.5-7.5L16 7h-3l-3.5 5L6 7H3z"/></svg>
        </button>
      </div>

      <span class="tt-sep"></span>

      <!-- Alignment -->
      <div class="tt-group">
        <button type="button" (click)="setAlign('left')"
          [class.tt-active]="editor?.isActive({ textAlign: 'left' })"
          class="tt-btn" title="Căn trái">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
        </button>
        <button type="button" (click)="setAlign('center')"
          [class.tt-active]="editor?.isActive({ textAlign: 'center' })"
          class="tt-btn" title="Căn giữa">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
        </button>
        <button type="button" (click)="setAlign('right')"
          [class.tt-active]="editor?.isActive({ textAlign: 'right' })"
          class="tt-btn" title="Căn phải">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>

      <span class="tt-sep"></span>

      <!-- Lists & structure -->
      <div class="tt-group">
        <button type="button" (click)="exec('toggleBulletList')"
          [class.tt-active]="editor?.isActive('bulletList')"
          class="tt-btn" title="Danh sách">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
        </button>
        <button type="button" (click)="exec('toggleOrderedList')"
          [class.tt-active]="editor?.isActive('orderedList')"
          class="tt-btn" title="Danh sách số">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="3" y="7" font-size="7" fill="currentColor" stroke="none">1</text><text x="3" y="13" font-size="7" fill="currentColor" stroke="none">2</text><text x="3" y="19" font-size="7" fill="currentColor" stroke="none">3</text></svg>
        </button>
        <button type="button" (click)="exec('toggleBlockquote')"
          [class.tt-active]="editor?.isActive('blockquote')"
          class="tt-btn" title="Trích dẫn">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
        </button>
        <button type="button" (click)="exec('toggleCodeBlock')"
          [class.tt-active]="editor?.isActive('codeBlock')"
          class="tt-btn" title="Code">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </button>
      </div>

      <span class="tt-sep"></span>

      <!-- Media & links -->
      <div class="tt-group">
        <button type="button" (click)="toggleLink()"
          [class.tt-active]="editor?.isActive('link')"
          class="tt-btn" title="Liên kết (Ctrl+K)">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        </button>
        <button type="button" (click)="insertTable()" class="tt-btn" title="Bảng">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        </button>
        <button type="button" (click)="triggerImageUpload()" class="tt-btn" title="Hình ảnh">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </button>
        @if (videoUploadFn()) {
          <button type="button" (click)="triggerVideoUpload()" class="tt-btn" title="Tải video lên">
            <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          </button>
        }
        <button type="button" (click)="insertYoutube()" class="tt-btn" title="Video YouTube">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
      </div>

      <span class="tt-sep"></span>

      <!-- History -->
      <div class="tt-group">
        <button type="button" (click)="exec('undo')"
          [disabled]="!editor?.can()?.undo()"
          class="tt-btn" title="Hoàn tác (Ctrl+Z)">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
        </button>
        <button type="button" (click)="exec('redo')"
          [disabled]="!editor?.can()?.redo()"
          class="tt-btn" title="Làm lại (Ctrl+Y)">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        </button>
      </div>
    </div>

    <!-- ═══════════ LINK EDIT BAR ═══════════ -->
    @if (linkEditMode()) {
      <div class="tt-link-bar" (mousedown)="$event.preventDefault()">
        <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        <input #linkInput type="text" class="tt-link-input"
          [(ngModel)]="linkUrl"
          placeholder="Nhập URL..."
          (keydown.enter)="applyLink()"
          (keydown.escape)="cancelLink()" />
        <button type="button" class="tt-link-action tt-link-apply" (click)="applyLink()" title="Áp dụng">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button type="button" class="tt-link-action tt-link-remove" (click)="removeLink()" title="Xóa liên kết">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    }

    <!-- ═══════════ BUBBLE MENU (text selection) ═══════════ -->
    <div tiptapBubbleMenu [editor]="editor">
      <div class="tt-bubble">
        <button type="button" (mousedown)="$event.preventDefault(); exec('toggleBold')"
          [class.tt-active]="editor?.isActive('bold')" class="tt-bubble-btn" title="Đậm">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"/><path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/></svg>
        </button>
        <button type="button" (mousedown)="$event.preventDefault(); exec('toggleItalic')"
          [class.tt-active]="editor?.isActive('italic')" class="tt-bubble-btn" title="Nghiêng">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
        </button>
        <button type="button" (mousedown)="$event.preventDefault(); exec('toggleUnderline')"
          [class.tt-active]="editor?.isActive('underline')" class="tt-bubble-btn" title="Gạch chân">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
        </button>
        <button type="button" (mousedown)="$event.preventDefault(); exec('toggleStrike')"
          [class.tt-active]="editor?.isActive('strike')" class="tt-bubble-btn" title="Gạch ngang">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4H9a3 3 0 00-3 3v0a3 3 0 003 3h6a3 3 0 013 3v0a3 3 0 01-3 3H8"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
        </button>
        <span class="tt-bubble-sep"></span>
        <button type="button" (mousedown)="$event.preventDefault(); toggleLink()"
          [class.tt-active]="editor?.isActive('link')" class="tt-bubble-btn" title="Liên kết">
          <svg class="tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        </button>
      </div>
    </div>

    <!-- ═══════════ EDITOR CONTENT ═══════════ -->
    <div class="tt-content" [style.min-height.px]="height()" (click)="closeDropdown()">
      <div tiptapEditor [editor]="editor"></div>
    </div>

    <!-- ═══════════ FOOTER ═══════════ -->
    <div class="tt-footer">
      <span>{{ charCount() }} ký tự</span>
      <span class="tt-footer-sep">·</span>
      <span>{{ wordCount() }} từ</span>
    </div>

    <!-- Hidden file inputs -->
    <input #fileInput type="file" accept="image/*" class="hidden"
           (change)="onFileSelected($event)" />
    <input #videoFileInput type="file" accept="video/*" class="hidden"
           (change)="onVideoFileSelected($event)" />
  `,
  styles: [`
    :host { display: block; }

    /* ── Toolbar ── */
    .tt-toolbar {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 6px 8px;
      border: 1px solid #E5E7EB;
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      background: #FAFAFA;
      flex-wrap: wrap;
    }

    .tt-group {
      display: flex;
      align-items: center;
      gap: 1px;
    }

    .tt-sep {
      width: 1px;
      height: 20px;
      background: #E5E7EB;
      margin: 0 4px;
      flex-shrink: 0;
    }

    .tt-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #6B7280;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;

      &:hover { background: #E5E7EB; color: #111827; }
      &.tt-active { background: #0056D2; color: white; }
      &:disabled { opacity: 0.3; cursor: not-allowed; }
    }

    .tt-icon { width: 16px; height: 16px; flex-shrink: 0; }

    /* ── Color button ── */
    .tt-color-btn { position: relative; }
    .tt-color-bar {
      position: absolute;
      bottom: 3px;
      left: 7px;
      right: 7px;
      height: 3px;
      border-radius: 2px;
    }

    /* ── Color dropdown ── */
    .tt-dropdown-wrap { position: relative; }
    .tt-color-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      z-index: 50;
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,.12);
      padding: 8px;
      min-width: 176px;
      animation: ttDropIn 0.15s ease-out;
    }

    .tt-color-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 4px;
      margin-bottom: 6px;
    }

    .tt-color-swatch {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.1s;

      &:hover { transform: scale(1.15); }
      &.tt-swatch-active { border-color: #0056D2; box-shadow: 0 0 0 2px rgba(0, 86, 210, 0.2); }
      &.tt-swatch-light { border-color: #E5E7EB; }
    }

    .tt-color-reset {
      width: 100%;
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: #6B7280;
      font-size: 12px;
      cursor: pointer;
      text-align: center;
      &:hover { background: #F3F4F6; color: #DC2626; }
    }

    @keyframes ttDropIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Link edit bar ── */
    .tt-link-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      border: 1px solid #E5E7EB;
      border-top: none;
      background: #F9FAFB;
      animation: ttDropIn 0.15s ease-out;
    }

    .tt-link-input {
      flex: 1;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 13px;
      outline: none;
      &:focus { border-color: #0056D2; box-shadow: 0 0 0 2px rgba(0,86,210,.1); }
    }

    .tt-link-action {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      svg { width: 16px; height: 16px; }
    }
    .tt-link-apply { color: #16A34A; &:hover { background: #F0FDF4; } }
    .tt-link-remove { color: #DC2626; &:hover { background: #FEF2F2; } }

    /* ── Bubble menu ── */
    .tt-bubble {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 4px 6px;
      background: #1F2937;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,.25);
    }

    .tt-bubble-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: #D1D5DB;
      cursor: pointer;
      transition: all 0.1s;
      &:hover { background: #374151; color: white; }
      &.tt-active { background: #0056D2; color: white; }
    }

    .tt-bubble-sep {
      width: 1px;
      height: 18px;
      background: #4B5563;
      margin: 0 2px;
    }

    /* ── Editor content ── */
    .tt-content {
      border: 1px solid #E5E7EB;
      background: white;
      overflow-y: auto;

      :host ::ng-deep .tiptap {
        padding: 16px;
        outline: none;
        font-size: 14px;
        line-height: 1.7;
        color: #1F1F1F;

        &:focus { border-color: #0056D2; }

        h2 { font-size: 20px; font-weight: 700; margin: 24px 0 8px; }
        h3 { font-size: 17px; font-weight: 600; margin: 20px 0 6px; }
        p { margin: 0 0 8px; }
        ul, ol { padding-left: 24px; margin: 8px 0; }
        blockquote { border-left: 3px solid #0056D2; padding-left: 16px; color: #6B7280; margin: 12px 0; }
        code { background: #F3F4F6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
        pre { background: #1F2937; color: #E5E7EB; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 12px 0; }
        pre code { background: none; padding: 0; color: inherit; }
        img { max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        td, th { border: 1px solid #E5E7EB; padding: 8px 12px; text-align: left; }
        th { background: #F9FAFB; font-weight: 600; }
        a { color: #0056D2; text-decoration: underline; cursor: pointer; }
        a:hover { color: #004BB5; }
        mark { border-radius: 2px; padding: 1px 2px; }
        sub { font-size: 0.75em; }
        sup { font-size: 0.75em; }
        hr { border: none; border-top: 2px solid #E5E7EB; margin: 16px 0; }

        .is-empty::before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          float: left;
          height: 0;
          pointer-events: none;
        }

        /* Text alignment */
        .has-text-align-center { text-align: center; }
        .has-text-align-right { text-align: right; }
        .has-text-align-left { text-align: left; }

        /* YouTube responsive embed */
        div[data-youtube-video] {
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
          overflow: hidden;
          border-radius: 8px;
          margin: 12px 0;
          iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
        }
      }
    }

    /* ── Footer ── */
    .tt-footer {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border: 1px solid #E5E7EB;
      border-top: none;
      border-radius: 0 0 8px 8px;
      background: #FAFAFA;
      font-size: 11px;
      color: #9CA3AF;
    }

    .tt-footer-sep { color: #D1D5DB; }

    .hidden { display: none; }
  `],
})
export class TiptapEditorComponent implements ControlValueAccessor, OnDestroy {
  readonly placeholder = input('Nhập nội dung...');
  readonly height = input(360);
  readonly uploadFn = input<((file: File) => Promise<string>) | null>(null);
  readonly videoUploadFn = input<((file: File) => Promise<string>) | null>(null);

  editor!: Editor;
  linkUrl = '';
  readonly colorPresets = COLOR_PRESETS;

  readonly linkEditMode = signal(false);
  readonly openDropdown = signal<string | null>(null);

  private fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private videoFileInputRef = viewChild<ElementRef<HTMLInputElement>>('videoFileInput');
  private linkInputRef = viewChild<ElementRef<HTMLInputElement>>('linkInput');
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private readonly updateTick = signal(0);

  readonly activeTextColor = computed(() => {
    this.updateTick();
    if (!this.editor) return '#1F2937';
    return this.editor.getAttributes('textStyle')?.['color'] || '#1F2937';
  });

  readonly charCount = computed(() => {
    this.updateTick();
    if (!this.editor) return 0;
    return this.editor.storage['characterCount']?.characters?.() ?? 0;
  });

  readonly wordCount = computed(() => {
    this.updateTick();
    if (!this.editor) return 0;
    return this.editor.storage['characterCount']?.words?.() ?? 0;
  });

  constructor() {
    this.editor = new Editor({
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } },
        }),
        Image.configure({ inline: false, allowBase64: false }),
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader,
        CodeBlockLowlight.configure({ lowlight }),
        Placeholder.configure({ placeholder: this.placeholder() }),
        Youtube.configure({ width: 640, height: 360 }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        Subscript,
        Superscript,
        CharacterCount,
      ],
      content: '',
      onUpdate: ({ editor }) => {
        this.onChange(editor.getHTML());
        this.updateTick.update(n => n + 1);
      },
      onSelectionUpdate: () => {
        this.updateTick.update(n => n + 1);
      },
      onBlur: () => {
        this.onTouched();
      },
    });
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  // ── ControlValueAccessor ──

  writeValue(value: string): void {
    if (this.editor && value !== this.editor.getHTML()) {
      this.editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.editor?.setEditable(!disabled);
  }

  // ── Commands ──

  exec(command: string, attrs?: Record<string, any>): void {
    const chain = this.editor.chain().focus() as any;
    if (attrs) {
      chain[command](attrs).run();
    } else {
      chain[command]().run();
    }
  }

  setAlign(alignment: string): void {
    this.editor.chain().focus().setTextAlign(alignment).run();
  }

  insertTable(): void {
    this.editor.chain().focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }

  // ── Link ──

  toggleLink(): void {
    if (this.editor.isActive('link')) {
      this.linkUrl = this.editor.getAttributes('link')?.['href'] || '';
      this.linkEditMode.set(true);
      setTimeout(() => this.linkInputRef()?.nativeElement?.focus());
    } else if (!this.editor.state.selection.empty) {
      this.linkUrl = '';
      this.linkEditMode.set(true);
      setTimeout(() => this.linkInputRef()?.nativeElement?.focus());
    }
  }

  applyLink(): void {
    const url = this.linkUrl.trim();
    if (url) {
      this.editor.chain().focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }
    this.linkEditMode.set(false);
    this.linkUrl = '';
  }

  removeLink(): void {
    this.editor.chain().focus().unsetLink().run();
    this.linkEditMode.set(false);
    this.linkUrl = '';
  }

  cancelLink(): void {
    this.linkEditMode.set(false);
    this.linkUrl = '';
    this.editor.chain().focus().run();
  }

  // ── Color ──

  setColor(color: string): void {
    this.editor.chain().focus().setColor(color).run();
    this.closeDropdown();
  }

  setHighlight(color: string): void {
    this.editor.chain().focus().toggleHighlight({ color }).run();
    this.closeDropdown();
  }

  toggleDropdown(name: string): void {
    this.openDropdown.set(this.openDropdown() === name ? null : name);
  }

  closeDropdown(): void {
    this.openDropdown.set(null);
  }

  // ── Image ──

  triggerImageUpload(): void {
    this.fileInputRef()?.nativeElement?.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const fn = this.uploadFn();
    if (fn) {
      const url = await fn(file);
      if (url) {
        this.editor.chain().focus().setImage({ src: url }).run();
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        this.editor.chain().focus().setImage({ src: reader.result as string }).run();
      };
      reader.readAsDataURL(file);
    }

    (event.target as HTMLInputElement).value = '';
  }

  // ── YouTube ──

  insertYoutube(): void {
    const url = prompt('Nhập URL video YouTube:');
    if (url) {
      this.editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }

  // ── Video Upload ──

  triggerVideoUpload(): void {
    this.videoFileInputRef()?.nativeElement?.click();
  }

  async onVideoFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const fn = this.videoUploadFn();
    if (!fn) return;

    // Insert placeholder while uploading
    this.editor.chain().focus().insertContent(
      `<p><em>Đang tải video "${file.name}"...</em></p>`
    ).run();

    try {
      const url = await fn(file);
      if (url) {
        // Replace placeholder with HTML5 video
        this.editor.chain().focus().insertContent(
          `<video src="${url}" controls style="max-width:100%;border-radius:8px;margin:12px 0"></video>`
        ).run();
      }
    } catch {
      this.editor.chain().focus().insertContent(
        `<p><em>Tải video thất bại. Vui lòng thử lại.</em></p>`
      ).run();
    }

    (event.target as HTMLInputElement).value = '';
  }
}
