import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-refund-policy',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50 py-12 px-4">
      <div class="max-w-3xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <a routerLink="/" class="text-[#0056D2] hover:underline text-sm mb-4 inline-block">&larr; Về trang chủ</a>
          <h1 class="text-3xl font-bold text-gray-900">Chính sách hoàn tiền</h1>
          <p class="text-gray-500 mt-2">Cập nhật lần cuối: 27/02/2026</p>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-8">

          <!-- Scope -->
          <section>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">1. Phạm vi áp dụng</h2>
            <p class="text-gray-600 leading-relaxed">
              Chính sách này áp dụng cho tất cả khóa học trả phí được mua trực tiếp trên nền tảng LMS Maritime
              (holilihu.online) bởi cá nhân. Chính sách tuân thủ Luật Bảo vệ quyền lợi người tiêu dùng số 19/2023/QH15
              và các quy định liên quan về giao dịch từ xa.
            </p>
          </section>

          <!-- Conditions -->
          <section>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">2. Điều kiện hoàn tiền</h2>
            <p class="text-gray-600 leading-relaxed mb-4">Bạn được quyền yêu cầu hoàn tiền khi đáp ứng <strong>đồng thời</strong> các điều kiện sau:</p>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <span class="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">1</span>
                <span class="text-gray-600"><strong>Thời hạn:</strong> Trong vòng <strong>7 ngày</strong> kể từ ngày thanh toán.</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">2</span>
                <span class="text-gray-600"><strong>Tiến độ:</strong> Đã học chưa quá <strong>30%</strong> tổng số bài học của khóa học.</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">3</span>
                <span class="text-gray-600"><strong>Chứng chỉ:</strong> Chưa được cấp chứng chỉ hoàn thành khóa học.</span>
              </li>
            </ul>
          </section>

          <!-- Exclusions -->
          <section>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">3. Trường hợp không hoàn tiền</h2>
            <ul class="space-y-2 text-gray-600">
              <li class="flex items-start gap-2">
                <span class="text-red-500 mt-1">&#10005;</span>
                <span>Đã học quá 30% nội dung khóa học.</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-red-500 mt-1">&#10005;</span>
                <span>Đã được cấp chứng chỉ hoàn thành.</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-red-500 mt-1">&#10005;</span>
                <span>Yêu cầu hoàn tiền sau 7 ngày kể từ ngày mua.</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-red-500 mt-1">&#10005;</span>
                <span>Khóa học được mua bằng mã giảm giá hoặc chương trình khuyến mãi đặc biệt.</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-red-500 mt-1">&#10005;</span>
                <span>Giao dịch mua bởi tổ chức/doanh nghiệp (B2B) — áp dụng theo hợp đồng riêng.</span>
              </li>
            </ul>
          </section>

          <!-- Process -->
          <section>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">4. Quy trình hoàn tiền</h2>
            <div class="space-y-4">
              <div class="flex items-start gap-4">
                <div class="w-8 h-8 bg-[#0056D2] text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">1</div>
                <div>
                  <p class="font-medium text-gray-900">Gửi yêu cầu</p>
                  <p class="text-gray-500 text-sm">Gửi email đến <strong>support&#64;holilihu.online</strong> với tiêu đề "Yêu cầu hoàn tiền" kèm mã giao dịch và lý do.</p>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <div class="w-8 h-8 bg-[#0056D2] text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">2</div>
                <div>
                  <p class="font-medium text-gray-900">Xem xét</p>
                  <p class="text-gray-500 text-sm">Chúng tôi sẽ xem xét yêu cầu trong vòng 3 ngày làm việc và phản hồi qua email.</p>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <div class="w-8 h-8 bg-[#0056D2] text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">3</div>
                <div>
                  <p class="font-medium text-gray-900">Xử lý</p>
                  <p class="text-gray-500 text-sm">Nếu được chấp thuận, hoàn tiền sẽ được xử lý qua phương thức thanh toán gốc trong 7-14 ngày làm việc.</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Amount -->
          <section>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">5. Số tiền hoàn trả</h2>
            <p class="text-gray-600 leading-relaxed">
              Số tiền hoàn trả là toàn bộ số tiền đã thanh toán, trừ phí cổng thanh toán (nếu có).
        Hoàn tiền được xử lý về phương thức thanh toán gốc.
            </p>
          </section>

          <!-- Contact -->
          <section class="bg-[#0056D2]/5 rounded-xl p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-3">6. Liên hệ</h2>
            <p class="text-gray-600">
              Mọi thắc mắc về chính sách hoàn tiền, vui lòng liên hệ:
            </p>
            <ul class="mt-3 space-y-1 text-gray-600">
              <li><strong>Email:</strong> support&#64;holilihu.online</li>
              <li><strong>Website:</strong> holilihu.online</li>
            </ul>
          </section>

        </div>

        <p class="text-center text-xs text-gray-400 mt-8">
          LMS Maritime &copy; 2026. Chính sách này tuân thủ Luật Bảo vệ quyền lợi người tiêu dùng số 19/2023/QH15.
        </p>
      </div>
    </div>
  `
})
export class RefundPolicyComponent {}
