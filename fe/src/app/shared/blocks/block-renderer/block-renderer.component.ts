import { Component, input, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';

import { ContentBlock } from '../block-types';
import { TextBlockComponent } from '../text-block/text-block.component';
import { FormulaBlockComponent } from '../formula-block/formula-block.component';
import { ImageBlockComponent } from '../image-block/image-block.component';
import { VideoBlockComponent } from '../video-block/video-block.component';

@Component({
  selector: 'app-block-renderer',
  imports: [
    TextBlockComponent,
    FormulaBlockComponent,
    ImageBlockComponent,
    VideoBlockComponent
],
  template: `
    <div class="block-container space-y-4">
      @for (block of blocks(); track block) {
        @switch (block.type) {
          @case ('text') {
            <app-text-block [data]="block.data"></app-text-block>
          }
          @case ('paragraph') {
            <app-text-block [data]="block.data"></app-text-block>
          }
          @case ('formula') {
            <app-formula-block [data]="block.data"></app-formula-block>
          }
          @case ('image') {
            <app-image-block [data]="block.data"></app-image-block>
          }
          @case ('video') {
            <app-video-block [data]="block.data"></app-video-block>
          }
        }
      }
    </div>
  `,
  styles: [`
    .block-container {
      width: 100%;
      max-width: 100%;
    }
  `],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlockRendererComponent {
  blocks = input<ContentBlock[]>([]);
}
