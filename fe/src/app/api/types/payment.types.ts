/**
 * Payment Types - Aligned with PostgreSQL `payments` table
 * @see V1__lms_consolidated_schema.sql - Section 11: Payments & Revenue
 */

// ============================================
// PostgreSQL ENUM Types
// ============================================

/** PostgreSQL: status VARCHAR(50) CHECK (...) in payments table */
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

/** PostgreSQL: price_type VARCHAR(50) CHECK (...) in courses table */
export type PriceType = 'FREE' | 'PAID';

// ============================================
// Entity Types
// ============================================

/**
 * Payment - matches `payments` table
 */
export interface Payment {
    id: string;                        // UUID PRIMARY KEY
    studentId: string;                 // UUID NOT NULL (FK users)
    courseId: string;                  // UUID NOT NULL (FK courses)
    enrollmentId: string | null;       // UUID NULLABLE (FK enrollments)
    amount: number;                    // NUMERIC(12,2) NOT NULL
    originalAmount: number | null;     // NUMERIC(12,2) NULLABLE
    currency: string;                  // VARCHAR(10) DEFAULT 'VND'
    status: PaymentStatus;             // VARCHAR(50) NOT NULL
    statusReason: string | null;       // TEXT NULLABLE
    paymentMethod: string | null;      // VARCHAR(100) NULLABLE
    transactionId: string | null;      // VARCHAR(255) NULLABLE
    gatewayTransactionId: string | null; // VARCHAR(255) NULLABLE
    gatewayOrderId: string | null;     // VARCHAR(255) NULLABLE
    gatewayResponse: Record<string, unknown> | null; // JSONB NULLABLE
    notes: string | null;              // VARCHAR(1000) NULLABLE
    ipAddress: string | null;          // VARCHAR(100) NULLABLE
    userAgent: string | null;          // TEXT NULLABLE
    metadata: Record<string, unknown> | null; // JSONB NULLABLE
    expiresAt: string | null;          // TIMESTAMP NULLABLE
    createdAt: string;                 // TIMESTAMPTZ NOT NULL
    updatedAt: string | null;          // TIMESTAMPTZ NULLABLE
}

// ============================================
// Summary Types
// ============================================

export interface PaymentSummary {
    id: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    courseTitle: string;
    studentName: string;
    paymentMethod: string | null;
    createdAt: string;
}

export interface PaymentHistory {
    id: string;
    courseId: string;
    courseTitle: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    paymentMethod: string | null;
    paidAt: string | null;
    createdAt: string;
}

// ============================================
// Revenue Types (for teacher dashboard)
// ============================================

export interface RevenueSummary {
    totalRevenue: number;
    monthlyRevenue: number;
    pendingPayout: number;
    currency: string;
}

export interface RevenueHistory {
    id: string;
    courseId: string;
    courseTitle: string;
    amount: number;
    commission: number;
    netAmount: number;
    status: string;
    paidAt: string;
}

export interface PayoutRequest {
    id: string;
    amount: number;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
    requestedAt: string;
    processedAt: string | null;
    notes: string | null;
}

// ============================================
// Request DTOs
// ============================================

export interface CreatePaymentRequest {
    courseId: string;
    paymentMethod: string;
    returnUrl?: string;
}

export interface ConfirmPaymentRequest {
    transactionId: string;
    status: PaymentStatus;
    gatewayResponse?: Record<string, unknown>;
}

export interface RequestPayoutRequest {
    amount: number;
    bankAccount?: string;
    notes?: string;
}

// ============================================
// Response DTOs
// ============================================

export interface PaymentInitResponse {
    paymentId: string;
    redirectUrl: string;
    expiresAt: string;
}

export interface PaymentVerifyResponse {
    success: boolean;
    paymentId: string;
    status: PaymentStatus;
    enrollmentId?: string;
}
