import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { InteractiveVideoInteraction } from '../../../../../../../api/types/interactive-video.types';
import { InteractiveVideoAuthoringPropertiesComponent } from './interactive-video-authoring-properties.component';

describe('InteractiveVideoAuthoringPropertiesComponent', () => {
  let fixture: ComponentFixture<InteractiveVideoAuthoringPropertiesComponent>;

  const interaction: InteractiveVideoInteraction = {
    id: 'interaction-1',
    type: 'single_choice',
    atSeconds: 15,
    title: 'Original title',
    pause: true,
    required: false,
    displayType: 'button',
    position: { xPercent: 25, yPercent: 40 },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractiveVideoAuthoringPropertiesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InteractiveVideoAuthoringPropertiesComponent);
  });

  it('renders a placeholder when no interaction is selected', () => {
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Chọn một điểm trên canvas');
  });

  it('emits title, time, display and position patches', () => {
    const patches: Array<Partial<InteractiveVideoInteraction>> = [];
    fixture.componentRef.setInput('interaction', interaction);
    fixture.componentRef.setInput('durationSeconds', 60);
    fixture.componentInstance.interactionPatch.subscribe(patch => patches.push(patch));
    fixture.detectChanges();

    setInputValue('interactive-video-properties-title', 'Updated title');
    setInputValue('interactive-video-properties-time', '90');
    fixture.componentInstance.updateDisplayType('poster');
    setInputValue('interactive-video-properties-x', '-10');
    setInputValue('interactive-video-properties-y', '105');

    expect(patches).toEqual([
      { title: 'Updated title' },
      { atSeconds: 59 },
      { displayType: 'poster' },
      { position: { xPercent: 0, yPercent: 40 } },
      { position: { xPercent: 25, yPercent: 100 } },
    ]);
  });

  it('emits boolean patches for pause and required settings', () => {
    const patches: Array<Partial<InteractiveVideoInteraction>> = [];
    fixture.componentRef.setInput('interaction', interaction);
    fixture.componentInstance.interactionPatch.subscribe(patch => patches.push(patch));
    fixture.detectChanges();

    const pause = query<HTMLInputElement>('interactive-video-properties-pause');
    pause.checked = false;
    pause.dispatchEvent(new Event('change'));

    const required = query<HTMLInputElement>('interactive-video-properties-required');
    required.checked = true;
    required.dispatchEvent(new Event('change'));

    expect(patches).toEqual([
      { pause: false },
      { required: true },
    ]);
  });

  function setInputValue(testId: string, value: string): void {
    const input = query<HTMLInputElement>(testId);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function query<T extends HTMLElement>(testId: string): T {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`) as T;
  }
});
