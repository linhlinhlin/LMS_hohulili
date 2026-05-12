import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../../../../../core/services/auth.service';
import { SessionManagementService } from '../../../application/services/session-management.service';
import { AiTokenService } from '../../../infrastructure/api/ai-token.service';
import { WiiiContextService } from '../../../infrastructure/api/wiii-context.service';
import { ChatWidgetComponent } from './chat-widget.component';

describe('ChatWidgetComponent', () => {
  let fixture: ComponentFixture<ChatWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatWidgetComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ id: 'teacher-1', role: 'teacher' }),
          },
        },
        {
          provide: SessionManagementService,
          useValue: {
            setUser: jasmine.createSpy('setUser'),
            updateContextFromRoute: jasmine.createSpy('updateContextFromRoute'),
          },
        },
        {
          provide: WiiiContextService,
          useValue: {
            applySidebarIntent: jasmine.createSpy('applySidebarIntent'),
            connectIframe: jasmine.createSpy('connectIframe'),
            disconnectIframe: jasmine.createSpy('disconnectIframe'),
          },
        },
        {
          provide: AiTokenService,
          useValue: {
            getToken: jasmine.createSpy('getToken').and.resolveTo(null),
            clearToken: jasmine.createSpy('clearToken'),
            organizationId: jasmine.createSpy('organizationId').and.returnValue('org-1'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatWidgetComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('renders the desktop right-rail trigger for course editor sidebar mode', () => {
    fixture.componentRef.setInput('variant', 'responsive-sidebar');
    fixture.detectChanges();

    const rail = fixture.nativeElement.querySelector('[data-wiii-id="open-wiii-right-sidebar"]') as HTMLButtonElement;

    expect(rail).not.toBeNull();
    expect(rail.getAttribute('data-wiii-click-safe')).toBe('true');
    expect(rail.getAttribute('aria-label')).toBe('Mở trợ lý Wiii');
  });

  it('opens the sidebar panel when LMS dispatches a Wiii open event', () => {
    fixture.componentRef.setInput('variant', 'responsive-sidebar');
    fixture.detectChanges();

    window.dispatchEvent(new CustomEvent('wiii:open-sidebar', {
      detail: { action: 'generate_course_from_document', courseId: 'course-1' },
    }));
    fixture.detectChanges();

    const contextService = TestBed.inject(WiiiContextService) as jasmine.SpyObj<WiiiContextService>;
    expect(contextService.applySidebarIntent).toHaveBeenCalledWith({
      action: 'generate_course_from_document',
      courseId: 'course-1',
    });
    expect(fixture.nativeElement.querySelector('.wiii-sidebar-host--open')).not.toBeNull();
  });
});
