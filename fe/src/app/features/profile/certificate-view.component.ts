import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CertificateApi } from '../../api/endpoints/certificate.api';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

interface Certificate {
  id: string;
  courseId: string;
  courseName: string;
  studentName: string;
  studentId: string;
  instructorName: string;
  issuedAt: Date;
  certificateNumber: string;
  certificateUrl: string;
  isValid: boolean;
  expiryDate?: Date;
  grade: number;
  maxGrade: number;
  completionDate: Date;
  duration: string;
  description: string;
  skills: string[];
  verificationCode: string;
  qrCode: string;
}

interface CertificateVerification {
  isValid: boolean;
  certificate: Certificate | null;
  verificationDate: Date;
  verifiedBy: string;
}

@Component({
  selector: 'app-certificate-view',
  imports: [RouterModule, IconComponent],
  template: `
    <div class="bg-gradient-to-br from-slate-50 via-[#0056D2]/5 to-indigo-100 min-h-screen">
      <!-- Header -->
      <div class="bg-white shadow-xl border-b border-gray-200">
        <div class="max-w-6xl mx-auto px-6 py-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button (click)="goBack()"
                      class="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                </svg>
                <span>Quay lại</span>
              </button>
              <div>
                <h1 class="text-3xl font-bold text-gray-900">Chứng chỉ</h1>
                <p class="text-gray-600">{{ certificate()?.courseName }}</p>
              </div>
            </div>
            
            <div class="flex items-center space-x-4">
              <button (click)="downloadCertificate()"
                      class="px-6 py-3 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors">
                <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
                Tải xuống
              </button>
              <button (click)="shareCertificate()"
                      class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3 3 0 000-2.38l4.94-2.47C13.456 7.68 14.19 8 15 8z"></path>
                </svg>
                Chia sẻ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-6 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Certificate Display -->
          <div class="lg:col-span-2">
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
              <!-- Certificate Header -->
              <div class="bg-[#0056D2] text-white p-8 text-center">
                <div class="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                </div>
                <h1 class="text-3xl font-bold mb-2">CHỨNG CHỈ HOÀN THÀNH</h1>
                <p class="text-white/80 text-lg">Certificate of Completion</p>
              </div>

              <!-- Certificate Content -->
              <div class="p-8">
                <div class="text-center mb-8">
                  <p class="text-gray-600 mb-4">Được cấp cho</p>
                  <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ certificate()?.studentName }}</h2>
                  <p class="text-gray-600">Mã sinh viên: {{ certificate()?.studentId }}</p>
                </div>

                <div class="text-center mb-8">
                  <p class="text-gray-600 mb-2">Đã hoàn thành thành công khóa học</p>
                  <h3 class="text-xl font-semibold text-gray-900 mb-4">{{ certificate()?.courseName }}</h3>
                  <p class="text-gray-600">{{ certificate()?.description }}</p>
                </div>

                <!-- Certificate Details -->
                <div class="grid grid-cols-2 gap-6 mb-8">
                  <div class="text-center p-4 bg-gray-50 rounded-xl">
                    <p class="text-sm text-gray-600 mb-1">Điểm số</p>
                    <p class="text-2xl font-bold text-gray-900">{{ certificate()?.grade }}/{{ certificate()?.maxGrade }}</p>
                  </div>
                  <div class="text-center p-4 bg-gray-50 rounded-xl">
                    <p class="text-sm text-gray-600 mb-1">Thời gian học</p>
                    <p class="text-lg font-semibold text-gray-900">{{ certificate()?.duration }}</p>
                  </div>
                </div>

                <!-- Skills -->
                @if (certificate()?.skills && certificate()!.skills.length > 0) {
                  <div class="mb-8">
                    <h4 class="text-lg font-semibold text-gray-900 mb-4 text-center">Kỹ năng đạt được</h4>
                    <div class="flex flex-wrap justify-center gap-2">
                      @for (skill of certificate()!.skills; track skill) {
                        <span class="px-3 py-1 bg-[#0056D2]/10 text-[#004BB5] rounded-full text-sm font-medium">
                          {{ skill }}
                        </span>
                      }
                    </div>
                  </div>
                }

                <!-- Certificate Footer -->
                <div class="border-t border-gray-200 pt-6">
                  <div class="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <p class="text-gray-600 mb-1">Ngày cấp</p>
                      <p class="font-semibold text-gray-900">{{ formatDate(certificate()?.issuedAt!) }}</p>
                    </div>
                    <div>
                      <p class="text-gray-600 mb-1">Ngày hoàn thành</p>
                      <p class="font-semibold text-gray-900">{{ formatDate(certificate()?.completionDate!) }}</p>
                    </div>
                    <div>
                      <p class="text-gray-600 mb-1">Giảng viên</p>
                      <p class="font-semibold text-gray-900">{{ certificate()?.instructorName }}</p>
                    </div>
                    <div>
                      <p class="text-gray-600 mb-1">Mã chứng chỉ</p>
                      <p class="font-semibold text-gray-900">{{ certificate()?.certificateNumber }}</p>
                    </div>
                  </div>
                </div>

                <!-- QR Code -->
                <div class="text-center mt-8">
                  <div class="inline-block p-4 bg-white border-2 border-gray-200 rounded-xl">
                    <div class="w-24 h-24 bg-gray-100 rounded flex items-center justify-center mb-2">
                      <svg class="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <p class="text-xs text-gray-600">Mã xác thực: {{ certificate()?.verificationCode }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Certificate Info Sidebar -->
          <div class="space-y-6">
            <!-- Certificate Status -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><app-icon name="bar-chart" size="md"/> Trạng thái chứng chỉ</h3>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-gray-600">Trạng thái</span>
                  <span class="px-3 py-1 rounded-full text-sm font-medium"
                        [class]="certificate()?.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                    {{ certificate()?.isValid ? 'Còn hiệu lực' : 'Hết hạn' }}
                  </span>
                </div>
                
                @if (certificate()?.expiryDate) {
                  <div class="flex items-center justify-between">
                    <span class="text-gray-600">Hạn sử dụng</span>
                    <span class="font-semibold text-gray-900">{{ formatDate(certificate()?.expiryDate!) }}</span>
                  </div>
                }
                
                <div class="flex items-center justify-between">
                  <span class="text-gray-600">Mã xác thực</span>
                  <span class="font-mono text-sm text-gray-900">{{ certificate()?.verificationCode }}</span>
                </div>
              </div>
            </div>

            <!-- Verification -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><app-icon name="search" size="md"/> Xác thực chứng chỉ</h3>
              <div class="space-y-4">
                <div class="text-center p-4 bg-green-50 rounded-xl">
                  <svg class="w-8 h-8 text-green-600 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                  <p class="text-green-800 font-medium">Chứng chỉ hợp lệ</p>
                  <p class="text-sm text-green-600">Đã được xác thực</p>
                </div>
                
                <div class="text-center">
                  <button (click)="verifyCertificate()"
                          class="px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors text-sm">
                    Xác thực lại
                  </button>
                </div>
              </div>
            </div>

            <!-- Course Information -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><app-icon name="courses" size="md"/> Thông tin khóa học</h3>
              <div class="space-y-3">
                <div>
                  <p class="text-sm text-gray-600">Tên khóa học</p>
                  <p class="font-semibold text-gray-900">{{ certificate()?.courseName }}</p>
                </div>
                
                <div>
                  <p class="text-sm text-gray-600">Giảng viên</p>
                  <p class="font-semibold text-gray-900">{{ certificate()?.instructorName }}</p>
                </div>
                
                <div>
                  <p class="text-sm text-gray-600">Thời gian học</p>
                  <p class="font-semibold text-gray-900">{{ certificate()?.duration }}</p>
                </div>
                
                <div>
                  <p class="text-sm text-gray-600">Điểm đạt được</p>
                  <p class="font-semibold text-gray-900">{{ certificate()?.grade }}/{{ certificate()?.maxGrade }}</p>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><app-icon name="zap" size="md"/> Thao tác</h3>
              <div class="space-y-3">
                <button (click)="downloadCertificate()"
                        class="w-full flex items-center space-x-3 p-3 bg-[#0056D2]/5 rounded-xl hover:bg-[#0056D2]/10 transition-colors">
                  <svg class="w-5 h-5 text-[#0056D2]" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                  </svg>
                  <span class="font-medium text-gray-900">Tải xuống PDF</span>
                </button>
                
                <button (click)="shareCertificate()"
                        class="w-full flex items-center space-x-3 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
                  <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3 3 0 000-2.38l4.94-2.47C13.456 7.68 14.19 8 15 8z"></path>
                  </svg>
                  <span class="font-medium text-gray-900">Chia sẻ</span>
                </button>
                
                <button (click)="printCertificate()"
                        class="w-full flex items-center space-x-3 p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
                  <svg class="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm2 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                  </svg>
                  <span class="font-medium text-gray-900">In chứng chỉ</span>
                </button>
                
                <button (click)="viewCourse()"
                        class="w-full flex items-center space-x-3 p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors">
                  <svg class="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                    <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                  </svg>
                  <span class="font-medium text-gray-900">Xem khóa học</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CertificateViewComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private certificateApi = inject(CertificateApi);
  private toast = inject(ToastService);

  // Component state
  certificate = signal<Certificate | null>(null);
  verification = signal<CertificateVerification | null>(null);

  ngOnInit(): void {
    this.loadCertificate();
  }

  private async loadCertificate(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token');

    if (token) {
      // Public verification by token
      try {
        const res: any = await firstValueFrom(this.certificateApi.verifyCertificate(token));
        if (res?.data?.valid) {
          const d = res.data;
          this.certificate.set({
            id: token,
            courseId: d.courseId || '',
            courseName: d.courseName || '',
            studentName: d.studentName || '',
            studentId: d.studentId || '',
            instructorName: '',
            issuedAt: new Date(d.issuedAt),
            certificateNumber: token.substring(0, 13).toUpperCase(),
            certificateUrl: '',
            isValid: true,
            grade: 0,
            maxGrade: 100,
            completionDate: new Date(d.issuedAt),
            duration: '',
            description: '',
            skills: [],
            verificationCode: token,
            qrCode: ''
          });
          return;
        }
      } catch {
        this.toast.error('Không thể tải thông tin chứng chỉ');
      }
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }

  downloadCertificate(): void {
    const cert = this.certificate();
    if (cert?.id) {
      window.open(`/api/v3/student/certificates/${cert.id}/download`, '_blank');
    }
  }

  shareCertificate(): void {
    // Mock share functionality
    if (navigator.share) {
      navigator.share({
        title: 'Chứng chỉ hoàn thành khóa học',
        text: `Tôi đã hoàn thành khóa học "${this.certificate()?.courseName}"`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      this.toast.success('Đã sao chép liên kết vào clipboard!');
    }
  }

  printCertificate(): void {
    // Mock print functionality
    window.print();
  }

  verifyCertificate(): void {
    // Mock verification
    this.toast.success('Chứng chỉ đã được xác thực thành công!');
  }

  viewCourse(): void {
    const courseId = this.certificate()?.courseId;
    if (courseId) {
      this.router.navigate(['/student/courses', courseId]);
    }
  }

  goBack(): void {
    this.router.navigate(['/student/profile']);
  }
}
