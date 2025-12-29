import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormulaBlockData } from '../block-types';

@Component({
    selector: 'app-formula-block',
    standalone: true,
    imports: [CommonModule],
    template: `<div>\[ {{ data.expression }} \]</div>`
})
export class FormulaBlockComponent {
    @Input() data!: FormulaBlockData;
}
