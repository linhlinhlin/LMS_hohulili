import { TestBed } from '@angular/core/testing';
import { SkipLinkComponent } from './skip-link.component';

describe('SkipLinkComponent', () => {
  function build(targetId?: string, label?: string): { hostEl: HTMLElement; anchor: HTMLAnchorElement } {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(SkipLinkComponent);
    if (targetId !== undefined) {
      fixture.componentRef.setInput('targetId', targetId);
    }
    if (label !== undefined) {
      fixture.componentRef.setInput('label', label);
    }
    fixture.detectChanges();
    const hostEl = fixture.nativeElement as HTMLElement;
    const anchor = hostEl.querySelector('a.skip-link') as HTMLAnchorElement;
    return { hostEl, anchor };
  }

  it('renders an anchor with default targetId "main-content" and Vietnamese label', () => {
    const { anchor } = build();
    expect(anchor).toBeTruthy();
    expect(anchor.getAttribute('href')).toBe('#main-content');
    expect(anchor.textContent?.trim()).toBe('Bỏ qua điều hướng');
  });

  it('respects custom targetId input', () => {
    const { anchor } = build('app-main');
    expect(anchor.getAttribute('href')).toBe('#app-main');
  });

  it('respects custom label input', () => {
    const { anchor } = build(undefined, 'Skip to content');
    expect(anchor.textContent?.trim()).toBe('Skip to content');
  });

  it('uses class "skip-link" so layout CSS can hide it off-screen until focused', () => {
    const { anchor } = build();
    expect(anchor.classList.contains('skip-link')).toBe(true);
  });
});
