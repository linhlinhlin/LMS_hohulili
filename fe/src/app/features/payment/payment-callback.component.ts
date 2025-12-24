import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * Payment Callback Component
 * 
 * Handles VNPay return URL callback
 * Extracts params and redirects to success/failed page
 */
@Component({
    selector: 'app-payment-callback',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="callback-container">
            <div class="loading-card">
                <div class="spinner"></div>
                <h2>Đang xử lý thanh toán...</h2>
                <p>Vui lòng đợi trong giây lát</p>
            </div>
        </div>
    `,
    styles: [`
        .callback-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .loading-card {
            background: white;
            border-radius: 1.5rem;
            padding: 3rem;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .spinner {
            width: 60px;
            height: 60px;
            border: 4px solid #E5E7EB;
            border-top-color: #667eea;
            border-radius: 50%;
            margin: 0 auto 1.5rem;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        h2 {
            color: #1F2937;
            margin-bottom: 0.5rem;
        }

        p {
            color: #6B7280;
        }
    `]
})
export class PaymentCallbackComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    ngOnInit() {
        // Process VNPay callback params
        this.route.queryParams.subscribe(params => {
            const responseCode = params['vnp_ResponseCode'];
            const transactionNo = params['vnp_TransactionNo'];
            const txnRef = params['vnp_TxnRef'];

            // Small delay for UX
            setTimeout(() => {
                if (responseCode === '00') {
                    // Success
                    this.router.navigate(['/payment/success'], {
                        queryParams: {
                            txn: transactionNo,
                            orderId: txnRef
                        }
                    });
                } else {
                    // Failed
                    this.router.navigate(['/payment/failed'], {
                        queryParams: {
                            reason: this.getReasonFromCode(responseCode),
                            orderId: txnRef
                        }
                    });
                }
            }, 1500);
        });
    }

    private getReasonFromCode(code: string): string {
        const codeMap: { [key: string]: string } = {
            '07': 'Trừ tiền thành công nhưng giao dịch bị nghi ngờ',
            '09': 'Thẻ/Tài khoản chưa đăng ký Internet Banking',
            '10': 'Xác thực sai quá 3 lần',
            '11': 'EXPIRED',
            '12': 'Thẻ/Tài khoản bị khóa',
            '13': 'Sai mật khẩu OTP',
            '24': 'CANCELLED',
            '51': 'INSUFFICIENT_FUNDS',
            '65': 'Vượt hạn mức giao dịch',
            '75': 'Ngân hàng đang bảo trì',
            '79': 'Sai mật khẩu quá số lần',
            '99': 'error'
        };

        return codeMap[code] || 'FAILED';
    }
}
