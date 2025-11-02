import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategoryCourseCardComponent } from './category-course-card.component';
import { ExtendedCourse } from '../../../../shared/types/course.types';

export interface CategoryCourseItem {
  id: string;
  title: string;
  description?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  price?: number;
  thumbnailUrl?: string;
  link: string | any[];
}

@Component({
  selector: 'app-category-course-grid',
  standalone: true,
  imports: [CommonModule, RouterModule, CategoryCourseCardComponent],
  template: `
    <section class="py-16 bg-gray-50" role="region" [attr.aria-label]="'Khóa học ' + title">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-end justify-between mb-8">
          <div>
            <h2 class="text-3xl font-bold text-gray-900 mb-2">{{ title }}</h2>
            <p class="text-gray-600" *ngIf="subtitle">{{ subtitle }}</p>
          </div>
          <a *ngIf="viewAllLink" [routerLink]="viewAllLink" [queryParams]="viewAllQueryParams" class="font-semibold transition-colors"
             [ngClass]="accentTextClass">{{ viewAllText || 'Xem thêm →' }}</a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          @for (item of items; track item.id) {
            <app-category-course-card 
              [course]="convertToExtendedCourse(item)"
              [brandColor]="brandColor">
            </app-category-course-card>
          }
        </div>
      </div>
    </section>
  `
})
export class CategoryCourseGridComponent {
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() items: CategoryCourseItem[] = [];
  @Input() brandColor: 'blue' | 'green' | 'amber' | 'indigo' | 'rose' | 'cyan' = 'blue';
  @Input() viewAllLink?: string | any[];
  @Input() viewAllQueryParams?: Record<string, unknown>;
  @Input() viewAllText?: string;

  trackById = (_: number, item: CategoryCourseItem) => item.id;

  convertToExtendedCourse(item: CategoryCourseItem): ExtendedCourse {
    // Convert CategoryCourseItem to ExtendedCourse for the enhanced card
    return {
      id: item.id,
      title: item.title,
      description: item.description || '',
      shortDescription: item.description || '',
      level: item.level || 'beginner',
      duration: '30h', // Default duration
      students: 100, // Default students
      rating: 4.5, // Default rating
      reviews: 20, // Default reviews
      price: item.price || 0,
      instructor: {
        id: '1',
        name: 'Giảng viên',
        title: 'Chuyên gia',
        avatar: 'https://via.placeholder.com/150',
        credentials: ['Chuyên gia'],
        experience: 10,
        rating: 4.5,
        studentsCount: 100
      },
      thumbnail: item.thumbnailUrl || 'https://via.placeholder.com/400x300',
      category: 'engineering',
      tags: ['Chuyên nghiệp'],
      skills: ['Kỹ năng'],
      prerequisites: ['Kiến thức cơ bản'],
      certificate: {
        type: 'Professional',
        description: 'Chứng chỉ chuyên nghiệp'
      },
      curriculum: {
        modules: 5,
        lessons: 10,
        duration: '30 giờ'
      },
      studentsCount: 100,
      lessonsCount: 10,
      isPublished: true
    };
  }

  get accentTextClass(): string {
    switch (this.brandColor) {
      case 'green': return 'text-green-700 hover:text-green-800';
      case 'amber': return 'text-amber-700 hover:text-amber-800';
      case 'indigo': return 'text-indigo-700 hover:text-indigo-800';
      case 'rose': return 'text-rose-700 hover:text-rose-800';
      case 'cyan': return 'text-cyan-700 hover:text-cyan-800';
      default: return 'text-blue-700 hover:text-blue-800';
    }
  }
}