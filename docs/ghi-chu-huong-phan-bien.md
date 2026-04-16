# Ghi chú hướng giải trình — gửi thầy

**Bài báo**: Hệ thống LMS ưu tiên ngoại tuyến cho đào tạo thuyền viên
**Kết quả**: PB1 yêu cầu sửa nhỏ, PB2 đồng ý đăng — cần giải trình 3 câu PB1 + bổ sung theo gợi ý PB2

---

## PB1 — 3 câu bắt buộc (hỏi "giải thích")

**Câu 1 — Bảo mật học liệu trên BYOD:**
→ Giải thích cơ chế đã có (Same-Origin Policy, xác thực 4 trạng thái, cô lập theo người dùng). Thừa nhận hạn chế trước truy cập vật lý. Đề xuất mã hoá AES-256-GCM ghi vào Hướng phát triển.

**Câu 2 — Buffer 10s < handover 15s:**
→ Sửa bài: 10s là giá trị làm tròn, thực tế 8s (ngưỡng tiếp tục phát). Buffer chính là **30 giây** — gấp đôi chu kỳ 15s. Bổ sung bảng tham số đầy đủ.

**Câu 3 — Backpressure khi tải tại cảng:**
→ Giải thích kiến trúc stream trực tiếp vào Cache API (không qua blob/RAM). Mô tả 3 cơ chế bảo vệ bổ sung. Xác nhận con số giảm 99% RAM.

## PB2 — 4 gợi ý (không bắt buộc, nhưng nên làm)

1. Thử nghiệm thực tế → bổ sung bảng nguồn tham số mô phỏng + kế hoạch thí điểm vào Future Work
2. So sánh LMS + ABR → bổ sung 2 bảng so sánh
3. Kịch bản không tải trước → mô tả cơ chế checkpoint + tải tuần tự đã có
4. Thuật ngữ + tham khảo → chuẩn hoá + bổ sung 5 tài liệu mới

## Nguyên tắc

- Hỏi gì đáp đấy, giải thích cái đã có trước, đề xuất cải tiến sau
- Rút gọn phù hợp tạp chí trong nước (~5 trang, không code snippets)
- 5 tài liệu mới (không phải 15 như bản cũ)

**Thầy có góp ý gì không ạ?**
