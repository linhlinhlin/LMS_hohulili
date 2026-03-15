# Production Smoke Test

Đây là smoke test ngắn sau deploy hoặc sau thay đổi runtime quan trọng.

## 1. Health

```bash
curl -s https://holilihu.online/actuator/health
```

Kỳ vọng: `{"status":"UP"}`

## 2. Public app

- mở trang chủ
- mở course detail
- không có lỗi trắng trang

## 3. Auth

- đăng nhập thành công bằng 1 tài khoản hợp lệ
- đăng xuất thành công

## 4. Teacher

- mở dashboard teacher
- mở curriculum/editor
- mở ít nhất một modal section

## 5. Learner

- mở một course đã được entitlement
- vào một lesson
- nếu có quiz/video/file thì mở đúng một loại nội dung

## 6. Payment / payout

- mở payment entrypoint
- kiểm tra payout history / admin payout nếu batch đụng finance

## 7. PWA

- nếu batch đụng SW/offline, mở `/reset-sw` rồi kiểm tra lại
