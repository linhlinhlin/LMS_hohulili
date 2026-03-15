# Maritime LMS Frontend

Frontend Angular cho hệ thống Maritime LMS.

## Tài liệu này dùng khi nào

Đọc file này nếu bạn cần:

- chạy frontend local nhanh
- hiểu sơ bộ cấu trúc frontend
- biết tài liệu frontend chi tiết nằm ở đâu

Nếu cần tài liệu kiến trúc sâu hơn, đọc:

- [FRONTEND_ARCHITECTURE.md](E:/Sach/Sua/LMS_hohulili/fe/FRONTEND_ARCHITECTURE.md)
- [docs/README.md](E:/Sach/Sua/LMS_hohulili/docs/README.md)

## Tech stack

- Angular 20.3
- TypeScript 5.9
- Sass
- RxJS
- Dexie.js
- Shaka Player

## Khởi động nhanh

```bash
npm install
npm start
```

Build production:

```bash
npm run build
```

## Cấu trúc chính

```text
fe/src/app/
├── api/        # API clients, endpoints, types
├── core/       # auth, guards, global services, offline
├── features/   # admin, teacher, student, learning, payment...
├── shared/     # reusable components, pipes, services
└── state/      # global and feature state
```

## Route nhóm chính

### Student

- `/student/dashboard`
- `/student/courses/library`
- `/student/learn/...`

### Teacher

- `/teacher/dashboard`
- `/teacher/courses`
- `/teacher/revenue`

### Admin

- `/admin/dashboard`
- `/admin/users`
- `/admin/courses`

## Tài liệu nên đọc tiếp

- [FRONTEND_ARCHITECTURE.md](E:/Sach/Sua/LMS_hohulili/fe/FRONTEND_ARCHITECTURE.md)
- [docs/reference/RUNTIME_CONVENTIONS.md](E:/Sach/Sua/LMS_hohulili/docs/reference/RUNTIME_CONVENTIONS.md)
- [docs/runbooks/LEARNER_FLOW_RUNBOOK.md](E:/Sach/Sua/LMS_hohulili/docs/runbooks/LEARNER_FLOW_RUNBOOK.md)
- [docs/runbooks/PWA_OFFLINE_RUNBOOK.md](E:/Sach/Sua/LMS_hohulili/docs/runbooks/PWA_OFFLINE_RUNBOOK.md)
