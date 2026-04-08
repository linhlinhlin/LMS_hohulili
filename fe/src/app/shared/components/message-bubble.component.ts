import { Component, ChangeDetectionStrategy, input, output, signal, HostListener, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Message,
  MessageReaction,
  MessageStatus,
  formatMessageTime,
  hasAssignmentReference,
  parseMessageWithLinks,
  TextSegment,
} from '../../features/student/messages/utils/message-utils';

@Component({
  selector: 'app-message-bubble',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="group flex items-center mb-1.5"
      [attr.id]="'msg-' + message().id"
      [class.justify-end]="isOwnMessage"
      [class.justify-start]="!isOwnMessage"
      [class.flex-row-reverse]="isOwnMessage"
    >
      <!-- Swipe reply indicator -->
      @if (swipeOffset() > 20) {
        <div class="absolute left-0 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-[#0056D2]/10 text-[#0056D2]"
             [style.opacity]="swipeOffset() > 40 ? 1 : 0.5">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
          </svg>
        </div>
      }

      <!-- Bubble content -->
      <div class="relative max-w-[65%]">

        <!-- Message content area — long-press for mobile context menu -->
        <div
          (touchstart)="onTouchStart($event)"
          (touchmove)="onTouchMove($event)"
          (touchend)="onTouchEnd()"
          [style.transform]="'translateX(' + swipeOffset() + 'px)'"
          [style.transition]="swipeOffset() === 0 ? 'transform 0.2s ease' : 'none'">

          @if (message().recalled) {
            <!-- Recalled message (Messenger "Unsend" pattern) -->
            <div class="rounded-lg px-4 py-3 border border-dashed border-slate-300 bg-slate-50">
              <p class="text-sm italic text-slate-400">
                {{ isOwnMessage ? 'Bạn đã thu hồi tin nhắn' : message().senderName + ' đã thu hồi tin nhắn' }}
              </p>
              <span class="text-[10px] text-slate-300">{{ formatTime() }}</span>
            </div>
          } @else {
            <!-- Messenger reply block: quoted msg above, reply below, connected -->
            @if (message().replyTo) {
              <div class="mb-0.5 text-[11px] text-slate-400 flex items-center gap-1"
                   [class.justify-end]="isOwnMessage">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                </svg>
                {{ isOwnMessage ? 'Bạn đã trả lời' : message().senderName + ' đã trả lời' }}
              </div>
              <!-- Clickable quoted block — scrolls to original message -->
              <div class="rounded-t-[14px] px-3 py-1.5 text-[12px] cursor-pointer transition-colors"
                   [class.bg-[#0056D2]/60]="isOwnMessage"
                   [class.hover:bg-[#0056D2]/70]="isOwnMessage"
                   [class.text-white/70]="isOwnMessage"
                   [class.bg-slate-200]="!isOwnMessage"
                   [class.hover:bg-slate-300]="!isOwnMessage"
                   [class.text-slate-600]="!isOwnMessage"
                   (click)="scrollToReply()">
                <p class="font-semibold text-[11px]"
                   [class.text-white/80]="isOwnMessage"
                   [class.text-slate-500]="!isOwnMessage">{{ message().replyTo!.senderName }}</p>
                <p class="truncate">{{ message().replyTo!.content }}</p>
              </div>
            }

            <div
              class="px-3 py-2"
              [class.rounded-[18px]]="!message().replyTo"
              [class.rounded-b-[18px]]="message().replyTo"
              [class.rounded-t-sm]="message().replyTo"
              [class.bg-[#0056D2]]="isOwnMessage"
              [class.text-white]="isOwnMessage"
              [class.bg-slate-100]="!isOwnMessage"
              [class.text-slate-900]="!isOwnMessage"
              [class.rounded-br-sm]="isOwnMessage && !message().replyTo"
              [class.rounded-bl-sm]="!isOwnMessage && !message().replyTo"
            >
              @if (!isOwnMessage && !message().replyTo) {
                <p class="text-[11px] font-semibold text-slate-500 mb-0.5">{{ message().senderName }}</p>
              }

              <p class="text-[14px] leading-[1.35] whitespace-pre-wrap break-words">
                @for (segment of contentSegments; track $index) {
                  @if (segment.type === 'link') {
                    <a [href]="segment.url" target="_blank" rel="noopener noreferrer"
                      class="underline hover:opacity-80"
                      [class.text-white/60]="isOwnMessage"
                      [class.text-[#0056D2]]="!isOwnMessage">{{ segment.content }}</a>
                  } @else {
                    {{ segment.content }}
                  }
                }
              </p>

              @if (hasReference()) {
                <div class="mt-2 p-3 rounded-lg border"
                  [class.bg-[#0056D2]]="isOwnMessage" [class.border-[#0056D2]]="isOwnMessage"
                  [class.bg-white]="!isOwnMessage" [class.border-slate-200]="!isOwnMessage">
                  <div class="flex items-center gap-2 mb-1">
                    <svg class="w-4 h-4" [class.text-white/60]="isOwnMessage" [class.text-[#0056D2]]="!isOwnMessage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span class="text-xs font-medium" [class.text-white/60]="isOwnMessage" [class.text-slate-500]="!isOwnMessage">Bài tập đính kèm</span>
                  </div>
                  <a [routerLink]="['/student/tasks', message().assignmentReference?.assignmentId, 'work']"
                    class="block font-medium text-sm hover:underline"
                    [class.text-white]="isOwnMessage" [class.text-[#0056D2]]="!isOwnMessage">
                    {{ message().assignmentReference?.assignmentTitle }}
                  </a>
                  <p class="text-xs mt-1" [class.text-white/60]="isOwnMessage" [class.text-slate-500]="!isOwnMessage">
                    {{ message().assignmentReference?.courseName }}
                  </p>
                </div>
              }

              <div class="flex items-center gap-1.5 mt-1" [class.justify-end]="isOwnMessage">
                <span class="text-[11px]" [class.text-white/50]="isOwnMessage" [class.text-slate-400]="!isOwnMessage">
                  {{ formatTime() }}
                </span>
                @if (isOwnMessage) {
                  @switch (messageStatus) {
                    @case ('sending') {
                      <svg class="w-3.5 h-3.5 text-white/40 animate-spin" fill="none" viewBox="0 0 24 24" aria-label="Đang gửi">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25"/>
                        <path fill="currentColor" class="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    }
                    @case ('failed') {
                      <svg class="w-3.5 h-3.5 text-red-300" fill="none" viewBox="0 0 24 24" aria-label="Gửi thất bại">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z"/>
                      </svg>
                    }
                    @case ('read') {
                      <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 20 20" aria-label="Đã đọc">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 11l4 4 7-7"/>
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 11l4 4 7-7"/>
                      </svg>
                    }
                    @default {
                      <svg class="w-3.5 h-3.5 text-white/50" fill="none" viewBox="0 0 20 20" aria-label="Đã gửi">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 11l4 4L18 5"/>
                      </svg>
                    }
                  }
                }
              </div>
            </div>
          }
        </div>

        <!-- Reactions display -->
        @if (groupedReactions.length > 0) {
          <div class="mt-1 flex flex-wrap gap-1" [class.justify-end]="isOwnMessage">
            @for (group of groupedReactions; track group.emoji) {
              <button type="button" (click)="onReact(group.emoji)"
                class="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition"
                [class]="group.hasOwn
                  ? 'border-[#0056D2]/30 bg-[#0056D2]/10 text-[#0056D2]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'">
                <span>{{ group.emoji }}</span>
                @if (group.count > 1) {
                  <span class="text-[10px] font-medium">{{ group.count }}</span>
                }
              </button>
            }
          </div>
        }

        <!-- Context menu dropdown (Messenger ··· pattern) -->
        @if (showMenu()) {
          <div class="absolute z-20 rounded-lg border border-slate-200 bg-white py-1 shadow-lg min-w-[160px]"
               [class.right-0]="isOwnMessage"
               [class.left-0]="!isOwnMessage"
               [class.top-0]="menuAbove"
               [class.bottom-full]="!menuAbove"
               [class.mb-1]="!menuAbove"
               (click)="$event.stopPropagation()">
            <button type="button" (click)="onReply()"
              class="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
              </svg>
              Trả lời
            </button>
            <button type="button" (click)="copyText()"
              class="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
              </svg>
              Sao chép
            </button>
            @if (canRecall) {
              <button type="button" (click)="onRecall()"
                class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                </svg>
                Thu hồi tin nhắn
              </button>
            }
          </div>
        }
      </div>

      <!-- Inline toolbar: SAME ROW as bubble (Messenger pattern) — [😀] [↩] [⋮] -->
      @if (!message().recalled) {
        <div class="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mx-1">
          <!-- React button — opens quick picker popup -->
          <div class="relative">
            <button type="button" (click)="toggleReactionPicker($event)" title="Thả biểu cảm"
              class="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke-linecap="round"/>
                <circle cx="9" cy="9.5" r="0.5" fill="currentColor" stroke="none"/>
                <circle cx="15" cy="9.5" r="0.5" fill="currentColor" stroke="none"/>
              </svg>
            </button>
            @if (showReactionPicker()) {
              <div class="absolute z-20 bottom-full mb-1 flex gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-lg"
                   [class.right-0]="isOwnMessage" [class.left-0]="!isOwnMessage"
                   (click)="$event.stopPropagation()">
                @for (emoji of quickReactions; track emoji) {
                  <button type="button" (click)="onReact(emoji); showReactionPicker.set(false)"
                    class="flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:scale-125 hover:bg-slate-100">
                    {{ emoji }}
                  </button>
                }
              </div>
            }
          </div>
          <button type="button" (click)="onReply()" title="Trả lời"
            class="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
            </svg>
          </button>
          <button type="button" (click)="toggleMenu($event)" title="Thêm"
            class="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="4" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/>
            </svg>
          </button>
        </div>
      }
    </div>

    <!-- Mobile long-press overlay (Messenger pattern) -->
    @if (showMobileMenu()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
           (click)="closeMobileMenu()">
        <div class="w-full max-w-xs rounded-lg bg-white shadow-xl overflow-hidden" (click)="$event.stopPropagation()">
          <!-- Quick reactions row -->
          <div class="flex justify-center gap-2 px-4 py-3 border-b border-slate-100">
            @for (emoji of quickReactions; track emoji) {
              <button type="button" (click)="onReact(emoji); closeMobileMenu()"
                class="flex h-10 w-10 items-center justify-center rounded-full text-xl transition active:scale-90 hover:bg-slate-100">
                {{ emoji }}
              </button>
            }
          </div>
          <!-- Actions -->
          <button type="button" (click)="onReply(); closeMobileMenu()"
            class="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 active:bg-slate-50">
            <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
            </svg>
            Trả lời
          </button>
          <button type="button" (click)="copyText(); closeMobileMenu()"
            class="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 active:bg-slate-50">
            <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
            </svg>
            Sao chép tin nhắn
          </button>
          @if (canRecall) {
            <button type="button" (click)="onRecall(); closeMobileMenu()"
              class="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 active:bg-red-50 border-t border-slate-100">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
              </svg>
              Thu hồi tin nhắn
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class MessageBubbleComponent {
  private readonly el = inject(ElementRef);

  readonly message = input.required<Message>();
  readonly currentUserId = input.required<string>();
  readonly reactionToggle = output<{ messageId: string; emoji: string }>();
  readonly recallMessage = output<string>();
  readonly replyMessage = output<Message>();
  readonly scrollToMsg = output<string>();

  readonly quickReactions = ['👍', '❤️', '😂', '😮', '😢'];
  readonly showMenu = signal(false);
  readonly showMobileMenu = signal(false);
  readonly showReactionPicker = signal(false);
  readonly menuAbove = false;

  private longPressTimer: any = null;
  private touchStartX = 0;
  private touchStartY = 0;
  readonly swipeOffset = signal(0);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.showMenu.set(false);
      this.showReactionPicker.set(false);
    }
  }

  get isOwnMessage(): boolean {
    return this.message().senderId === this.currentUserId();
  }

  get messageStatus(): MessageStatus {
    const msg = this.message();
    if (msg.status) return msg.status;
    return msg.isRead ? 'read' : 'sent';
  }

  get groupedReactions(): { emoji: string; count: number; hasOwn: boolean }[] {
    const reactions = this.message().reactions || [];
    if (reactions.length === 0) return [];
    const groups = new Map<string, { count: number; hasOwn: boolean }>();
    const uid = this.currentUserId();
    for (const r of reactions) {
      const g = groups.get(r.emoji) || { count: 0, hasOwn: false };
      g.count++;
      if (r.userId === uid) g.hasOwn = true;
      groups.set(r.emoji, g);
    }
    return Array.from(groups.entries()).map(([emoji, g]) => ({ emoji, ...g }));
  }

  get canRecall(): boolean {
    if (!this.isOwnMessage || this.message().recalled) return false;
    const created = new Date(this.message().createdAt).getTime();
    return Date.now() - created < 15 * 60 * 1000;
  }

  get contentSegments(): TextSegment[] {
    return parseMessageWithLinks(this.message().content);
  }

  // === Actions ===

  onReact(emoji: string): void {
    this.reactionToggle.emit({ messageId: this.message().id, emoji });
    this.showMenu.set(false);
  }

  onReply(): void {
    this.replyMessage.emit(this.message());
    this.showMenu.set(false);
    this.showMobileMenu.set(false);
  }

  scrollToReply(): void {
    const replyId = this.message().replyTo?.id;
    if (replyId) this.scrollToMsg.emit(replyId);
  }

  onRecall(): void {
    this.recallMessage.emit(this.message().id);
    this.showMenu.set(false);
    this.showMobileMenu.set(false);
  }

  toggleReactionPicker(event: Event): void {
    event.stopPropagation();
    this.showReactionPicker.update(v => !v);
    this.showMenu.set(false);
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.showMenu.update(v => !v);
    this.showReactionPicker.set(false);
  }

  copyText(): void {
    const content = this.message().content;
    if (content && navigator.clipboard) {
      navigator.clipboard.writeText(content);
    }
    this.showMenu.set(false);
  }

  // === Mobile long-press (500ms — Messenger pattern) ===

  onTouchStart(event: TouchEvent): void {
    if (this.message().recalled) return;
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.swipeOffset.set(0);

    this.longPressTimer = setTimeout(() => {
      if (Math.abs(this.swipeOffset()) < 10) {
        this.showMobileMenu.set(true);
      }
    }, 500);
  }

  onTouchMove(event: TouchEvent): void {
    const touch = event.touches[0];
    const dx = touch.clientX - this.touchStartX;
    const dy = Math.abs(touch.clientY - this.touchStartY);

    // Cancel long-press if swiping
    if (Math.abs(dx) > 10 || dy > 10) {
      if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
    }

    // Swipe right to reply (Messenger pattern) — only for received messages, cap at 80px
    if (dx > 0 && dy < 30 && !this.isOwnMessage) {
      this.swipeOffset.set(Math.min(dx, 80));
    }
  }

  onTouchEnd(): void {
    if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }

    // If swiped far enough → trigger reply
    if (this.swipeOffset() > 50 && !this.isOwnMessage) {
      this.onReply();
    }
    this.swipeOffset.set(0);
  }

  closeMobileMenu(): void {
    this.showMobileMenu.set(false);
  }

  hasReference(): boolean {
    return hasAssignmentReference(this.message());
  }

  formatTime(): string {
    return formatMessageTime(this.message().createdAt);
  }
}
