import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunicationService, Message, Conversation, Announcement } from '../../services/communication.service';

@Component({
  selector: 'app-communication',
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="communication-container bg-white rounded-xl shadow-lg">
      <!-- Header -->
      <div class="border-b border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">💬 Giao tiếp</h2>
            <p class="text-sm text-gray-600">Tin nhắn và thông báo</p>
          </div>
          <div class="flex items-center space-x-2">
            <div class="flex items-center space-x-1">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              <span class="text-xs text-gray-500">Trực tuyến</span>
            </div>
            @if (totalUnreadCount() > 0) {
              <span class="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                {{ totalUnreadCount() }}
              </span>
            }
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="border-b border-gray-200">
        <nav class="flex space-x-8 px-6">
          <button (click)="setActiveTab('messages')"
                  class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                  [class]="activeTab() === 'messages' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'">
            Tin nhắn
            @if (unreadMessages().length > 0) {
              <span class="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                {{ unreadMessages().length }}
              </span>
            }
          </button>
          <button (click)="setActiveTab('announcements')"
                  class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                  [class]="activeTab() === 'announcements' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'">
            Thông báo
            @if (unreadAnnouncements().length > 0) {
              <span class="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                {{ unreadAnnouncements().length }}
              </span>
            }
          </button>
          <button (click)="setActiveTab('forums')"
                  class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                  [class]="activeTab() === 'forums' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'">
            Diễn đàn
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="p-6">
        @switch (activeTab()) {
          @case ('messages') {
            <!-- Messages Tab -->
            <div class="space-y-6">
              <!-- Quick Actions -->
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-medium text-gray-900">Tin nhắn gần đây</h3>
                <button (click)="composeMessage()"
                        class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                  <svg class="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                  </svg>
                  Soạn tin nhắn
                </button>
              </div>

              <!-- Conversations List -->
              <div class="space-y-3">
                @for (conversation of activeConversations(); track conversation.id) {
                  <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                       (click)="openConversation(conversation.id)">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-3">
                        <div class="relative">
                          <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <svg class="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
                            </svg>
                          </div>
                          @if (hasOnlineParticipants(conversation)) {
                            <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          }
                        </div>
                        <div>
                          <h4 class="font-medium text-gray-900">
                            {{ getConversationTitle(conversation) }}
                          </h4>
                          @if (conversation.lastMessage) {
                            <p class="text-sm text-gray-600 truncate max-w-xs">
                              {{ conversation.lastMessage.content }}
                            </p>
                          }
                        </div>
                      </div>
                      <div class="text-right">
                        @if (conversation.unreadCount > 0) {
                          <span class="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                            {{ conversation.unreadCount }}
                          </span>
                        }
                        @if (conversation.lastMessage) {
                          <p class="text-xs text-gray-500 mt-1">
                            {{ formatTime(conversation.lastMessage.timestamp) }}
                          </p>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          @case ('announcements') {
            <!-- Announcements Tab -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-medium text-gray-900">Thông báo</h3>
                <button (click)="createAnnouncement()"
                        class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                  <svg class="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                  </svg>
                  Tạo thông báo
                </button>
              </div>

              <div class="space-y-4">
                @for (announcement of announcements(); track announcement.id) {
                  <div class="border border-gray-200 rounded-lg p-4"
                       [class]="announcement.priority === 'urgent' ? 'border-red-200 bg-red-50' : 'hover:bg-gray-50'">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                          <h4 class="font-medium text-gray-900">{{ announcement.title }}</h4>
                          @if (announcement.priority === 'urgent') {
                            <span class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                              Khẩn cấp
                            </span>
                          } @else if (announcement.priority === 'high') {
                            <span class="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                              Cao
                            </span>
                          }
                          @if (!announcement.readBy.includes('current-user')) {
                            <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                          }
                        </div>
                        <p class="text-sm text-gray-600 mb-2">{{ announcement.content }}</p>
                        <div class="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Tác giả: {{ announcement.authorName }}</span>
                          <span>{{ formatDateTime(announcement.createdAt) }}</span>
                          @if (announcement.targetAudience !== 'all') {
                            <span>Đối tượng: {{ getTargetAudienceText(announcement.targetAudience) }}</span>
                          }
                        </div>
                      </div>
                      <div class="flex items-center space-x-2">
                        @if (!announcement.readBy.includes('current-user')) {
                          <button (click)="markAnnouncementAsRead(announcement.id)"
                                  class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                            Đánh dấu đã đọc
                          </button>
                        }
                        <button (click)="viewAnnouncement(announcement.id)"
                                class="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          @case ('forums') {
            <!-- Forums Tab -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-medium text-gray-900">Diễn đàn thảo luận</h3>
                <button (click)="createForum()"
                        class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                  <svg class="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                  </svg>
                  Tạo diễn đàn
                </button>
              </div>

              <div class="space-y-4">
                @for (forum of forums(); track forum.id) {
                  <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                       (click)="openForum(forum.id)">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                          <h4 class="font-medium text-gray-900">{{ forum.title }}</h4>
                          @if (forum.isPinned) {
                            <span class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                              Ghim
                            </span>
                          }
                          @if (forum.isLocked) {
                            <span class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                              Khóa
                            </span>
                          }
                        </div>
                        <p class="text-sm text-gray-600 mb-2">{{ forum.description }}</p>
                        <div class="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Tác giả: {{ forum.authorName }}</span>
                          <span>{{ forum.postCount }} bài viết</span>
                          @if (forum.lastPost) {
                            <span>Cuối: {{ formatTime(forum.lastPost.timestamp) }}</span>
                          }
                        </div>
                      </div>
                      <div class="text-right">
                        <span class="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                          {{ getCategoryText(forum.category) }}
                        </span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }
      </div>
    </div>

    <!-- Message Composer Modal -->
    @if (showMessageComposer()) {
      <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div class="mt-3">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">Soạn tin nhắn mới</h3>
              <button (click)="closeMessageComposer()" class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Người nhận</label>
                <input type="text" placeholder="Nhập tên hoặc email..." 
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
                <input type="text" placeholder="Nhập tiêu đề tin nhắn..." 
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
                <textarea rows="4" placeholder="Nhập nội dung tin nhắn..." 
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
              </div>
            </div>
            
            <div class="flex justify-end space-x-3 mt-6">
              <button (click)="closeMessageComposer()"
                      class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors">
                Hủy
              </button>
              <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Gửi tin nhắn
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Announcement Detail Modal -->
    @if (showAnnouncementDetail() && selectedAnnouncement()) {
      <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
          <div class="mt-3">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">Chi tiết thông báo</h3>
              <button (click)="closeAnnouncementDetail()" class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div class="space-y-4">
              <div>
                <h4 class="text-xl font-semibold text-gray-900">{{ selectedAnnouncement().title }}</h4>
                <p class="text-sm text-gray-500 mt-1">{{ selectedAnnouncement().author.name }} • {{ formatDate(selectedAnnouncement().createdAt) }}</p>
              </div>
              
              <div class="prose max-w-none">
                <p class="text-gray-700">{{ selectedAnnouncement().content }}</p>
              </div>
              
              @if (selectedAnnouncement().attachments && selectedAnnouncement().attachments.length > 0) {
                <div>
                  <h5 class="font-medium text-gray-900 mb-2">Tệp đính kèm</h5>
                  <div class="space-y-2">
                    @for (attachment of selectedAnnouncement().attachments; track attachment.id) {
                      <div class="flex items-center p-2 bg-gray-50 rounded">
                        <svg class="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                        <span class="text-sm text-gray-700">{{ attachment.name }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
            
            <div class="flex justify-end mt-6">
              <button (click)="closeAnnouncementDetail()"
                      class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommunicationComponent implements OnInit {
  protected communicationService = inject(CommunicationService);

  // State
  activeTab = signal<'messages' | 'announcements' | 'forums'>('messages');
  
  // Modal states
  showMessageComposer = signal(false);
  showAnnouncementCreator = signal(false);
  showAnnouncementDetail = signal(false);
  showForumCreator = signal(false);
  selectedAnnouncement = signal<any>(null);

  // Computed properties from service
  messages = computed(() => this.communicationService.messages());
  conversations = computed(() => this.communicationService.conversations());
  announcements = computed(() => this.communicationService.announcements());
  forums = computed(() => this.communicationService.forums());
  unreadMessages = computed(() => this.communicationService.unreadMessages());
  unreadAnnouncements = computed(() => this.communicationService.unreadAnnouncements());
  activeConversations = computed(() => this.communicationService.activeConversations());
  totalUnreadCount = computed(() => this.communicationService.totalUnreadCount());

  ngOnInit(): void {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    await Promise.all([
      this.communicationService.getMessages(),
      this.communicationService.getConversations(),
      this.communicationService.getAnnouncements(),
      this.communicationService.getForums()
    ]);
  }

  setActiveTab(tab: 'messages' | 'announcements' | 'forums'): void {
    this.activeTab.set(tab);
  }

  hasOnlineParticipants(conversation: Conversation): boolean {
    return conversation.participants.some(p => p.isOnline);
  }

  // Message Actions
  composeMessage(): void {
    this.showMessageComposer.set(true);
  }

  openConversation(conversationId: string): void {
    // Navigate to conversation detail page
    window.open(`/communication/conversation/${conversationId}`, '_blank');
  }

  // Announcement Actions
  createAnnouncement(): void {
    this.showAnnouncementCreator.set(true);
  }

  async markAnnouncementAsRead(announcementId: string): Promise<void> {
    await this.communicationService.markAnnouncementAsRead(announcementId);
  }

  viewAnnouncement(announcementId: string): void {
    const announcement = this.announcements().find(a => a.id === announcementId);
    if (announcement) {
      this.selectedAnnouncement.set(announcement);
      this.showAnnouncementDetail.set(true);
    }
  }

  // Forum Actions
  createForum(): void {
    this.showForumCreator.set(true);
  }

  openForum(forumId: string): void {
    // Navigate to forum detail page
    window.open(`/communication/forum/${forumId}`, '_blank');
  }

  // Modal close methods
  closeMessageComposer(): void {
    this.showMessageComposer.set(false);
  }

  closeAnnouncementCreator(): void {
    this.showAnnouncementCreator.set(false);
  }

  closeAnnouncementDetail(): void {
    this.showAnnouncementDetail.set(false);
    this.selectedAnnouncement.set(null);
  }

  closeForumCreator(): void {
    this.showForumCreator.set(false);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Utility Methods
  getConversationTitle(conversation: Conversation): string {
    const otherParticipants = conversation.participants.filter(p => p.id !== 'current-user');
    if (otherParticipants.length === 1) {
      return otherParticipants[0].name;
    } else if (otherParticipants.length > 1) {
      return `${otherParticipants.length} người`;
    }
    return 'Cuộc trò chuyện';
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Vừa xong';
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTargetAudienceText(audience: string): string {
    const audienceMap: Record<string, string> = {
      'all': 'Tất cả',
      'teachers': 'Giảng viên',
      'students': 'Học viên',
      'specific': 'Cụ thể'
    };
    return audienceMap[audience] || audience;
  }

  getCategoryText(category: string): string {
    const categoryMap: Record<string, string> = {
      'general': 'Chung',
      'course': 'Khóa học',
      'assignment': 'Bài tập',
      'technical': 'Kỹ thuật',
      'announcement': 'Thông báo'
    };
    return categoryMap[category] || category;
  }
}