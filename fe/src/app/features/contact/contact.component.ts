import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-contact',
  imports: [FormsModule],
  templateUrl: './contact.component.html',
})
export class ContactComponent {
  private toast = inject(ToastService);

  isSubmitting = signal(false);
  submitMessage = signal('');
  isSuccess = signal(false);

  formData = {
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    agree: false
  };

  onSubmit(): void {
    if (!this.formData.agree) {
      this.toast.error('Vui lòng đồng ý với chính sách bảo mật và điều khoản sử dụng');
      return;
    }

    const subject = encodeURIComponent(this.formData.subject);
    const body = encodeURIComponent(
      `Tên: ${this.formData.name}\nEmail: ${this.formData.email}\nSĐT: ${this.formData.phone}\n\n${this.formData.message}`
    );
    window.open(`mailto:support@maritime.edu?subject=${subject}&body=${body}`, '_self');
    this.toast.success('Đã mở ứng dụng email. Vui lòng gửi email để liên hệ.');
  }
}
