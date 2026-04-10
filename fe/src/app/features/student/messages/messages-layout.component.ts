import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ConversationSidebarComponent } from './conversation-sidebar.component';
import { MessageRecipientPickerComponent } from './message-recipient-picker.component';
import { MessageRecipientCandidate } from '../../../core/services/messaging.service';

/**
 * MessagesLayoutComponent — Messenger-style split layout.
 *
 * Desktop (md+): left sidebar (320px) with conversation list + right chat area.
 * Mobile (< md): standard routing (sidebar hidden, full-screen chat or inbox).
 */
@Component({
  selector: 'app-messages-layout',
  host: { class: 'messages-layout-host' },
  imports: [RouterOutlet, ConversationSidebarComponent, MessageRecipientPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
    /* Mobile inbox: block flow, sticky headers work naturally */
    .messages-layout { background: white; }
    /* Mobile conversation: fixed full-screen overlay */
    @media (max-width: 767.98px) {
      .messages-layout.is-conversation {
        display: flex;
        position: fixed;
        inset: 0;
        z-index: 40;
        overflow: hidden;
      }
    }
    /* Desktop: flex split layout, fill viewport */
    @media (min-width: 768px) {
      :host { height: 100dvh; overflow: hidden; }
      .messages-layout { display: flex; position: relative; height: 100%; overflow: hidden; }
    }
  `],
  template: `
    <div class="messages-layout" [class.is-conversation]="!!activeConversationId()">
      <!-- ═══ Desktop sidebar (md+): fixed, self-scrolling ═══ -->
      <aside class="hidden w-80 flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 md:flex">
        <app-conversation-sidebar
          [selectedId]="activeConversationId()"
          (selectConversation)="onSelectConversation($event)"
          (newMessage)="openRecipientPicker()" />
      </aside>

      <!-- ═══ Main content: flex column so children stretch ═══ -->
      <main class="flex flex-1 flex-col min-w-0 min-h-0">
        <router-outlet />
      </main>
    </div>

    @if (showRecipientPicker()) {
      <app-message-recipient-picker
        (close)="closeRecipientPicker()"
        (recipientSelected)="handleRecipientSelected($event)" />
    }
  `,
})
export class MessagesLayoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly showRecipientPicker = signal(false);
  readonly activeConversationId = signal<string | null>(null);

  ngOnInit(): void {
    // Track current URL reactively for sidebar highlighting
    this.updateActiveId(this.router.url);

    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((e) => this.updateActiveId(e.urlAfterRedirects));
  }

  private updateActiveId(url: string): void {
    const match = url.match(/\/messages\/([0-9a-f-]{36})/i);
    this.activeConversationId.set(match?.[1] ?? null);
  }

  private get basePath(): string {
    return this.router.url.includes('/teacher/') ? '/teacher/messages' : '/student/messages';
  }

  onSelectConversation(conversationId: string): void {
    this.router.navigate([this.basePath, conversationId]);
  }

  openRecipientPicker(): void {
    this.showRecipientPicker.set(true);
  }

  closeRecipientPicker(): void {
    this.showRecipientPicker.set(false);
  }

  handleRecipientSelected(recipient: MessageRecipientCandidate): void {
    this.showRecipientPicker.set(false);

    if (recipient.conversationId) {
      this.router.navigate([this.basePath, recipient.conversationId]);
      return;
    }

    this.router.navigate([this.basePath, 'new'], {
      queryParams: {
        recipientId: recipient.userId,
        recipientName: recipient.displayName,
        recipientRole: recipient.role,
      },
    });
  }
}
// rebuild trigger
