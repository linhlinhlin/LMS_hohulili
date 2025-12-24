# Payment System Schema Investigation Report

**Date:** 2025-12-24  
**Database:** Supabase LMS (`rljldvpboqapokzecfff`)  
**Purpose:** Điều tra schema hiện tại và yêu cầu cho hệ thống Payment

---

## 🔍 **Phân tích Schema Hiện tại**

### **1. Bảng `enrollments`**
**❌ MISSING PAYMENT FIELDS**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'enrollments' 
  AND column_name IN ('is_paid', 'paid_at', 'payment_id');
```
**Result:** ❌ **No rows returned** - Các trường không tồn tại

**Yêu cầu:** Cần thêm:
- `is_paid BOOLEAN DEFAULT false`
- `paid_at TIMESTAMP`
- `payment_id UUID REFERENCES payments(id)`

### **2. Bảng `payments`**
**✅ ĐÃ TỒN TẠI** nhưng **CẦN MỞ RỘNG**

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'payments' 
  AND table_schema = 'public';
```
**Result:** ✅ **Table exists**

**Current Schema:**
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ,
    notes VARCHAR,
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR,
    status VARCHAR NOT NULL,
    transaction_id VARCHAR,
    course_id UUID NOT NULL,
    student_id UUID NOT NULL
);
```

**⚠️ MISSING FIELDS (So với yêu cầu):**
- `original_amount DECIMAL(15, 2)` - Giá gốc trước giảm giá
- `currency VARCHAR(3) DEFAULT 'VND'` - Loại tiền tệ
- `gateway_transaction_id VARCHAR(100)` - ID từ payment gateway
- `gateway_order_id VARCHAR(100)` - Order ID gửi đến gateway
- `gateway_response JSONB` - Full response từ gateway
- `status_reason TEXT` - Lý do nếu FAILED/CANCELLED
- `expires_at TIMESTAMP` - Payment link expiration
- `ip_address INET` - Địa chỉ IP
- `user_agent TEXT` - Thông tin trình duyệt
- `metadata JSONB` - Custom data (coupon_code, campaign_id)
- `enrollment_id UUID REFERENCES enrollments(id)` - Liên kết với enrollment

### **3. Bảng `payment_refunds`**
**❌ KHÔNG TỒN TẠI**

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'payment_refunds' 
  AND table_schema = 'public';
```
**Result:** ❌ **No rows returned** - Cần tạo mới

### **4. Bảng `payment_methods_config`**
**❌ KHÔNG TỒN TẠI**

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'payment_methods_config' 
  AND table_schema = 'public';
```
**Result:** ❌ **No rows returned** - Cần tạo mới

### **5. Bảng `courses`**
**✅ ĐÃ CÓ PRICE FIELDS**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'courses' 
  AND column_name IN ('price', 'sale_price', 'price_type');
```
**Result:** ✅ **All fields exist**

| Column | Type | Nullable |
|--------|------|----------|
| `price` | numeric | YES |
| `sale_price` | numeric | YES |
| `price_type` | varchar | YES |

### **6. Dữ liệu Payment Hiện có**
```sql
SELECT COUNT(*) as payment_count FROM payments;
```
**Result:** 1 payment record exists

---

## 📊 **Tóm tắt Phát hiện**

### **✅ Đã có:**
1. **Bảng `courses`**: Đã có đầy đủ price fields (`price`, `sale_price`, `price_type`)
2. **Bảng `payments`**: Đã tồn tại với 10 columns cơ bản
3. **Dữ liệu**: Đã có 1 payment record

### **❌ Cần thêm:**
1. **Bảng `payment_refunds`**: Cần tạo hoàn toàn mới
2. **Bảng `payment_methods_config`**: Cần tạo hoàn toàn mới
3. **Mở rộng bảng `payments`**: Thêm 11 fields mới
4. **Sửa đổi bảng `enrollments`**: Thêm 3 fields mới

### **📈 Thống kê:**
- **Tables cần tạo mới:** 2 tables
- **Tables cần mở rộng:** 2 tables
- **Fields cần thêm:** 17 fields
- **Foreign keys cần thêm:** 2 FKs

