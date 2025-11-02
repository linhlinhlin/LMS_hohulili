import { Component, signal, computed, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface VideoLesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: number;
  thumbnail: string;
  courseId: string;
  order: number;
  isCompleted: boolean;
  watchedDuration: number;
  lastWatchedAt: Date;
  bookmarks: any[];
  notes: any[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  thumbnail: string;
  duration: string;
  progress: number;
  category: string;
  rating: number;
  lessons: VideoLesson[];
}

@Component({
  selector: 'app-learning-course-simple',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ course().title }}</h1>
          <p class="text-gray-600 mb-4">{{ course().description }}</p>
          <div class="flex items-center space-x-6 text-sm text-gray-500">
            <span>Giảng viên: {{ course().instructor }}</span>
            <span>{{ course().duration }} phút</span>
            <span>{{ course().lessons.length }} bài học</span>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LearningCourseSimpleComponent {
  course = signal<Course>({
    id: '1',
    title: 'Khóa học mẫu',
    description: 'Mô tả khóa học',
    instructor: 'Giảng viên',
    thumbnail: '',
    duration: '120',
    progress: 0,
    category: 'test',
    rating: 5,
    lessons: []
  });
}