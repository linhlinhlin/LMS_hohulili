import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentApi } from '../../api/client/payment.api';
import { firstValueFrom, take } from 'rxjs';

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
        this.route.queryParams.pipe(take(1)).subscribe(params => {
            const txnRef = params['vnp_TxnRef'] || params['txnRef'];
            const transactionNo = params['vnp_TransactionNo'];

            // Small delay for UX, then verify with server
            setTimeout(() => this.verifyPaymentFromServer(txnRef, transactionNo), 1000);
        });
    }

    /**
     * SECURITY: Verify payment status from server, not URL params.
     * The IPN callback is the authoritative source — we just check the DB result.
     * Uses exponential polling: 2s, 4s, 8s (max 3 retries, ~14s total).
     */
    private async verifyPaymentFromServer(txnRef: string | undefined, transactionNo: string | undefined): Promise<void> {
        // Validate txnRef: must be UUID format (prevents injection via URL params)
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!txnRef || !UUID_REGEX.test(txnRef)) {
            this.router.navigate(['/payment/failed'], {
                queryParams: { reason: 'error', message: 'Không tìm thấy mã giao dịch' }
            });
            return;
        }

        // Exponential polling: delays = [2s, 4s, 8s]
        const MAX_RETRIES = 3;
        const BASE_DELAY = 2000;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await firstValueFrom(this.paymentApi.getPaymentByTxnRef(txnRef));

                if (response.success && response.data.status === 'COMPLETED') {
                    this.router.navigate(['/payment/success'], {
                        queryParams: {
                            txn: transactionNo || response.data.transactionId,
                            orderId: txnRef,
                            courseId: response.data.courseId
                        }
                    });
                    return;
                } else if (response.success && response.data.status === 'PENDING') {
                    if (attempt < MAX_RETRIES) {
                        // Wait with exponential backoff before next attempt
                        await new Promise(resolve => setTimeout(resolve, BASE_DELAY * Math.pow(2, attempt)));
                        continue;
                    }
                    // All retries exhausted — show "waiting" state, NOT failed
                    this.router.navigate(['/payment/success'], {
                        queryParams: {
                            txn: transactionNo,
                            orderId: txnRef,
                            courseId: response.data.courseId,
                            pending: 'true'
                        }
                    });
                    return;
                } else {
                    // Definitive failure (FAILED, CANCELLED, etc.)
                    this.router.navigate(['/payment/failed'], {
                        queryParams: {
                            reason: this.getReasonFromStatus(response.data?.status),
                            orderId: txnRef
                        }
                    });
                    return;
                }
            } catch {
                if (attempt < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, BASE_DELAY * Math.pow(2, attempt)));
                    continue;
                }
                // SECURITY: Never trust URL params on API failure — always show error
                this.router.navigate(['/payment/failed'], {
                    queryParams: {
                        reason: 'error',
                        message: 'Không thể xác minh thanh toán. Vui lòng kiểm tra lịch sử thanh toán.',
                        orderId: txnRef
                    }
                });
                return;
            }
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
