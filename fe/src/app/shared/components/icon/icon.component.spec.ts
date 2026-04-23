import { TestBed } from '@angular/core/testing';

import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  it('renders newly added offline-safe learning glyphs as svg without ligature text', () => {
    TestBed.configureTestingModule({
      imports: [IconComponent],
    });

    const fixture = TestBed.createComponent(IconComponent);
    fixture.componentRef.setInput('name', 'folder');
    fixture.componentRef.setInput('size', 'md');
    fixture.componentRef.setInput('ariaLabel', 'Folder');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const svg = host.querySelector('svg');

    expect(svg).withContext('expected folder icon to render an inline svg').not.toBeNull();
    expect(svg?.getAttribute('aria-label')).toBe('Folder');
    expect(host.textContent).not.toContain('folder_open');
    expect(host.textContent).not.toContain('arrow_back');
  });

  it('supports play-circle and help-circle icons used in the learning shell', () => {
    TestBed.configureTestingModule({
      imports: [IconComponent],
    });

    const fixture = TestBed.createComponent(IconComponent);
    fixture.componentRef.setInput('name', 'play-circle');
    fixture.componentRef.setInput('ariaLabel', 'Current lesson');
    fixture.detectChanges();

    let svg = fixture.nativeElement.querySelector('svg') as SVGElement | null;
    expect(svg?.getAttribute('aria-label')).toBe('Current lesson');

    fixture.componentRef.setInput('name', 'help-circle');
    fixture.componentRef.setInput('ariaLabel', 'Quiz section');
    fixture.detectChanges();

    svg = fixture.nativeElement.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('Quiz section');
  });
});
