import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextBlockData } from '../block-types';

@Component({
    selector: 'app-text-block',
    standalone: true,
    imports: [CommonModule],
    template: `<div [innerHTML]="data.html"></div>`
})
export class TextBlockComponent {
    @Input() data!: TextBlockData;
}
