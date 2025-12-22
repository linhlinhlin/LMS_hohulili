/**
 * ChatPageComponent - Professional AI Chat Interface
 * Redesigned with ChatGPT/Gemini-style layout
 * - Left sidebar: Chat history
 * - Main area: Chat messages with centered content
 * - Bottom: Input area
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  ElementRef,
  viewChild,
  afterNextRender,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../application/services/chat.service';
import { SessionManagementService } from '../../../application/services/session-management.service';
import { ChatMessageComponent } from '../../components/chat-message/chat-message.component';
import { ChatMessageInputComponent } from '../../components/chat-message-input/chat-message-input.component';
import { TypingIndicatorComponent } from '../../components/typing-indicator/typing-indicator.component';
import { SuggestedQuestionsComponent } from '../../components/suggested-questions/suggested-questions.component';
import { SourceCitationComponent } from '../../components/source-citation/source-citation.component';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    ChatMessageComponent,
    ChatMessageInputComponent,
    TypingIndicatorComponent,
    SuggestedQuestionsComponent,
    SourceCitationComponent,
  ],
  templateUrl: './chat-page.component.html',
  styleUrls: ['./chat-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPageComponent implements OnInit {
  readonly chatService = inject(ChatService);
  private readonly sessionService = inject(SessionManagementService);
  private readonly authService = inject(AuthService);

  // State
  userName = signal<string>('');
  sidebarCollapsed = signal<boolean>(false);
  
  // Mock chat history for sidebar
  chatHistory = signal<Array<{id: string; title: string; date: string; active: boolean}>>([
    { id: '1', title: 'Quy tắc COLREGs Rule 15', date: 'Hôm nay', active: true },
    { id: '2', title: 'An toàn hàng hải SOLAS', date: 'Hôm qua', active: false },
    { id: '3', title: 'Luật MARPOL về ô nhiễm', date: '3 ngày trước', active: false },
  ]);

  // View child
  messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  // Computed
  hasMessages = computed(() => this.chatService.messages().length > 0);

  constructor() {
    afterNextRender(() => {
      this.scrollToBottom();
    });
  }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.userName.set(user.fullName || user.name || '');
      this.sessionService.setUser(user.id, user.role || 'student');
    }
    this.sessionService.updateContextFromRoute();
  }

  onSendMessage(message: string): void {
    this.chatService.sendMessage(message);
    setTimeout(() => this.scrollToBottom(), 100);
  }

  onSuggestionClick(question: string): void {
    this.chatService.sendSuggestedQuestion(question);
    setTimeout(() => this.scrollToBottom(), 100);
  }

  onRetry(): void {
    this.chatService.retryLastMessage();
  }

  onNewChat(): void {
    this.chatService.startNewSession();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  selectChat(chatId: string): void {
    this.chatHistory.update(history => 
      history.map(h => ({ ...h, active: h.id === chatId }))
    );
  }

  private scrollToBottom(): void {
    const container = this.messagesContainer();
    if (container) {
      container.nativeElement.scrollTop = container.nativeElement.scrollHeight;
    }
  }
}

