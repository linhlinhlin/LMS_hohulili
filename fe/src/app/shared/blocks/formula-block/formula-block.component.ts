import { Component, input, viewChild, ElementRef, AfterViewInit, effect, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

import { FormulaBlockData } from '../block-types';
import katex from 'katex';

@Component({
    selector: 'app-formula-block',
    imports: [],
    template: `
    <div #formulaContainer class="formula-container my-4 text-center overflow-x-auto py-2"></div>
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
        if (!container || !data || !data.expression) return;

        try {
            katex.render(data.expression, container.nativeElement, {
                throwOnError: false,
                displayMode: true,
                output: 'html'
            });
        } catch (e) {
            container.nativeElement.innerText = data.expression;
        }
    }
}
