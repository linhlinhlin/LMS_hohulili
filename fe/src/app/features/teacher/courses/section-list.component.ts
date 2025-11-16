import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SectionApi } from '../../../api/client/section.api';

@Component({
  selector: 'app-section-list',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="max-w-3xl mx-auto p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Chương của khóa học</h1>
        <button (click)="goBackToCourse()" 
                class="px-4 py-2 border rounded hover:bg-gray-50 transition-colors flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Quay lại khóa học
        </button>
      </div>

      <div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b flex items-center justify-between">
          <div class="text-gray-700">Tổng: {{ sections().length }}</div>
        </div>
        <ul>
          <li *ngFor="let s of sections()" class="p-4 border-b last:border-b-0 flex items-center justify-between">
            <div>
              <div class="font-medium">{{ s.title }}</div>
              <div class="text-sm text-gray-500">{{ s.description || '—' }}</div>
            </div>
            <button class="px-3 py-1 border rounded" (click)="openSection(s.id)">Mở</button>
          </li>
        </ul>
        <div class="p-6 text-gray-500" *ngIf="!loading() && sections().length === 0">Chưa có chương nào.</div>
        <div class="p-6 text-red-600" *ngIf="error()">{{ error() }}</div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionListComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sectionApi = inject(SectionApi);

  sections = signal<any[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');

  constructor() {
    const courseId = this.route.snapshot.paramMap.get('id')!;
    this.sectionApi.listSectionsFlat(courseId).subscribe({
      next: (res) => {
        this.sections.set(res?.data || []);
      },
      error: (err) => this.error.set(err?.message || 'Không tải được danh sách chương'),
      complete: () => this.loading.set(false)
    });
  }

  openSection(sectionId: string) {
    const courseId = this.route.snapshot.paramMap.get('id')!;
    this.router.navigate([`/teacher/courses/${courseId}/sections/${sectionId}`]);
  }

  goBackToCourse() {
    const courseId = this.route.snapshot.paramMap.get('id')!;
    this.router.navigate([`/teacher/courses/${courseId}/edit`]);
  }
}
