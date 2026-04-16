import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TiptapEditorComponent } from './tiptap-editor.component';
import { createTiptapUploadFn } from './tiptap-upload';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-tiptap-demo',
  imports: [TiptapEditorComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50 p-6">
      <div class="max-w-[900px] mx-auto">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">TipTap Editor Demo</h1>
        <p class="text-sm text-gray-500 mb-6">Thử nghiệm editor mới thay thế CKEditor</p>

        <app-tiptap-editor
          [(ngModel)]="content"
          [uploadFn]="uploadFn"
          [height]="400"
          placeholder="Bắt đầu soạn nội dung bài giảng..." />

        <div class="mt-6 p-4 bg-white rounded-lg border border-gray-200">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">HTML Output:</h3>
          <pre class="text-xs text-gray-500 whitespace-pre-wrap max-h-48 overflow-y-auto">{{ content }}</pre>
        </div>
      </div>
    </div>
  `
})
export class TiptapDemoComponent {
  private http = inject(HttpClient);
  content = '<h2>Chào mừng đến với TipTap Editor</h2><p>Đây là editor mới thay thế CKEditor — không giới hạn số lần load, hỗ trợ slash commands và nhiều tính năng hiện đại.</p><p>Thử các tính năng: <strong>đậm</strong>, <em>nghiêng</em>, <u>gạch chân</u>, danh sách, bảng, hình ảnh...</p>';
  uploadFn = createTiptapUploadFn(this.http, environment.apiUrl);
}
