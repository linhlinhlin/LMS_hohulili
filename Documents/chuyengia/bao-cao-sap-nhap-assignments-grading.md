# Báo cáo Đề xuất Sáp nhập Module Assignments & Grading

## 1. Tổng quan Hiện trạng

### 1.1 Module Assignments (`/teacher/assignments`)
- **Chức năng chính**: Quản lý bài tập (CRUD)
- **Components**:
  - `assignment-management.component.ts` - Danh sách bài tập
  - `assignment-creation.component.ts` - Tạo bài tập mới
  - `assignment-editor.component.ts` - Chỉnh sửa bài tập
  - `assignment-submissions.component.ts` - Xem bài nộp của học viên

### 1.2 Module Grading (`/teacher/grading`)
- **Chức năng chính**: Chấm điểm bài nộp
- **Components**:
  - `advanced-grading-system.component.ts` - Dashboard chấm điểm
  - `speed-grader-layout.component.ts` - SpeedGrader (split-view)
  - `rubric-manager/creator/editor.component.ts` - Quản lý Rubric

### 1.3 Vấn đề hiện tại
1. **Phân tách không tự nhiên**: Giáo viên phải chuyển đổi giữa 2 module để hoàn thành workflow
2. **Duplicate navigation**: Cùng một bài tập xuất hiện ở cả 2 nơi
3. **Context switching**: Mất ngữ cảnh khi chuyển từ xem bài nộp sang chấm điểm
4. **UX không liền mạch**: Không theo flow tự nhiên của giáo viên

---

## 2. Phân tích Mô hình Coursera

### 2.1 Coursera Instructor Dashboard Flow
```
Course → Assignments → [Assignment Detail]
                            ↓
                    ┌───────┴───────┐
                    │               │
              [Settings]    [Submissions]
                                │
                    ┌───────────┼───────────┐
                    │           │           │
              [Overview]  [Grade All]  [Individual]
                                │
                          [SpeedGrader]
```

### 2.2 Đặc điểm chính của Coursera
1. **Single Entry Point**: Tất cả bắt đầu từ Assignment
2. **Contextual Actions**: Chấm điểm nằm trong context của Assignment
3. **Progressive Disclosure**: Hiển thị thông tin theo mức độ chi tiết
4. **Inline Grading**: Có thể chấm điểm ngay trong danh sách submissions
5. **Batch Operations**: Hỗ trợ chấm điểm hàng loạt

---

## 3. Đề xuất Kiến trúc Mới

### 3.1 Unified Assignment Hub
```
/teacher/assignments
    │
    ├── / (list) ─────────────────────────────────────────┐
    │   • Danh sách assignments với grading stats         │
    │   • Quick actions: Edit, View Submissions, Grade    │
    │   • Filter: All, Needs Grading, Graded              │
    │                                                     │
    ├── /create ──────────────────────────────────────────┤
    │   • Tạo assignment mới                              │
    │   • Attach rubric (optional)                        │
    │                                                     │
    ├── /:id ─────────────────────────────────────────────┤
    │   │                                                 │
    │   ├── /overview ────────────────────────────────────┤
    │   │   • Assignment details                          │
    │   │   • Grading statistics                          │
    │   │   • Quick grade summary                         │
    │   │                                                 │
    │   ├── /edit ────────────────────────────────────────┤
    │   │   • Edit assignment settings                    │
    │   │   • Manage rubric                               │
    │   │                                                 │
    │   ├── /submissions ─────────────────────────────────┤
    │   │   • List all submissions                        │
    │   │   • Inline quick grade                          │
    │   │   • Bulk actions                                │
    │   │                                                 │
    │   └── /grade/:submissionId ─────────────────────────┤
    │       • SpeedGrader view                            │
    │       • Full grading interface                      │
    │                                                     │
    └── /rubrics ─────────────────────────────────────────┘
        • Rubric library (shared across assignments)
```

