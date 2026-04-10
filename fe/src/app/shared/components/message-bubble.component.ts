import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Message,
  MessageStatus,
  TextSegment,
  formatFullDateTime,
  formatMessageTime,
  hasAssignmentReference,
  isEmojiOnly,
  parseMessageWithLinks,
} from '../../features/student/messages/utils/message-utils';

/**
 * Message Bubble — Messenger Desktop Pattern (Clean Rewrite)
 *
 * Features:
 * - Emoji-only: large 32–40px, no bubble bg
 * - Messenger border-radius grouping (18px/4px)
 * - Connected reply block (quoted + reply, no gap)
 * - Inline toolbar same row as bubble (desktop)
 * - Quick reaction picker popup
 * - Mobile: long-press 500ms context menu + swipe-to-reply both directions
 * - Message status icons: sending/sent/read/failed
 * - Hover tooltip with full datetime
 */
@Component({
  selector: 'app-message-bubble',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="group relative flex items-end gap-1"
      [attr.id]="'msg-' + message().id"
      [class.flex-row-reverse]="isOwn()"
      [class.mb-0.5]="!isLastInGroup()"
      [class.mb-2]="isLastInGroup()"
    >
      <!-- Swipe-to-reply indicator -->
      @if (Math.abs(swipeOffset()) > 20) {
        <div
          class="absolute top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#0056D2]/10 text-[#0056D2] transition-opacity"
          [class.left-0]="!isOwn()"
          [class.right-0]="isOwn()"
          [style.opacity]="Math.abs(swipeOffset()) > 40 ? 1 : 0.5"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
          </svg>
        </div>
      }

      <!-- Bubble content area -->
      <div class="relative max-w-[65%] min-w-0" [title]="fullDateTime()">
        <div
          (touchstart)="onTouchStart($event)"
          (touchmove)="onTouchMove($event)"
          (touchend)="onTouchEnd()"
          [style.transform]="'translateX(' + swipeOffset() + 'px)'"
          [style.transition]="swipeOffset() === 0 ? 'transform 0.2s ease' : 'none'"
        >
          @if (message().recalled) {
            <div class="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
              <p class="text-sm italic text-slate-400">
                {{ isOwn() ? 'Bạn đã thu hồi tin nhắn' : message().senderName + ' đã thu hồi tin nhắn' }}
              </p>
              <span class="text-[10px] text-slate-300">{{ formatTime() }}</span>
            </div>
          } @else if (emojiOnly()) {
            <div>
              @if (!isOwn() && isFirstInGroup()) {
                <p class="mb-0.5 text-[11px] font-semibold text-slate-500">{{ message().senderName }}</p>
              }
              <p class="text-[40px] leading-tight">{{ message().content }}</p>
              <div class="mt-0.5 flex items-center gap-1" [class.justify-end]="isOwn()">
                <span class="text-[11px] text-slate-400">{{ formatTime() }}</span>
                @if (isOwn() && msgStatus() === 'read') {
                  <svg class="h-3.5 w-3.5 text-[#0056D2]" fill="none" viewBox="0 0 20 20">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 11l4 4 7-7"/>
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 11l4 4 7-7"/>
                  </svg>
                } @else if (isOwn()) {
                  <svg class="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 20 20">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 11l4 4L18 5"/>
                  </svg>
                }
              </div>
            </div>
          } @else {
            <!-- Sender name (received, first in group, no reply) -->
            @if (!isOwn() && isFirstInGroup() && !message().replyTo) {
              <p class="mb-0.5 text-[11px] font-semibold text-slate-500">{{ message().senderName }}</p>
            }

            <!-- Reply: quoted block above, connected to reply bubble -->
            @if (message().replyTo) {
              <div class="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400"
                   [class.justify-end]="isOwn()">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                </svg>
                {{ isOwn() ? 'Bạn đã trả lời' : message().senderName + ' đã trả lời' }}
              </div>
              <div
                class="cursor-pointer rounded-t-[14px] px-3 py-1.5 text-[12px] transition-colors"
                [class.bg-[#0056D2]/60]="isOwn()"
                [class.hover:bg-[#0056D2]/70]="isOwn()"
                [class.text-white/70]="isOwn()"
                [class.bg-slate-200]="!isOwn()"
                [class.hover:bg-slate-300]="!isOwn()"
                [class.text-slate-600]="!isOwn()"
                (click)="scrollToReply()">
                <p class="font-semibold text-[11px]"
                   [class.text-white/80]="isOwn()"
                   [class.text-slate-500]="!isOwn()">{{ message().replyTo!.senderName }}</p>
                <p class="truncate">{{ message().replyTo!.content }}</p>
              </div>
            }

            <!-- Main bubble -->
            <div
              class="px-3 py-2"
              [class.bg-[#0056D2]]="isOwn()"
              [class.text-white]="isOwn()"
              [class.bg-slate-100]="!isOwn()"
              [class.text-slate-900]="!isOwn()"
              [style.border-radius]="bubbleRadius()"
            >
              @if (!isOwn() && isFirstInGroup() && message().replyTo) {
                <p class="mb-0.5 text-[11px] font-semibold text-slate-500">{{ message().senderName }}</p>
              }
              <p class="whitespace-pre-wrap break-words text-[14px] leading-[1.35]">
                @for (segment of contentSegments(); track $index) {
                  @if (segment.type === 'link') {
                    <a [href]="segment.url" target="_blank" rel="noopener noreferrer"
                       class="underline hover:opacity-80"
                       [class.text-white/60]="isOwn()"
                       [class.text-[#0056D2]]="!isOwn()">{{ segment.content }}</a>
                  } @else {
                    {{ segment.content }}
                  }
                }
              </p>

              @if (hasReference()) {
                <div class="mt-2 rounded-lg border p-3"
                     [class.bg-[#0056D2]]="isOwn()" [class.border-white/20]="isOwn()"
                     [class.bg-white]="!isOwn()" [class.border-slate-200]="!isOwn()">
                  <div class="mb-1 flex items-center gap-2">
                    <svg class="h-4 w-4" [class.text-white/60]="isOwn()" [class.text-[#0056D2]]="!isOwn()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span class="text-xs font-medium" [class.text-white/60]="isOwn()" [class.text-slate-500]="!isOwn()">Bài tập đính kèm</span>
                  </div>
                  <a [routerLink]="['/student/tasks', message().assignmentReference?.assignmentId, 'work']"
                     class="block text-sm font-medium hover:underline"
                     [class.text-white]="isOwn()" [class.text-[#0056D2]]="!isOwn()">
                    {{ message().assignmentReference?.assignmentTitle }}
                  </a>
                  <p class="mt-1 text-xs" [class.text-white/60]="isOwn()" [class.text-slate-500]="!isOwn()">
                    {{ message().assignmentReference?.courseName }}
                  </p>
                </div>
              }

              <div class="mt-1 flex items-center gap-1.5" [class.justify-end]="isOwn()">
                <span class="text-[11px]" [class.text-white/50]="isOwn()" [class.text-slate-400]="!isOwn()">
                  {{ formatTime() }}
                </span>
                @if (isOwn()) {
                  @switch (msgStatus()) {
                    @case ('sending') {
                      <svg class="h-3.5 w-3.5 animate-spin text-white/40" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25"/>
                        <path fill="currentColor" class="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    }
                    @case ('failed') {
                      <svg class="h-3.5 w-3.5 text-red-300" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z"/>
                      </svg>
                    }
                    @case ('read') {
                      <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 11l4 4 7-7"/>
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 11l4 4 7-7"/>
                      </svg>
                    }
                    @default {
                      <svg class="h-3.5 w-3.5 text-white/50" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 11l4 4L18 5"/>
                      </svg>
                    }
                  }
                }
              </div>
            </div>
          }
        </div>

        <!-- Reaction chips -->
        @if (groupedReactions().length > 0) {
          <div class="mt-1 flex flex-wrap gap-1" [class.justify-end]="isOwn()">
            @for (group of groupedReactions(); track group.emoji) {
              <button type="button" (click)="onReact(group.emoji)"
                class="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition"
                [class.border-[#0056D2]/30]="group.hasOwn"
                [class.bg-[#0056D2]/10]="group.hasOwn"
                [class.text-[#0056D2]]="group.hasOwn"
                [class.border-slate-200]="!group.hasOwn"
                [class.bg-white]="!group.hasOwn"
                [class.text-slate-600]="!group.hasOwn"
                [class.hover:bg-slate-50]="!group.hasOwn">
                <span>{{ group.emoji }}</span>
                @if (group.count > 1) {
                  <span class="text-[10px] font-medium">{{ group.count }}</span>
                }
              </button>
            }
          </div>
        }

        <!-- Context menu -->
        @if (showMenu()) {
          <div class="absolute z-20 min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
               [class.right-0]="isOwn()" [class.left-0]="!isOwn()"
               [class.bottom-full]="true" [class.mb-1]="true"
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
            @if (canRecall()) {
              <button type="button" (click)="onRecall()"
                class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Thu hồi tin nhắn
              </button>
            }
          </div>
        }
      </div>

      <!-- Inline toolbar (desktop) -->
      @if (!message().recalled) {
        <div class="hidden flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity sm:flex group-hover:opacity-100">
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
              <div class="absolute bottom-full z-20 mb-1 flex gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-lg"
                   [class.right-0]="isOwn()" [class.left-0]="!isOwn()"
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

    <!-- Mobile long-press overlay -->
    @if (showMobileMenu()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
           (click)="closeMobileMenu()">
        <div class="w-full max-w-xs overflow-hidden rounded-lg bg-white shadow-xl" (click)="$event.stopPropagation()">
          <div class="flex justify-center gap-2 border-b border-slate-100 px-4 py-3">
            @for (emoji of quickReactions; track emoji) {
              <button type="button" (click)="onReact(emoji); closeMobileMenu()"
                class="flex h-10 w-10 items-center justify-center rounded-full text-xl transition active:scale-90 hover:bg-slate-100">
                {{ emoji }}
              </button>
            }
          </div>
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
          @if (canRecall()) {
            <button type="button" (click)="onRecall(); closeMobileMenu()"
              class="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm text-red-600 active:bg-red-50">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
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
  readonly isFirstInGroup = input<boolean>(true);
  readonly isLastInGroup = input<boolean>(true);

  readonly reactionToggle = output<{ messageId: string; emoji: string }>();
  readonly recallMessage = output<string>();
  readonly replyMessage = output<Message>();
  readonly scrollToMsg = output<string>();

  readonly Math = Math;
  readonly quickReactions = ['👍', '❤️', '😂', '😮', '😢'];

  readonly showMenu = signal(false);
  readonly showMobileMenu = signal(false);
  readonly showReactionPicker = signal(false);
  readonly swipeOffset = signal(0);

  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private touchStartX = 0;
  private touchStartY = 0;

  readonly isOwn = computed(() => this.message().senderId === this.currentUserId());

  readonly emojiOnly = computed(() => {
    const msg = this.message();
    if (msg.recalled || msg.replyTo || msg.assignmentReference) return false;
    return isEmojiOnly(msg.content);
  });

  readonly msgStatus = computed((): MessageStatus => {
    const msg = this.message();
    if (msg.status) return msg.status;
    return msg.isRead ? 'read' : 'sent';
  });

  readonly contentSegments = computed((): TextSegment[] =>
    parseMessageWithLinks(this.message().content),
  );

  readonly groupedReactions = computed(() => {
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
  });

  readonly canRecall = computed(() => {
    if (!this.isOwn() || this.message().recalled) return false;
    const created = new Date(this.message().createdAt).getTime();
    return Date.now() - created < 15 * 60 * 1000;
  });

  readonly bubbleRadius = computed(() => {
    const own = this.isOwn();
    const first = this.isFirstInGroup();
    const last = this.isLastInGroup();
    const hasReply = !!this.message().replyTo;
    const big = '18px';
    const small = '4px';

    if (hasReply) {
      if (own) return `${small} ${small} ${last ? big : small} ${big}`;
      return `${small} ${small} ${big} ${last ? big : small}`;
    }

    if (first && last) {
      if (own) return `${big} ${big} ${small} ${big}`;
      return `${big} ${big} ${big} ${small}`;
    }

    if (own) {
      const tr = first ? big : small;
      const br = last ? big : small;
      return `${big} ${tr} ${br} ${big}`;
    } else {
      const tl = first ? big : small;
      const bl = last ? big : small;
      return `${tl} ${big} ${big} ${bl}`;
    }
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.showMenu.set(false);
      this.showReactionPicker.set(false);
    }
  }

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

  hasReference(): boolean {
    return hasAssignmentReference(this.message());
  }

  formatTime(): string {
    return formatMessageTime(this.message().createdAt);
  }

  fullDateTime(): string {
    return formatFullDateTime(this.message().createdAt);
  }

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

    if (Math.abs(dx) > 10 || dy > 10) {
      if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
    }

    if (dy < 30) {
      if (!this.isOwn() && dx > 0) {
        this.swipeOffset.set(Math.min(dx, 80));
      } else if (this.isOwn() && dx < 0) {
        this.swipeOffset.set(Math.max(dx, -80));
      }
    }
  }

  onTouchEnd(): void {
    if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }

    if (Math.abs(this.swipeOffset()) > 50) {
      this.onReply();
    }
    this.swipeOffset.set(0);
  }

  closeMobileMenu(): void {
    this.showMobileMenu.set(false);
  }
}
