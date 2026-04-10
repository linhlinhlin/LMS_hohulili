import { TestBed } from '@angular/core/testing';

import { PageDataExtractorService } from './page-data-extractor.service';

describe('PageDataExtractorService', () => {
  let service: PageDataExtractorService;
  let host: HTMLDivElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PageDataExtractorService],
    });

    service = TestBed.inject(PageDataExtractorService);
    host = document.createElement('div');
    host.id = 'page-data-extractor-spec-host';
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('extracts assignment work data from the student task page', () => {
    host.innerHTML = `
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Bài tập cứu sinh</h1>
        <p class="text-sm text-gray-500 mt-1">Huấn luyện an toàn STCW</p>
        <div class="flex flex-wrap items-center gap-2 mt-3">
          <span>Hạn: 11/04/2026</span>
          <span>Tối đa 100 điểm</span>
          <span>Chưa nộp</span>
        </div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div class="px-5 py-3 border-b border-gray-100">
          <h2 class="text-sm font-semibold text-gray-900">Hướng dẫn bài tập</h2>
        </div>
        <div class="px-5 py-4">
          <div class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            Viết checklist các phương tiện cứu sinh trên tàu.
          </div>
        </div>
      </div>
    `;

    const extracted = service.extract('assignment');

    expect(extracted).toEqual(jasmine.objectContaining({
      _type: 'assignment',
      title: 'Bài tập cứu sinh',
      course_name: 'Huấn luyện an toàn STCW',
      due_date: 'Hạn: 11/04/2026',
      status: 'Chưa nộp',
      instructions: 'Viết checklist các phương tiện cứu sinh trên tàu.',
      max_score: 100,
    }));
  });

  it('extracts lesson title and visible prose content from the learning page DOM', () => {
    host.innerHTML = `
      <app-lesson-content>
        <h1 class="text-xl md:text-2xl font-semibold text-gray-900 mb-2 leading-tight">
          Bài 1.1: Các loại phương tiện cứu sinh
        </h1>
        <h3 class="text-xl md:text-xl font-semibold text-gray-700 mb-2 leading-tight">
          Phương tiện cứu sinh
        </h3>
        <div class="prose prose-slate max-w-none">
          Xuồng cứu sinh, bè cứu sinh và phao cứu sinh là các phương tiện quan trọng.
        </div>
      </app-lesson-content>
    `;

    const extracted = service.extract('lesson');

    expect(extracted).toEqual(jasmine.objectContaining({
      _type: 'lesson',
      lesson_title: 'Bài 1.1: Các loại phương tiện cứu sinh',
      chapter_name: 'Phương tiện cứu sinh',
      content_text: 'Xuồng cứu sinh, bè cứu sinh và phao cứu sinh là các phương tiện quan trọng.',
    }));
  });
});
