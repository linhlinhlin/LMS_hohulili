import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InteractiveVideoFillBlankComponent } from './interactive-video-fill-blank.component';

describe('InteractiveVideoFillBlankComponent', () => {
  let fixture: ComponentFixture<InteractiveVideoFillBlankComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractiveVideoFillBlankComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InteractiveVideoFillBlankComponent);
    fixture.componentRef.setInput('interaction', {
      id: 'fill-1',
      type: 'fill_blank',
      atSeconds: 12,
      required: true,
      fillBlank: {
        template: 'Strawberries and {{1}} with {{2}}.',
        blanks: [
          { id: '1', acceptedAnswers: ['blueberries', 'berries'] },
          { id: '2', acceptedAnswers: ['milk'] },
        ],
        enableRetry: true,
        enableShowSolution: true,
      },
    });
  });

  it('checks blank answers and shows solution for incorrect blanks', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    setInputValue('1', 'blueberries');
    setInputValue('2', 'water');
    click('[data-testid="interactive-video-fill-blank-check"]');
    fixture.detectChanges();

    expect(element.querySelector('[data-testid="interactive-video-fill-blank-feedback"]')?.textContent)
      .toContain('1/2');
    expect((element.querySelector('[data-testid="interactive-video-fill-blank-continue"]') as HTMLButtonElement).disabled)
      .toBeFalse();

    click('[data-testid="interactive-video-fill-blank-solution"]');
    fixture.detectChanges();

    expect(element.textContent).toContain('milk');
  });

  it('keeps continue disabled before checking when the interaction is required', () => {
    fixture.detectChanges();

    const continueButton = fixture.nativeElement
      .querySelector('[data-testid="interactive-video-fill-blank-continue"]') as HTMLButtonElement;

    expect(continueButton.disabled).toBeTrue();
  });

  function setInputValue(blankId: string, value: string): void {
    const input = fixture.nativeElement
      .querySelector(`[data-testid="interactive-video-fill-blank-input-${blankId}"]`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function click(selector: string): void {
    const button = fixture.nativeElement.querySelector(selector) as HTMLButtonElement;
    button.click();
  }
});
