import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InteractiveVideoOverlayComponent } from './interactive-video-overlay.component';

describe('InteractiveVideoOverlayComponent', () => {
  let fixture: ComponentFixture<InteractiveVideoOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractiveVideoOverlayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InteractiveVideoOverlayComponent);
  });

  it('renders dialog semantics and disables continue until required choice is selected', () => {
    fixture.componentRef.setInput('interaction', {
      id: 'q1',
      type: 'single_choice',
      atSeconds: 12,
      title: 'Safety check',
      body: 'Choose the safest action.',
      required: true,
      choices: [
        { id: 'a', label: 'Check the chart', isCorrect: true },
        { id: 'b', label: 'Guess', isCorrect: false },
      ],
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector('[role="dialog"]') as HTMLElement;
    const continueButton = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Tiếp tục')) as HTMLButtonElement;

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('interactive-video-title-q1');
    expect(dialog.getAttribute('aria-describedby')).toBe('interactive-video-body-q1');
    expect(continueButton.disabled).toBeTrue();
    expect(continueButton.getAttribute('aria-describedby')).toBe('interactive-video-choice-hint-q1');
    expect(element.querySelector('#interactive-video-choice-hint-q1')?.textContent?.trim())
      .toBe('Chọn một phương án để tiếp tục.');

    fixture.componentRef.setInput('selectedChoiceId', 'a');
    fixture.detectChanges();

    const selectedChoice = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Check the chart')) as HTMLButtonElement;
    expect(selectedChoice.getAttribute('aria-pressed')).toBe('true');
    expect(continueButton.disabled).toBeFalse();
    expect(continueButton.hasAttribute('aria-describedby')).toBeFalse();
    expect(element.querySelector('#interactive-video-choice-hint-q1')).toBeNull();
  });

  it('renders rich body and choice content without treating raw html as markup', () => {
    fixture.componentRef.setInput('interaction', {
      id: 'rich1',
      type: 'single_choice',
      atSeconds: 20,
      title: 'Rich check',
      body: 'Inspect [IMG:https://example.com/ship.png] $x^2$ <script>alert(1)</script>',
      choices: [
        { id: 'a', label: 'Chart [IMG:https://example.com/chart.png]', feedback: 'Good $a+b$' },
      ],
    });
    fixture.componentRef.setInput('selectedChoiceId', 'a');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const images = element.querySelectorAll('img');

    expect(images.length).toBe(2);
    expect(images[0].getAttribute('src')).toBe('https://example.com/ship.png');
    expect(images[1].getAttribute('src')).toBe('https://example.com/chart.png');
    expect(element.querySelector('script')).toBeNull();
    expect(element.innerHTML).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(element.querySelector('.katex')).not.toBeNull();
  });
});
