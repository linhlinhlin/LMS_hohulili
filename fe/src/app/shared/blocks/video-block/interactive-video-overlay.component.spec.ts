import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
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

  it('keeps continue disabled until the selected choice is correct when required by adaptivity', () => {
    fixture.componentRef.setInput('interaction', {
      id: 'q-correct',
      type: 'single_choice',
      atSeconds: 18,
      title: 'Check understanding',
      required: true,
      adaptivity: {
        requireCorrectBeforeContinue: true,
        onWrong: { type: 'continue', message: 'Review the example before moving on.' },
        onCorrect: { type: 'continue', message: 'Nice, continue to the next part.' },
      },
      choices: [
        { id: 'wrong', label: 'Skip the example', feedback: 'Not quite.', isCorrect: false },
        { id: 'right', label: 'Review the example', feedback: 'Correct.', isCorrect: true },
      ],
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const continueButton = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Tiếp tục')) as HTMLButtonElement;

    expect(continueButton.disabled).toBeTrue();
    expect(element.querySelector('#interactive-video-choice-hint-q-correct')?.textContent?.trim())
      .toBe('Chọn đáp án đúng để tiếp tục.');

    fixture.componentRef.setInput('selectedChoiceId', 'wrong');
    fixture.detectChanges();

    const wrongChoice = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Skip the example')) as HTMLButtonElement;
    const rightChoice = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Review the example')) as HTMLButtonElement;

    expect(continueButton.disabled).toBeTrue();
    expect(wrongChoice.getAttribute('data-answer-state')).toBe('selected-wrong');
    expect(rightChoice.getAttribute('data-answer-state')).toBe('correct-answer');
    expect(element.querySelector('[data-testid="interactive-video-feedback"]')).not.toBeNull();
    expect(element.textContent).toContain('Not quite.');
    expect(element.textContent).toContain('Review the example before moving on.');

    fixture.componentRef.setInput('selectedChoiceId', 'right');
    fixture.detectChanges();

    expect(continueButton.disabled).toBeFalse();
    expect(rightChoice.getAttribute('data-answer-state')).toBe('selected-correct');
    expect(element.textContent).toContain('Correct.');
    expect(element.textContent).toContain('Nice, continue to the next part.');
  });

  it('locks wrong review answers and offers a video review action', () => {
    fixture.componentRef.setInput('interaction', {
      id: 'branch-review',
      type: 'branch',
      atSeconds: 47,
      title: 'How many fruits appeared?',
      required: false,
      choices: [
        { id: 'wrong', label: 'One fruit', isCorrect: false, targetTimeSeconds: 5 },
        { id: 'right', label: 'Two fruits', isCorrect: true },
      ],
    });
    fixture.componentRef.setInput('selectedChoiceId', 'wrong');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const wrongChoice = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.includes('One fruit')) as HTMLButtonElement;
    const rightChoice = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Two fruits')) as HTMLButtonElement;
    const reviewButton = element.querySelector('[data-testid="interactive-video-review-button"]') as HTMLButtonElement;

    expect(wrongChoice.disabled).toBeTrue();
    expect(rightChoice.disabled).toBeTrue();
    expect(wrongChoice.getAttribute('data-answer-state')).toBe('selected-wrong');
    expect(rightChoice.getAttribute('data-answer-state')).toBe('idle');
    expect(reviewButton.textContent).toContain('Xem lại video');
  });

  it('lets learners retry a wrong branch answer when no review target exists', () => {
    fixture.componentRef.setInput('interaction', {
      id: 'branch-no-review-target',
      type: 'branch',
      atSeconds: 47,
      title: 'Pick the safer action.',
      adaptivity: {
        requireCorrectBeforeContinue: true,
        onWrong: { type: 'continue', message: 'Try the safer option.' },
      },
      choices: [
        { id: 'wrong', label: 'Skip the checklist', isCorrect: false },
        { id: 'right', label: 'Complete the checklist', isCorrect: true },
      ],
    });
    fixture.componentRef.setInput('selectedChoiceId', 'wrong');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const wrongChoice = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Skip the checklist')) as HTMLButtonElement;
    const rightChoice = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Complete the checklist')) as HTMLButtonElement;
    const continueButton = Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => !button.hasAttribute('data-answer-state')) as HTMLButtonElement;

    expect(element.querySelector('[data-testid="interactive-video-review-button"]')).toBeNull();
    expect(wrongChoice.disabled).toBeFalse();
    expect(rightChoice.disabled).toBeFalse();
    expect(rightChoice.getAttribute('data-answer-state')).toBe('correct-answer');
    expect(continueButton.disabled).toBeTrue();
    expect(element.textContent).toContain('Try the safer option.');
  });

  it('keeps tab focus inside the dialog', fakeAsync(() => {
    fixture.componentRef.setInput('interaction', {
      id: 'focus1',
      type: 'single_choice',
      atSeconds: 21,
      title: 'Focus check',
      choices: [
        { id: 'a', label: 'First choice' },
        { id: 'b', label: 'Second choice' },
      ],
    });
    fixture.detectChanges();
    flushMicrotasks();

    const element = fixture.nativeElement as HTMLElement;
    const firstChoice = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.includes('First choice')) as HTMLButtonElement;
    const continueButton = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Tiếp tục')) as HTMLButtonElement;

    continueButton.focus();
    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventForward = spyOn(forward, 'preventDefault').and.callThrough();
    fixture.componentInstance.trapFocus(forward);

    expect(preventForward).toHaveBeenCalled();
    expect(document.activeElement).toBe(firstChoice);

    firstChoice.focus();
    const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
    const preventBackward = spyOn(backward, 'preventDefault').and.callThrough();
    fixture.componentInstance.trapFocus(backward);

    expect(preventBackward).toHaveBeenCalled();
    expect(document.activeElement).toBe(continueButton);
  }));

  it('restores focus to the previously active element when destroyed', fakeAsync(() => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    fixture.componentRef.setInput('interaction', {
      id: 'restore1',
      type: 'checkpoint',
      atSeconds: 22,
      title: 'Restore focus',
    });
    fixture.detectChanges();
    flushMicrotasks();

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('[role="dialog"]'));

    fixture.destroy();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  }));

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
