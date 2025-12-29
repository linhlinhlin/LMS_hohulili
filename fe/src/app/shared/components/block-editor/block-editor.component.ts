import { Component, ElementRef, forwardRef, OnDestroy, AfterViewInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
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
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-block-editor',
    standalone: true,
    templateUrl: './block-editor.component.html',
    styleUrl: './block-editor.component.scss',
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

    @Input() set initialBlocks(blocks: any[]) {
        if (blocks && blocks.length > 0) {
            this.value = { blocks } as any;
            if (this.editor && this.editor.render) {
                this.editor.render(this.value as OutputData);
            }
        }
    }

    @Output() blocksChange = new EventEmitter<any[]>();

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
                    class: Header as any,
                    config: {
                        placeholder: 'Tiêu đề',
                        levels: [2, 3, 4],
                        defaultLevel: 3
                    }
                },
                list: {
                    class: List as any,
                    inlineToolbar: true,
                    config: {
                        defaultStyle: 'unordered'
                    }
                },
                quote: {
                    class: Quote as any,
                    inlineToolbar: true,
                    config: {
                        quotePlaceholder: 'Nhập trích dẫn',
                        captionPlaceholder: 'Tác giả'
                    }
                },
                image: {
                    class: ImageTool as any,
                    config: {
                        endpoints: {
                            byFile: `${environment.apiUrl}/api/v1/files/upload/editor`,
                        },
                        field: 'file',
                        // Retrieve token from local storage if needed for Auth
                        additionalRequestHeaders: {
                            Authorization: `Bearer ${localStorage.getItem('token') || ''}`
                        }
                    }
                }
            } as any, // Cast to any to avoid strict type issues
            data: this.value || undefined,
            onChange: async () => {
                const data = await this.editor.save();
                this.value = data;
                this.onChange(data);
                if (data && data.blocks) {
                    this.blocksChange.emit(data.blocks);
                }
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
