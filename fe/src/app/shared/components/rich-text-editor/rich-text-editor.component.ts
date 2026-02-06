import { Component, input, output, ViewEncapsulation, forwardRef, effect, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import {
    ClassicEditor,
    Essentials, Paragraph, Heading,
    Bold, Italic, Underline, Strikethrough, Subscript, Superscript, RemoveFormat,
    Font, FontFamily, FontSize, FontColor, FontBackgroundColor,
    Alignment, List, Indent, IndentBlock, BlockQuote,
    Link, Image, ImageUpload, ImageToolbar, ImageStyle, ImageResize, ImageCaption,
    Table, TableToolbar, MediaEmbed,
    SourceEditing, Autoformat
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';
import { Base64UploadAdapterPlugin } from '../../../core/utils/base64-upload-adapter';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-rich-text-editor',
    imports: [FormsModule, CKEditorModule],
    template: `
    <div class="editor-container-wrapper" [style.height.px]="height()">
        <ckeditor
          [editor]="Editor"
          [(ngModel)]="content"
          (ngModelChange)="onContentChange($event)"
          (blur)="onTouched()"
          [config]="editorConfig"
          [disabled]="isDisabled">
        </ckeditor>
    </div>
  `,
    styleUrls: ['./rich-text-editor.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => RichTextEditorComponent),
            multi: true
        }
    ]
})
export class RichTextEditorComponent implements ControlValueAccessor {
    // Signal inputs - Angular v20+
    placeholder = input<string>('Nhập nội dung...');
    height = input<number>(300);

    // Signal output - Angular v20+
    contentChange = output<string>();

    // Mutable state for ControlValueAccessor
    public content: string = '';
    public Editor = ClassicEditor;
    public isDisabled = false;

    // ControlValueAccessor callbacks
    private onChange: (value: string) => void = () => { };
    public onTouched: () => void = () => { };

    public editorConfig: any = {
        licenseKey: 'GPL',
        placeholder: 'Nhập nội dung...',
        plugins: [
            Essentials, Paragraph, Heading,
            Bold, Italic, Underline, Strikethrough, Subscript, Superscript, RemoveFormat,
            Font, FontFamily, FontSize, FontColor, FontBackgroundColor,
            Alignment, List, Indent, IndentBlock, BlockQuote,
            Link, Image, ImageUpload, ImageToolbar, ImageStyle, ImageResize, ImageCaption,
            Table, TableToolbar, MediaEmbed,
            SourceEditing, Autoformat,
            Base64UploadAdapterPlugin
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
        image: {
            toolbar: [
                'imageTextAlternative', 'toggleImageCaption', 'imageStyle:inline', 'imageStyle:block', 'imageStyle:side'
            ]
        },
        table: {
            contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells']
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
        }
    };

    // Effect to update editorConfig when placeholder changes
    constructor() {
        effect(() => {
            const ph = this.placeholder();
            this.editorConfig = { ...this.editorConfig, placeholder: ph };
        });
    }

    // ControlValueAccessor Implementation
    writeValue(value: string): void {
        this.content = value || '';
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
    }

    onContentChange(value: string) {
        this.content = value;
        this.contentChange.emit(value); // Keep supporting explicit binding
        this.onChange(value);
    }
}
