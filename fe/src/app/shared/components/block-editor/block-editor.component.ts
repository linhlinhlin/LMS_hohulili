import { Component, ElementRef, forwardRef, OnDestroy, AfterViewInit, ViewChild, Input, Output, EventEmitter, ViewEncapsulation, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import EditorJS, { OutputData } from '@editorjs/editorjs';
// @ts-ignore
import List from '@editorjs/list';
// @ts-ignore
import ImageTool from '@editorjs/image';
// @ts-ignore
import Table from '@editorjs/table';
// @ts-ignore
import Warning from '@editorjs/warning';
// Custom Math Tool with KaTeX preview
import MathBlockTool from './math-block-tool';
import { environment } from '../../../../environments/environment';

/**
 * SOTA 2025 Maritime-Optimized Block Editor
 * 
 * Tools included (5 essential):
 * 1. Text (paragraph) - Default
 * 2. Image - Sơ đồ, hình ảnh kỹ thuật hàng hải
 * 3. List - Quy trình thực hiện, danh sách thiết bị
 * 4. Table - Bảng tra cứu dữ liệu, thông số kỹ thuật
 * 5. Warning - Mô tả tình huống khẩn cấp/giả định
 * 6. Math - Công thức LaTeX với preview KaTeX
 * 
 * Tools REMOVED (to reduce noise):
 * - Header: Không cần trong câu hỏi trắc nghiệm
 * - Quote: Không phù hợp với bài thi kỹ thuật
 * - Checklist: Gây nhầm lẫn với đáp án
 * - Link: Tránh xao nhãng khi làm bài
 */
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
    ],
    encapsulation: ViewEncapsulation.None
})
export class BlockEditorComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
    @Input() readOnly = false;
    @Input() placeholder = 'Nhập nội dung câu hỏi...';

    @Input() set initialBlocks(blocks: any[]) {
        if (blocks && blocks.length > 0) {
            this.value = { blocks } as any;
            if (this.editor && this.editor.render) {
                this.editor.render(this.value as OutputData);
            }
        }
    }

    @Output() blocksChange = new EventEmitter<any[]>();

    @ViewChild('editorContainer') editorContainer!: ElementRef;

    private http = inject(HttpClient);

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
        if (!this.editorContainer) {
            console.error('Editor container not found', this.editorContainer);
            return;
        }

        console.log('Initializing Maritime EditorJS...');

        try {
            this.editor = new EditorJS({
                holder: this.editorContainer.nativeElement,
                readOnly: this.readOnly,
                placeholder: this.placeholder,

                // SOTA 2025: Maritime-optimized toolset
                tools: {
                    // ============================================
                    // 1. LIST - Quy trình, danh sách thiết bị
                    // ============================================
                    list: {
                        class: List as any,
                        inlineToolbar: true,
                        config: {
                            defaultStyle: 'unordered'
                        },
                        toolbox: {
                            title: 'Danh sách',
                            icon: '<svg width="17" height="13" viewBox="0 0 17 13" xmlns="http://www.w3.org/2000/svg"><path d="M5.625 4.85h9.25a1.125 1.125 0 0 1 0 2.25h-9.25a1.125 1.125 0 0 1 0-2.25zm0-4.85h9.25a1.125 1.125 0 0 1 0 2.25h-9.25a1.125 1.125 0 0 1 0-2.25zm0 9.85h9.25a1.125 1.125 0 0 1 0 2.25h-9.25a1.125 1.125 0 0 1 0-2.25zm-4.5-5a1.125 1.125 0 1 1 0 2.25 1.125 1.125 0 0 1 0-2.25zm0-4.85a1.125 1.125 0 1 1 0 2.25 1.125 1.125 0 0 1 0-2.25zm0 9.85a1.125 1.125 0 1 1 0 2.25 1.125 1.125 0 0 1 0-2.25z"/></svg>'
                        }
                    },

                    // ============================================
                    // 2. IMAGE - Sơ đồ, hải đồ, hình ảnh kỹ thuật
                    // ============================================
                    image: {
                        class: ImageTool as any,
                        config: {
                            endpoints: {
                                byFile: `${environment.apiUrl}/api/v3/files/upload/editor`,
                            },
                            field: 'file',
                            additionalRequestHeaders: (() => {
                                const t = localStorage.getItem('lms_access_token') || localStorage.getItem('token');
                                return t ? { 'Authorization': `Bearer ${t}` } : {};
                            })(),
                            captionPlaceholder: 'Chú thích hình ảnh (tùy chọn)',
                            buttonContent: 'Chọn hình ảnh'
                        },
                        toolbox: {
                            title: 'Hình ảnh',
                            icon: '<svg width="17" height="15" viewBox="0 0 336 276" xmlns="http://www.w3.org/2000/svg"><path d="M291 150V79c0-19-15-34-34-34H79c-19 0-34 15-34 34v42l67-44 81 72 56-29 42 30zm0 52l-43-30-56 30-81-67-66 39v23c0 19 15 34 34 34h178c17 0 31-13 34-29zM79 0h178c44 0 79 35 79 79v118c0 44-35 79-79 79H79c-44 0-79-35-79-79V79C0 35 35 0 79 0z"/></svg>'
                        }
                    },

                    // ============================================
                    // 3. TABLE - Bảng tra cứu, thông số kỹ thuật
                    // ============================================
                    table: {
                        class: Table as any,
                        inlineToolbar: true,
                        config: {
                            rows: 3,
                            cols: 3,
                            withHeadings: true
                        },
                        toolbox: {
                            title: 'Bảng dữ liệu',
                            icon: '<svg width="18" height="14" viewBox="0 0 18 14" xmlns="http://www.w3.org/2000/svg"><path d="M2.833 8.833V11h3.334V8.833H2.833zm0-2.333h3.334V4.167H2.833V6.5zm5 2.333V11h3.334V8.833H7.833zm0-2.333h3.334V4.167H7.833V6.5zm5 2.333V11h3.334V8.833h-3.334zm0-2.333h3.334V4.167h-3.334V6.5zM1.5 2.833V11c0 .92.746 1.667 1.667 1.667h11.666c.92 0 1.667-.746 1.667-1.667V2.833c0-.92-.746-1.666-1.667-1.666H3.167c-.92 0-1.667.746-1.667 1.666z"/></svg>'
                        }
                    },

                    // ============================================
                    // 4. WARNING - Tình huống giả định, cảnh báo
                    // ============================================
                    warning: {
                        class: Warning as any,
                        inlineToolbar: true,
                        config: {
                            titlePlaceholder: 'Tình huống / Cảnh báo',
                            messagePlaceholder: 'Mô tả chi tiết tình huống giả định hoặc điều kiện đặc biệt...'
                        },
                        toolbox: {
                            title: 'Tình huống',
                            icon: '<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><path d="M8.5 0C3.813 0 0 3.813 0 8.5S3.813 17 8.5 17 17 13.187 17 8.5 13.187 0 8.5 0zm0 15.3c-3.749 0-6.8-3.051-6.8-6.8s3.051-6.8 6.8-6.8 6.8 3.051 6.8 6.8-3.051 6.8-6.8 6.8z"/><path d="M8.5 3.4c-.663 0-1.2.537-1.2 1.2v4.25c0 .663.537 1.2 1.2 1.2s1.2-.537 1.2-1.2V4.6c0-.663-.537-1.2-1.2-1.2zm0 8.5c-.663 0-1.2.537-1.2 1.2s.537 1.2 1.2 1.2 1.2-.537 1.2-1.2-.537-1.2-1.2-1.2z"/></svg>'
                        }
                    },

                    // ============================================
                    // 5. MATH - Công thức LaTeX với KaTeX preview
                    // ============================================
                    math: {
                        class: MathBlockTool as any,
                        toolbox: {
                            title: 'Công thức',
                            icon: '<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><text x="2" y="14" font-family="serif" font-size="14" font-style="italic">∑</text></svg>'
                        }
                    }

                    // ============================================
                    // REMOVED TOOLS (SOTA 2025 - Less is More):
                    // - header: Không cần trong câu hỏi trắc nghiệm
                    // - quote: Không phù hợp với bài thi kỹ thuật  
                    // - checklist: Gây nhầm lẫn với đáp án
                    // - link: Tránh xao nhãng khi làm bài
                    // ============================================

                } as any,

                data: this.value || undefined,

                onChange: async () => {
                    const data = await this.editor.save();
                    this.value = data;
                    this.onChange(data);
                    if (data && data.blocks) {
                        this.blocksChange.emit(data.blocks);
                    }
                },

                // Localization for Vietnamese
                i18n: {
                    messages: {
                        ui: {
                            blockTunes: {
                                toggler: {
                                    'Click to tune': 'Nhấn để điều chỉnh',
                                    'or drag to move': 'hoặc kéo để di chuyển'
                                }
                            },
                            inlineToolbar: {
                                converter: {
                                    'Convert to': 'Chuyển thành'
                                }
                            },
                            toolbar: {
                                toolbox: {
                                    'Add': 'Thêm'
                                }
                            }
                        },
                        toolNames: {
                            'Text': 'Văn bản',
                            'List': 'Danh sách',
                            'Image': 'Hình ảnh',
                            'Table': 'Bảng',
                            'Warning': 'Tình huống',
                            'Math': 'Công thức'
                        },
                        tools: {
                            list: {
                                'Unordered': 'Không đánh số',
                                'Ordered': 'Đánh số'
                            },
                            warning: {
                                'Title': 'Tiêu đề',
                                'Message': 'Nội dung'
                            },
                            table: {
                                'Add row above': 'Thêm hàng phía trên',
                                'Add row below': 'Thêm hàng phía dưới',
                                'Delete row': 'Xóa hàng',
                                'Add column left': 'Thêm cột bên trái',
                                'Add column right': 'Thêm cột bên phải',
                                'Delete column': 'Xóa cột',
                                'With headings': 'Có tiêu đề',
                                'Without headings': 'Không tiêu đề'
                            }
                        },
                        blockTunes: {
                            delete: {
                                'Delete': 'Xóa'
                            },
                            moveUp: {
                                'Move up': 'Di chuyển lên'
                            },
                            moveDown: {
                                'Move down': 'Di chuyển xuống'
                            }
                        }
                    }
                }
            });
        } catch (e) {
            console.error('EditorJS Initialization Error:', e);
        }
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
