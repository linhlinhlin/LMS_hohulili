import { Component, ChangeDetectionStrategy, signal, inject, OnInit, OnDestroy, HostListener, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-privacy-policy',
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './privacy-policy.component.html',
})
export class PrivacyPolicyComponent implements OnInit, OnDestroy {
  private platformId = inject<Object>(PLATFORM_ID);
  private router = inject(Router);
  private seo = inject(SeoService);

  // Signals
  isTocVisible = signal(true);
  activeSection = signal('');
  showBackToTop = signal(false);
  
  // Sections for the privacy policy
  sections = [
    { id: 'gioi-thieu', title: 'Giới Thiệu' },
    { id: 'thong-tin-thu-thap', title: 'Thông Tin Thu Thập' },
    { id: 'lien-he', title: 'Liên Hệ' },
  ];

  ngOnInit(): void {
    this.seo.setPageMeta(
      'Chính sách bảo mật',
      'Chính sách bảo mật và bảo vệ dữ liệu cá nhân của LMS Maritime — hệ thống đào tạo hàng hải.',
      undefined,
      'https://holilihu.online/privacy'
    );
    this.seo.setCanonical('https://holilihu.online/privacy');
    // SEO Phase 6: BreadcrumbList
    this.seo.setBreadcrumb([
      { name: 'Trang chủ', url: 'https://holilihu.online/' },
      { name: 'Chính sách bảo mật' }
    ]);
    this.seo.setWebPageJsonLd({
      id: 'jsonld-privacy-page',
      name: 'Chính sách bảo mật LMS Maritime',
      description: 'Chính sách bảo mật và bảo vệ dữ liệu cá nhân của LMS Maritime cho người học, giảng viên và tổ chức đào tạo.',
      url: 'https://holilihu.online/privacy',
      about: 'Bảo mật dữ liệu cá nhân trên nền tảng đào tạo hàng hải'
    });

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
      ? 'bg-[#0056D2]/5 text-[#004BB5]'
      : 'hover:bg-gray-100 text-gray-700';
  }

  setIsTocVisible(value: boolean): void {
    this.isTocVisible.set(value);
  }
}
