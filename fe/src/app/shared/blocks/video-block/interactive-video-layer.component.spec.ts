import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { InteractiveVideoInteraction } from '../../../api/types/interactive-video.types';
import { InteractiveVideoLayerComponent } from './interactive-video-layer.component';

describe('InteractiveVideoLayerComponent', () => {
  let fixture: ComponentFixture<InteractiveVideoLayerComponent>;

  const timeline: InteractiveVideoInteraction[] = [
    {
      id: 'button-1',
      type: 'checkpoint',
      atSeconds: 10,
      endSeconds: 20,
      title: 'Pause here',
      displayType: 'button',
      position: { xPercent: 25, yPercent: 40 },
    },
    {
      id: 'poster-1',
      type: 'single_choice',
      atSeconds: 30,
      endSeconds: 40,
      title: 'Answer this',
      required: true,
      displayType: 'poster',
      position: { xPercent: 70, yPercent: 35, widthPercent: 30 },
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractiveVideoLayerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InteractiveVideoLayerComponent);
  });

  it('renders compact button interactions at their video position', () => {
    fixture.componentRef.setInput('timeline', timeline);
    fixture.componentRef.setInput('currentTimeSeconds', 15);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('[data-testid="interactive-video-layer-button-1"]') as HTMLElement;

    expect(button).not.toBeNull();
    expect(button.textContent).toContain('Pause here');
    expect(button.style.left).toBe('25%');
    expect(button.style.top).toBe('40%');
    expect(button.getAttribute('aria-label')).toBe('Điểm dừng: Pause here');
  });

  it('renders poster interactions with required accessible label', () => {
    fixture.componentRef.setInput('timeline', timeline);
    fixture.componentRef.setInput('currentTimeSeconds', 35);
    fixture.detectChanges();

    const poster = fixture.nativeElement.querySelector('[data-testid="interactive-video-layer-poster-1"]') as HTMLElement;

    expect(poster).not.toBeNull();
    expect(poster.textContent).toContain('Answer this');
    expect(poster.textContent).toContain('Bắt buộc');
    expect(poster.style.left).toBe('70%');
    expect(poster.style.top).toBe('35%');
    expect(poster.style.width).toBe('30%');
    expect(poster.getAttribute('aria-label')).toBe('Câu hỏi bắt buộc: Answer this');
  });

  it('does not render completed interactions', () => {
    fixture.componentRef.setInput('timeline', timeline);
    fixture.componentRef.setInput('currentTimeSeconds', 15);
    fixture.componentRef.setInput('completedInteractionIds', new Set(['button-1']));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="interactive-video-layer-button-1"]')).toBeNull();
  });

  it('emits the selected interaction when clicked', () => {
    const selected: InteractiveVideoInteraction[] = [];
    fixture.componentRef.setInput('timeline', timeline);
    fixture.componentRef.setInput('currentTimeSeconds', 15);
    fixture.componentInstance.interactionSelected.subscribe(interaction => selected.push(interaction));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('[data-testid="interactive-video-layer-button-1"]') as HTMLButtonElement;
    button.click();

    expect(selected.map(interaction => interaction.id)).toEqual(['button-1']);
  });
});
