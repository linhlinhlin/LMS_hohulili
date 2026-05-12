import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SidebarTooltipDirective } from './sidebar-tooltip.directive';

@Component({
  selector: 'test-host',
  imports: [SidebarTooltipDirective],
  template: `
    <button
      data-testid="trigger"
      [appSidebarTooltip]="label"
      [tooltipEnabled]="enabled">Icon</button>
  `,
})
class HostComponent {
  label: string | null = 'Khóa học của tôi';
  enabled = true;
}

describe('SidebarTooltipDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let trigger: HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    trigger = fixture.nativeElement.querySelector('[data-testid="trigger"]');
  });

  afterEach(() => {
    // Defensive cleanup — directive removes its popover on destroy, but
    // ensure no orphan tooltip survives between tests.
    document.querySelectorAll('[role="tooltip"]').forEach((el) => el.remove());
  });

  it('does not show tooltip immediately on mouse enter (waits for delay)', fakeAsync(() => {
    trigger.dispatchEvent(new MouseEvent('mouseenter'));
    tick(100);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    tick(500); // total ~600 ms past
    // Defensive: tooltip rendered or not depending on reduced-motion env.
    // In test environment, prefers-reduced-motion typically false → 500 ms
    // delay, so tooltip should be present by now.
    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
    expect(tooltip!.textContent).toBe('Khóa học của tôi');
    // Cleanup before fakeAsync queue check
    trigger.dispatchEvent(new MouseEvent('mouseleave'));
  }));

  it('removes tooltip and aria-describedby on mouse leave', fakeAsync(() => {
    trigger.dispatchEvent(new MouseEvent('mouseenter'));
    tick(600);
    expect(trigger.getAttribute('aria-describedby')).toMatch(/sidebar-tooltip-/);

    trigger.dispatchEvent(new MouseEvent('mouseleave'));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(trigger.getAttribute('aria-describedby')).toBeNull();
  }));

  it('does not render tooltip when tooltipEnabled is false', fakeAsync(() => {
    fixture.componentInstance.enabled = false;
    fixture.detectChanges();
    trigger.dispatchEvent(new MouseEvent('mouseenter'));
    tick(1000);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  }));

  it('does not render tooltip when label is empty', fakeAsync(() => {
    fixture.componentInstance.label = '';
    fixture.detectChanges();
    trigger.dispatchEvent(new MouseEvent('mouseenter'));
    tick(1000);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  }));

  it('cancels pending tooltip if mouse leaves before delay elapses', fakeAsync(() => {
    trigger.dispatchEvent(new MouseEvent('mouseenter'));
    tick(200); // less than 500 ms
    trigger.dispatchEvent(new MouseEvent('mouseleave'));
    tick(400); // would-be elapse; should not show
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  }));
});
