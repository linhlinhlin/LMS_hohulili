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
<<<<<<< HEAD
          <app-text-block *ngSwitchCase="'text'" [data]="block.data"></app-text-block>
          <app-formula-block *ngSwitchCase="'formula'" [data]="block.data"></app-formula-block>
          <app-image-block *ngSwitchCase="'image'" [data]="block.data"></app-image-block>
=======
          
          <!-- Text Block -->
          <app-text-block 
            *ngSwitchCase="'text'" 
            [data]="block.data">
          </app-text-block>

          <!-- Formula Block (KaTeX) -->
          <app-formula-block 
            *ngSwitchCase="'formula'" 
            [data]="block.data">
          </app-formula-block>

          <!-- Image Block (Lazy + PWA) -->
          <app-image-block 
            *ngSwitchCase="'image'" 
            [data]="block.data">
          </app-image-block>

>>>>>>> fix/image
        </div>
      </ng-container>
    </div>
  `,
<<<<<<< HEAD
=======
    styles: [`
    .block-container {
      width: 100%;
      max-width: 100%;
    }
  `],
>>>>>>> fix/image
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlockRendererComponent {
    @Input() blocks: ContentBlock[] = [];
}
