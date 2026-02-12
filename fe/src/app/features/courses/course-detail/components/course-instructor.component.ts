import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExtendedCourse } from '../../../../shared/types/course.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-instructor',
  imports: [RouterModule, NgOptimizedImage],
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
    // TODO: Wire to real API to fetch other courses by instructor
    return [];
  }

  contactInstructor(): void {
    // Mock contact functionality
    // Trong thực tế sẽ mở contact modal hoặc redirect đến contact page
  }
}
