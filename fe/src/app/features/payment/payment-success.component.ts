import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { PaymentResponse } from '../../api/client/payment.api';
import { IconComponent } from '../../shared/components/icon/icon.component';
import {
    PaymentAccessActivationResult,
    PaymentService
} from './payment.service';

/**
 * Payment Success Component
 *
 * Handles the post-payment state using server truth:
 * - payment completion
 * - enrollment/access activation
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-payment-success',
    imports: [RouterLink, IconComponent],
    template: `
        <div class="payment-result-container">
            <div class="result-card success">
                <div class="icon-container">
                    <div class="success-checkmark">
                        <div class="check-icon">
                            <span class="icon-line line-tip"></span>
                            <span class="icon-line line-long"></span>
                            <div class="icon-circle"></div>
                            <div class="icon-fix"></div>
                        </div>
                    </div>
                </div>

                <h1 class="title"><app-icon name="party" size="lg" class="text-emerald-500"/> {{ title() }}</h1>

                <p class="message">{{ summaryMessage() }}</p>

                @if (transactionId()) {
                    <div class="transaction-info">
                        <span class="label">Mã giao dịch:</span>
                        <span class="value">{{ transactionId() }}</span>
                    </div>
                }

                @if (orderId()) {
                    <div class="transaction-info">
                        <span class="label">Mã đơn hàng:</span>
                        <span class="value">{{ orderId() }}</span>
                    </div>
                }

                @if (detailMessage()) {
                    <div class="pending-notice"
                         [class.info-notice]="activation().state === 'ACCESS_PENDING' && !isPending()">
                        <p>{{ detailMessage() }}</p>
                    </div>
                }

                <div class="actions">
                    @if (showStartLearningCta()) {
                        <button (click)="goToLearning()" class="btn btn-primary">
                            <app-icon name="courses" size="sm" class="mr-1"/> Bắt đầu học ngay ({{ countdown() }}s)
                        </button>
                    } @else if (showCourseDetailCta()) {
                        <button (click)="goToCourseDetail()" class="btn btn-primary">
                            <app-icon name="courses" size="sm" class="mr-1"/> Về trang khóa học
                        </button>
                    } @else {
                        <a routerLink="/student/payments" class="btn btn-primary">
                            <app-icon name="briefcase" size="sm" class="mr-1"/> Xem lịch sử thanh toán
                        </a>
                    }

                    <a routerLink="/courses" class="btn btn-secondary">
                        <app-icon name="search" size="sm" class="mr-1"/> Khám phá thêm khóa học
                    </a>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .payment-result-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            padding: 2rem;
        }

        .result-card {
            background: white;
            border-radius: 1.5rem;
            padding: 3rem;
            max-width: 500px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .icon-container {
            margin-bottom: 2rem;
        }

        .success-checkmark {
            width: 80px;
            height: 80px;
            margin: 0 auto;
        }

        .check-icon {
            width: 80px;
            height: 80px;
            position: relative;
            border-radius: 50%;
            box-sizing: content-box;
            border: 4px solid #10B981;
        }

        .check-icon::before {
            top: 3px;
            left: -2px;
            width: 30px;
            transform-origin: 100% 50%;
            border-radius: 100px 0 0 100px;
        }

        .check-icon::after {
            top: 0;
            left: 30px;
            width: 60px;
            transform-origin: 0 50%;
            border-radius: 0 100px 100px 0;
            animation: rotate-circle 4.25s ease-in;
        }

        .check-icon::before, .check-icon::after {
            content: '';
            height: 100px;
            position: absolute;
            background: #FFFFFF;
            transform: rotate(-45deg);
        }

        .icon-line {
            height: 5px;
            background-color: #10B981;
            display: block;
            border-radius: 2px;
            position: absolute;
            z-index: 10;
        }

        .icon-line.line-tip {
            top: 46px;
            left: 14px;
            width: 25px;
            transform: rotate(45deg);
            animation: icon-line-tip 0.75s;
        }

        .icon-line.line-long {
            top: 38px;
            right: 8px;
            width: 47px;
            transform: rotate(-45deg);
            animation: icon-line-long 0.75s;
        }

        .icon-circle {
            top: -4px;
            left: -4px;
            z-index: 10;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            position: absolute;
            box-sizing: content-box;
            border: 4px solid rgba(16, 185, 129, 0.5);
        }

        .icon-fix {
            top: 8px;
            width: 5px;
            left: 26px;
            z-index: 1;
            height: 85px;
            position: absolute;
            transform: rotate(-45deg);
            background-color: #FFFFFF;
        }

        @keyframes icon-line-tip {
            0% { width: 0; left: 1px; top: 19px; }
            54% { width: 0; left: 1px; top: 19px; }
            70% { width: 50px; left: -8px; top: 37px; }
            84% { width: 17px; left: 21px; top: 48px; }
            100% { width: 25px; left: 14px; top: 46px; }
        }

        @keyframes icon-line-long {
            0% { width: 0; right: 46px; top: 54px; }
            65% { width: 0; right: 46px; top: 54px; }
            84% { width: 55px; right: 0px; top: 35px; }
            100% { width: 47px; right: 8px; top: 38px; }
        }

        .title {
            font-size: 1.75rem;
            font-weight: 700;
            color: #10B981;
            margin-bottom: 1rem;
        }

        .message {
            color: #6B7280;
            font-size: 1rem;
            margin-bottom: 1.5rem;
            line-height: 1.6;
        }

        .transaction-info {
            background: #F3F4F6;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            margin-bottom: 0.5rem;
            display: flex;
            justify-content: space-between;
            font-size: 0.875rem;
        }

        .transaction-info .label {
            color: #6B7280;
        }

        .transaction-info .value {
            color: #1F2937;
            font-weight: 600;
            font-family: monospace;
        }

        .actions {
            margin-top: 2rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .btn {
            padding: 1rem 1.5rem;
            border-radius: 0.75rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
        }

        .btn-primary {
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .btn-secondary {
            background: #F3F4F6;
            color: #374151;
        }

        .btn-secondary:hover {
            background: #E5E7EB;
        }

        .pending-notice {
            background: #FEF3C7;
            border: 1px solid #FDE68A;
            border-radius: 0.75rem;
            padding: 1rem;
            margin-bottom: 1rem;
            color: #92400E;
            font-size: 0.875rem;
        }

        .info-notice {
            background: rgba(0, 86, 210, 0.08);
            border-color: rgba(0, 86, 210, 0.18);
            color: #0F172A;
        }
    `]
})
export class PaymentSuccessComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private paymentService = inject(PaymentService);

    transactionId = signal<string | null>(null);
    orderId = signal<string | null>(null);
    courseId = signal<string | null>(null);
    isPending = signal(false);
    countdown = signal(5);
    activation = signal<PaymentAccessActivationResult>({
        state: 'READY',
        message: null
    });

    title = computed(() => {
        if (this.isPending()) {
            return 'Đang xác nhận thanh toán';
        }
        switch (this.activation().state) {
            case 'MANUAL_ACTIVATION_REQUIRED':
                return 'Thanh toán đã được ghi nhận';
            case 'ACCESS_PENDING':
                return 'Đã ghi nhận thanh toán';
            default:
                return 'Thanh toán thành công!';
        }
    });

    summaryMessage = computed(() => {
        if (this.isPending()) {
            return 'Giao dịch đang được xác nhận từ cổng thanh toán. Chúng tôi sẽ cập nhật quyền học ngay khi nhận được xác nhận cuối cùng.';
        }
        switch (this.activation().state) {
            case 'MANUAL_ACTIVATION_REQUIRED':
                return 'Bạn đã thanh toán thành công, nhưng khóa học này cần được xếp lớp trước khi bắt đầu học.';
            case 'ACCESS_PENDING':
                return 'Thanh toán đã hoàn tất. Hệ thống đang kích hoạt quyền học cho bạn.';
            default:
                return 'Cảm ơn bạn đã đăng ký khóa học. Bạn đã có thể truy cập đầy đủ nội dung khóa học.';
        }
    });

    detailMessage = computed(() => {
        if (this.isPending()) {
            return 'Nếu trạng thái này kéo dài, bạn vẫn có thể kiểm tra lịch sử thanh toán hoặc quay lại trang khóa học sau ít phút.';
        }
        return this.activation().message;
    });

    showStartLearningCta = computed(() =>
        !this.isPending() && this.activation().state === 'READY' && !!this.courseId()
    );

    showCourseDetailCta = computed(() =>
        !this.isPending() && this.activation().state === 'MANUAL_ACTIVATION_REQUIRED' && !!this.courseId()
    );

    private countdownInterval: ReturnType<typeof setInterval> | null = null;
    private destroyed = false;

    ngOnInit() {
        this.route.queryParams.pipe(take(1)).subscribe(params => {
            this.transactionId.set(params['txn'] || params['vnp_TransactionNo'] || null);
            this.orderId.set(params['orderId'] || params['vnp_TxnRef'] || null);
            this.courseId.set(params['courseId'] || null);
            this.isPending.set(params['pending'] === 'true');

            if (this.isPending()) {
                void this.monitorPendingPayment();
                return;
            }

            if (this.orderId()) {
                void this.loadConfirmedPayment(this.orderId()!);
                return;
            }

            if (this.courseId()) {
                void this.finalizeLearningAccess(this.courseId()!);
            }
        });
    }

    async goToLearning(): Promise<void> {
        const cid = this.courseId();
        if (!cid) {
            this.router.navigate(['/student/courses/library']);
            return;
        }

        if (this.activation().state === 'READY') {
            this.router.navigate(['/student/learn/course', cid]);
            return;
        }

        this.goToCourseDetail();
    }

    goToCourseDetail(): void {
        const cid = this.courseId();
        if (cid) {
            this.router.navigate(['/student/courses', cid]);
            return;
        }
        this.router.navigate(['/student/courses/library']);
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }

    private async monitorPendingPayment(): Promise<void> {
        const orderId = this.orderId();
        if (!orderId) {
            return;
        }

        for (let attempt = 0; attempt < 10; attempt++) {
            if (this.destroyed) {
                return;
            }

            try {
                const payment = await this.paymentService.getPaymentByTxnRef(orderId);
                if (payment.status === 'COMPLETED') {
                    await this.applyPaymentRecord(payment);
                    return;
                }

                if (payment.status && payment.status !== 'PENDING') {
                    this.isPending.set(false);
                    this.activation.set({
                        state: 'ACCESS_PENDING',
                        message: 'Giao dịch chưa được xác nhận hoàn tất. Vui lòng kiểm tra lại lịch sử thanh toán hoặc liên hệ hỗ trợ nếu tiền đã bị trừ.'
                    });
                    return;
                }
            } catch {
                // Best-effort polling: keep waiting until retries are exhausted.
            }

            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        this.activation.set({
            state: 'ACCESS_PENDING',
            message: 'Hệ thống vẫn chưa nhận được xác nhận cuối cùng từ cổng thanh toán. Vui lòng kiểm tra lại tại lịch sử thanh toán trong ít phút tới.'
        });
    }

    private async finalizeLearningAccess(courseId: string): Promise<void> {
        try {
            const status = await this.paymentService.loadPaymentStatus(courseId);
            if (!status.hasPaid) {
                this.activation.set({
                    state: 'ACCESS_PENDING',
                    message: 'Hệ thống chưa xác nhận hoàn tất giao dịch. Vui lòng kiểm tra lại tại lịch sử thanh toán sau ít phút.'
                });
                return;
            }

            if (status.accessActivationState) {
                this.activation.set({
                    state: status.accessActivationState,
                    message: status.accessActivationMessage ?? null
                });
                if (status.accessActivationState === 'READY') {
                    this.startCountdown();
                }
                return;
            }
        } catch {
            // Fall back to the best-effort activation path below.
        }

        const activation = await this.paymentService.ensureEnrollment(courseId);
        this.activation.set(activation);
        if (activation.state === 'READY') {
            this.startCountdown();
        }
    }

    private async loadConfirmedPayment(txnRef: string): Promise<void> {
        try {
            const payment = await this.paymentService.getPaymentByTxnRef(txnRef);
            await this.applyPaymentRecord(payment);
        } catch {
            const courseId = this.courseId();
            if (courseId) {
                await this.finalizeLearningAccess(courseId);
            }
        }
    }

    private async applyPaymentRecord(payment: PaymentResponse): Promise<void> {
        this.transactionId.set(payment.transactionId || this.transactionId());
        this.courseId.set(payment.courseId || this.courseId());
        this.isPending.set(false);

        if (payment.accessActivationState) {
            this.activation.set({
                state: payment.accessActivationState,
                message: payment.accessActivationMessage ?? null,
            });
            if (payment.accessActivationState === 'READY') {
                this.startCountdown();
            }
            return;
        }

        if (payment.courseId) {
            await this.finalizeLearningAccess(payment.courseId);
        }
    }

    private startCountdown(): void {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        this.countdown.set(5);
        this.countdownInterval = setInterval(() => {
            const current = this.countdown();
            if (current <= 1) {
                if (this.countdownInterval) {
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                }
                void this.goToLearning();
            } else {
                this.countdown.set(current - 1);
            }
        }, 1000);
    }
}