### 3.2 Component Structure Mới
```
fe/src/app/features/teacher/assignments/
├── assignment-hub.component.ts          # Main container với tabs
├── assignment-list.component.ts         # Danh sách với grading stats
├── assignment-detail/
│   ├── assignment-overview.component.ts # Overview + stats
│   ├── assignment-settings.component.ts # Edit settings
│   ├── submission-list.component.ts     # Submissions với inline grade
│   └── submission-grader.component.ts   # SpeedGrader embedded
├── assignment-create.component.ts
├── rubric/
│   ├── rubric-library.component.ts
│   ├── rubric-editor.component.ts
│   └── rubric-selector.component.ts
├── services/
│   └── unified-assignment.service.ts    # Merged state service
└── utils/
    └── (existing utils)
```

---

## 4. UI/UX Design Proposal

### 4.1 Assignment List với Grading Stats
```
┌─────────────────────────────────────────────────────────────────┐
│ Quản lý Bài tập                              [+ Tạo bài tập]    │
├─────────────────────────────────────────────────────────────────┤
│ [Tất cả] [Cần chấm (5)] [Đã chấm] [Nháp]                       │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📝 Bài tập An toàn Hàng hải - Chương 1                      │ │
│ │ Khóa học: An toàn Hàng hải Cơ bản                           │ │
│ │                                                              │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │ │
│ │ │ 25/30    │ │ 20       │ │ 5        │ │ 85%      │        │ │
│ │ │ Đã nộp   │ │ Đã chấm  │ │ Chờ chấm │ │ TB điểm  │        │ │
│ │ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │ │
│ │                                                              │ │
│ │ Hạn nộp: 25/11/2025        [Xem chi tiết] [Chấm điểm →]    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📝 Thực hành Điều khiển tàu                    🔴 5 chờ chấm│ │
│ │ ...                                                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Assignment Detail với Tabs
```
┌─────────────────────────────────────────────────────────────────┐
│ ← Quay lại    Bài tập An toàn Hàng hải - Chương 1              │
├─────────────────────────────────────────────────────────────────┤
│ [Tổng quan] [Bài nộp (25)] [Cài đặt] [Rubric]                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    TỔNG QUAN                             │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐        │   │
│  │  │  25    │  │  20    │  │   5    │  │  85%   │        │   │
│  │  │ Đã nộp │  │Đã chấm │  │Chờ chấm│  │TB điểm │        │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘        │   │
│  │                                                          │   │
│  │  Phân bố điểm:                                          │   │
│  │  ████████████████░░░░ 90-100: 8 học viên                │   │
│  │  ██████████░░░░░░░░░░ 80-89:  5 học viên                │   │
│  │  ████████░░░░░░░░░░░░ 70-79:  4 học viên                │   │
│  │  ████░░░░░░░░░░░░░░░░ 60-69:  2 học viên                │   │
│  │  ██░░░░░░░░░░░░░░░░░░ <60:    1 học viên                │   │
│  │                                                          │   │
│  │  [Chấm tất cả bài chờ →]                                │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Submissions Tab với Inline Grading
```
┌─────────────────────────────────────────────────────────────────┐
│ [Tổng quan] [Bài nộp (25)] [Cài đặt] [Rubric]                  │
├─────────────────────────────────────────────────────────────────┤
│ Tìm kiếm: [________________]  Lọc: [Tất cả ▼]  [Chấm hàng loạt]│
├─────────────────────────────────────────────────────────────────┤
│ ☐ │ Học viên          │ Nộp lúc      │ Trạng thái │ Điểm │     │
├───┼───────────────────┼──────────────┼────────────┼──────┼─────┤
│ ☐ │ 👤 Nguyễn Văn A   │ 24/11 10:30  │ ✅ Đã chấm │ 85   │ [→] │
│ ☐ │ 👤 Trần Thị B     │ 26/11 08:00  │ 🔴 Muộn    │ [__] │ [→] │
│ ☐ │ 👤 Lê Văn C       │ 23/11 14:00  │ ⏳ Chờ chấm│ [__] │ [→] │
│ ☐ │ 👤 Phạm Thị D     │ 25/11 16:30  │ ⏳ Chờ chấm│ [__] │ [→] │
└─────────────────────────────────────────────────────────────────┘
                                                    ↑
                                            Click để mở SpeedGrader
```

