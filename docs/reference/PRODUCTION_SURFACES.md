# Bề mặt production

Tài liệu này liệt kê các điểm vào production cần biết khi smoke test hoặc xử lý sự cố.

## Public surfaces

- Site chính: `https://holilihu.online`
- API same-origin: `https://holilihu.online/api/*`
- Health: `https://holilihu.online/actuator/health`
- Wiii: `https://wiii.holilihu.online`

## Bề mặt kiểm tra sau deploy

- đăng nhập
- course browse / course detail
- teacher curriculum/editor
- learner lesson view
- payment modal / payment callback
- teacher revenue / payout
- admin finance / payout / payment guard
- PWA reset và reinstall nếu có thay đổi service worker

## Cảnh báo thực tế

- service worker cũ có thể làm kết quả test sai nếu không reset cache
- payment cần tránh tạo side effect tài chính thật khi không cần thiết
- production smoke nên dùng fixture account đã biết trạng thái trước
