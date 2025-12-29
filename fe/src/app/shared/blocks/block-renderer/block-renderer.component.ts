import { Component, Input, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentBlock } from '../block-types';
import { TextBlockComponent } from '../text-block/text-block.component';
import { FormulaBlockComponent } from '../formula-block/formula-block.component';
import { ImageBlockComponent } from '../image-block/image-block.component';

@Component({
    selector: 'app-block-renderer',
    standalone: true,
    imports: [
        CommonModule,
        TextBlockComponent,
        FormulaBlockComponent,
        ImageBlockComponent
    ],
    template: `
    <div class="block-container space-y-4">
      <ng-container *ngFor="let block of blocks">
        <div [ngSwitch]="block.type" class="block-item">
          <app-text-block *ngSwitchCase="'text'" [data]="block.data"></app-text-block>
          <app-formula-block *ngSwitchCase="'formula'" [data]="block.data"></app-formula-block>
          <app-image-block *ngSwitchCase="'image'" [data]="block.data"></app-image-block>
        </div>
      </ng-container>
    </div>
  `,
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlockRendererComponent {
    @Input() blocks: ContentBlock[] = [];
}
