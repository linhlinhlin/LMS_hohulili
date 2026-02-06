import { Component, input, output, computed, signal, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SessionSummary } from '../../../domain/types';
import { ChatDialogService } from '../chat-dialog/chat-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chat-sidebar',
  imports: [FormsModule, RouterModule],
  template: `
    <div class="sidebar-wrapper">
      <!-- Header -->
      <div class="sidebar-header">
        <a routerLink=".." class="back-link">
          <svg class="back-icon" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Quay lại</span>
        </a>
      </div>

      <!-- Brand -->
      <div class="brand-section">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M12 2V4M12 20V22M2 12H4M20 12H22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="brand-text">
          <span class="brand-title">Trợ lý AI</span>
          <span class="brand-subtitle">Hàng hải</span>
        </div>
      </div>

      <!-- New Chat Button -->
      <button class="new-chat-btn" (click)="onNewChat()">
        <svg class="plus-icon" viewBox="0 0 24 24" fill="none">
          <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Cuộc trò chuyện mới</span>
      </button>

      <!-- Search -->
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none">
          <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <input 
          type="text" 
          placeholder="Tìm kiếm lịch sử..."
          [(ngModel)]="searchQuery"
          class="search-input"
        >
      </div>

      <!-- Sessions List (Scrollable) -->
      <div class="sessions-scroll">
        <!-- Group: Today -->
        @if (groupedSessions().today.length > 0) {
          <div class="session-group">
            <h3 class="group-title">Hôm nay</h3>
            @for (session of groupedSessions().today; track session.id) {
              <div 
                class="session-item"
                [class.active]="session.id === activeSessionId()"
                (click)="onSelectSession(session.id)"
              >
                <svg class="session-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="session-title">{{ session.title }}</span>
                <button class="delete-btn" (click)="onDeleteSession($event, session.id)" title="Xóa">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            }
          </div>
        }

        <!-- Group: Yesterday -->
        @if (groupedSessions().yesterday.length > 0) {
          <div class="session-group">
            <h3 class="group-title">Hôm qua</h3>
            @for (session of groupedSessions().yesterday; track session.id) {
              <div 
                class="session-item"
                [class.active]="session.id === activeSessionId()"
                (click)="onSelectSession(session.id)"
              >
                <svg class="session-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="session-title">{{ session.title }}</span>
                <button class="delete-btn" (click)="onDeleteSession($event, session.id)" title="Xóa">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            }
          </div>
        }

        <!-- Group: Previous 7 Days -->
        @if (groupedSessions().previous7Days.length > 0) {
          <div class="session-group">
            <h3 class="group-title">7 ngày qua</h3>
            @for (session of groupedSessions().previous7Days; track session.id) {
              <div 
                class="session-item"
                [class.active]="session.id === activeSessionId()"
                (click)="onSelectSession(session.id)"
              >
                <svg class="session-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="session-title">{{ session.title }}</span>
                <button class="delete-btn" (click)="onDeleteSession($event, session.id)" title="Xóa">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            }
          </div>
        }
        
        <!-- Group: Older -->
        @if (groupedSessions().older.length > 0) {
          <div class="session-group">
            <h3 class="group-title">Cũ hơn</h3>
            @for (session of groupedSessions().older; track session.id) {
              <div 
                class="session-item"
                [class.active]="session.id === activeSessionId()"
                (click)="onSelectSession(session.id)"
              >
                <svg class="session-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="session-title">{{ session.title }}</span>
                <button class="delete-btn" (click)="onDeleteSession($event, session.id)" title="Xóa">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            }
          </div>
        }

        <!-- Empty State -->
        @if (sessions().length === 0) {
          <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none">
              <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p>Chưa có cuộc trò chuyện</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .sidebar-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 280px;
      background: #FFFFFF;
      border-right: 1px solid #E2E8F0;
    }

    /* ===== FIXED HEADER ===== */
    .sidebar-header {
      flex-shrink: 0;
      padding: 16px;
      border-bottom: 1px solid #E2E8F0;
    }

    .back-link {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: #64748B;
      text-decoration: none;
      transition: color 0.15s;
    }

    .back-link:hover {
      color: #0369A1;
    }

    .back-icon {
      width: 18px;
      height: 18px;
    }

    /* ===== BRAND ===== */
    .brand-section {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
    }

    .brand-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0369A1 0%, #0284C7 100%);
      border-radius: 10px;
      color: white;
    }

    .brand-icon svg {
      width: 24px;
      height: 24px;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: #0F172A;
    }

    .brand-subtitle {
      font-size: 0.75rem;
      color: #64748B;
    }

    /* ===== NEW CHAT BUTTON ===== */
    .new-chat-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 0 16px 16px;
      padding: 12px 16px;
      background: #0369A1;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      color: white;
      transition: all 0.2s;
    }

    .new-chat-btn:hover {
      background: #0284C7;
    }

    .plus-icon {
      width: 18px;
      height: 18px;
    }

    /* ===== SEARCH ===== */
    .search-box {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 16px 16px;
      padding: 10px 12px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
    }

    .search-icon {
      width: 16px;
      height: 16px;
      color: #94A3B8;
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 0.875rem;
      color: #334155;
      outline: none;
    }

    .search-input::placeholder {
      color: #94A3B8;
    }

    /* ===== SESSIONS LIST (SCROLLABLE) ===== */
    .sessions-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 0 12px;
    }

    .sessions-scroll::-webkit-scrollbar {
      width: 4px;
    }

    .sessions-scroll::-webkit-scrollbar-track {
      background: transparent;
    }

    .sessions-scroll::-webkit-scrollbar-thumb {
      background-color: #E2E8F0;
      border-radius: 2px;
    }

    .session-group {
      margin-bottom: 20px;
    }

    .group-title {
      font-size: 0.6875rem;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
      padding-left: 8px;
      font-weight: 600;
    }

    .session-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
      margin-bottom: 2px;
    }

    .session-item:hover {
      background: #F1F5F9;
    }

    .session-item.active {
      background: #F0F9FF;
    }

    .session-icon {
      width: 18px;
      height: 18px;
      color: #94A3B8;
      flex-shrink: 0;
    }

    .session-item.active .session-icon {
      color: #0369A1;
    }

    .session-title {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.875rem;
      color: #334155;
    }

    .session-item.active .session-title {
      color: #0369A1;
      font-weight: 500;
    }

    .delete-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      color: #94A3B8;
      opacity: 0;
      transition: all 0.15s;
    }

    .session-item:hover .delete-btn {
      opacity: 1;
    }

    .delete-btn:hover {
      background: #FEE2E2;
      color: #DC2626;
    }

    .delete-btn svg {
      width: 16px;
      height: 16px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 16px;
      text-align: center;
    }

    .empty-icon {
      width: 40px;
      height: 40px;
      color: #CBD5E1;
      margin-bottom: 12px;
    }

    .empty-state p {
      font-size: 0.875rem;
      color: #94A3B8;
      margin: 0;
    }
  `]
})
export class ChatSidebarComponent {
  private readonly dialogService = inject(ChatDialogService);

