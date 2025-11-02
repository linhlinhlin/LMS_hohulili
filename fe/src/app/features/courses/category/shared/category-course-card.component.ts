import { Component, Input } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExtendedCourse } from '../../../../shared/types/course.types';

@Component({
  selector: 'app-category-course-card',
  imports: [CommonModule, RouterModule, NgOptimizedImage],
  template: `
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group">
      <!-- Course Thumbnail -->
      <div class="relative overflow-hidden">
        <img 
          [ngSrc]="course.thumbnail" 
          width="400" 
          height="200" 
          class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          [alt]="course.title" />
        
        <!-- Course Level Badge -->
        <div class="absolute top-4 left-4">
          <span class="px-3 py-1 rounded-full text-sm font-semibold"
                [ngClass]="getLevelBadgeClass(course.level)">
            {{ getLevelLabel(course.level) }}
          </span>
        </div>
        
        <!-- Course Price -->
        <div class="absolute top-4 right-4">
          <span class="px-3 py-1 rounded-full text-sm font-semibold bg-white/90 backdrop-blur-sm"
                [ngClass]="course.price === 0 ? 'text-green-700' : 'text-blue-700'">
            {{ getPriceDisplay(course.price) }}
          </span>
        </div>

        <!-- Play Button Overlay -->
        <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button 
            (click)="playPreview($event)"
            class="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg">
            <svg class="w-6 h-6 text-blue-600 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Course Content -->
      <div class="p-6">
        <!-- Course Title -->
        <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {{ course.title }}
        </h3>
        
        <!-- Course Description -->
        <p class="text-gray-600 mb-4 line-clamp-3">{{ course.shortDescription }}</p>
        
        <!-- Course Stats -->
        <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div class="flex items-center space-x-4">
            <span class="flex items-center">
              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              {{ course.rating }}
            </span>
            <span>{{ course.studentsCount }} học viên</span>
          </div>
          <span>{{ course.duration }}</span>
        </div>
        
        <!-- Course Instructor -->
        <div class="flex items-center mb-4">
          <img
            [ngSrc]="course.instructor.avatar"
            width="48"
            height="32"
            class="w-8 h-8 rounded-full mr-3"
            [alt]="course.instructor.name" />
          <div>
            <p class="text-sm font-medium text-gray-900">{{ course.instructor.name }}</p>
            <p class="text-xs text-gray-500">{{ course.instructor.title }}</p>
          </div>
        </div>

        <!-- Course Tags -->
        <div class="flex flex-wrap gap-1 mb-4">
          @for (tag of course.tags.slice(0, 3); track tag) {
            <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
              {{ tag }}
            </span>
          }
        </div>
        
        <!-- Action Button -->
        <a 
          [routerLink]="['/courses', course.id]" 
          class="block w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105">
          Xem chi tiết
        </a>
      </div>
    </div>
  `
})
export class CategoryCourseCardComponent {
  @Input() course!: ExtendedCourse;
  @Input() brandColor: 'blue' | 'green' | 'amber' | 'indigo' | 'rose' | 'cyan' = 'blue';

  getLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      'beginner': 'Cơ bản',
      'intermediate': 'Trung cấp',
      'advanced': 'Nâng cao'
    };
    return labels[level] || level;
  }

  getLevelBadgeClass(level: string): string {
    const baseClass = 'bg-opacity-90 backdrop-blur-sm';
    switch (level) {
      case 'beginner': return `bg-green-100 text-green-800 ${baseClass}`;
      case 'intermediate': return `bg-yellow-100 text-yellow-800 ${baseClass}`;
      case 'advanced': return `bg-red-100 text-red-800 ${baseClass}`;
      default: return `bg-gray-100 text-gray-800 ${baseClass}`;
    }
  }

  getPriceDisplay(price: number): string {
    return price === 0 ? 'Miễn phí' : `${price.toLocaleString()} VNĐ`;
  }

  playPreview(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Mock preview functionality
    console.log('Playing course preview for:', this.course.title);
    // Trong thực tế sẽ mở video player modal hoặc redirect đến preview page
  }
}