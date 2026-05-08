import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { InteractiveVideoInteraction } from '../../../../../../../api/types/interactive-video.types';
import {
  InteractiveVideoAuthoringCanvasComponent,
  type InteractiveVideoCanvasMove,
  type InteractiveVideoCanvasPlacement,
} from './interactive-video-authoring-canvas.component';

describe('InteractiveVideoAuthoringCanvasComponent', () => {
  let fixture: ComponentFixture<InteractiveVideoAuthoringCanvasComponent>;

  const timeline: InteractiveVideoInteraction[] = [
    {
      id: 'interaction-1',
      type: 'single_choice',
      atSeconds: 15,
      title: 'Canvas question',
      position: { xPercent: 25, yPercent: 40 },
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractiveVideoAuthoringCanvasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InteractiveVideoAuthoringCanvasComponent);
  });

  it('renders interaction handles at their canvas position', () => {
    fixture.componentRef.setInput('timeline', timeline);
    fixture.componentRef.setInput('selectedInteractionId', 'interaction-1');
    fixture.detectChanges();

    const handle = fixture.nativeElement
      .querySelector('[data-testid="interactive-video-canvas-handle-interaction-1"]') as HTMLElement;

    expect(handle).not.toBeNull();
    expect(handle.style.left).toBe('25%');
    expect(handle.style.top).toBe('40%');
    expect(handle.getAttribute('aria-current')).toBe('true');
  });

  it('emits placement with pointer-derived time and pointer position', () => {
    const placements: InteractiveVideoCanvasPlacement[] = [];
    fixture.componentRef.setInput('defaultTimeSeconds', 12);
    fixture.componentRef.setInput('durationSeconds', 90);
    fixture.componentInstance.interactionPlaced.subscribe(event => placements.push(event));
    fixture.detectChanges();

    mockCanvasRect();
    fixture.componentInstance.startPlacement('single_choice');
    fixture.detectChanges();

    const layer = fixture.nativeElement
      .querySelector('[data-testid="interactive-video-canvas-placement-layer"]') as HTMLElement;
    layer.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      clientX: 110,
      clientY: 70,
    }));

    expect(placements).toEqual([
      {
        type: 'single_choice',
        atSeconds: 45,
        position: { xPercent: 50, yPercent: 50 },
      },
    ]);
  });

  it('emits moved position while dragging an interaction handle', () => {
    const moves: InteractiveVideoCanvasMove[] = [];
    const selected: string[] = [];
    fixture.componentRef.setInput('timeline', timeline);
    fixture.componentRef.setInput('durationSeconds', 120);
    fixture.componentInstance.interactionMoved.subscribe(event => moves.push(event));
    fixture.componentInstance.interactionSelected.subscribe(id => selected.push(id));
    fixture.detectChanges();

    mockCanvasRect();
    const target = {
      setPointerCapture: jasmine.createSpy('setPointerCapture'),
      releasePointerCapture: jasmine.createSpy('releasePointerCapture'),
      hasPointerCapture: () => true,
    } as unknown as HTMLElement;

    fixture.componentInstance.onHandlePointerDown({
      button: 0,
      pointerId: 1,
      currentTarget: target,
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
    } as unknown as PointerEvent, timeline[0]);
    fixture.componentInstance.onHandlePointerMove({
      clientX: 210,
      clientY: 120,
      preventDefault: jasmine.createSpy('preventDefault'),
    } as unknown as PointerEvent);
    fixture.componentInstance.onHandlePointerUp({
      pointerId: 1,
      currentTarget: target,
    } as unknown as PointerEvent);

    expect(selected).toEqual(['interaction-1']);
    expect(moves).toEqual([
      {
        interactionId: 'interaction-1',
        atSeconds: 119,
        position: { xPercent: 100, yPercent: 100 },
      },
    ]);
  });

  function mockCanvasRect(): void {
    const canvas = fixture.nativeElement
      .querySelector('[data-testid="interactive-video-authoring-canvas"]') as HTMLElement;
    spyOn(canvas, 'getBoundingClientRect').and.returnValue({
      left: 10,
      top: 20,
      width: 200,
      height: 100,
      right: 210,
      bottom: 120,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect);
  }
});
