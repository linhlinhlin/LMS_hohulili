import { HttpClient } from '@angular/common/http';
import {
  ClassicEditor,
  Essentials, Paragraph,
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript, RemoveFormat,
  Font, FontFamily, FontSize, FontColor, FontBackgroundColor,
  Alignment, List, Indent, IndentBlock, BlockQuote, Heading,
  Link, Image, ImageUpload, ImageToolbar, ImageStyle, ImageResize, ImageCaption,
  Table, TableToolbar, MediaEmbed,
  SourceEditing, Autoformat
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import { createServerUploadPlugin } from '../../../../../../core/utils/server-upload-adapter';

export const CKEDITOR_CLASS = ClassicEditor;

export function createCKEditorConfig(http: HttpClient, apiUrl: string) {
  return {
    licenseKey: 'GPL',
    plugins: [
      Essentials, Paragraph, Heading,
      Bold, Italic, Underline, Strikethrough, Subscript, Superscript, RemoveFormat,
      Font, FontFamily, FontSize, FontColor, FontBackgroundColor,
      Alignment, List, Indent, IndentBlock, BlockQuote,
      Link, Image, ImageUpload, ImageToolbar, ImageStyle, ImageResize, ImageCaption,
      Table, TableToolbar, MediaEmbed,
      SourceEditing, Autoformat,
      createServerUploadPlugin(http, apiUrl)
    ],
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
      shouldNotGroupWhenFull: true
    },
    fontFamily: {
      options: [
        'default',
        'Arial, Helvetica, sans-serif',
        'Times New Roman, Times, serif',
        'Courier New, Courier, monospace',
        'Verdana, Geneva, sans-serif'
      ],
      supportAllValues: true
    },
    image: {
      toolbar: [
        'imageTextAlternative',
        'toggleImageCaption',
        '|',
        'imageStyle:inline',
        'imageStyle:block',
        'imageStyle:side',
        '|',
        'resizeImage'
      ]
    },
    table: {
      contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells']
    },
    placeholder: 'Nhập nội dung bài học chi tiết tại đây (văn bản, hình ảnh, video)...'
  };
}
