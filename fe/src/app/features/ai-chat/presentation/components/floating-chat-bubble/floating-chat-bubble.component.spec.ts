import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingChatBubbleComponent } from './floating-chat-bubble.component';

describe('FloatingChatBubbleComponent', () => {
  let fixture: ComponentFixture<FloatingChatBubbleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingChatBubbleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingChatBubbleComponent);
  });

  it('exposes a safe stable Pointy target for opening Wiii', () => {
    fixture.componentRef.setInput('isPanelOpen', false);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.getAttribute('data-wiii-id')).toBe('open-wiii-widget');
    expect(button.getAttribute('data-wiii-click-safe')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Mở trợ lý AI');
  });

  it('exposes a safe stable Pointy target for closing Wiii', () => {
    fixture.componentRef.setInput('isPanelOpen', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.getAttribute('data-wiii-id')).toBe('close-wiii-widget');
    expect(button.getAttribute('data-wiii-click-safe')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Đóng chat');
  });
});
