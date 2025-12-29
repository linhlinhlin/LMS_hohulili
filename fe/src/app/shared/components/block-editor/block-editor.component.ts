import { Component, ElementRef, forwardRef, OnDestroy, AfterViewInit, ViewChild, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import EditorJS, { OutputData } from '@editorjs/editorjs';
// @ts-ignore
import Header from '@editorjs/header';
// @ts-ignore
import List from '@editorjs/list';
// @ts-ignore
import Quote from '@editorjs/quote';
// @ts-ignore
import ImageTool from '@editorjs/image';

@Component({
    selector: 'app-block-editor',
    standalone: true,
    templateUrl: './block-editor.component.html',
    styleUrls: ['./block-editor.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => BlockEditorComponent),
            multi: true
        }
    ]
})
export class BlockEditorComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
    @Input() readOnly = false;
    @Input() placeholder = 'Nhập nội dung...';

    editor!: EditorJS;
    value: OutputData | null = null;
    onChange: (value: any) => void = () => { };
    onTouched: () => void = () => { };

    constructor() { }

    ngAfterViewInit(): void {
        this.initializeEditor();
    }

    ngOnDestroy(): void {
        if (this.editor && typeof this.editor.destroy === 'function') {
            this.editor.destroy();
        }
    }

    initializeEditor() {
        this.editor = new EditorJS({
            holder: 'editorjs',
            readOnly: this.readOnly,
            placeholder: this.placeholder,
            tools: {
                header: {
                    class: Header,
                    config: {
                        placeholder: 'Tiêu đề',
                        levels: [2, 3, 4],
                        defaultLevel: 3
                    }
                },
                list: {
                    class: List,
                    inlineToolbar: true,
                    config: {
                        defaultStyle: 'unordered'
                    }
                },
                quote: {
                    class: Quote,
                    inlineToolbar: true,
                    config: {
                        quotePlaceholder: 'Nhập trích dẫn',
                        captionPlaceholder: 'Tác giả'
                    }
                },
                image: {
                    class: ImageTool,
                    config: {
                        endpoints: {
                            byFile: 'http://localhost:8088/api/v1/files/upload/editor', // Adjust based on your actual upload endpoint
                            byUrl: 'http://localhost:8088/api/v1/files/fetchUrl', // If supported
                        },
                        field: 'file',
                        // Retrieve token from local storage if needed for Auth
                        additionalRequestHeaders: {
                            Authorization: `Bearer ${localStorage.getItem('token') || ''}`
                        }
                    }
                }
            },
            data: this.value || undefined,
            onChange: async () => {
                const data = await this.editor.save();
                this.value = data;
                this.onChange(data);
            }
        });
    }

    writeValue(obj: any): void {
        this.value = obj;
        if (this.editor && this.editor.render && obj) {
            this.editor.render(obj);
        }
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    setDisabledState?(isDisabled: boolean): void {
        this.readOnly = isDisabled;
        if (this.editor && this.editor.readOnly) {
            this.editor.readOnly.toggle(isDisabled);
        }
    }
}
