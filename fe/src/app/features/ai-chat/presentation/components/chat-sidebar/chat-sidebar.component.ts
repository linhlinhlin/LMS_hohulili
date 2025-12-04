import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionSummary } from '../../../domain/types';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="sidebar-container" 
      [class.collapsed]="isCollapsed()"
      [class.open]="mobileIsOpen"
    >
      <!-- New Chat Button -->
      <button class="new-chat-btn" (click)="onNewChat()">
        <span class="icon">+</span>
        <span class="text" *ngIf="!isCollapsed()">Cuộc trò chuyện mới</span>
      </button>

      <!-- Session List -->
      <div class="sessions-list" *ngIf="!isCollapsed()">
        <!-- Group: Today -->
        <div class="session-group" *ngIf="groupedSessions().today.length > 0">
          <h3 class="group-title">Hôm nay</h3>
          <div 
            *ngFor="let session of groupedSessions().today"
            class="session-item"
            [class.active]="session.id === activeSessionId"
            (click)="onSelectSession(session.id)"
          >
            <span class="session-title">{{ session.title }}</span>
            <button class="delete-btn" (click)="onDeleteSession($event, session.id)" title="Xóa">
              ×
            </button>
          </div>
        </div>

        <!-- Group: Yesterday -->
        <div class="session-group" *ngIf="groupedSessions().yesterday.length > 0">
          <h3 class="group-title">Hôm qua</h3>
          <div 
            *ngFor="let session of groupedSessions().yesterday"
            class="session-item"
            [class.active]="session.id === activeSessionId"
            (click)="onSelectSession(session.id)"
          >
            <span class="session-title">{{ session.title }}</span>
            <button class="delete-btn" (click)="onDeleteSession($event, session.id)" title="Xóa">
              ×
            </button>
          </div>
        </div>

        <!-- Group: Previous 7 Days -->
        <div class="session-group" *ngIf="groupedSessions().previous7Days.length > 0">
          <h3 class="group-title">7 ngày trước</h3>
          <div 
            *ngFor="let session of groupedSessions().previous7Days"
            class="session-item"
            [class.active]="session.id === activeSessionId"
            (click)="onSelectSession(session.id)"
          >
            <span class="session-title">{{ session.title }}</span>
            <button class="delete-btn" (click)="onDeleteSession($event, session.id)" title="Xóa">
              ×
            </button>
          </div>
        </div>
        
        <!-- Group: Older -->
        <div class="session-group" *ngIf="groupedSessions().older.length > 0">
          <h3 class="group-title">Cũ hơn</h3>
          <div 
            *ngFor="let session of groupedSessions().older"
            class="session-item"
            [class.active]="session.id === activeSessionId"
            (click)="onSelectSession(session.id)"
          >
            <span class="session-title">{{ session.title }}</span>
            <button class="delete-btn" (click)="onDeleteSession($event, session.id)" title="Xóa">
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- User Profile / Settings (Bottom) -->
      <div class="sidebar-footer">
        <!-- Placeholder for user info or settings -->
      </div>
    </div>
    
    <!-- Mobile Overlay -->
    <div 
      class="mobile-overlay" 
      *ngIf="mobileIsOpen"
      (click)="closeMobileMenu()"
    ></div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      background-color: #0a192f; /* Deep Maritime Blue */
      color: #e6f1ff; /* Light Blue-White text */
      border-right: 1px solid #172a45;
    }

    .sidebar-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 260px;
      padding: 10px;
      transition: width 0.3s ease;
      background-color: #0a192f;
    }

    .sidebar-container.collapsed {
      width: 60px;
    }

    .new-chat-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 12px 15px;
      border: 1px solid #233554;
      border-radius: 6px;
      background: #112240; /* Slightly lighter blue */
      color: #64ffda; /* Teal/Cyan accent */
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 20px;
      font-weight: 500;
    }

    .new-chat-btn:hover {
      background-color: #172a45;
      border-color: #64ffda;
    }

    .sessions-list {
      flex: 1;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #233554 #0a192f;
    }
    
    .sessions-list::-webkit-scrollbar {
      width: 6px;
    }
    
    .sessions-list::-webkit-scrollbar-track {
      background: #0a192f;
    }
    
    .sessions-list::-webkit-scrollbar-thumb {
      background-color: #233554;
      border-radius: 3px;
    }

    .session-group {
      margin-bottom: 20px;
    }

    .group-title {
      font-size: 0.75rem;
      color: #8892b0; /* Muted blue-gray */
      margin-bottom: 8px;
      padding-left: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .session-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
      color: #ccd6f6;
      font-size: 0.9rem;
      margin-bottom: 2px;
    }

    .session-item:hover {
      background-color: #112240;
    }

    .session-item.active {
      background-color: #172a45;
      color: #64ffda;
    }

    .session-title {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .delete-btn {
      background: none;
      border: none;
      color: #8892b0;
      cursor: pointer;
      font-size: 1.2rem;
      opacity: 0;
      transition: all 0.2s;
      padding: 0 5px;
      line-height: 1;
    }

    .session-item:hover .delete-btn {
      opacity: 1;
    }

    .delete-btn:hover {
      color: #ff6b6b; /* Soft red */
    }
    
    .mobile-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 90;
    }
    
    /* Mobile Responsive */
    @media (max-width: 768px) {
      .sidebar-container {
        position: absolute;
        z-index: 100;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        box-shadow: 2px 0 10px rgba(0,0,0,0.3);
        height: 100%;
      }
      
      .sidebar-container.open {
        transform: translateX(0);
      }
      
      .mobile-overlay {
        display: block;
      }
    }
  `]
})
export class ChatSidebarComponent {
  @Input() sessions: SessionSummary[] = [];
  @Input() activeSessionId: string | null = null;
  @Input() mobileIsOpen: boolean = false;

  @Output() newChat = new EventEmitter<void>();
  @Output() selectSession = new EventEmitter<string>();
  @Output() deleteSession = new EventEmitter<string>();
  @Output() closeMobile = new EventEmitter<void>();

  isCollapsed = signal(false);

  groupedSessions = computed(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    const groups = {
      today: [] as SessionSummary[],
      yesterday: [] as SessionSummary[],
      previous7Days: [] as SessionSummary[],
      older: [] as SessionSummary[]
    };

    this.sessions.forEach(session => {
      const date = new Date(session.updatedAt); // Assuming updatedAt is ISO string

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
    this.closeMobileMenu();
  }

  onSelectSession(id: string) {
    this.selectSession.emit(id);
    this.closeMobileMenu();
  }

  onDeleteSession(event: Event, id: string) {
    event.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này?')) {
      this.deleteSession.emit(id);
    }
  }

  closeMobileMenu() {
    this.closeMobile.emit();
  }
}
