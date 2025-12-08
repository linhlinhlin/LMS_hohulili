Chào bạn, tôi đã xem kỹ code HTML và SCSS của bạn. Cấu trúc DOM và Styling của bạn đã rất tốt (đã dùng Flexbox, xử lý overflow, ẩn branding).

Tuy nhiên, lý do Editor của bạn "trắng trơn" hoặc thiếu chức năng (ví dụ: không thấy nút chèn ảnh, không thấy font,...) là do bạn chưa khai báo Plugins trong file TypeScript (.ts).

Trong CKEditor 5, Toolbar chỉ là cái vỏ, Plugin mới là cái ruột. Nếu bạn khai báo toolbar là 'uploadImage' nhưng không import plugin ImageUpload, nút đó sẽ không hiện ra.

Dưới đây là phần code TypeScript hoàn chỉnh để "kích hoạt" toàn bộ chức năng (bao gồm cả Adapter Base64 bạn đã viết):

1. Cập nhật file course-curriculum.component.ts

Bạn hãy thay thế hoặc cập nhật file component bằng đoạn code sau. Lưu ý phần imports và plugins.

code
TypeScript
download
content_copy
expand_less
import { Component, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';

// 1. IMPORT TẤT CẢ CÁC PLUGIN CẦN THIẾT TỪ 'ckeditor5'
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

// 2. IMPORT ADAPTER BẠN ĐÃ VIẾT
import { Base64UploadAdapterPlugin } from '../../core/utils/base64-upload-adapter';

@Component({
  selector: 'app-course-curriculum',
  standalone: true,
  imports: [CommonModule, FormsModule, CKEditorModule],
  templateUrl: './course-curriculum.component.html',
  styleUrls: ['./course-curriculum.component.scss']
})
export class CourseCurriculumComponent {
  public Editor = ClassicEditor;
  public lessonContent = '<p><span style="font-family:Arial, Helvetica, sans-serif;">Nội dung bài học...</span></p>';
  public editorHeight = signal(450); // Chiều cao mặc định
  
  // Helper để đếm từ
  private editorInstance: any;

  constructor(private cdr: ChangeDetectorRef) {}

  // 3. CẤU HÌNH CONFIG CHI TIẾT
  public editorConfig = {
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

  // 4. CÁC HÀM XỬ LÝ SỰ KIỆN
  onEditorReady(editor: any) {
    this.editorInstance = editor;
  }

  getWordCount(): number {
    if (!this.editorInstance) return 0;
    const data = this.editorInstance.getData();
    // Loại bỏ thẻ HTML để đếm chữ
    const plainText = data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return plainText ? plainText.split(' ').length : 0;
  }

  // Hàm Resize của bạn
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
}
2. Kiểm tra lại SCSS (Một chỉnh sửa nhỏ)

Trong đoạn SCSS bạn gửi, phần .ck-editor__top bạn đang set z-index: 1. Đôi khi z-index này thấp hơn các thành phần khác (ví dụ Header của trang web).

Nếu khi cuộn trang mà Toolbar bị che khuất hoặc Toolbar của editor đè lên menu dropdown, hãy chỉnh lại z-index an toàn hơn:

code
Scss
download
content_copy
expand_less
/* Trong course-curriculum.component.scss */
::ng-deep {
    /* ... các phần cũ ... */

    .ck.ck-editor {
        /* ... */
        .ck-editor__top {
            /* ... */
            z-index: 10 !important; /* Tăng lên 1 chút để chắc chắn nó nằm trên content */
            position: sticky; /* (Tùy chọn) Giúp toolbar dính lên đầu khi cuộn editor dài */
            top: 0;
        }
    }
}
3. Giải thích tại sao code cũ bị lỗi

Trong hình ảnh bạn gửi, Editor trông giống như một khung trắng vì:

Thiếu Plugins: Trong code cũ (nếu bạn chỉ copy phần HTML/CSS), Angular không biết uploadImage là gì nên nó ẩn nút đó đi.

Thiếu Base64 Plugin: Nếu không có Base64UploadAdapterPlugin trong mảng plugins, khi bạn bấm upload ảnh, CKEditor sẽ đòi URL server (mà bạn chưa làm backend upload) -> Dẫn đến lỗi không hiện ảnh.

Kết quả mong đợi sau khi sửa

Thanh công cụ sẽ hiện đầy đủ các nút: Font chữ (Arial đầu tiên), Màu sắc, Chèn ảnh, Bảng...

Bấm vào nút ảnh -> Chọn ảnh từ máy -> Ảnh sẽ hiện ra ngay lập tức trong khung soạn thảo.

Giao diện vẫn giữ nguyên vẻ đẹp Clean UI/UX mà bạn đã dựng bằng SCSS.