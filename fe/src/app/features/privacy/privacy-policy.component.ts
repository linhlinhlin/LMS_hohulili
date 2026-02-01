import { Component, ChangeDetectionStrategy, ViewEncapsulation, signal, inject, OnInit, OnDestroy, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-privacy-policy',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './privacy-policy.component.html',
})
export class PrivacyPolicyComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  // Signals
  isTocVisible = signal(true);
  activeSection = signal('');
  showBackToTop = signal(false);
  
  // Sections for the privacy policy
  sections = [
    { id: 'gioi-thieu', title: 'Giá»›i Thiá»‡u' },
    { id: 'thong-tin-thu-thap', title: 'ThĂ´ng Tin Thu Tháº­p' },
    { id: 'lien-he', title: 'LiĂªn Há»‡' },
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
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
      ? 'bg-blue-50 text-blue-700'
      : 'hover:bg-gray-100 text-gray-700';
  }

  setIsTocVisible(value: boolean): void {
    this.isTocVisible.set(value);
  }
}

