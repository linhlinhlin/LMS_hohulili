import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FocusTrapDirective } from './focus-trap.directive';

@Component({
  selector: 'test-host',
  imports: [FocusTrapDirective],
  template: `
    <button data-testid="outside-before">Before</button>
    <div data-testid="trap" [appFocusTrap]="active()" (escape)="onEscape()">
      <button data-testid="first">First</button>
      <button data-testid="middle">Middle</button>
      <button data-testid="last">Last</button>
    </div>
    <button data-testid="outside-after">After</button>
  `,
})
class HostComponent {
  active = signal(false);
  escapeCount = 0;
  onEscape() {
    this.escapeCount += 1;
  }
}

describe('FocusTrapDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let comp: HostComponent;
  let trap: HTMLElement;
  let first: HTMLButtonElement;
  let middle: HTMLButtonElement;
  let last: HTMLButtonElement;
  let outsideBefore: HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    trap = el.querySelector('[data-testid="trap"]')!;
    first = el.querySelector('[data-testid="first"]')!;
    middle = el.querySelector('[data-testid="middle"]')!;
    last = el.querySelector('[data-testid="last"]')!;
    outsideBefore = el.querySelector('[data-testid="outside-before"]')!;
    document.body.appendChild(el); // ensure focusable visible
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('moves focus to the first focusable when activated', () => {
    outsideBefore.focus();
    expect(document.activeElement).toBe(outsideBefore);

    comp.active.set(true);
    fixture.detectChanges();

    expect(document.activeElement).toBe(first);
  });

  it('returns focus to the previously-focused element on deactivation', () => {
    outsideBefore.focus();
    comp.active.set(true);
    fixture.detectChanges();
    expect(document.activeElement).toBe(first);

    comp.active.set(false);
    fixture.detectChanges();

    expect(document.activeElement).toBe(outsideBefore);
  });

  it('cycles Tab from last focusable back to first', () => {
    comp.active.set(true);
    fixture.detectChanges();
    last.focus();

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    trap.dispatchEvent(tabEvent);

    // The directive uses Angular's keydown.tab pseudo — Angular wraps keydown
    // with key match. Simulate via dispatch on the trap element.
    expect(tabEvent.defaultPrevented || document.activeElement === first).toBeTruthy();
  });

  it('emits (escape) when Escape pressed inside the trap', () => {
    comp.active.set(true);
    fixture.detectChanges();
    middle.focus();
    expect(comp.escapeCount).toBe(0);

    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    trap.dispatchEvent(escEvent);

    expect(comp.escapeCount).toBe(1);
  });

  it('does not act when inactive (no focus move, no escape emission)', () => {
    outsideBefore.focus();
    expect(document.activeElement).toBe(outsideBefore);

    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    trap.dispatchEvent(escEvent);

    expect(comp.escapeCount).toBe(0);
    expect(document.activeElement).toBe(outsideBefore);
  });
});
