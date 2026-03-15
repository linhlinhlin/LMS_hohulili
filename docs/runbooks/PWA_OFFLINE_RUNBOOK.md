# PWA / Offline Runbook

## Khi nào dùng

- thay đổi service worker
- thay đổi IndexedDB schema
- thay đổi offline download/media
- xuất hiện bug chỉ thấy trên production/PWA

## Reset service worker

1. mở `/reset-sw`
2. hard refresh
3. đăng nhập lại nếu cần

## Smoke tối thiểu

- course đã tải vẫn xuất hiện trong library
- learner mở được text lesson offline
- nếu hỗ trợ offline media, kiểm tra video/file offline đúng đường local
- không có spam lỗi IndexedDB trong console

## Khi gặp lỗi offline DB

- xác minh browser có chặn IndexedDB không
- reset SW
- reload
- nếu vẫn lỗi, fallback về online-only mode cho session đó là chấp nhận được hơn crash
