import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { MessagingService } from '../../../core/services/messaging.service';
import { ConversationListItemComponent } from './conversation-list-item.component';
import { Conversation, ConversationListItem, toConversationListItem } from './utils/message-utils';

/**
 * Compact conversation list sidebar for Messenger-style desktop split layout.
 * Reuses ConversationListItemComponent and MessagingService.
 */
@Component({
  selector: 'app-conversation-sidebar',
  host: { class: 'flex flex-1 flex-col min-h-0 overflow-hidden' },
  imports: [FormsModule, ConversationListItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <h2 class="text-lg font-bold text-slate-900">Tin nhắn</h2>
      <button type="button" (click)="newMessage.emit()"
        class="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-[#0056D2]"
        title="Tin nhắn mới">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
        </svg>
      </button>
    </div>

    <!-- Search -->
    <div class="border-b border-slate-100 px-3 py-2">
      <div class="relative">
        <svg class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          placeholder="Tìm kiếm..."
          class="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm focus:border-[#0056D2] focus:bg-white focus:ring-1 focus:ring-[#0056D2]" />
      </div>
    </div>

    <!-- Conversation list -->
    <div class="flex-1 overflow-y-auto">
      @if (loading() && conversations().length === 0) {
        @for (i of [1, 2, 3, 4]; track i) {
          <div class="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <div class="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-slate-200"></div>
            <div class="flex-1 space-y-1.5">
              <div class="h-3.5 w-24 animate-pulse rounded bg-slate-200"></div>
              <div class="h-3 w-36 animate-pulse rounded bg-slate-100"></div>
            </div>
          </div>
        }
      } @else if (filteredConversations().length === 0) {
        <div class="px-4 py-8 text-center">
          <p class="text-sm text-slate-400">
            {{ searchQuery.trim() ? 'Không tìm thấy' : 'Chưa có tin nhắn' }}
          </p>
        </div>
      } @else {
        @for (conv of filteredConversations(); track conv.conversationId) {
          <app-conversation-list-item
            [conversation]="conv"
            [isSelected]="selectedId() === conv.conversationId"
            (select)="selectConversation.emit($event)" />
        }
      }
    </div>
  `,
})
export class ConversationSidebarComponent implements OnInit {
  private readonly messagingService = inject(MessagingService);
  private readonly authService = inject(AuthService);

  readonly selectedId = input<string | null>(null);
  readonly selectConversation = output<string>();
  readonly newMessage = output<void>();

  private readonly conversationsState = signal<ConversationListItem[]>([]);
  readonly loading = signal(false);
  searchQuery = '';

  private get currentUserId(): string {
    return this.authService.getCurrentUser()?.id || '';
  }

  readonly conversations = computed(() => this.conversationsState());

  readonly filteredConversations = computed(() => {
    const keyword = this.searchQuery.trim().toLowerCase();
    if (!keyword) return this.conversationsState();
    return this.conversationsState().filter(c =>
      c.otherParticipant.name.toLowerCase().includes(keyword) ||
      c.lastMessagePreview.toLowerCase().includes(keyword),
    );
  });

  ngOnInit(): void {
    this.messagingService.setCurrentUserId(this.currentUserId);
    this.loadConversations();
  }

  private loadConversations(): void {
    this.loading.set(true);
    this.messagingService.getConversations().subscribe({
      next: (conversations) => {
        this.applyConversations(conversations);
        this.loading.set(false);
        this.startPolling();
      },
      error: () => this.loading.set(false),
    });
  }

  private startPolling(): void {
    this.messagingService.startConversationListPolling((conversations) => {
      this.applyConversations(conversations);
    });
  }

  private applyConversations(conversations: Conversation[]): void {
    this.conversationsState.set(
      conversations.map(c => toConversationListItem(c, this.currentUserId)),
    );
  }
}
