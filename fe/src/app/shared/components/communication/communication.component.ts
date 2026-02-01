import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunicationService, Message, Conversation, Announcement } from '../../services/communication.service';

@Component({
  selector: 'app-communication',
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './communication.component.html',
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
      return `${otherParticipants.length} ngÆ°á»i`;
    }
    return 'Cuá»™c trĂ² chuyá»‡n';
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Vá»«a xong';
    if (diffInHours < 24) return `${diffInHours} giá» trÆ°á»›c`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngĂ y trÆ°á»›c`;
    
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
      'all': 'Táº¥t cáº£',
      'teachers': 'Giáº£ng viĂªn',
      'students': 'Há»c viĂªn',
      'specific': 'Cá»¥ thá»ƒ'
    };
    return audienceMap[audience] || audience;
  }

  getCategoryText(category: string): string {
    const categoryMap: Record<string, string> = {
      'general': 'Chung',
      'course': 'KhĂ³a há»c',
      'assignment': 'BĂ i táº­p',
      'technical': 'Ká»¹ thuáº­t',
      'announcement': 'ThĂ´ng bĂ¡o'
    };
    return categoryMap[category] || category;
  }
}

