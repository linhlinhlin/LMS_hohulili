<<<<<<< HEAD
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormulaBlockData } from '../block-types';
=======
import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormulaBlockData } from '../block-types';
import katex from 'katex';
>>>>>>> fix/image

@Component({
    selector: 'app-formula-block',
    standalone: true,
    imports: [CommonModule],
<<<<<<< HEAD
    template: `<div>\[ {{ data.expression }} \]</div>`
})
export class FormulaBlockComponent {
    @Input() data!: FormulaBlockData;
=======
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
export class FormulaBlockComponent implements AfterViewInit, OnChanges {
    @Input() data!: FormulaBlockData;
    @ViewChild('formulaContainer') container!: ElementRef;

    ngAfterViewInit() {
        this.render();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['data'] && !changes['data'].firstChange) {
            this.render();
        }
    }

    private render() {
        if (!this.container || !this.data || !this.data.expression) return;

        try {
            katex.render(this.data.expression, this.container.nativeElement, {
                throwOnError: false,
                displayMode: true, // Render as block equation
                output: 'html' // For accessibility and speed
            });
        } catch (e) {
            console.error('KaTeX Render Error:', e);
            this.container.nativeElement.innerText = this.data.expression; // Fallback
        }
    }
>>>>>>> fix/image
}
