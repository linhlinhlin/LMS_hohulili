import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../core/services/toast.service';
import { SeoService } from '../../core/services/seo.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-contact',
  imports: [FormsModule, RouterModule],
  templateUrl: './contact.component.html',
})
export class ContactComponent implements OnInit {
  private toast = inject(ToastService);
  private seo = inject(SeoService);

  isSubmitting = signal(false);
  submitMessage = signal('');
  isSuccess = signal(false);

  ngOnInit(): void {
    // SEO Phase 5: surface contact page meta cho search engines + share previews
    this.seo.setPageMeta(
      'Liên hệ',
      'Liên hệ The Wiii Lab — đội ngũ vận hành LMS Maritime hỗ trợ tư vấn khóa học hàng hải, hợp tác doanh nghiệp/trường học/chính phủ.',
      'https://holilihu.online/og-image.png',
      'https://holilihu.online/contact'
    );
    this.seo.setCanonical('https://holilihu.online/contact');
    // SEO Phase 6: BreadcrumbList
    this.seo.setBreadcrumb([
      { name: 'Trang chủ', url: 'https://holilihu.online/' },
      { name: 'Liên hệ' }
    ]);
  }

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
    window.open(`mailto:contact@holilihu.online?subject=${subject}&body=${body}`, '_self');
    this.toast.success('Đã mở ứng dụng email. Vui lòng gửi email để liên hệ.');
  }
}
