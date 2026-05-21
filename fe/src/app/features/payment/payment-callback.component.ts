import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';
import { PaymentApi } from '../../api/client/payment.api';
import { SeoService } from '../../core/services/seo.service';

/**
 * Payment Callback Component
 *
 * Verifies payment status from the server after the browser is redirected back
 * from a gateway. URL params alone are never treated as authoritative.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-payment-callback',
  imports: [],
  template: `
    <div class="callback-container">
      <div class="loading-card">
        <div class="spinner"></div>
        <h2>Dang xac minh thanh toan...</h2>
        <p>Vui long doi trong giay lat</p>
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
  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setNoindex();

    this.route.queryParams.pipe(take(1)).subscribe(params => {
      const txnRef = params['vnp_TxnRef'] || params['txnRef'];
      const transactionNo = params['vnp_TransactionNo'];

      // Give the gateway/IPN a brief moment before polling the server.
      setTimeout(() => {
        void this.verifyPaymentFromServer(txnRef, transactionNo);
      }, 1000);
    });
  }

  /**
   * Verify payment status from the server, not from URL params.
   * Uses exponential polling: 2s, 4s, 8s (max ~14s).
   */
  private async verifyPaymentFromServer(
    txnRef: string | undefined,
    transactionNo: string | undefined,
  ): Promise<void> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!txnRef || !uuidRegex.test(txnRef)) {
      this.router.navigate(['/payment/failed'], {
        queryParams: { reason: 'error', message: 'Khong tim thay ma giao dich' },
      });
      return;
    }

    const maxRetries = 3;
    const baseDelay = 2000;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const response = await firstValueFrom(this.paymentApi.getPaymentByTxnRef(txnRef));

        if (response.success && response.data.status === 'COMPLETED') {
          this.router.navigate(['/payment/success'], {
            queryParams: {
              txn: transactionNo || response.data.transactionId,
              orderId: txnRef,
              courseId: response.data.courseId,
            },
          });
          return;
        }

        if (response.success && response.data.status === 'PENDING') {
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
            continue;
          }

          this.router.navigate(['/payment/success'], {
            queryParams: {
              txn: transactionNo,
              orderId: txnRef,
              courseId: response.data.courseId,
              pending: 'true',
            },
          });
          return;
        }

        this.router.navigate(['/payment/failed'], {
          queryParams: {
            reason: this.getReasonFromStatus(response.data?.status),
            orderId: txnRef,
          },
        });
        return;
      } catch {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
          continue;
        }

        // A callback verification timeout is not the same as a confirmed payment failure.
        // Keep the user in a pending state so they can re-check the payment history instead
        // of seeing a false negative after money has already been debited.
        this.router.navigate(['/payment/success'], {
          queryParams: {
            txn: transactionNo,
            orderId: txnRef,
            pending: 'true',
          },
        });
        return;
      }
    }
  }

  private getReasonFromStatus(status: string | undefined): string {
    if (!status) return 'error';
    const map: Record<string, string> = {
      FAILED: 'FAILED',
      PENDING: 'PENDING',
      REFUNDED: 'REFUNDED',
    };
    return map[status] || 'FAILED';
  }
}
