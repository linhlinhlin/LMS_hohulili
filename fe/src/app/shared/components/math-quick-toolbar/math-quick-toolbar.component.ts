import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-math-quick-toolbar',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
      
      <!-- Basic Math -->
      <div class="flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
        <button (click)="insert('\\frac{numerator}{denominator}')" class="p-1 hover:bg-gray-100 rounded text-gray-700 text-xs font-serif" title="Fraction">
          (a/b)
        </button>
        <button (click)="insert('\\sqrt{}')" class="p-1 hover:bg-gray-100 rounded text-gray-700 text-xs" title="Square Root">
          √
        </button>
        <button (click)="insert('^{}')" class="p-1 hover:bg-gray-100 rounded text-gray-700 text-xs" title="Superscript">
          x²
        </button>
      </div>

      <!-- Maritime Symbols -->
      <div class="flex items-center gap-1">
        <button (click)="insert('\\Delta')" class="p-1 hover:bg-blue-50 text-blue-800 rounded font-serif italic" title="Displacement">
          Δ
        </button>
        <button (click)="insert('\\nabla')" class="p-1 hover:bg-blue-50 text-blue-800 rounded font-serif italic" title="Nabla">
          ∇
        </button>
        <button (click)="insert('\\theta')" class="p-1 hover:bg-blue-50 text-blue-800 rounded font-serif italic" title="Heel Angle">
          θ
        </button>
        <button (click)="insert('\\Sigma')" class="p-1 hover:bg-blue-50 text-blue-800 rounded font-serif italic" title="Sum">
          Σ
        </button>
        <button (click)="insert('\\alpha')" class="p-1 hover:bg-blue-50 text-blue-800 rounded font-serif italic" title="Alpha">
          α
        </button>
        <button (click)="insert('\\beta')" class="p-1 hover:bg-blue-50 text-blue-800 rounded font-serif italic" title="Beta">
          β
        </button>
        <button (click)="insert('\\omega')" class="p-1 hover:bg-blue-50 text-blue-800 rounded font-serif italic" title="Omega">
          ω
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

    insert(symbol: string) {
        this.insertSymbol.emit(symbol);
    }
}
