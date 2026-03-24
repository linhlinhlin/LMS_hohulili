import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  MessageRecipientCandidate,
  MessagingService,
} from '../../../core/services/messaging.service';

@Component({
  selector: 'app-message-recipient-picker',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './message-recipient-picker.component.html',
})
export class MessageRecipientPickerComponent implements OnInit, OnDestroy {
  private readonly messagingService = inject(MessagingService);

  readonly close = output<void>();
  readonly recipientSelected = output<MessageRecipientCandidate>();

  readonly recipients = signal<MessageRecipientCandidate[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  searchQuery = '';

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly hasResults = computed(() => this.recipients().length > 0);

  ngOnInit(): void {
    this.loadRecipients();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(() => {
      this.loadRecipients(this.searchQuery.trim());
    }, 250);
  }

  retry(): void {
    this.loadRecipients(this.searchQuery.trim());
  }

  chooseRecipient(recipient: MessageRecipientCandidate): void {
    this.recipientSelected.emit(recipient);
  }

  dismiss(): void {
    this.close.emit();
  }

  roleLabel(role: MessageRecipientCandidate['role']): string {
    switch (role) {
      case 'ADMIN':
        return 'Quản trị hệ thống';
      case 'ORG_ADMIN':
        return 'Chuyên viên quản lý';
      case 'TEACHER':
        return 'Giảng viên';
      default:
        return 'Học viên';
    }
  }

  private loadRecipients(query?: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.messagingService
      .getRecipients({
        query,
        contextType: 'auto',
        limit: 20,
      })
      .subscribe({
        next: (recipients) => {
          this.recipients.set(recipients);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Không thể tải danh sách người nhận. Vui lòng thử lại.');
          this.loading.set(false);
        },
      });
  }
}
