import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../../../core/services/auth.service';
import { SessionManagementService } from '../../../application/services/session-management.service';
import { AiTokenService } from '../../../infrastructure/api/ai-token.service';
import { WiiiContextService } from '../../../infrastructure/api/wiii-context.service';
import { ChatWidgetComponent } from './chat-widget.component';

describe('ChatWidgetComponent', () => {
  let fixture: ComponentFixture<ChatWidgetComponent>;

  const installMatchMedia = (matches: boolean): void => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jasmine.createSpy('matchMedia').and.returnValue({
        matches,
        media: '(max-width: 767px)',
        onchange: null,
        addEventListener: jasmine.createSpy('addEventListener'),
        removeEventListener: jasmine.createSpy('removeEventListener'),
        addListener: jasmine.createSpy('addListener'),
        removeListener: jasmine.createSpy('removeListener'),
        dispatchEvent: jasmine.createSpy('dispatchEvent').and.returnValue(true),
      } as unknown as MediaQueryList),
    });
  };

  beforeEach(async () => {
    installMatchMedia(false);

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
            operatorPreview$: of(null),
            approveOperatorPreview: jasmine.createSpy('approveOperatorPreview'),
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

  it('mounts only one Wiii panel in desktop responsive-sidebar mode', () => {
    fixture.componentRef.setInput('variant', 'responsive-sidebar');
    fixture.detectChanges();

    window.dispatchEvent(new CustomEvent('wiii:open-sidebar'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-chat-panel').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.wiii-sidebar-host app-chat-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.wiii-mobile-widget app-chat-panel')).toBeNull();
  });
});
