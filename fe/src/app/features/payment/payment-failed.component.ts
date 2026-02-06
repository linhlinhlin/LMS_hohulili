import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

/**
 * Payment Failed Component
 * 
 * Shown when payment fails or is cancelled
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-payment-failed',
    imports: [RouterLink],
    template: `
        <div class="payment-result-container">
            <div class="result-card failed">
                <!-- Error Icon -->
                <div class="icon-container">
                    <div class="error-icon">
                        <span class="x-line line-left"></span>
                        <span class="x-line line-right"></span>
                    </div>
                </div>

                <h1 class="title">Thanh toán không thành công</h1>
                
                <p class="message">{{ errorMessage() }}</p>

                @if (reason()) {
                    <div class="error-info">
                        <span class="label">Lý do:</span>
                        <span class="value">{{ getReasonText(reason()) }}</span>
                    </div>
                }

                <div class="actions">
                    <button (click)="retry()" class="btn btn-primary">
                        🔄 Thử lại
                    </button>
                    <a routerLink="/courses" class="btn btn-secondary">
                        ← Quay lại danh sách khóa học
                    </a>
                    <a href="mailto:support@lms-maritime.com" class="btn btn-link">
                        📧 Liên hệ hỗ trợ
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
            background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
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

        .error-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto;
            border-radius: 50%;
            border: 4px solid #EF4444;
            position: relative;
            animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-5px); }
            40%, 80% { transform: translateX(5px); }
        }

        .x-line {
            position: absolute;
            width: 40px;
            height: 5px;
            background: #EF4444;
            border-radius: 2px;
            top: 50%;
            left: 50%;
        }

        .x-line.line-left {
            transform: translate(-50%, -50%) rotate(45deg);
        }

        .x-line.line-right {
            transform: translate(-50%, -50%) rotate(-45deg);
        }

        .title {
            font-size: 1.75rem;
            font-weight: 700;
            color: #EF4444;
            margin-bottom: 1rem;
        }

        .message {
            color: #6B7280;
            font-size: 1rem;
            margin-bottom: 1.5rem;
            line-height: 1.6;
        }

        .error-info {
            background: #FEE2E2;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            margin-bottom: 0.5rem;
            display: flex;
            justify-content: space-between;
            font-size: 0.875rem;
            border: 1px solid #FECACA;
        }

        .error-info .label {
            color: #991B1B;
        }

        .error-info .value {
            color: #DC2626;
            font-weight: 600;
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
            font-size: 1rem;
        }

        .btn-primary {
            background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .btn-secondary {
            background: #F3F4F6;
            color: #374151;
        }

        .btn-secondary:hover {
            background: #E5E7EB;
        }

        .btn-link {
            background: transparent;
            color: #6B7280;
        }

        .btn-link:hover {
            color: #374151;
        }
    `]
})
export class PaymentFailedComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    reason = signal<string | null>(null);
    errorMessage = signal<string>('Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.');

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            this.reason.set(params['reason'] || null);

            if (params['message']) {
                try {
                    this.errorMessage.set(decodeURIComponent(params['message']));
                } catch {
                    this.errorMessage.set(params['message']);
                }
            }
        });
    }

    getReasonText(reason: string | null): string {
        if (!reason) return 'Không xác định';

        const reasonMap: { [key: string]: string } = {
            'invalid_signature': 'Chữ ký không hợp lệ',
            'CANCELLED': 'Bạn đã hủy giao dịch',
            'FAILED': 'Giao dịch thất bại',
            'EXPIRED': 'Phiên thanh toán đã hết hạn',
            'INSUFFICIENT_FUNDS': 'Số dư không đủ',
            'error': 'Lỗi hệ thống'
        };

        return reasonMap[reason] || reason;
    }

    retry() {
        // Go back to previous page or courses
        window.history.back();
    }
}