---

## 5. Lợi ích của Việc Sáp nhập

### 5.1 Cho Giáo viên
1. **Workflow liền mạch**: Không cần chuyển đổi giữa các module
2. **Context rõ ràng**: Luôn biết đang làm việc với assignment nào
3. **Tiết kiệm thời gian**: Ít click hơn để hoàn thành công việc
4. **Tổng quan tốt hơn**: Thấy grading stats ngay trong assignment list

### 5.2 Cho Hệ thống
1. **Code đơn giản hơn**: Giảm duplicate logic
2. **State management tập trung**: Một service quản lý cả assignment và grading
3. **Routing đơn giản**: Cấu trúc URL logic và dễ hiểu
4. **Maintainability**: Dễ bảo trì và mở rộng

### 5.3 Cho UX
1. **Consistent**: Trải nghiệm nhất quán
2. **Discoverable**: Dễ tìm thấy chức năng
3. **Efficient**: Tối ưu số bước thực hiện
4. **Familiar**: Giống với các LMS phổ biến (Coursera, Canvas)

---

## 6. Kế hoạch Triển khai

### Phase 1: Chuẩn bị (1-2 ngày)
- [ ] Tạo unified service
- [ ] Migrate state từ 2 services hiện tại
- [ ] Setup routing mới

### Phase 2: UI Components (2-3 ngày)
- [ ] Tạo Assignment Hub component
- [ ] Tạo Assignment Detail với tabs
- [ ] Tích hợp SpeedGrader vào assignment context
- [ ] Cập nhật Submission List với inline grading

### Phase 3: Migration (1-2 ngày)
- [ ] Redirect routes cũ sang routes mới
- [ ] Update navigation/sidebar
- [ ] Test toàn bộ flow

### Phase 4: Cleanup (1 ngày)
- [ ] Remove deprecated components
- [ ] Update documentation
- [ ] Final testing

---

## 7. Câu hỏi cho Chuyên gia

1. **Về UX Flow**: Mô hình tabs (Overview/Submissions/Settings/Rubric) có phù hợp với workflow của giáo viên hàng hải không? Có cần thêm/bớt tab nào?

2. **Về Inline Grading**: Có nên cho phép chấm điểm nhanh ngay trong danh sách submissions (chỉ nhập điểm) hay bắt buộc phải vào SpeedGrader?

3. **Về Rubric**: Rubric nên được quản lý ở cấp độ nào?
   - A) Global (dùng chung cho nhiều assignments)
   - B) Per-assignment (mỗi assignment có rubric riêng)
   - C) Cả hai (có library + có thể customize per assignment)

4. **Về Batch Grading**: Có cần tính năng chấm điểm hàng loạt (chọn nhiều submissions, áp dụng cùng điểm/feedback)?

5. **Về Mobile**: Giáo viên có thường xuyên chấm điểm trên mobile không? Cần ưu tiên responsive design đến mức nào?

6. **Về Notifications**: Khi sáp nhập, notification về "bài chờ chấm" nên hiển thị ở đâu? Badge trên menu Assignments hay notification riêng?

---

## 8. Tài liệu Tham khảo

- Coursera Instructor Dashboard: https://www.coursera.org/teach
- Canvas LMS SpeedGrader: https://community.canvaslms.com/t5/Instructor-Guide/How-do-I-use-SpeedGrader/ta-p/757
- Google Classroom Grading: https://support.google.com/edu/classroom/answer/9095575

---

*Báo cáo được tạo: 26/11/2025*
*Người tạo: Kiro AI Assistant*
*Phiên bản: 1.0*