---

## 🛠️ **Migration Script Đề xuất**

### **1. Tạo bảng `payment_refunds`**
```sql
CREATE TABLE payment_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    processed_by UUID REFERENCES users(id),
    
    -- Refund Data
    amount DECIMAL(15, 2) NOT NULL,
    reason TEXT NOT NULL,
    refund_type VARCHAR(30) DEFAULT 'FULL',
    
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING',
    rejection_reason TEXT,
    
    -- Gateway response
    gateway_refund_id VARCHAR(100),
    gateway_response JSONB,
    
    -- Timestamps
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB
);

CREATE INDEX idx_refunds_payment_id ON payment_refunds(payment_id);
CREATE INDEX idx_refunds_user_id ON payment_refunds(user_id);
CREATE INDEX idx_refunds_status ON payment_refunds(status);
```

### **2. Tạo bảng `payment_methods_config`**
```sql
CREATE TABLE payment_methods_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    method_code VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url TEXT,
    
    -- Status
    is_enabled BOOLEAN DEFAULT true,
    is_sandbox BOOLEAN DEFAULT false,
    
    -- Configuration
    config_json JSONB,
    
    -- Limits
    min_amount DECIMAL(15, 2) DEFAULT 10000,
    max_amount DECIMAL(15, 2) DEFAULT 500000000,
    
    -- Ordering
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **3. Mở rộng bảng `payments`**
```sql
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'VND',
ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS gateway_response JSONB,
ADD COLUMN IF NOT EXISTS status_reason TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL;

-- Tạo indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_course_id ON payments(course_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_gateway_transaction_id ON payments(gateway_transaction_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE UNIQUE INDEX idx_payments_gateway_unique ON payments(payment_method, gateway_transaction_id) 
    WHERE gateway_transaction_id IS NOT NULL;
```

### **4. Sửa đổi bảng `enrollments`**
```sql
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;

CREATE INDEX idx_enrollments_is_paid ON enrollments(is_paid);
```

### **5. Data Migration cho FREE courses**
```sql
UPDATE enrollments e
SET is_paid = true, paid_at = e.enrolled_at
FROM learning_classes lc
JOIN courses c ON lc.course_id = c.id
WHERE e.learning_class_id = lc.id
  AND (c.price_type = 'FREE' OR c.price = 0 OR c.price IS NULL);
```

### **6. Insert Default Payment Methods**
```sql
INSERT INTO payment_methods_config (method_code, display_name, is_enabled, sort_order)
VALUES 
    ('VNPAY', 'VNPay', true, 1),
    ('ZALOPAY', 'ZaloPay', true, 2),
    ('MOMO', 'MoMo', true, 3),
    ('BANK_TRANSFER', 'Chuyển khoản ngân hàng', true, 4),
    ('SIMULATED', 'Thanh toán giả lập (Dev)', false, 99)
ON CONFLICT (method_code) DO NOTHING;
```

---

## 🎯 **Kết luận & Khuyến nghị**

### **✅ Đã sẵn sàng:**
- Course entity đã có price fields
- Bảng payments cơ bản đã tồn tại
- Database sử dụng PostgreSQL (hỗ trợ JSONB, INET)

### **❌ Cần implement:**
1. **Tạo 2 bảng mới**: `payment_refunds`, `payment_methods_config`
2. **Mở rộng 2 bảng**: `payments`, `enrollments`
3. **Tạo indexes**: 10 indexes mới cho performance
4. **Data migration**: Cập nhật enrollments cho FREE courses

### **📋 Next Steps:**
1. **Tạo migration script** theo đề xuất trên
2. **Test trên staging** trước khi apply production
3. **Backup database** trước khi chạy migration
4. **Update JPA entities** để match schema mới
5. **Implement payment service** với các gateway

**Ước tính thời gian:** 2-3 ngày phát triển + 1 ngày testing

---

**Report generated:** 2025-12-24 08:43:07 UTC  
**Database:** Supabase LMS Maritime Project  
**Status:** Ready for migration implementation