# Session Prompt: Trang Lịch sử thanh toán — Deep Redesign

## Ngữ cảnh

Trang `/student/payments` (`StudentPaymentHistoryComponent`) cần redesign toàn diện để đồng bộ với hệ thống thiết kế và đạt chuẩn SOTA.

Session trước đã hoàn thành redesign trang `/student/analytics` — thiết lập design system SCSS dùng `_variables.scss`, loại bỏ Tailwind inline, tối ưu mobile/tablet/desktop, skeleton loading, print CSS.

## BẮT BUỘC đọc trước:
1. **`CLAUDE.md`** — project overview, architecture
2. **`fe/UX_UI_GUIDELINES.md`** — quy tắc thiết kế hệ thống
3. **`fe/src/styles/_variables.scss`** — design tokens ($blue-primary, $gray-*, spacing, shadows)
4. **`fe/src/app/features/student/dashboard/student-dashboard.component.scss`** — SCSS reference chuẩn
5. **`fe/src/app/features/analytics/student-analytics.component.scss`** — SCSS mới nhất (analytics redesign)
6. **Memory** — kiểm tra sessions trước

## Hiện trạng trang payments:
- **File**: `fe/src/app/features/student/pages/student-payment-history.component.ts` (inline template)
- **Style**: Tailwind inline — KHÔNG đồng bộ với dashboard SCSS
- **Pagination**: KHÔNG CÓ — load toàn bộ payments
- **Mobile**: Table 6 cột + cuộn ngang — rất tệ UX
- **Summary**: 3 cards riêng lẻ (card soup)

## Việc cần làm — suy nghĩ kỹ theo SOTA:

### 1. Nghiên cứu sâu (BẮT BUỘC dùng `cot-research` SKILL)
- [ ] **Coursera, Canvas, Moodle, Stripe Dashboard** — trang lịch sử thanh toán thiết kế thế nào?
- [ ] **Table design SOTA** — bảng dữ liệu trên mobile nên card layout hay responsive table?
- [ ] **Pagination pattern** — server-side pagination hay client-side Load More?
- [ ] **Grouping/filtering** — nên chia theo tháng? theo trạng thái? hay flat list?
- [ ] **Search/filter** — cần tìm kiếm giao dịch không?

### 2. Thiết kế lại (BẮT BUỘC dùng `brainstorming` SKILL)
- [ ] **Chuyển từ Tailwind inline → SCSS** dùng `_variables.scss` (match dashboard)
- [ ] **Tách template ra file `.html`** — inline template 150 dòng quá dài
- [ ] **Summary 3 cards → 1 metrics strip** (pattern từ analytics)
- [ ] **Table redesign**: desktop = table, mobile = card layout (responsive switching)
- [ ] **Pagination**: server-side nếu API hỗ trợ, hoặc client-side Load More
- [ ] **Grouping**: cân nhắc group theo tháng (Stripe pattern) hoặc flat list + filter
- [ ] **Skeleton loading** match layout mới
- [ ] **Empty state + Error state** giữ nguyên (đã tốt)

### 3. Responsive (3 breakpoints)
- [ ] **Desktop (>1024px)**: Table đầy đủ 6 cột
- [ ] **Tablet (768-1024px)**: Table rút gọn (ẩn cột "Mã GD", "Phương thức")
- [ ] **Mobile (<640px)**: Card layout — mỗi giao dịch = 1 card compact
- [ ] **Ultra-small (<340px)**: Card layout thu gọn hơn

### 4. Print CSS
- [ ] Ẩn app shell (sidebar, nav) — đã có global print CSS trong `styles.scss`
- [ ] Table format sạch cho A4
- [ ] `break-inside: avoid` cho mỗi row/card

### 5. Tiếng Việt
- [ ] Mọi label phải tiếng Việt có dấu, dễ hiểu
- [ ] Không dùng thuật ngữ kỹ thuật (transaction ID → Mã giao dịch)
- [ ] Số tiền format: `1.234.567₫` (VND, không decimal)

## API hiện có:
```typescript
// PaymentService
getPaymentHistory(): Promise<PaymentResponse[]>

// PaymentResponse
interface PaymentResponse {
  id: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
  paymentMethod: string;
  transactionId: string;
  paidAt: string;
  createdAt: string;
  accessActivationState: string;
}
```

## KHÔNG làm:
- Không sửa analytics page (đã done)
- Không sửa backend payment API
- Không thêm features ngoài scope (refund flow, v.v.)
- Không dùng thư viện bảng bên ngoài (Material Table, AG Grid) — dùng native HTML table + SCSS

## Quy tắc kỹ thuật:
- Angular 20+: signals, `inject()`, `ChangeDetectionStrategy.OnPush`, NO `standalone: true`
- SCSS với `@use '../../../styles/variables' as *`
- Tách `.html` + `.scss` files riêng (không inline template)
- Clean code, clean architecture — không slop AI
- Tuân thủ `UX_UI_GUIDELINES.md` và `_variables.scss` tokens
- Dùng `rtk` prefix cho Bash commands

## Tham khảo design:
- **Stripe Dashboard** — bảng giao dịch chuyên nghiệp nhất
- **Coursera Purchases** — simple, student-friendly
- **Canvas Billing** — minimal, clean
- **Student dashboard SCSS** — `student-dashboard.component.scss` là chuẩn visual
- **Analytics SCSS** — `student-analytics.component.scss` là mẫu SCSS mới nhất
