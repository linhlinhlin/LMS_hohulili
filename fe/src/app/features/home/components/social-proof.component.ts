import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  avatar: string;
  rating: number;
}

interface Partner {
  id: string;
  name: string;
  logo: string;
}

@Component({
  selector: 'app-social-proof',
  imports: [CommonModule, NgOptimizedImage],
  encapsulation: ViewEncapsulation.None,
  template: `
    <section class="py-16 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">Được tin tưởng bởi các tổ chức hàng đầu</h2>
          <p class="text-lg text-gray-600">Hơn 10,000 học viên đã tin tưởng và thành công cùng chúng tôi</p>
        </div>

        <!-- Partner Logos -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60 mb-16">
          @for (partner of partners; track partner.id) {
            <div class="flex justify-center">
              <img
                [ngSrc]="partner.logo"
                [alt]="partner.name"
                width="120"
                height="48"
                class="h-12 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
              />
            </div>
          }
        </div>

        <!-- Testimonials -->
        <div class="grid md:grid-cols-3 gap-8">
          @for (testimonial of testimonials; track testimonial.id) {
            <div class="bg-gray-50 p-6 rounded-lg hover:shadow-md transition-all duration-300 group">
              <div class="flex items-center mb-4">
                <img
                  [ngSrc]="testimonial.avatar"
                  [alt]="testimonial.name"
                  width="72"
                  height="48"
                  class="w-12 h-12 rounded-full object-cover mr-4 group-hover:scale-110 transition-transform duration-200"
                />
                <div>
                  <h4 class="font-semibold text-gray-900">{{ testimonial.name }}</h4>
                  <p class="text-sm text-gray-600">{{ testimonial.role }}</p>
                  <p class="text-xs text-blue-600">{{ testimonial.company }}</p>
                </div>
              </div>
              
              <!-- Rating -->
              <div class="flex items-center mb-3">
                @for (star of [1,2,3,4,5]; track star) {
                  <span 
                    class="w-4 h-4 mr-1 text-sm"
                    [class.text-yellow-400]="star <= testimonial.rating"
                    [class.text-gray-300]="star > testimonial.rating"
                  >⭐</span>
                }
                <span class="text-sm text-gray-500 ml-2">{{ testimonial.rating }}.0</span>
              </div>
              
              <p class="text-gray-700 italic">
                "{{ testimonial.content }}"
              </p>
            </div>
          }
        </div>

        <!-- Stats Section -->
        <div class="mt-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div class="group">
              <div class="text-4xl font-bold mb-2 group-hover:scale-110 transition-transform duration-200">
                10,000+
              </div>
              <div class="text-blue-200">Học viên đã tốt nghiệp</div>
            </div>
            <div class="group">
              <div class="text-4xl font-bold mb-2 group-hover:scale-110 transition-transform duration-200">
                50+
              </div>
              <div class="text-blue-200">Khóa học chuyên nghiệp</div>
            </div>
            <div class="group">
              <div class="text-4xl font-bold mb-2 group-hover:scale-110 transition-transform duration-200">
                95%
              </div>
              <div class="text-blue-200">Tỷ lệ có việc làm</div>
            </div>
            <div class="group">
              <div class="text-4xl font-bold mb-2 group-hover:scale-110 transition-transform duration-200">
                15+
              </div>
              <div class="text-blue-200">Năm kinh nghiệm</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProofComponent {
  partners: Partner[] = [
    {
      id: '1',
      name: 'Vinalines',
      logo: '/images/partners/vinalines-logo.jpg'
    },
    {
      id: '2',
      name: 'Cảng Sài Gòn',
      logo: '/images/partners/port-logo.jpg'
    },
    {
      id: '3',
      name: 'Công ty Hàng hải',
      logo: '/images/partners/maritime-company-logo.jpg'
    },
    {
      id: '4',
      name: 'Gemadept',
      logo: '/images/partners/gemadept-logo.jpg'
    }
  ];

  testimonials: Testimonial[] = [
    {
      id: '1',
      name: 'Thuyền trưởng Nguyễn Văn A',
      role: 'Thuyền trưởng',
      company: 'Vinalines',
      content: 'Khóa học rất chuyên nghiệp và thực tế. Tôi đã áp dụng được ngay vào công việc.',
      avatar: '/images/testimonials/captain-portrait.jpg',
      rating: 5
    },
    {
      id: '2',
      name: 'Kỹ sư Trần Thị B',
      role: 'Kỹ sư máy tàu',
      company: 'Cảng Sài Gòn',
      content: 'Giảng viên giàu kinh nghiệm, nội dung cập nhật theo tiêu chuẩn quốc tế.',
      avatar: '/images/testimonials/female-engineer-working.png',
      rating: 5
    },
    {
      id: '3',
      name: 'Học viên Lê Văn C',
      role: 'Sinh viên',
      company: 'Đại học Hàng hải',
      content: 'Môi trường học tập hiện đại, hỗ trợ tìm việc làm sau khi tốt nghiệp.',
      avatar: '/images/testimonials/diverse-student-portraits.png',
      rating: 4
    }
  ];
}
