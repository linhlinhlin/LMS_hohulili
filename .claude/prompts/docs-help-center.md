# Session Prompt: Xây dựng User Documentation — Notion-style Help Center

## Mục tiêu
Xây dựng hệ thống docs cho end users (sinh viên, giảng viên, quản trị viên) tại `holilihu.online/docs/vi/`.

## Công nghệ đề xuất
- **Docusaurus 3** với `baseUrl: '/docs/'` + i18n (`vi` default, `en` later)
- Deploy: Static build output → nginx serve tại `/docs/` path trên cùng frontend container
- Path-based (không subdomain) — SEO tốt hơn, deploy đơn giản hơn

## URL Structure
```
holilihu.online/docs/vi/              → Trang chủ docs
holilihu.online/docs/vi/student/      → Sinh viên
holilihu.online/docs/vi/teacher/      → Giảng viên
holilihu.online/docs/vi/admin/        → Quản trị viên
holilihu.online/docs/en/              → English (phase sau)
```

## Cấu trúc nội dung (theo SOTA — Notion/Stripe/Canvas)

### Dành cho Sinh viên
- Bắt đầu sử dụng (onboarding)
- Đăng ký khóa học
- Học trực tuyến (video, bài đọc, quiz)
- Học ngoại tuyến (PWA)
  - Tải khóa học về thiết bị
  - Quản lý bộ nhớ (giải thích dung lượng, bộ nhớ đệm, đồng bộ)
  - Xử lý sự cố offline
- Làm bài tập & kiểm tra
- Thanh toán & hoàn tiền
- Tin nhắn & thông báo
- Câu hỏi thường gặp (FAQ)

### Dành cho Giảng viên
- Tạo và quản lý khóa học
- Soạn nội dung bài học (EditorJS, video, quiz)
- Quản lý học viên & lớp học
- Chấm điểm & đánh giá
- Xem phân tích học tập
- FAQ

### Dành cho Quản trị viên
- Dashboard & phân tích
- Quản lý người dùng (ADMIN vs ORG_ADMIN)
- Duyệt & quản lý khóa học
- Cài đặt hệ thống

## Phong cách viết
- Notion-style: clean, collapsible sections, searchable
- Ngôn ngữ đơn giản, không kỹ thuật
- Screenshots minh họa (dùng agent-browser chụp)
- Mỗi trang: tiêu đề rõ → bước 1-2-3 → screenshot → lưu ý
- FAQ dạng accordion

## Lưu ý
- KHÔNG viết docs cho developer (đã có CLAUDE.md, Swagger)
- Focus 100% end user experience
- Tham khảo: notion.so/help, support.stripe.com, community.canvaslms.com
