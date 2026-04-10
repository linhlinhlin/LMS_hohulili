# Session Prompt: Student Analytics Page — Deep Redesign

## Context
Trang `/student/analytics` hiện có data thực từ API nhưng UX/UI chưa hoàn chỉnh:
- Backend API `/api/v3/student/analytics` đã trả đủ data (study time, scores, quiz attempts, performance trend...)
- Frontend component hiện có nhưng thiết kế cơ bản, thiếu visualization
- Mục tiêu học tập (`learningGoals`) chưa có backend support — hiện luôn rỗng
- Performance trend chỉ hiện dạng bar đơn giản, chưa có chart thực sự

## BẮT BUỘC đọc trước:
1. **`CLAUDE.md`** — project overview, architecture
2. **`fe/UX_UI_GUIDELINES.md`** — quy tắc thiết kế
3. **Memory** — kiểm tra sessions trước

## Hiện trạng API response:
```json
{
  "totalStudyTimeHours": 7.3,
  "coursesCompleted": 2,
  "averageScore": 41.4,
  "learningStreakDays": 0,
  "activeCourses": 7,
  "totalQuizAttempts": 27,
  "totalAssignmentsSubmitted": 1,
  "certificatesEarned": 0,
  "averageCompletionPercent": 22.9,
  "performanceTrend": [
    { "date": "2026-04-04", "score": 75, "type": "quiz", "label": "Quiz" },
    { "date": "2026-04-05", "score": 37.5, "type": "quiz", "label": "Quiz" }
  ]
}
```

## Hiện trạng Frontend:
- File: `fe/src/app/features/analytics/student-analytics.component.ts` + `.html`
- Backend: `StudentAnalyticsControllerV3.java`, `StudentAnalyticsUseCase.java`, `StudentAnalyticsQueryAdapter.java`
- Đã audit UX cơ bản (session trước): rounded-lg, border, Vietnamese casing

## Việc cần làm — suy nghĩ kỹ theo SOTA:

### 1. Nghiên cứu SOTA (Coursera, Khan Academy, Duolingo, Canvas)
- Coursera: Weekly activity heatmap, course progress rings, skill radar
- Khan Academy: Mastery progress, energy points, streak
- Duolingo: XP chart, streak fire, leaderboard
- Canvas: Grade distribution, submission timeline

### 2. Redesign trang analytics
- [ ] **KPI cards**: Thiết kế lại 4 metric cards chính (study time, completed, score, streak)
- [ ] **Performance chart**: Dùng chart library (lightweight — ví dụ Chart.js, ngx-charts, hoặc pure SVG)
  - Line chart cho performance trend theo thời gian
  - Hoặc bar chart grouped by week
- [ ] **Course progress**: Visual cho từng khóa đang học (progress ring/bar)
- [ ] **Activity timeline**: Lịch sử hoạt động gần đây
- [ ] **Period selector**: 7 ngày / 30 ngày / 3 tháng / 1 năm (đã có)
- [ ] **Export**: Giữ hoặc cải tiến (hiện export JSON — nên export PDF hoặc CSV)

### 3. Cân nhắc backend
- [ ] API có cần thêm endpoint mới? (ví dụ: weekly breakdown, per-course stats)
- [ ] `performanceTrend` nên group by date (hiện nhiều entries cùng ngày)
- [ ] `learningGoals` — nên implement hay bỏ khỏi UI?
- [ ] `learningStreakDays` luôn = 0 — kiểm tra logic backend

### 4. Responsive + UX
- [ ] Mobile: Cards stack, chart responsive
- [ ] Empty states khi chưa có data
- [ ] Loading skeleton
- [ ] Theo `UX_UI_GUIDELINES.md`

## KHÔNG làm:
- Không sửa files messaging (session khác)
- Không sửa storage page (đã done)
- Không thêm features ngoài scope analytics

## Test accounts:
- Student: `nguyenvanan@sv.maritime.edu` / `Student@2026` (có data thực)
- Student: `student@maritime.edu` / `student123` (nếu tồn tại)

## Chart library recommendation:
- **Lightweight**: Dùng pure SVG (không thêm dependency) — HOẶC
- **Feature-rich**: `chart.js` + `ng2-charts` (~50KB gzipped) — phổ biến nhất
- **Angular-native**: `ngx-charts` (Swimlane) — Angular signals compatible
- Quyết định trong session dựa trên brainstorming

## Lưu ý:
- Dùng `cot-research` SKILL để nghiên cứu SOTA trước khi code
- Dùng `brainstorming` SKILL trước khi thiết kế
- Commit thường xuyên, message rõ ràng
- Dùng RTK prefix cho Bash commands
