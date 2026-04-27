# Bảo vệ TTTN VIMARU — 2026-04-28

> Bộ tài liệu nhóm 4 sinh viên đọc + hiểu + biện luận trước hội đồng.
>
> **KHÔNG phải báo cáo nộp** — đây là kiến thức để tự tin trả lời câu hỏi.

---

## Đề tài

**Xây dựng hệ thống học trực tuyến đặc thù cho học viên ngành hàng hải**

- **GVHD:** ThS. Phạm Trung Minh (`minhpt@vimaru.edu.vn`)
- **Cơ sở thực tập:** Công ty CP giải pháp phần mềm trực tuyến Việt Nam (Vinhomes Marina, Lê Chân, Hải Phòng)
- **Thời gian thực tập:** 23/02/2026 → 17/04/2026 (8 tuần)
- **Buổi bảo vệ:** thứ 3 ngày 28/04/2026 — Khoa CNTT — VIMARU
- **Domain demo:** `https://holilihu.online` (paused tiết kiệm credit, có runbook resume)
- **Repo:** `LMS_hohulili` (Github `@meiiie`)

---

## Nhóm

| # | Sinh viên | Lớp | Phụ trách |
|---|---|---|---|
| 1 | **Phạm Thị Minh Hồng** | CNT63ĐH | Phân hệ quản trị hệ thống |
| 2 | **Nguyễn Thùy Linh** | CNT63ĐH | Phân hệ tạo khóa học |
| 3 | **Nghiêm Thị Mỹ Linh** | KPM63ĐH | Phân hệ đánh giá / trắc nghiệm |
| 4 | **Nguyễn Mạnh Hùng** | CNT63ĐH | Phân hệ tối ưu offline / PWA (TRỌNG TÂM) |

---

## Cấu trúc tài liệu

| File | Mục đích | Đối tượng đọc | Thời gian đọc |
|---|---|---|---|
| **README.md** (file này) | Index + cách dùng | Cả nhóm | 5 phút |
| **CHEAT_SHEET.md** | 1 trang in ra cầm vào phòng | Cả nhóm | 10 phút |
| **DEFENSE_QA_BANK.md** | 80+ câu hỏi giám khảo + answer + evidence | Cả nhóm | **đọc kỹ 2-3 lần** |
| **SLIDE_OUTLINE.md** | 10-12 slide trình bày | Người làm slide | 30 phút |
| **01-phan-he-quan-tri-hong.md** | Defense brief phân hệ 1 (Hồng) | Hồng đọc kỹ, 3 SV còn lại đọc lướt | 30 phút Hồng / 15 phút khác |
| **02-phan-he-tao-khoa-hoc-thuy-linh.md** | Defense brief phân hệ 2 (Thùy Linh) | Tương tự | Tương tự |
| **03-phan-he-danh-gia-my-linh.md** | Defense brief phân hệ 3 (Mỹ Linh) | Tương tự | Tương tự |
| **04-phan-he-offline-pwa-hung.md** | Defense brief phân hệ 4 (Hùng) — TRỌNG TÂM | Hùng đọc rất kỹ, cả nhóm đọc kỹ | 60 phút Hùng / 30 phút khác |

**Tổng thời gian đọc cho mỗi SV:** ~3-4h.

---

## Workflow đề xuất (3 ngày trước bảo vệ)

### Ngày 1 (26/04 — chủ nhật)
- Cả nhóm đọc README.md + CHEAT_SHEET.md
- Mỗi SV đọc kỹ brief phân hệ của mình
- Đọc lướt 3 brief phân hệ còn lại
- Note câu nào chưa rõ → hỏi nhau

### Ngày 2 (27/04 — thứ 2)
- Đọc DEFENSE_QA_BANK.md 2 lần
- Mock interview với nhau:
  - SV1 hỏi câu trong Q&A bank, SV2 trả lời (không nhìn answer)
  - Đổi vai
  - Cover ít nhất 30 câu
- Mở SLIDE_OUTLINE.md → thiết kế slide thật (PowerPoint/Google Slides/Keynote)
- Test login 4 demo account
- Test stack chạy local (`docker ps` + `curl`)

### Ngày 3 (28/04 — thứ 3 — buổi bảo vệ)
- Sáng: đọc lại CHEAT_SHEET.md 1 lần
- Mang laptop + sạc + dây mạng + slide (USB + cloud backup) + handout in
- 30 phút trước phòng bảo vệ: stack chạy, login OK, slide mở sẵn

---

## Một số nguyên tắc trả lời

1. **Lắng nghe đến hết câu hỏi** trước khi trả lời. Không cắt ngang.
2. **Trả lời ngắn 2-3 câu** trước. Chờ giám khảo gật/lắc đầu hoặc đào sâu.
3. **Có evidence** — mở file:line code minh hoạ nếu giám khảo yêu cầu.
4. **Không biết → nói không biết.** "Em chưa nghiên cứu sâu phần đó, theo design hiện tại thì..." → tốt hơn fabricate.
5. **Câu bẫy** (em copy không, em mock không): trả lời thẳng, có evidence cụ thể.
6. **Tự tin** — code đã có 929 test pass, 85% coverage, deployed production. Không phải "demo phòng học".
7. **Chậm + rõ** — đặc biệt với GVHD và giám khảo lớn tuổi.

---

## Lưu ý đặc thù VIMARU

- **GVHD ThS. Phạm Trung Minh** — quen thuộc dự án (đã hướng dẫn 8 tuần). Câu hỏi sẽ deep technical.
- **Khoa CNTT giám khảo lớn tuổi** có thể hỏi business logic > tech buzzword. Tập trung giải thích **VÌ SAO** chứ không phải "em dùng X".
- **Đề tài hàng hải** — luôn nhấn mạnh **đặc thù maritime** (offline, STCW, multi-tenant org). Đó là điểm khác biệt với đề tài LMS general.
- **Tiếng Việt CÓ DẤU** mọi communication.

---

## Backup nếu có sự cố

| Tình huống | Backup |
|---|---|
| Stack local fail demo | Screenshot + video record sẵn (lưu USB + cloud) |
| Slide bị hỏng | PDF backup + 4 bản handout in (1 cho mỗi giám khảo) |
| Câu hỏi quá deep | "Em xin ghi nhận và nghiên cứu thêm sau buổi bảo vệ" |
| Mạng phòng họp lỗi | Stack chạy hoàn toàn local — không cần Internet |
| Code minh hoạ quên path | Mở `MEMORY.md` hoặc `CLAUDE.md` đã có map file |

---

## Liên kết tham khảo nội bộ

- **Stack overview:** `CLAUDE.md` (root) + `AGENTS.md`
- **Backend deep:** `backend/README.md`
- **Frontend deep:** `fe/FRONTEND_ARCHITECTURE.md`
- **PWA research:** `docs/PWA_OFFLINE_RESEARCH.md` (≈40 trang research SOTA)
- **PWA roadmap:** `docs/architecture/STREAMING_PWA_ROADMAP.md`
- **CI/CD:** `.github/workflows/{ci,deploy}.yml`
- **Conventions:** `CONTRIBUTING.md` + `.github/pull_request_template.md`
- **Security:** `SECURITY.md`
- **Changelog:** `CHANGELOG.md`

---

Chúc cả nhóm bảo vệ thành công.

**Còn 2 ngày — đọc kỹ + mock interview với nhau là đủ.**
