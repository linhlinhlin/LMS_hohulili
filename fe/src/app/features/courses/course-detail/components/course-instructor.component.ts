import { Component, input, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExtendedCourse } from '../../../../shared/types/course.types';
import { ApiClient } from '../../../../api/client/api-client';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-instructor',
  imports: [RouterModule, NgOptimizedImage],
  templateUrl: './course-instructor.component.html'
})
export class CourseInstructorComponent implements OnInit {
  private apiClient = inject(ApiClient);

  instructor = input<ExtendedCourse['instructor'] | null>(null);
  otherCourses = signal<any[]>([]);

  ngOnInit(): void {
    const inst = this.instructor();
    if (inst?.id) {
      this.loadOtherCourses(inst.id);
    }
  }

  getInstructorBio(): string {
    const instructor = this.instructor();
    if (!instructor) return '';
    return `Với ${instructor.experience} năm kinh nghiệm trong lĩnh vực hàng hải, ${instructor.name} đã đào tạo hơn ${instructor.studentsCount} học viên và nhận được đánh giá ${instructor.rating}/5 từ cộng đồng. ${instructor.name} chuyên sâu về ${instructor.title.toLowerCase()} và luôn cam kết mang đến những kiến thức thực tế, hữu ích cho học viên.`;
  }

  getOtherCourses(): any[] {
    return this.otherCourses();
  }

  contactInstructor(): void {
    // Trong thực tế sẽ mở contact modal hoặc redirect đến contact page
  }

  private loadOtherCourses(instructorId: string): void {
    this.apiClient.get<any>(`/api/v3/courses?page=0&size=4`)
      .subscribe({
        next: (response: any) => {
          const courses = response?.data?.content || response?.data || [];
          this.otherCourses.set(Array.isArray(courses) ? courses.slice(0, 4) : []);
        },
        error: () => this.otherCourses.set([])
      });
  }
}
