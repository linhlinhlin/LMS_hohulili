import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

/**
 * Payment Success Component
 * 
 * Shown after successful payment completion
 */
@Component({
    selector: 'app-payment-success',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
        <div class="payment-result-container">
            <div class="result-card success">
                <!-- Success Animation -->
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

                <h1 class="title">Thanh toán thành công! 🎉</h1>
                
                <p class="message">
                    Cảm ơn bạn đã đăng ký khóa học. Bạn đã có thể truy cập đầy đủ nội dung khóa học.
                </p>

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

                <div class="actions">
                    <a routerLink="/student/my-courses" class="btn btn-primary">
                        📚 Bắt đầu học ngay
                    </a>
                    <a routerLink="/courses" class="btn btn-secondary">
                        🔍 Khám phá thêm khóa học
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
    `]
})
export class PaymentSuccessComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    transactionId = signal<string | null>(null);
    orderId = signal<string | null>(null);

    ngOnInit() {
        // Get query params from VNPay callback or other sources
        this.route.queryParams.subscribe(params => {
            this.transactionId.set(params['txn'] || params['vnp_TransactionNo'] || null);
            this.orderId.set(params['orderId'] || params['vnp_TxnRef'] || null);
        });
    }
}