  // Signal inputs (Angular v20+)
  readonly sessions = input<SessionSummary[]>([]);
  readonly activeSessionId = input<string | null>(null);
  readonly mobileIsOpen = input(false);

  // Output functions (Angular v20+)
  readonly newChat = output<void>();
  readonly selectSession = output<string>();
  readonly deleteSession = output<string>();
  readonly closeMobile = output<void>();

  searchQuery = '';

  groupedSessions = computed(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    const filteredSessions = this.searchQuery.trim()
      ? this.sessions().filter(s =>
        s.title.toLowerCase().includes(this.searchQuery.toLowerCase())
      )
      : this.sessions();

    const groups = {
      today: [] as SessionSummary[],
      yesterday: [] as SessionSummary[],
      previous7Days: [] as SessionSummary[],
      older: [] as SessionSummary[]
    };

    filteredSessions.forEach(session => {
      const date = new Date(session.updatedAt);

      if (date >= today) {
        groups.today.push(session);
      } else if (date >= yesterday) {
        groups.yesterday.push(session);
      } else if (date >= last7Days) {
        groups.previous7Days.push(session);
      } else {
        groups.older.push(session);
      }
    });

    return groups;
  });

  onNewChat() {
    this.newChat.emit();
  }

  onSelectSession(id: string) {
    this.selectSession.emit(id);
  }

  async onDeleteSession(event: Event, id: string) {
    event.stopPropagation();
    const session = this.sessions().find(s => s.id === id);
    const title = session?.title || 'cuộc trò chuyện này';

    const confirmed = await this.dialogService.confirmDelete(title);
    if (confirmed) {
      this.deleteSession.emit(id);
    }
  }
}
