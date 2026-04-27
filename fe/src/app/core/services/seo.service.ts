import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private document = inject(DOCUMENT);
  private meta = inject(Meta);
  private title = inject(Title);

  setPageMeta(title: string, description: string, ogImage?: string, pageUrl?: string): void {
    const pageTitle = `${title} - LMS Maritime`;
    this.title.setTitle(pageTitle);

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });

    if (pageUrl) {
      this.meta.updateTag({ property: 'og:url', content: pageUrl });
    }

    if (ogImage) {
      this.meta.updateTag({ property: 'og:image', content: ogImage });
      this.meta.updateTag({ name: 'twitter:image', content: ogImage });
    }

    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
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

  removeJsonLd(id: string): void {
    this.document.getElementById(id)?.remove();
  }

  /**
   * SEO Phase 5: ngăn search engines index 1 page (auth, account-only pages).
   * Default robots meta của index.html không có noindex → index by default.
   * Gọi method này trong ngOnInit của các page private (login, register,
   * forgot-password). Khi user navigate sang page khác, nhớ gọi
   * `setIndexable()` để revert (hoặc setPageMeta sẽ override gián tiếp).
   */
  setNoindex(): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  /** SEO Phase 5: revert noindex — cho phép Google index page bình thường. */
  setIndexable(): void {
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }
}
