import { Component, input, computed } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExtendedCourse } from '../../../../shared/types/course.types';

@Component({
  selector: 'app-course-instructor',
  imports: [CommonModule, RouterModule, NgOptimizedImage],
  templateUrl: './course-instructor.component.html'
})
export class CourseInstructorComponent {
  instructor = input<ExtendedCourse['instructor'] | null>(null);

  getInstructorBio(): string {
    const instructor = this.instructor();
    if (!instructor) return '';

    // Mock bio based on instructor data
    return `Với ${instructor.experience} năm kinh nghiệm trong lĩnh vực hàng hải, ${instructor.name} đã đào tạo hơn ${instructor.studentsCount} học viên và nhận được đánh giá ${instructor.rating}/5 từ cộng đồng. ${instructor.name} chuyên sâu về ${instructor.title.toLowerCase()} và luôn cam kết mang đến những kiến thức thực tế, hữu ích cho học viên.`;
  }

  getOtherCourses(): ExtendedCourse[] {
    const instructor = this.instructor();
    return [
      {
        id: 'other-1',
        title: 'Kỹ thuật Tàu biển Nâng cao',
        thumbnail: 'https://via.placeholder.com/200x120/0288D1/FFFFFF?text=Advanced',
        rating: 4.8,
        studentsCount: 650,
        description: '',
        shortDescription: '',
        level: 'advanced',
        duration: '45h',
        students: 650,
        reviews: 95,
        price: 3500000,
        instructor: instructor!,
        category: 'engineering',
        tags: [],
        skills: [],
        prerequisites: [],
        certificate: { type: 'Professional', description: '' },
        curriculum: { modules: 0, lessons: 0, duration: '' },
        lessonsCount: 0,
        isPublished: true,
        isEnrolled: false // Default for instructor courses
      },
      {
        id: 'other-2',
        title: 'Bảo trì Hệ thống Tàu',
        thumbnail: 'https://via.placeholder.com/200x120/2E7D32/FFFFFF?text=Maintenance',
        rating: 4.6,
        studentsCount: 420,
        description: '',
        shortDescription: '',
        level: 'intermediate',
        duration: '35h',
        students: 420,
        reviews: 78,
        price: 2800000,
        instructor: instructor!,
        category: 'engineering',
        tags: [],
        skills: [],
        prerequisites: [],
        certificate: { type: 'Professional', description: '' },
        curriculum: { modules: 0, lessons: 0, duration: '' },
        lessonsCount: 0,
        isPublished: true,
        isEnrolled: false // Default for instructor courses
      }
    ];
  }

  contactInstructor(): void {
    // Mock contact functionality
    console.log('Contacting instructor:', this.instructor()?.name);
    // Trong thực tế sẽ mở contact modal hoặc redirect đến contact page
  }
}
