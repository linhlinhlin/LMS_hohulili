import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AcademicApi } from '../../../api/client/academic.api';
import {
  AcademicLearningPackageAvailability,
  AcademicLearningPackagePaymentQr,
} from '../../../api/types/academic.types';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-student-learning-packages',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-learning-packages.component.html',
  styleUrl: './student-learning-packages.component.scss',
})
export class StudentLearningPackagesComponent implements OnInit {
  private academicApi = inject(AcademicApi);
  private auth = inject(AuthService);

  protected readonly packages = signal<AcademicLearningPackageAvailability[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly busyPackageId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly qr = signal<AcademicLearningPackagePaymentQr | null>(null);

  protected readonly organizationId = computed(() => this.auth.currentUserSignal()?.organizationId ?? null);
  protected readonly organizationName = computed(() =>
    this.auth.currentUserSignal()?.organizationName || 'Tổ chức của bạn'
  );
  protected readonly totalPackages = computed(() => this.packages().length);
  protected readonly activeEnrollments = computed(() =>
    this.packages().filter(item => item.enrollment?.status === 'ACTIVE').length
  );
  protected readonly pendingPayments = computed(() =>
    this.packages().filter(item => item.enrollment?.status === 'PENDING_PAYMENT').length
  );

  async ngOnInit(): Promise<void> {
    await this.loadPackages();
  }

  protected async loadPackages(): Promise<void> {
    const orgId = this.organizationId();
    if (!orgId) {
      this.error.set('Không xác định được tổ chức của tài khoản học viên.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.academicApi.listMyAvailableLearningPackages(orgId));
      this.packages.set(response.data ?? []);
    } catch (error: any) {
      this.error.set(error?.message || 'Không thể tải danh sách gói học.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async requestEnrollment(item: AcademicLearningPackageAvailability): Promise<void> {
    const orgId = this.organizationId();
    if (!orgId) return;
    this.busyPackageId.set(item.learningPackage.id);
    this.error.set(null);
    this.notice.set(null);
    try {
      const response = await firstValueFrom(
        this.academicApi.requestLearningPackageEnrollment(orgId, item.learningPackage.id)
      );
      this.replaceEnrollment(item.learningPackage.id, response.data);
      this.notice.set(this.noticeForStatus(response.data.status));
    } catch (error: any) {
      this.error.set(error?.message || 'Không thể gửi yêu cầu gói học.');
    } finally {
      this.busyPackageId.set(null);
    }
  }

  protected async createPaymentQr(item: AcademicLearningPackageAvailability): Promise<void> {
    const orgId = this.organizationId();
    if (!orgId) return;
    this.busyPackageId.set(item.learningPackage.id);
    this.error.set(null);
    this.notice.set(null);
    try {
      const response = await firstValueFrom(
        this.academicApi.createMyLearningPackagePaymentQr(orgId, item.learningPackage.id)
      );
      this.qr.set(response.data);
      this.replaceEnrollment(item.learningPackage.id, response.data.enrollment);
    } catch (error: any) {
      this.error.set(error?.message || 'Không thể tạo QR thanh toán gói học.');
    } finally {
      this.busyPackageId.set(null);
    }
  }

  protected closeQr(): void {
    this.qr.set(null);
  }

  protected async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.notice.set('Đã sao chép thông tin chuyển khoản.');
    } catch {
      this.notice.set('Không thể sao chép tự động, vui lòng sao chép thủ công.');
    }
  }

  protected actionLabel(item: AcademicLearningPackageAvailability): string {
    const status = item.enrollment?.status;
    if (status === 'ACTIVE') return 'Đã kích hoạt';
    if (status === 'PENDING_APPROVAL') return 'Đang chờ duyệt';
    if (item.learningPackage.enrollmentPolicy === 'PAYMENT_REQUIRED') {
      return status === 'PENDING_PAYMENT' ? 'Tạo lại QR' : 'Thanh toán gói học';
    }
    if (item.learningPackage.enrollmentPolicy === 'OPEN') return 'Kích hoạt gói học';
    return 'Gửi yêu cầu duyệt';
  }

  protected canAct(item: AcademicLearningPackageAvailability): boolean {
    const status = item.enrollment?.status;
    return status !== 'ACTIVE' && status !== 'PENDING_APPROVAL';
  }

  protected isPaymentPackage(item: AcademicLearningPackageAvailability): boolean {
    return item.learningPackage.enrollmentPolicy === 'PAYMENT_REQUIRED';
  }

  protected isBusy(packageId: string): boolean {
    return this.busyPackageId() === packageId;
  }

  protected statusLabel(item: AcademicLearningPackageAvailability): string {
    const status = item.enrollment?.status;
    if (!status) {
      return this.policyLabel(item.learningPackage.enrollmentPolicy);
    }
    const labels: Record<string, string> = {
      PENDING_APPROVAL: 'Chờ quản lý duyệt',
      PENDING_PAYMENT: 'Chờ thanh toán',
      ACTIVE: 'Đã kích hoạt',
      REJECTED: 'Đã từ chối',
      CANCELLED: 'Đã hủy',
    };
    return labels[status] ?? status;
  }

  protected policyLabel(policy: string): string {
    const labels: Record<string, string> = {
      OPEN: 'Kích hoạt ngay',
      ORG_APPROVAL: 'Cần duyệt bởi nhà trường',
      PAYMENT_REQUIRED: 'Cần thanh toán học phí',
      INVITE_ONLY: 'Theo lời mời',
    };
    return labels[policy] ?? policy;
  }

  protected formatAmount(amount: number, currency: string): string {
    if (!amount) return 'Miễn phí';
    return amount.toLocaleString('vi-VN') + ' ' + currency;
  }

  protected formatDate(value: string | null): string {
    if (!value) return 'Chưa có';
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private replaceEnrollment(
    packageId: string,
    enrollment: AcademicLearningPackageAvailability['enrollment']
  ): void {
    this.packages.update(items =>
      items.map(item => item.learningPackage.id === packageId ? { ...item, enrollment } : item)
    );
  }

  private noticeForStatus(status: string): string {
    if (status === 'ACTIVE') return 'Gói học đã được kích hoạt.';
    if (status === 'PENDING_APPROVAL') return 'Yêu cầu đã gửi, vui lòng chờ nhà trường duyệt.';
    if (status === 'PENDING_PAYMENT') return 'Gói học đang chờ thanh toán.';
    return 'Yêu cầu đã được ghi nhận.';
  }
}
