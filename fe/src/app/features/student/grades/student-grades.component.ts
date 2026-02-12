import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../api/client/api-client';
import { CertificateApi, CertificateDTO } from '../../../api/endpoints/certificate.api';

interface QuizScore {
  quizId: string;
  quizTitle: string;
  bestScore: number;
  maxScore: number;
  attempts: number;
}

interface AssignmentScore {
  assignmentId: string;
  assignmentTitle: string;
  grade: number | null;
  maxScore: number;
  status: string;
}

interface CourseGrade {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  thumbnailUrl: string | null;
  progress: number;
  status: string;
  quizScores: QuizScore[];
  assignmentScores: AssignmentScore[];
  hasCertificate: boolean;
}

@Component({
  selector: 'app-student-grades',
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grades-container">
      <!-- Tab Navigation -->
      <div class="tab-nav">
        <button class="tab-btn" [class.active]="activeTab() === 'grades'" (click)="activeTab.set('grades')">
          Bảng điểm
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'certificates'" (click)="activeTab.set('certificates'); loadCertificates()">
          Chứng chỉ
        </button>
      </div>

      @if (error()) {
        <div class="error-banner">
          <span>{{ error() }}</span>
          <button class="error-dismiss" (click)="error.set(null)">&times;</button>
        </div>
      }

      @if (activeTab() === 'grades') {
        <!-- GRADES TAB -->
        @if (isLoading()) {
          <div class="skeleton-summary">
            <div class="skeleton-card"><div class="skeleton-pulse skeleton-value"></div><div class="skeleton-pulse skeleton-label"></div></div>
            <div class="skeleton-card"><div class="skeleton-pulse skeleton-value"></div><div class="skeleton-pulse skeleton-label"></div></div>
            <div class="skeleton-card"><div class="skeleton-pulse skeleton-value"></div><div class="skeleton-pulse skeleton-label"></div></div>
          </div>
          <div class="skeleton-table">
            @for (i of [1,2,3,4]; track i) {
              <div class="skeleton-row"><div class="skeleton-pulse skeleton-cell-sm"></div><div class="skeleton-pulse skeleton-cell-lg"></div><div class="skeleton-pulse skeleton-cell-md"></div><div class="skeleton-pulse skeleton-cell-sm"></div></div>
            }
          </div>
        } @else if (grades().length === 0) {
          <div class="empty-state">
            <p class="empty-title">Chưa có dữ liệu điểm</p>
            <p class="empty-text">Hãy đăng ký và hoàn thành các khóa học để xem điểm</p>
            <a routerLink="/student/my-courses" class="empty-cta">Xem khóa học</a>
          </div>
        } @else {
          <!-- Summary -->
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-value text-blue">{{ grades().length }}</div>
              <div class="summary-label">Khóa học</div>
            </div>
            <div class="summary-card">
              <div class="summary-value text-green">{{ completedCount() }}</div>
              <div class="summary-label">Hoàn thành</div>
            </div>
            <div class="summary-card">
              <div class="summary-value text-amber">{{ averageProgress() }}%</div>
              <div class="summary-label">Tiến độ TB</div>
            </div>
          </div>

          <!-- Grades Table -->
          <div class="table-wrapper">
            <table class="grades-table">
              <thead>
                <tr>
                  <th class="th-left">Mã KH</th>
                  <th class="th-left">Tên khóa học</th>
                  <th class="th-center">Tiến độ</th>
                  <th class="th-center">Trạng thái</th>
                  <th class="th-center">Chứng chỉ</th>
                </tr>
              </thead>
              <tbody>
                @for (grade of grades(); track grade.courseId) {
                  <tr>
                    <td class="td-code">{{ grade.courseCode || '-' }}</td>
                    <td>
                      <a [routerLink]="['/student/learn/course', grade.courseId]" class="course-link">
                        {{ grade.courseTitle }}
                      </a>
                      @if (grade.quizScores.length > 0 || grade.assignmentScores.length > 0) {
                        <div class="score-details">
                          @for (qs of grade.quizScores; track qs.quizId) {
                            <span class="score-tag quiz-tag">Quiz: {{ qs.bestScore | number:'1.0-0' }}pts</span>
                          }
                          @for (ascore of grade.assignmentScores; track ascore.assignmentId) {
                            @if (ascore.grade !== null) {
                              <span class="score-tag assignment-tag">BT: {{ ascore.grade }}/{{ ascore.maxScore }}</span>
                            }
                          }
                        </div>
                      }
                    </td>
                    <td class="td-center">
                      <div class="progress-cell">
                        <div class="progress-track">
                          <div class="progress-fill"
                               [class.completed]="grade.progress >= 100"
                               [style.width.%]="grade.progress"></div>
                        </div>
                        <span class="progress-text">{{ grade.progress }}%</span>
                      </div>
                    </td>
                    <td class="td-center">
                      <span class="status-badge" [class.status-completed]="grade.status === 'COMPLETED'" [class.status-active]="grade.status !== 'COMPLETED'">
                        {{ grade.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang học' }}
                      </span>
                    </td>
                    <td class="td-center">
                      @if (grade.hasCertificate) {
                        <span class="cert-badge">Đã cấp</span>
                      } @else {
                        <span class="no-cert">-</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      } @else {
        <!-- CERTIFICATES TAB -->
        @if (certsLoading()) {
          <div class="skeleton-table">
            @for (i of [1,2,3]; track i) {
              <div class="skeleton-row"><div class="skeleton-pulse skeleton-cell-lg"></div><div class="skeleton-pulse skeleton-cell-md"></div></div>
            }
          </div>
        } @else if (certificates().length === 0) {
          <div class="empty-state">
            <p class="empty-title">Chưa có chứng chỉ</p>
            <p class="empty-text">Hoàn thành khóa học để nhận chứng chỉ</p>
          </div>
        } @else {
          <div class="certs-grid">
            @for (cert of certificates(); track cert.id) {
              <div class="cert-card">
                <div class="cert-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
                    <path d="M12 15l-3 3m0 0l-3-3m3 3V9m12 3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div class="cert-info">
                  <h3 class="cert-course">{{ cert.courseName }}</h3>
                  <p class="cert-date">Cấp ngày: {{ cert.issuedAt }}</p>
                  <p class="cert-token">Mã xác thực: {{ cert.verificationToken.substring(0, 8) }}...</p>
                </div>
                <a [routerLink]="['/student/certificate', cert.verificationToken]" class="cert-view-btn">
                  Xem
                </a>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .grades-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
    }

    /* Tab Navigation */
    .tab-nav {
      display: flex;
      gap: 4px;
      margin-bottom: 24px;
      background: #f3f4f6;
      border-radius: 10px;
      padding: 4px;
    }

    .tab-btn {
      flex: 1;
      padding: 10px 16px;
      border: none;
      background: transparent;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s;

      &.active {
        background: #fff;
        color: #1f2937;
        box-shadow: 0 1px 3px rgba(0,0,0,.1);
      }

      &:hover:not(.active) { color: #374151; }
    }

    /* Error Banner */
    .error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .error-dismiss {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 18px;
      color: #991b1b;
    }

    /* Loading Skeleton */
    .skeleton-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .skeleton-card {
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .skeleton-pulse {
      background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
      background-size: 200% 100%;
      animation: pulse 1.5s infinite;
      border-radius: 4px;
    }

    .skeleton-value { width: 60px; height: 28px; }
    .skeleton-label { width: 80px; height: 14px; }

    .skeleton-table {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.1);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .skeleton-row {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .skeleton-cell-sm { width: 60px; height: 16px; }
    .skeleton-cell-md { width: 100px; height: 16px; }
    .skeleton-cell-lg { flex: 1; height: 16px; }

    @keyframes pulse {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 48px;
      background: #f9fafb;
      border-radius: 12px;
      border: 1px dashed #d1d5db;
    }

    .empty-title {
      font-size: 18px;
      color: #6b7280;
      margin: 0;
    }

    .empty-text {
      color: #9ca3af;
      margin: 8px 0 0;
    }

    .empty-cta {
      display: inline-block;
      margin-top: 16px;
      padding: 8px 24px;
      background: #3b82f6;
      color: #fff;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: background 0.2s;

      &:hover { background: #2563eb; }
    }

    /* Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    @media (max-width: 640px) {
      .summary-grid { grid-template-columns: 1fr; }
      .skeleton-summary { grid-template-columns: 1fr; }
    }

    .summary-card {
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.1);
      text-align: center;
    }

    .summary-value {
      font-size: 28px;
      font-weight: 700;
    }

    .summary-label {
      color: #6b7280;
      font-size: 14px;
      margin-top: 4px;
    }

    .text-blue { color: #3b82f6; }
    .text-green { color: #10b981; }
    .text-amber { color: #f59e0b; }

    /* Table */
    .table-wrapper {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.1);
      overflow: hidden;
    }

    .grades-table {
      width: 100%;
      border-collapse: collapse;
    }

    thead tr {
      background: #f9fafb;
    }

    th {
      padding: 12px 16px;
      font-weight: 600;
      color: #374151;
      font-size: 14px;
    }

    .th-left { text-align: left; }
    .th-center { text-align: center; }

    tbody tr {
      border-top: 1px solid #e5e7eb;
      transition: background 0.15s;

      &:hover { background: #f9fafb; }
    }

    td {
      padding: 12px 16px;
    }

    .td-code {
      font-size: 14px;
      color: #6b7280;
    }

    .td-center {
      text-align: center;
    }

    .course-link {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;

      &:hover { text-decoration: underline; }
    }

    /* Score Details */
    .score-details {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .score-tag {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
    }

    .quiz-tag {
      background: #ede9fe;
      color: #6d28d9;
    }

    .assignment-tag {
      background: #fef3c7;
      color: #92400e;
    }

    /* Progress Cell */
    .progress-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .progress-track {
      width: 80px;
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
      background: #3b82f6;
      transition: width 0.3s;

      &.completed { background: #10b981; }
    }

    .progress-text {
      font-size: 13px;
      font-weight: 500;
      color: #374151;
    }

    /* Status Badge */
    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-completed {
      background: #d1fae5;
      color: #065f46;
    }

    .status-active {
      background: #dbeafe;
      color: #1e40af;
    }

    .cert-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      background: #dbeafe;
      color: #1e40af;
    }

    .no-cert {
      color: #9ca3af;
    }

    /* Certificates Grid */
    .certs-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .cert-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.1);
      transition: box-shadow 0.2s;

      &:hover { box-shadow: 0 4px 12px rgba(0,0,0,.1); }
    }

    .cert-icon {
      flex-shrink: 0;
      width: 56px;
      height: 56px;
      background: #eff6ff;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cert-info {
      flex: 1;
      min-width: 0;
    }

    .cert-course {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 4px;
    }

    .cert-date, .cert-token {
      font-size: 13px;
      color: #6b7280;
      margin: 0;
    }

    .cert-view-btn {
      flex-shrink: 0;
      padding: 8px 20px;
      background: #3b82f6;
      color: #fff;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
      transition: background 0.2s;

      &:hover { background: #2563eb; }
    }

    /* Responsive table */
    @media (max-width: 640px) {
      .grades-container { padding: 16px; }

      .table-wrapper { overflow-x: auto; }

      .grades-table { min-width: 600px; }

      .cert-card { flex-wrap: wrap; }
    }
  `]
})
export class StudentGradesComponent implements OnInit {
  private apiClient = inject(ApiClient);
  private certificateApi = inject(CertificateApi);

  activeTab = signal<'grades' | 'certificates'>('grades');
  grades = signal<CourseGrade[]>([]);
  certificates = signal<CertificateDTO[]>([]);
  isLoading = signal(true);
  certsLoading = signal(false);
  error = signal<string | null>(null);

  completedCount = signal(0);
  averageProgress = signal(0);

  async ngOnInit(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.apiClient.get('/api/v3/student/grades'));
      const data: CourseGrade[] = (response?.data || []).map((g: any) => ({
        ...g,
        quizScores: g.quizScores || [],
        assignmentScores: g.assignmentScores || [],
        hasCertificate: g.hasCertificate || false
      }));
      this.grades.set(data);

      this.completedCount.set(data.filter(g => g.status === 'COMPLETED').length);
      const avg = data.length > 0
        ? Math.round(data.reduce((sum, g) => sum + g.progress, 0) / data.length)
        : 0;
      this.averageProgress.set(avg);
    } catch (err: any) {
      this.error.set(err?.message || 'Không thể tải bảng điểm');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadCertificates(): Promise<void> {
    if (this.certificates().length > 0) return; // already loaded
    this.certsLoading.set(true);
    try {
      const response: any = await firstValueFrom(this.certificateApi.getMyCertificates());
      this.certificates.set(response?.data || []);
    } catch {
      // silently fail
    } finally {
      this.certsLoading.set(false);
    }
  }
}
