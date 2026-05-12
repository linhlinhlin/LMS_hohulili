import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import axe from 'axe-core';

import { SidebarComponent, SidebarConfig } from './sidebar.component';
import {
  studentSidebarConfig,
  teacherSidebarConfig,
  adminSidebarConfig,
  orgAdminSidebarConfig,
} from './sidebar.config';
import { AuthService } from '../../../core/services/auth.service';
import { OrganizationContextService } from '../../../core/services/organization-context.service';

/**
 * Accessibility audit for the SidebarComponent — runs axe-core (Deque) over
 * the rendered sidebar in expanded and collapsed states for all 4 role
 * configurations.
 *
 * Per spec SC-002 / SC-003 (Lighthouse a11y ≥ 95, zero ARIA validation
 * errors). This is the project's first programmatic a11y gate; it sits in
 * the standard `npm run test:ci` pipeline so violations block merge.
 *
 * Notes:
 * - Auth + Org services are stubbed so the component renders without a
 *   live backend or router URL.
 * - The mobile-drawer focus-trap behaviour is covered separately by
 *   focus-trap.directive.spec.ts.
 */
describe('Sidebar — axe-core accessibility', () => {
  function buildFixture(config: SidebarConfig, collapsed: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUserSignal: signal({
              id: 'test-user',
              email: 'test@maritime.edu',
              fullName: 'Test User',
              role: config.role,
            }),
            currentUser: signal({
              id: 'test-user',
              email: 'test@maritime.edu',
              fullName: 'Test User',
              role: config.role,
            }),
            userRole: signal(config.role),
            logout: () => undefined,
          },
        },
        {
          provide: OrganizationContextService,
          useValue: { getOrganization: () => of(null) },
        },
      ],
    });
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.componentRef.setInput('config', config);
    fixture.componentRef.setInput('collapsed', collapsed);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    return fixture;
  }

  async function runAxe(rootEl: HTMLElement): Promise<axe.AxeResults> {
    return axe.run(rootEl, {
      // The rule set covers WCAG 2.1 + 2.2 levels A & AA. We don't disable
      // any rules; if the sidebar legitimately needs an exception, the spec
      // calls it out and we add the rule + reason here.
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
  }

  function describeViolations(violations: axe.Result[]): string {
    if (violations.length === 0) return '';
    return violations
      .map(
        (v) =>
          `\n  - [${v.impact}] ${v.id}: ${v.help}\n    nodes: ${v.nodes
            .map((n) => n.target.join(' '))
            .join(' | ')}`,
      )
      .join('');
  }

  const matrix: Array<{ name: string; config: SidebarConfig }> = [
    { name: 'student', config: studentSidebarConfig },
    { name: 'teacher', config: teacherSidebarConfig },
    { name: 'admin', config: adminSidebarConfig },
    { name: 'org-admin', config: orgAdminSidebarConfig },
  ];

  for (const { name, config } of matrix) {
    for (const collapsed of [false, true]) {
      const stateLabel = collapsed ? 'collapsed' : 'expanded';
      it(`${name} sidebar (${stateLabel}) has zero axe violations`, async () => {
        const fixture = buildFixture(config, collapsed);
        try {
          const results = await runAxe(fixture.nativeElement);
          expect(results.violations.length)
            .withContext(`Violations in ${name}/${stateLabel}:${describeViolations(results.violations)}`)
            .toBe(0);
        } finally {
          if (fixture.nativeElement.parentNode) {
            fixture.nativeElement.parentNode.removeChild(fixture.nativeElement);
          }
          fixture.destroy();
        }
      });
    }
  }
});
