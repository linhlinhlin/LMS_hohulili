import katex from 'katex';

/**
 * SOTA 2025: Custom EditorJS Math Block Tool
 * - Live KaTeX preview
 * - Vietnamese placeholder hints
 * - Quick symbol toolbar
 */
export default class MathBlockTool {
    private api: any;
    private data: { latex: string };
    private wrapper: HTMLElement | null = null;
    private input: HTMLTextAreaElement | null = null;
    private preview: HTMLElement | null = null;
    private toolbar: HTMLElement | null = null;

    static get toolbox() {
        return {
            title: 'Công thức',
            icon: '<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><text x="2" y="14" font-family="serif" font-size="14" font-style="italic">∑</text></svg>'
        };
    }

    static get isReadOnlySupported() {
        return true;
    }

    constructor({ data, api }: { data: any; api: any }) {
        this.api = api;
        this.data = {
            latex: data.latex || ''
        };
    }

    render(): HTMLElement {
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('math-block-wrapper');
        this.wrapper.style.cssText = `
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            background: #fafafa;
        `;

        // Toolbar with quick symbols
        this.toolbar = this.createToolbar();
        this.wrapper.appendChild(this.toolbar);

        // Input area
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = 'padding: 12px; background: white;';

        this.input = document.createElement('textarea');
        this.input.classList.add('math-input');
        this.input.placeholder = 'Nhập công thức LaTeX... (ví dụ: \\frac{a}{b}, \\sqrt{x})';
        this.input.value = this.data.latex;
        this.input.style.cssText = `
            width: 100%;
            min-height: 60px;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-family: 'Fira Code', 'Monaco', monospace;
            font-size: 14px;
            resize: vertical;
            outline: none;
            transition: border-color 0.2s;
        `;
        this.input.addEventListener('focus', () => {
            this.input!.style.borderColor = '#3b82f6';
            this.toolbar!.style.display = 'flex';
        });
        this.input.addEventListener('blur', () => {
            this.input!.style.borderColor = '#d1d5db';
            // Delay hiding toolbar to allow button clicks
            setTimeout(() => {
                if (!this.wrapper?.contains(document.activeElement)) {
                    this.toolbar!.style.display = 'none';
                }
            }, 200);
        });
        this.input.addEventListener('input', () => this.updatePreview());
        
        // Smart Navigation: Tab-to-Exit pattern (like Notion/Desmos)
        this.input.addEventListener('keydown', (e) => this.handleSmartNavigation(e));

        inputContainer.appendChild(this.input);
        this.wrapper.appendChild(inputContainer);

        // Preview area
        this.preview = document.createElement('div');
        this.preview.classList.add('math-preview');
        this.preview.style.cssText = `
            padding: 16px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-top: 1px solid #e5e7eb;
            min-height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        this.wrapper.appendChild(this.preview);

        // Initial render
        this.updatePreview();

        return this.wrapper;
    }

    private createToolbar(): HTMLElement {
        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
            display: none;
            flex-wrap: wrap;
            gap: 4px;
            padding: 8px 12px;
            background: #f8fafc;
            border-bottom: 1px solid #e5e7eb;
        `;

        const symbols = [
            // Basic Math
            { label: 'ᵃ⁄ᵦ', latex: '\\frac{tử số}{mẫu số}', title: 'Phân số' },
            { label: '√', latex: '\\sqrt[bậc]{biểu thức}', title: 'Căn bậc n' },
            { label: 'x²', latex: '^{số mũ}', title: 'Lũy thừa' },
            { label: 'x₂', latex: '_{chỉ số}', title: 'Chỉ số dưới' },
            { label: '|', type: 'divider' },
            // Advanced
            { label: 'Σ', latex: '\\sum_{i=1}^{n}', title: 'Tổng' },
            { label: '∫', latex: '\\int_{a}^{b}', title: 'Tích phân' },
            { label: 'lim', latex: '\\lim_{x \\to \\infty}', title: 'Giới hạn' },
            { label: '|', type: 'divider' },
            // Greek letters (Maritime)
            { label: 'Δ', latex: '\\Delta', title: 'Delta - Lượng giãn nước' },
            { label: 'θ', latex: '\\theta', title: 'Theta - Góc nghiêng' },
            { label: 'α', latex: '\\alpha', title: 'Alpha' },
            { label: 'β', latex: '\\beta', title: 'Beta' },
            { label: 'ω', latex: '\\omega', title: 'Omega' },
            { label: 'π', latex: '\\pi', title: 'Pi' },
            { label: '|', type: 'divider' },
            // Operators
            { label: '±', latex: '\\pm', title: 'Cộng trừ' },
            { label: '×', latex: '\\times', title: 'Nhân' },
            { label: '÷', latex: '\\div', title: 'Chia' },
            { label: '≤', latex: '\\leq', title: 'Nhỏ hơn hoặc bằng' },
            { label: '≥', latex: '\\geq', title: 'Lớn hơn hoặc bằng' },
            { label: '≠', latex: '\\neq', title: 'Khác' },
            { label: '≈', latex: '\\approx', title: 'Xấp xỉ' },
        ];

        symbols.forEach(sym => {
            if (sym.type === 'divider') {
                const divider = document.createElement('div');
                divider.style.cssText = 'width: 1px; height: 20px; background: #d1d5db; margin: 0 4px;';
                toolbar.appendChild(divider);
            } else {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = sym.label;
                btn.title = sym.title || '';
                btn.style.cssText = `
                    padding: 4px 8px;
                    border: 1px solid #e5e7eb;
                    border-radius: 4px;
                    background: white;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.15s;
                    font-family: serif;
                `;
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = '#eff6ff';
                    btn.style.borderColor = '#3b82f6';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = 'white';
                    btn.style.borderColor = '#e5e7eb';
                });
                btn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this.insertSymbol(sym.latex!);
                });
                toolbar.appendChild(btn);
            }
        });

        return toolbar;
    }

    private insertSymbol(latex: string) {
        if (!this.input) return;

        const start = this.input.selectionStart;
        const end = this.input.selectionEnd;
        const value = this.input.value;

        const newValue = value.substring(0, start) + latex + value.substring(end);
        this.input.value = newValue;
        this.data.latex = newValue;

        // Focus and select placeholder if exists
        this.input.focus();
        
        // Find Vietnamese placeholder to select
        const placeholderMatch = latex.match(/[a-zà-ỹA-ZÀ-Ỹ\s]{2,}/u);
        if (placeholderMatch) {
            const placeholder = placeholderMatch[0];
            const placeholderStart = start + latex.indexOf(placeholder);
            const placeholderEnd = placeholderStart + placeholder.length;
            this.input.setSelectionRange(placeholderStart, placeholderEnd);
        } else {
            // Place cursor at end of inserted text
            const newPos = start + latex.length;
            this.input.setSelectionRange(newPos, newPos);
        }

        this.updatePreview();
    }

    private updatePreview() {
        if (!this.preview || !this.input) return;

        const latex = this.input.value.trim();
        this.data.latex = latex;

        if (!latex) {
            this.preview.innerHTML = `
                <div style="color: #9ca3af; font-size: 14px; text-align: center;">
                    <div style="font-style: italic;">Xem trước công thức sẽ hiển thị ở đây</div>
                    <div style="font-size: 12px; margin-top: 4px;">Nhấn vào các nút phía trên để chèn ký hiệu</div>
                    <div style="font-size: 11px; margin-top: 4px; color: #6b7280;">
                        <kbd style="background:#e5e7eb;padding:1px 4px;border-radius:3px;font-size:10px;">Tab</kbd> để nhảy qua placeholder ·
                        <kbd style="background:#e5e7eb;padding:1px 4px;border-radius:3px;font-size:10px;">Space</kbd> tại } để thoát
                    </div>
                </div>
            `;
            return;
        }

        try {
            const rendered = katex.renderToString(latex, {
                throwOnError: false,
                displayMode: true,
                output: 'html'
            });
            this.preview.innerHTML = `
                <div style="font-size: 18px;">${rendered}</div>
            `;
        } catch (e) {
            this.preview.innerHTML = `
                <div style="color: #ef4444; font-size: 13px;">
                    <strong>Lỗi cú pháp:</strong> ${(e as Error).message}
                </div>
            `;
        }
    }

    save(): { latex: string } {
        return {
            latex: this.data.latex
        };
    }

    validate(savedData: { latex: string }): boolean {
        return !!(savedData.latex && savedData.latex.trim().length > 0);
    }

    /**
     * Smart Navigation: Tab-to-Exit pattern
     * - Tab: Jump to next placeholder or exit brace
     * - Shift+Tab: Jump to previous placeholder
     * - Space at '}': Exit the block
     */
    private handleSmartNavigation(e: KeyboardEvent) {
        if (!this.input) return;

        const value = this.input.value;
        const pos = this.input.selectionStart;

        if (e.key === 'Tab') {
            e.preventDefault();
            
            if (e.shiftKey) {
                // Shift+Tab: Jump to previous placeholder
                this.jumpToPreviousPlaceholder(value, pos);
            } else {
                // Tab: Jump to next placeholder or exit brace
                this.jumpToNextPlaceholder(value, pos);
            }
        } else if (e.key === ' ') {
            // Space at '}': Exit the block (move cursor after closing brace)
            if (pos < value.length && value[pos] === '}') {
                e.preventDefault();
                this.input.setSelectionRange(pos + 1, pos + 1);
            }
        }
    }

    /**
     * Jump to next placeholder (Vietnamese text) or closing brace
     */
    private jumpToNextPlaceholder(value: string, currentPos: number) {
        if (!this.input) return;

        // Pattern: Vietnamese placeholder inside braces
        const placeholderRegex = /\{([a-zà-ỹA-ZÀ-Ỹ\s]{2,})\}/gu;
        let match;
        
        // Find next placeholder after current position
        while ((match = placeholderRegex.exec(value)) !== null) {
            const placeholderStart = match.index + 1; // +1 to skip '{'
            const placeholderEnd = placeholderStart + match[1].length;
            
            if (placeholderStart > currentPos) {
                this.input.setSelectionRange(placeholderStart, placeholderEnd);
                return;
            }
        }

        // No more placeholders, find next closing brace
        const nextBrace = value.indexOf('}', currentPos);
        if (nextBrace !== -1) {
            this.input.setSelectionRange(nextBrace + 1, nextBrace + 1);
            return;
        }

        // Nothing found, move to end
        this.input.setSelectionRange(value.length, value.length);
    }

    /**
     * Jump to previous placeholder
     */
    private jumpToPreviousPlaceholder(value: string, currentPos: number) {
        if (!this.input) return;

        const placeholderRegex = /\{([a-zà-ỹA-ZÀ-Ỹ\s]{2,})\}/gu;
        const matches: { start: number; end: number }[] = [];
        let match;

        // Collect all placeholders
        while ((match = placeholderRegex.exec(value)) !== null) {
            matches.push({
                start: match.index + 1,
                end: match.index + 1 + match[1].length
            });
        }

        // Find previous placeholder before current position
        for (let i = matches.length - 1; i >= 0; i--) {
            if (matches[i].end < currentPos) {
                this.input.setSelectionRange(matches[i].start, matches[i].end);
                return;
            }
        }

        // No previous placeholder, move to start
        this.input.setSelectionRange(0, 0);
    }
}
