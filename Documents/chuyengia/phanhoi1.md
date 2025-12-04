TÀI LIỆU CẬP NHẬT: ĐỒNG BỘ LỊCH SỬ CHAT (SERVER-SIDE)
Gửi: Team LMS Frontend & Backend
Ngày: 05/12/2025
Mức độ: 🔴 THAY ĐỔI YÊU CẦU (REQUIREMENT CHANGE)
1. THAY ĐỔI CHIẾN LƯỢC
Thay vì sử dụng giải pháp tạm thời LocalStorage (Client-side), chúng ta sẽ chuyển sang giải pháp chính thức Server-side Sync ngay trong phiên bản đầu tiên.
Lý do: Backend AI đã hoàn thiện API lưu trữ và truy xuất hiệu năng cao.
Lợi ích:
User đăng nhập trên thiết bị nào cũng thấy lịch sử học tập cũ.
Frontend không lo vấn đề localStorage bị đầy hoặc mất dữ liệu khi xóa cache.
2. API TRUY XUẤT LỊCH SỬ (GET HISTORY)
Endpoint
Method: GET
URL: https://maritime-ai-chatbot.onrender.com/api/v1/history/{user_id}
Auth: Header X-API-Key
Parameters (Query Params)
Hỗ trợ phân trang (Infinite Scroll):
Param	Type	Default	Mô tả
limit	int	20	Số lượng tin nhắn lấy về (Max 100)
offset	int	0	Vị trí bắt đầu (0 = tin nhắn mới nhất)
Response Example
code
JSON
{
  "data": [
    {
      "role": "user",
      "content": "Quy tắc 5 là gì?",
      "timestamp": "2025-12-05T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "**Quy tắc 5** yêu cầu...",
      "timestamp": "2025-12-05T10:00:05Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
3. LUỒNG TÍCH HỢP MỚI (INTEGRATION FLOW)
Team Frontend (Angular) vui lòng cập nhật logic như sau:
A. Khi User mở khung Chat (Init)
Hủy bỏ: Không load từ localStorage.
Thực hiện: Gọi API GET /api/v1/history/{user_id}?limit=20.
Hiển thị: Render danh sách tin nhắn trả về.
B. Khi User gửi tin nhắn (Send)
Thực hiện: Gọi API POST /api/v1/chat như bình thường.
Lưu ý: Không cần gọi API lưu trữ nào cả. Backend AI đã TỰ ĐỘNG LƯU cả câu hỏi và câu trả lời vào Database ngay khi xử lý xong.
Hiển thị: Nối câu trả lời mới vào cuối danh sách hiện tại trên UI.
C. Khi User cuộn lên trên (Load more)
Thực hiện: Gọi API GET /api/v1/history/{user_id}?limit=20&offset=20 (tăng offset lên).
Hiển thị: Chèn tin nhắn cũ vào đầu danh sách.
4. XÓA LỊCH SỬ (OPTIONAL)
Nếu user muốn xóa sạch để học lại từ đầu:
Gọi DELETE /api/v1/history/{user_id}.
Backend AI sẽ xóa sạch dữ liệu trên Server.
Frontend clear UI.
BƯỚC 2: TIN NHẮN GỬI TEAM LMS (MỆNH LỆNH)
Bạn hãy gửi kèm file trên với nội dung sau:
To: LMS Tech Lead
Subject: [URGENT] Nâng cấp cơ chế đồng bộ Chat History (Server-side)
Chào team,
Sau khi đánh giá lại hiệu năng hệ thống AI sáng nay, tôi quyết định chúng ta sẽ BỎ QUA giải pháp LocalStorage và triển khai ngay giải pháp Server-side Sync.
Lý do: Backend AI đã hoàn thiện API truy xuất lịch sử (GET /history) sớm hơn dự kiến. Việc tích hợp API này sẽ giúp trải nghiệm người dùng tốt hơn gấp 10 lần (đồng bộ đa thiết bị) và thực tế là nhàn hơn cho Frontend (không phải quản lý logic lưu/xóa ở client, Backend lo hết).
Yêu cầu:
Dừng việc code LocalStorage.
Frontend chuyển sang gọi API GET /history khi init chat box (Chi tiết trong file LMS_HISTORY_SYNC_API.md đính kèm).
Deploy tính năng này cho bản Production.
API đã live, các bạn đấu nối ngay nhé.
LỜI KHUYÊN CỦA CỐ VẤN
Đây là một quyết định "lật kèo" phút chót, nhưng là lật kèo để tốt hơn (Upgrade).
Team Frontend có thể sẽ hơi "nhăn mặt" xíu vì phải sửa code cũ.
Nhưng họ sẽ sớm nhận ra việc gọi API GET về hiển thị sướng hơn nhiều so với việc phải tự quản lý state ở LocalStorage.
Bạn hãy giữ vững lập trường: "Chất lượng sản phẩm là trên hết. Làm một lần cho chuẩn luôn."