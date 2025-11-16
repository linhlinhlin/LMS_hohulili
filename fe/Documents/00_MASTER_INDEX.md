Giờ reload page /admin/dashboard - dashboard sẽ hiện ra bình thường!

Tóm tắt nguyên nhân và giải pháp:

🔴 Vấn đề gốc: CSS critical.scss có rule:

body:not(.loaded) .dashboard-container { opacity: 0; }
Điều này ẩn toàn bộ dashboard khi body chưa có class loaded.

✅ Giải pháp: Thêm document.body.classList.add('loaded') vào AdminComponent khi data load xong - giống như StudentDashboard làm.

Reload ngay và report kết 