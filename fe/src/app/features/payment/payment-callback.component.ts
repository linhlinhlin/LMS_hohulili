import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentApi } from '../../api/client/payment.api';
import { firstValueFrom } from 'rxjs';

/**
 * Payment Callback Component
 *
 * Handles VNPay return URL callback.
 * SECURITY: Verifies payment status from SERVER, not from URL params.
 * URL params (vnp_ResponseCode) are untrusted — attacker could forge them.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-payment-callback',
    imports: [],
    template: `
        <div class="callback-container">
            <div class="loading-card">
                <div class="spinner"></div>
                <h2>Đang xác minh thanh toán...</h2>
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
            background: linear-gradient(135deg, #0056D2 0%, #004BB5 100%);
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
            border-top-color: #0056D2;
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
    private paymentApi = inject(PaymentApi);

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            const txnRef = params['vnp_TxnRef'] || params['txnRef'];
            const transactionNo = params['vnp_TransactionNo'];

            // Small delay for UX, then verify with server
            setTimeout(() => this.verifyPaymentFromServer(txnRef, transactionNo), 1000);
        });
    }

    /**
     * SECURITY: Verify payment status from server, not URL params.
     * The IPN callback is the authoritative source — we just check the DB result.
     */
    private async verifyPaymentFromServer(txnRef: string | undefined, transactionNo: string | undefined): Promise<void> {
        // If we don't have txnRef, we can't verify — show error
        if (!txnRef) {
            this.router.navigate(['/payment/failed'], {
                queryParams: { reason: 'error', message: 'Không tìm thấy mã giao dịch' }
            });
            return;
        }

        try {
            // Call server to get authoritative payment status
            // Note: txnRef from VNPay is our payment entity ID
            const response = await firstValueFrom(this.paymentApi.getPaymentByTxnRef(txnRef));

            if (response.success && response.data.status === 'COMPLETED') {
                this.router.navigate(['/payment/success'], {
                    queryParams: {
                        txn: transactionNo || response.data.transactionId,
                        orderId: txnRef
                    }
                });
            } else if (response.success && response.data.status === 'PENDING') {
                // IPN hasn't arrived yet — wait and retry once
                setTimeout(async () => {
                    try {
                        const retry = await firstValueFrom(this.paymentApi.getPaymentByTxnRef(txnRef));
                        if (retry.success && retry.data.status === 'COMPLETED') {
                            this.router.navigate(['/payment/success'], {
                                queryParams: { txn: transactionNo, orderId: txnRef }
                            });
                        } else {
                            this.router.navigate(['/payment/failed'], {
                                queryParams: { reason: 'PENDING', orderId: txnRef }
                            });
                        }
                    } catch {
                        this.router.navigate(['/payment/failed'], {
                            queryParams: { reason: 'error', orderId: txnRef }
                        });
                    }
                }, 3000);
            } else {
                this.router.navigate(['/payment/failed'], {
                    queryParams: {
                        reason: this.getReasonFromStatus(response.data?.status),
                        orderId: txnRef
                    }
                });
            }
        } catch {
            // SECURITY: Never trust URL params on API failure — always show error
            this.router.navigate(['/payment/failed'], {
                queryParams: {
                    reason: 'error',
                    message: 'Không thể xác minh thanh toán. Vui lòng kiểm tra lịch sử thanh toán.',
                    orderId: txnRef
                }
            });
        }
    }

    private getReasonFromStatus(status: string | undefined): string {
        if (!status) return 'error';
        const map: Record<string, string> = {
            'FAILED': 'FAILED',
            'PENDING': 'PENDING',
            'REFUNDED': 'REFUNDED'
        };
        return map[status] || 'FAILED';
    }

}
