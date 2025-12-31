import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * SOTA 2025: Math Quick Toolbar with user-friendly placeholders
 * - Uses type="button" to prevent form submission
 * - Uses mousedown with preventDefault to maintain input focus
 * - Provides Vietnamese placeholders for non-LaTeX users
 */
@Component({
    selector: 'app-math-quick-toolbar',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="flex items-center gap-1 p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">
      
      <!-- Basic Math -->
      <div class="flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
        <button type="button" 
                (mousedown)="onInsert($event, '\\\\frac{tử số}{mẫu số}')" 
                class="p-1.5 hover:bg-blue-50 rounded text-gray-700 text-xs font-serif transition-colors" 
                title="Phân số: tử/mẫu">
          <span class="text-base">ᵃ⁄ᵦ</span>
        </button>
        <button type="button" 
                (mousedown)="onInsert($event, '\\\\sqrt[bậc]{biểu thức}')" 
                class="p-1.5 hover:bg-blue-50 rounded text-gray-700 text-sm transition-colors" 
                title="Căn bậc n">
          √
        </button>
        <button type="button" 
                (mousedown)="onInsert($event, '^{số mũ}')" 
                class="p-1.5 hover:bg-blue-50 rounded text-gray-700 text-xs transition-colors" 
                title="Lũy thừa">
          x²
        </button>
        <button type="button" 
                (mousedown)="onInsert($event, '_{chỉ số}')" 
                class="p-1.5 hover:bg-blue-50 rounded text-gray-700 text-xs transition-colors" 
                title="Chỉ số dưới">
          x₂
        </button>
      </div>

      <!-- Advanced Math -->
      <div class="flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
        <button type="button" 
                (mousedown)="onInsert($event, '\\\\sum_{i=1}^{n}')" 
                class="p-1.5 hover:bg-green-50 text-green-800 rounded font-serif transition-colors" 
                title="Tổng sigma">
          Σ
        </button>
        <button type="button" 
                (mousedown)="onInsert($event, '\\\\int_{a}^{b}')" 
                class="p-1.5 hover:bg-green-50 text-green-800 rounded font-serif transition-colors" 
                title="Tích phân">
          ∫
        </button>
        <button type="button" 
                (mousedown)="onInsert($event, '\\\\lim_{x \\\\to \\\\infty}')" 
                class="p-1.5 hover:bg-green-50 text-green-800 rounded font-serif text-xs transition-colors" 
                title="Giới hạn">
          lim
        </button>
      </div>

      <!-- Maritime/Greek Symbols -->
      <div class="flex items-center gap-1">
        <button type="button" 
                (mousedown)="onInsert($event, '\\\\Delta')" 
                class="p-1.5 hover:bg-blue-50 text-blue-800 rounded font-serif italic transition-colors" 
                title="Delta - Lượng giãn nước">
          Δ
        </button>
        <button type="button" 
                (mousedown)="onInsert($event, '\\\\theta')" 
                class="p-1.5 hover:bg-blue-50 text-blue-800 rounded font-serif italic transition-colors" 
                title="Theta - Góc nghiêng">
          θ
        </button>
        <button type="button" 
                (mousedown)="onInsert($event, '\\\\alpha')" 
                class="p-1.5 hover:bg-blue-50 text-blue-800 rounded font-serif italic transition-colors" 
                title="Alpha">
          α
        </button>
        <button type="button" 
                (mousedown)="onInsert($event, '\\\\beta')" 
                class="p-1.5 hover:bg-blue-50 text-blue-800 rounded font-serif italic transition-colors" 
                title="Beta">
          β
        </button>
        <button type="button" 
                (mousedown)="onInsert($event, '\\\\omega')" 
                class="p-1.5 hover:bg-blue-50 text-blue-800 rounded font-serif italic transition-colors" 
                title="Omega">
          ω
        </button>
        <button type="button" 
                (mousedown)="onInsert($event, '\\\\pi')" 
                class="p-1.5 hover:bg-blue-50 text-blue-800 rounded font-serif italic transition-colors" 
                title="Pi">
          π
        </button>
      </div>

    </div>
  `,
    styles: [`
    :host {
      display: inline-block;
      user-select: none;
    }
  `]
})
export class MathQuickToolbarComponent {
    @Output() insertSymbol = new EventEmitter<string>();

    /**
     * Handle button click with preventDefault to maintain input focus
     */
    onInsert(event: MouseEvent, symbol: string) {
        event.preventDefault();
        event.stopPropagation();
        this.insertSymbol.emit(symbol);
    }
}
