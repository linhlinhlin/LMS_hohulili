import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InteractiveVideoDragDropComponent } from './interactive-video-drag-drop.component';

describe('InteractiveVideoDragDropComponent', () => {
  let fixture: ComponentFixture<InteractiveVideoDragDropComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractiveVideoDragDropComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InteractiveVideoDragDropComponent);
    fixture.componentRef.setInput('interaction', {
      id: 'drag-1',
      type: 'drag_drop',
      atSeconds: 32,
      required: true,
      dragDrop: {
        instruction: 'Kéo những đáp án đúng vào vùng ảnh. Để nguyên đáp án sai ở ngoài.',
        backgroundImage: { idOrUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==' },
        dropZones: [
          {
            id: 'answer-zone',
            label: 'Vung dung',
            xPercent: 50,
            yPercent: 50,
            widthPercent: 80,
            heightPercent: 72,
            correctDraggableIds: ['vest'],
          },
        ],
        draggables: [
          { id: 'vest', label: 'Ao phao', acceptedDropZoneIds: ['answer-zone'] },
          { id: 'anchor', label: 'Neo', acceptedDropZoneIds: [] },
        ],
        enableRetry: true,
        enableShowSolution: true,
      },
    });
  });

  it('places draggables by click fallback and treats unplaced distractors as correct', () => {
    fixture.detectChanges();

    click('[data-testid="interactive-video-drag-drop-draggable-vest"]');
    click('[data-testid="interactive-video-drag-drop-zone-answer-zone"]');
    click('[data-testid="interactive-video-drag-drop-check"]');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="interactive-video-drag-drop-feedback"]')?.textContent)
      .toContain('2/2');
    expect(element.querySelector('[data-testid="interactive-video-drag-drop-draggable-vest"]')?.getAttribute('data-state'))
      .toBe('correct');
    expect(element.querySelector('[data-testid="interactive-video-drag-drop-draggable-anchor"]')?.getAttribute('data-state'))
      .toBe('correct');
  });

  it('marks a distractor wrong when it is placed in the answer zone', () => {
    fixture.detectChanges();

    click('[data-testid="interactive-video-drag-drop-draggable-vest"]');
    click('[data-testid="interactive-video-drag-drop-zone-answer-zone"]');
    click('[data-testid="interactive-video-drag-drop-draggable-anchor"]');
    click('[data-testid="interactive-video-drag-drop-zone-answer-zone"]');
    click('[data-testid="interactive-video-drag-drop-check"]');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="interactive-video-drag-drop-feedback"]')?.textContent)
      .toContain('1/2');
    expect(element.querySelector('[data-testid="interactive-video-drag-drop-draggable-anchor"]')?.getAttribute('data-state'))
      .toBe('wrong');
  });

  it('keeps continue disabled before checking when the interaction is required', () => {
    fixture.detectChanges();

    const continueButton = fixture.nativeElement
      .querySelector('[data-testid="interactive-video-drag-drop-continue"]') as HTMLButtonElement;

    expect(continueButton.disabled).toBeTrue();
  });

  it('hides answer-role wording in student preview instructions', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Chọn các vật dụng phù hợp rồi kéo vào vùng trên hình.');
    expect(element.textContent).not.toContain('Kéo những đáp án đúng');
    expect(element.textContent).not.toContain('Để nguyên đáp án sai');
  });

  function click(selector: string): void {
    const button = fixture.nativeElement.querySelector(selector) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  }
});
