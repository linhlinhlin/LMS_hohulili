import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { SidebarComponent, SidebarConfig, SidebarMenuItem } from './sidebar.component';
import { AuthService } from '../../../core/services/auth.service';
import { OrganizationContextService } from '../../../core/services/organization-context.service';

/**
 * Tests for the (itemClick) output added in PR #2 (sidebar mobile drawer
 * auto-close). The output MUST emit only when a LEAF item (no children) is
 * activated; parent items with sub-menus MUST NOT emit so the drawer stays
 * open and the user can pick a child. Per spec FR-012 / FR-013.
 */
describe('SidebarComponent — itemClick output', () => {
  function buildComponent(): SidebarComponent {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { currentUserSignal: signal(null), logout: () => undefined },
        },
        {
          provide: OrganizationContextService,
          useValue: { getOrganization: () => of(null) },
        },
      ],
    });
    const fixture = TestBed.createComponent(SidebarComponent);
    const config: SidebarConfig = {
      role: 'student',
      title: 'Test',
      logoIcon: 'home',
      menuItems: [],
    };
    fixture.componentRef.setInput('config', config);
    return fixture.componentInstance;
  }

  it('emits itemClick for leaf items (no children)', () => {
    const comp = buildComponent();
    const captured: { item: SidebarMenuItem | null } = { item: null };
    comp.itemClick.subscribe((item) => (captured.item = item));

    const leaf: SidebarMenuItem = { label: 'Bài cần làm', route: '/student/tasks', icon: 'blog' };
    (comp as any).onLeafClick(leaf);

    expect(captured.item).toBe(leaf);
  });

  it('does NOT emit itemClick for parent items with children', () => {
    const comp = buildComponent();
    const captured: { item: SidebarMenuItem | null } = { item: null };
    comp.itemClick.subscribe((item) => (captured.item = item));

    const parent: SidebarMenuItem = {
      label: 'Khoá học của tôi',
      route: '/student/courses',
      icon: 'courses',
      children: [{ label: 'Tất cả khoá học', route: '/student/courses/library', icon: 'book' }],
    };
    (comp as any).onLeafClick(parent);

    expect(captured.item).toBeNull();
  });

  it('emits itemClick for items whose children array is empty (treated as leaf)', () => {
    const comp = buildComponent();
    const captured: { item: SidebarMenuItem | null } = { item: null };
    comp.itemClick.subscribe((item) => (captured.item = item));

    const emptyParent: SidebarMenuItem = {
      label: 'Edge',
      route: '/edge',
      icon: 'home',
      children: [],
    };
    (comp as any).onLeafClick(emptyParent);

    expect(captured.item).toBe(emptyParent);
  });
});
