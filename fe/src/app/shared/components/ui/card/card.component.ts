import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="cardClasses()">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    @import '../../../../../styles/variables';

    .card {
      background: $bg-surface;
      border-radius: $card-radius;
      box-shadow: $card-shadow;
      overflow: hidden;
      transition: box-shadow $transition-normal;

      &.card-hover:hover {
        box-shadow: $shadow-card-hover;
      }

      &.card-bordered {
        border: 1px solid $border-default;
        box-shadow: none;
      }
    }

    .card-padding {
      padding: $card-padding;
    }

    .card-clickable {
      cursor: pointer;
      
      &:active {
        transform: translateY(1px);
      }
    }
  `]
})
export class CardComponent {
  hover = input<boolean>(true);
  bordered = input<boolean>(false);
  padding = input<boolean>(true);
  clickable = input<boolean>(false);

  cardClasses() {
    return [
      'card',
      this.hover() ? 'card-hover' : '',
      this.bordered() ? 'card-bordered' : '',
      this.padding() ? 'card-padding' : '',
      this.clickable() ? 'card-clickable' : ''
    ].filter(Boolean).join(' ');
  }
}
