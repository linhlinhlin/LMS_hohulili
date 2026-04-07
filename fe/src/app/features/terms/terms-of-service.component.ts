import { Component, ChangeDetectionStrategy, signal, inject, OnInit, OnDestroy, HostListener, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-terms-of-service',
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './terms-of-service.component.html',
})
export class TermsOfServiceComponent implements OnInit, OnDestroy {
  private platformId = inject<Object>(PLATFORM_ID);
  private router = inject(Router);
  private seo = inject(SeoService);

  // Signals
  isTocVisible = signal(true);
  activeSection = signal('');
  showBackToTop = signal(false);
  
  // Sections for the table of contents
  sections = [
    { id: 'gioi-thieu', title: 'Giới Thiệu' },
    { id: 'chap-nhan-dieu-khoan', title: 'Chấp Nhận Điều Khoản' },
    { id: 'muc-dich-su-dung', title: 'Mục Đích Sử Dụng' },
    { id: 'lien-he', title: 'Liên Hệ' },
  ];

  ngOnInit(): void {
    this.seo.setPageMeta(
      'Điều khoản sử dụng',
      'Điều khoản sử dụng dịch vụ LMS Maritime — hệ thống đào tạo hàng hải trực tuyến.',
      undefined,
      'https://holilihu.online/terms'
    );
    this.seo.setCanonical('https://holilihu.online/terms');

    if (isPlatformBrowser(this.platformId)) {
      this.updateActiveSection();
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.updateActiveSection();
      this.showBackToTop.set(window.scrollY > 300);
    }
  }

  private updateActiveSection(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    let currentSection = '';
    this.sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          currentSection = id;
        }
      }
    });
    this.activeSection.set(currentSection);
  }

  scrollToSection(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: 'smooth',
      });
    }
  }

  getSectionClass(sectionId: string): string {
    return this.activeSection() === sectionId
      ? 'bg-[#0056D2]/5 text-[#0056D2]'
      : 'hover:bg-gray-100 text-gray-700';
  }

  getDotClass(sectionId: string): string {
    return this.activeSection() === sectionId
      ? 'bg-[#0056D2]'
      : 'bg-gray-300';
  }

  setIsTocVisible(value: boolean): void {
    this.isTocVisible.set(value);
  }
}

