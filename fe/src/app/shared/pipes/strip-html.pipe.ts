import { Pipe, PipeTransform, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Pipe({ name: 'stripHtml' })
export class StripHtmlPipe implements PipeTransform {
  private platformId = inject(PLATFORM_ID);

  transform(value: string, maxLength = 120): string {
    if (!value) return '(Không có nội dung)';

    let text: string;
    if (isPlatformBrowser(this.platformId)) {
      const div = document.createElement('div');
      div.innerHTML = value;
      text = div.textContent || div.innerText || '';
    } else {
      // SSR fallback: regex-based stripping
      text = value.replace(/<[^>]*>/g, '');
    }

    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return '(Không có nội dung)';
    if (maxLength > 0 && clean.length > maxLength) {
      return clean.slice(0, maxLength) + '...';
    }
    return clean;
  }
}
