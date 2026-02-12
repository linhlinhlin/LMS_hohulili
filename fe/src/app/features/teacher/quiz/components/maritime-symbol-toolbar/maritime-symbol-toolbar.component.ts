import { Component, output, ChangeDetectionStrategy } from '@angular/core';


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-maritime-symbol-toolbar',
  imports: [],
  template: `
    <div class="flex flex-wrap gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg mb-2">
      @for (symbol of symbols; track symbol.char) {
        <button (click)="insertSymbol(symbol)"
                class="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 hover:text-[#0056D2] transition-colors"
                [title]="symbol.name">
          {{symbol.char}}
        </button>
      }
    </div>
  `
})
export class MaritimeSymbolToolbarComponent {
  // Output function (Angular v20+)
  readonly symbolSelected = output<string>();

  readonly symbols = [
    { char: 'Δ', name: 'Delta' },
    { char: '∇', name: 'Nabla' },
    { char: 'Σ', name: 'Sigma' },
    { char: 'θ', name: 'Theta' },
    { char: 'λ', name: 'Lambda' },
    { char: 'π', name: 'Pi' },
    { char: 'Ω', name: 'Omega' },
    { char: 'α', name: 'Alpha' },
    { char: 'β', name: 'Beta' },
    { char: '$$', name: 'Block Math' },
    { char: '$', name: 'Inline Math' }
  ];

  insertSymbol(symbol: { char: string }) {
    this.symbolSelected.emit(symbol.char);
  }
}
