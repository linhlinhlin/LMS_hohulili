# Tổng quan frontend

Tài liệu này là điểm vào ngắn gọn cho frontend.

## Công nghệ

- Angular 20.3
- TypeScript 5.9
- RxJS
- Sass
- Dexie.js
- Shaka Player

## Cấu trúc chính

- `api/`
- `core/`
- `features/`
- `shared/`
- `state/`

## Các luồng lớn

- admin
- teacher
- student
- learning
- payment
- offline/PWA

## Điểm cần nhớ

- frontend dev dùng proxy `/api/*`
- không hardcode backend host trong local FE
- runbook learner/offline nằm ở `docs/runbooks/`
- reference frontend sâu hơn nằm ở:
  - [fe/README.md](E:/Sach/Sua/LMS_hohulili/fe/README.md)
  - [FRONTEND_ARCHITECTURE.md](E:/Sach/Sua/LMS_hohulili/fe/FRONTEND_ARCHITECTURE.md)
