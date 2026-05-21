import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

interface WebPageJsonLdOptions {
  id: string;
  name: string;
  description: string;
  url: string;
  about?: string;
  mainEntity?: Record<string, unknown>;
  primaryImage?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly siteName = 'LMS Maritime';
  private readonly defaultOgImage = 'https://holilihu.online/og-image.png';
  private readonly pageJsonLdIds = [
    'breadcrumb-jsonld',
    'jsonld-about-page',
    'jsonld-contact-page',
    'jsonld-course-category-list',
    'jsonld-courses-page',
    'jsonld-course-detail',
    'jsonld-courses-itemlist',
    'jsonld-privacy-page',
    'jsonld-refund-policy',
    'jsonld-simulation-webpage',
    'jsonld-terms-page'
  ];

  private document = inject(DOCUMENT);
  private meta = inject(Meta);
  private title = inject(Title);

  setPageMeta(title: string, description: string, ogImage = this.defaultOgImage, pageUrl?: string): void {
    const cleanTitle = this.cleanText(title);
    const cleanDescription = this.cleanText(description);
    const pageTitle = cleanTitle.includes(this.siteName) ? cleanTitle : `${cleanTitle} - ${this.siteName}`;
    const imageAlt = `${pageTitle} preview`;

    this.removePageJsonLd();
    this.setIndexable();
    this.title.setTitle(pageTitle);

    this.meta.updateTag({ name: 'description', content: cleanDescription });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: cleanDescription });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: this.siteName });
    this.meta.updateTag({ property: 'og:locale', content: 'vi_VN' });

    if (pageUrl) {
      this.meta.updateTag({ property: 'og:url', content: pageUrl });
    }

    this.meta.updateTag({ property: 'og:image', content: ogImage });
    this.meta.updateTag({ property: 'og:image:alt', content: imageAlt });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: cleanDescription });
    this.meta.updateTag({ name: 'twitter:image', content: ogImage });
    this.meta.updateTag({ name: 'twitter:image:alt', content: imageAlt });
  }

  setCanonical(url: string): void {
    let link = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  setKeywords(keywords: string[]): void {
    this.meta.updateTag({ name: 'keywords', content: keywords.join(', ') });
  }

  setJsonLd(id: string, data: unknown): void {
    let scriptEl = this.document.getElementById(id) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = this.document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.id = id;
      this.document.head.appendChild(scriptEl);
    }
    scriptEl.text = JSON.stringify(data);
  }

  setWebPageJsonLd(options: WebPageJsonLdOptions): void {
    const data: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: options.name,
      description: this.cleanText(options.description),
      url: options.url,
      inLanguage: 'vi',
      isPartOf: {
        '@type': 'WebSite',
        name: this.siteName,
        url: 'https://holilihu.online'
      }
    };

    if (options.about) {
      data['about'] = {
        '@type': 'Thing',
        name: options.about
      };
    }

    if (options.mainEntity) {
      data['mainEntity'] = options.mainEntity;
    }

    if (options.primaryImage) {
      data['primaryImageOfPage'] = {
        '@type': 'ImageObject',
        url: options.primaryImage
      };
    }

    this.setJsonLd(options.id, data);
  }

  removeJsonLd(id: string): void {
    this.document.getElementById(id)?.remove();
  }

  /**
   * SEO Phase 5: ngăn search engines index 1 page (auth, account-only pages).
   * Default robots meta của index.html không có noindex → index by default.
   * Gọi method này trong ngOnInit của các page private (login, register,
   * forgot-password). Khi user navigate sang page khác, `setPageMeta()` sẽ
   * tự revert về indexable cho các trang public.
   */
  setNoindex(): void {
    this.removePageJsonLd();
    this.removeCanonical();
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  /** SEO Phase 5: revert noindex — cho phép Google index page bình thường. */
  setIndexable(): void {
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }

  /**
   * SEO Phase 6: BreadcrumbList JSON-LD — giúp Google hiểu page hierarchy
   * → tăng khả năng hiển thị sitelinks dưới SERP entry chính.
   *
   * @param items Mảng từ root → current page. Last item KHÔNG có URL (current).
   *   Example: [{ name: 'Trang chủ', url: 'https://...' }, { name: 'Khóa học' }]
   */
  setBreadcrumb(items: Array<{ name: string; url?: string }>): void {
    const itemListElement = items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {})
    }));
    this.setJsonLd('breadcrumb-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement
    });
  }

  private removePageJsonLd(): void {
    this.pageJsonLdIds.forEach((id) => this.removeJsonLd(id));
  }

  private removeCanonical(): void {
    this.document.querySelector('link[rel="canonical"]')?.remove();
  }

  private cleanText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }
}
