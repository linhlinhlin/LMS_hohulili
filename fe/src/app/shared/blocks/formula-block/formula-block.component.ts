import { Component, input, viewChild, ElementRef, AfterViewInit, effect, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

import { FormulaBlockData } from '../block-types';
import katex from 'katex';

@Component({
    selector: 'app-formula-block',
    imports: [],
    template: `
    <div #formulaContainer class="formula-container overflow-x-auto"
         [class.my-4]="data().format !== 'inline'"
         [class.text-center]="data().format !== 'inline'"
         [class.py-2]="data().format !== 'inline'"
         [class.inline-block]="data().format === 'inline'"></div>
  `,
    styles: [`
    .formula-container {
      font-size: 1.1em;
    }
  `],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class FormulaBlockComponent implements AfterViewInit {
    data = input.required<FormulaBlockData>();
    container = viewChild<ElementRef>('formulaContainer');

    constructor() {
        // Re-render when data changes
        effect(() => {
            const d = this.data();
            const c = this.container();
            if (d && c) {
                this.render();
            }
        });
    }

    ngAfterViewInit() {
        this.render();
    }

    private render() {
        const container = this.container();
        const data = this.data();
        const expr = data?.expression || data?.latex;
        if (!container || !expr) return;

        const isInline = data?.format === 'inline';
        try {
            katex.render(expr, container.nativeElement, {
                throwOnError: false,
                displayMode: !isInline,
                output: 'html'
            });
        } catch (e) {
            container.nativeElement.innerText = expr;
        }
    }
}
