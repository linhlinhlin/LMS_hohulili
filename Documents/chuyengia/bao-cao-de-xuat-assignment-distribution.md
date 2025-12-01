# Báo cáo Đề xuất: Hệ thống Giao Bài tập cho Học viên

## 1. Tổng quan Hiện trạng

### 1.1 Những gì đã có
Chúng tôi đã hoàn thành các module sau:

| Module | Chức năng | Trạng thái |
|--------|-----------|------------|
| **Assignment Hub** | Tạo, quản lý, chỉnh sửa bài tập | ✅ Hoàn thành |
| **Grading System** | Chấm điểm, SpeedGrader, Rubric | ✅ Hoàn thành |
| **Student Management** | Xem danh sách học viên theo khóa học | ✅ Hoàn thành |
| **Course Management** | Quản lý khóa học, sections | ✅ Hoàn thành |

### 1.2 Vấn đề hiện tại - GAP Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW HIỆN TẠI (THIẾU)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Tạo bài tập] ──────────────────────────────────────────────── │
│       │                                                         │
│       ▼                                                         │
│  [Bài tập được tạo] ─────────────────────────────────────────── │
│       │                                                         │
│       ▼                                                         │
│  ❓ THIẾU: Làm sao học viên biết có bài tập mới?               │
│  ❓ THIẾU: Bài tập được giao cho ai? Cả lớp hay từng người?    │
│  ❓ THIẾU: Học viên xem bài tập ở đâu?                         │
│  ❓ THIẾU: Deadline và reminder hoạt động như thế nào?         │
│       │                                                         │
│       ▼                                                         │
│  [Học viên nộp bài] ─────────────────────────────────────────── │
│       │                                                         │
│       ▼                                                         │
│  [Giáo viên chấm điểm] ✅ ĐÃ CÓ                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Trang Student Management hiện tại
URL: `/teacher/students`

**Chức năng hiện có:**
- Xem danh sách học viên theo khóa học
- Lọc theo trạng thái (Đang học, Không hoạt động, Tạm khóa)
- Xem tiến độ học tập (%)
- Xem điểm trung bình
- Xem chi tiết từng học viên
- Gửi tin nhắn (placeholder)

**Chức năng CHƯA CÓ:**
- ❌ Giao bài tập cho học viên
- ❌ Xem bài tập đã giao cho từng học viên
- ❌ Theo dõi tiến độ làm bài tập
- ❌ Nhắc nhở học viên về deadline

---

## 2. Phân tích Các Mô hình Giao Bài tập

### 2.1 Mô hình A: Course-Based Assignment (Coursera/Canvas)
```
Assignment ──belongs to──▶ Course
                              │
                              ▼
                    All enrolled students
                    automatically see it
```

**Đặc điểm:**
- Bài tập gắn với khóa học
- Tất cả học viên enrolled trong khóa học tự động thấy bài tập
- Không cần "giao" riêng cho từng người
- Phù hợp với: Khóa học online, MOOC

### 2.2 Mô hình B: Individual Assignment (Google Classroom)
```
Assignment ──assigned to──▶ Specific Students
                              │
                              ▼
                    Only selected students
                    see the assignment
```

**Đặc điểm:**
- Giáo viên chọn học viên cụ thể để giao bài
- Có thể giao bài khác nhau cho từng nhóm
- Phù hợp với: Lớp học truyền thống, bài tập cá nhân hóa

### 2.3 Mô hình C: Hybrid (Canvas Advanced)
```
Assignment ──default──▶ All students in course
              │
              └──override──▶ Specific students/groups
                              (different deadline, different content)
```

**Đặc điểm:**
- Mặc định giao cho cả lớp
- Có thể tùy chỉnh cho từng học viên/nhóm
- Phù hợp với: Đào tạo chuyên nghiệp, có học viên đặc biệt

---

## 3. Đề xuất cho LMS Hàng Hải

### 3.1 Đề xuất: Mô hình Hybrid Maritime

Dựa trên đặc thù đào tạo hàng hải (STCW), chúng tôi đề xuất mô hình kết hợp:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ASSIGNMENT DISTRIBUTION FLOW                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐                                                │
│  │ Tạo bài tập │                                                │
│  └──────┬──────┘                                                │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              CHỌN PHƯƠNG THỨC GIAO BÀI                   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  ○ Giao cho TẤT CẢ học viên trong khóa học              │   │
│  │    └─ Tự động giao khi Publish                          │   │
│  │                                                          │   │
│  │  ○ Giao cho NHÓM học viên                               │   │
│  │    └─ Chọn nhóm: [Nhóm A] [Nhóm B] [Ca sáng]...        │   │
│  │                                                          │   │
│  │  ○ Giao cho HỌC VIÊN cụ thể                             │   │
│  │    └─ Chọn từng người: ☑ Nguyễn A ☑ Trần B...          │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              TÙY CHỈNH DEADLINE (Optional)               │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  Deadline mặc định: [25/11/2025 23:59]                  │   │
│  │                                                          │   │
│  │  ☐ Cho phép deadline khác cho từng nhóm/cá nhân         │   │
│  │    └─ Nhóm A: [26/11/2025]                              │   │
│  │    └─ Nguyễn Văn X (ốm): [30/11/2025]                   │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐                                                │
│  │   Publish   │ ──▶ Thông báo được gửi đến học viên           │
│  └─────────────┘                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Model Đề xuất

```typescript
// Assignment Distribution Model
interface AssignmentDistribution {
  id: string;
  assignmentId: string;
  distributionType: 'ALL' | 'GROUP' | 'INDIVIDUAL';
  
  // Nếu distributionType = 'GROUP'
  groupIds?: string[];
  
  // Nếu distributionType = 'INDIVIDUAL'
  studentIds?: string[];
  
  // Override deadline cho từng đối tượng
  deadlineOverrides?: DeadlineOverride[];
  
  // Tracking
  distributedAt: string;
  distributedBy: string;
}

interface DeadlineOverride {
  targetType: 'GROUP' | 'STUDENT';
  targetId: string;
  newDeadline: string;
  reason?: string;
}

// Student Assignment View (Học viên nhìn thấy)
interface StudentAssignment {
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseTitle: string;
  dueDate: string;
  personalDeadline?: string; // Nếu có override
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'LATE';
  grade?: number;
  maxScore: number;
}
```

### 3.3 UI Flow Đề xuất

#### A. Từ Assignment Hub (Khi tạo/edit bài tập)
```
┌─────────────────────────────────────────────────────────────────┐
│ Tạo bài tập mới                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Tiêu đề: [_________________________________]                    │
│                                                                 │
│ Khóa học: [An toàn Hàng hải Cơ bản ▼]                          │
│                                                                 │
│ Hướng dẫn: [____________________________________]              │
│            [____________________________________]              │
│                                                                 │
│ ─────────────────────────────────────────────────────────────  │
│ GIAO BÀI TẬP                                                   │
│ ─────────────────────────────────────────────────────────────  │
│                                                                 │
│ Giao cho: ● Tất cả học viên (30 người)                         │
│           ○ Chọn nhóm                                          │
│           ○ Chọn học viên cụ thể                               │
│                                                                 │
│ Hạn nộp: [25/11/2025] [23:59]                                  │
│                                                                 │
│ ☐ Cho phép nộp muộn (trừ điểm)                                 │
│                                                                 │
│                              [Lưu nháp] [Xuất bản & Giao bài]  │
└─────────────────────────────────────────────────────────────────┘
```

#### B. Từ Student Management (Giao bài cho học viên cụ thể)
```
┌─────────────────────────────────────────────────────────────────┐
│ Học viên: Nguyễn Văn A                                          │
├─────────────────────────────────────────────────────────────────┤
│ [Thông tin] [Bài tập] [Điểm số] [Hoạt động]                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ BÀI TẬP ĐÃ GIAO                                    [+ Giao mới]│
│ ─────────────────────────────────────────────────────────────  │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 📝 An toàn Hàng hải - Chương 1                              ││
│ │ Hạn nộp: 25/11/2025 │ Trạng thái: ✅ Đã nộp │ Điểm: 85/100 ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 📝 Thực hành Điều khiển tàu                                 ││
│ │ Hạn nộp: 30/11/2025 │ Trạng thái: ⏳ Chưa nộp │ Điểm: --   ││
│ │                                              [Nhắc nhở]     ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ BÀI TẬP CÓ THỂ GIAO THÊM                                       │
│ ─────────────────────────────────────────────────────────────  │
│ ☐ Bài tập bổ sung: Vẽ hải đồ                                   │
│ ☐ Bài tập phụ đạo: Ôn tập an toàn                              │
│                                                                 │
│                                                    [Giao bài]  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Các Phương án Triển khai

### Phương án A: Tích hợp vào Assignment Hub
**Mô tả:** Thêm bước "Giao bài" vào flow tạo/edit bài tập

**Ưu điểm:**
- Workflow liền mạch
- Không cần tạo module mới
- Giáo viên quen thuộc với flow hiện tại

**Nhược điểm:**
- Assignment Hub có thể phình to
- Khó giao bài cho học viên cụ thể từ trang Students

### Phương án B: Module Distribution riêng
**Mô tả:** Tạo module `/teacher/distribution` riêng biệt

**Ưu điểm:**
- Tách biệt rõ ràng
- Dễ quản lý và mở rộng
- Có thể giao nhiều bài tập cùng lúc

**Nhược điểm:**
- Thêm một bước trong workflow
- Giáo viên phải chuyển đổi giữa các module

### Phương án C: Hybrid (Đề xuất)
**Mô tả:** 
- Giao bài mặc định (cả lớp) ngay trong Assignment Hub
- Giao bài cá nhân hóa từ Student Management
- Dashboard tổng hợp ở Teacher Dashboard

**Ưu điểm:**
- Linh hoạt
- Phù hợp với nhiều use case
- Không phá vỡ flow hiện tại

**Nhược điểm:**
- Phức tạp hơn để implement
- Cần đồng bộ state giữa các module

---

## 5. Câu hỏi cho Chuyên gia

### 5.1 Về Mô hình Giao Bài
1. **Mô hình nào phù hợp nhất với đào tạo hàng hải?**
   - A) Course-based (tự động giao cho cả lớp)
   - B) Individual (chọn từng học viên)
   - C) Hybrid (cả hai)

2. **Có cần tính năng "Nhóm học viên" không?**
   - Ví dụ: Nhóm ca sáng, Nhóm ca chiều, Nhóm thực hành A...
   - Nếu có, nhóm nên được quản lý ở đâu?

### 5.2 Về Deadline & Reminder
3. **Deadline override có cần thiết không?**
   - Cho phép gia hạn cho học viên cụ thể (ốm, lý do chính đáng)
   - Nếu có, cần audit log không?

4. **Hệ thống nhắc nhở nên hoạt động như thế nào?**
   - Tự động nhắc trước deadline X ngày?
   - Giáo viên nhắc thủ công?
   - Cả hai?

### 5.3 Về UX/UI
5. **Entry point chính để giao bài nên ở đâu?**
   - A) Assignment Hub (khi tạo/edit bài tập)
   - B) Student Management (khi xem học viên)
   - C) Cả hai

6. **Học viên nên xem bài tập được giao ở đâu?**
   - A) Dashboard riêng "Bài tập của tôi"
   - B) Trong từng khóa học
   - C) Cả hai

### 5.4 Về Đặc thù Hàng Hải
7. **Có loại bài tập nào đặc thù cần xử lý riêng?**
   - Bài tập thực hành trên tàu mô phỏng?
   - Bài tập nhóm (crew)?
   - Bài tập có giám sát (proctored)?

8. **Cần tích hợp với hệ thống nào khác không?**
   - Hệ thống quản lý thuyền viên?
   - Hệ thống chứng chỉ STCW?

### 5.5 Về Kỹ thuật
9. **Notification nên implement như thế nào?**
   - In-app notification?
   - Email?
   - SMS (cho deadline quan trọng)?

10. **Cần offline support không?**
    - Học viên trên tàu có thể không có internet ổn định
    - Cần download bài tập offline?

---

## 6. Đề xuất Roadmap

### Phase 1: MVP (1-2 tuần)
- [ ] Thêm "Distribution Type" vào Assignment model
- [ ] UI chọn "Giao cho ai" khi tạo bài tập
- [ ] API endpoint cho student assignments
- [ ] Student Dashboard hiển thị bài tập được giao

### Phase 2: Enhanced (1-2 tuần)
- [ ] Deadline override cho từng học viên
- [ ] Reminder system (in-app notification)
- [ ] Giao bài từ Student Management page

### Phase 3: Advanced (2-3 tuần)
- [ ] Nhóm học viên (Student Groups)
- [ ] Batch assignment (giao nhiều bài cùng lúc)
- [ ] Email notifications
- [ ] Analytics & Reports

---

## 7. Tài liệu Tham khảo

- Canvas LMS Assignment Groups: https://community.canvaslms.com/t5/Instructor-Guide/How-do-I-assign-an-assignment-to-a-course-group/ta-p/633
- Google Classroom Assignment: https://support.google.com/edu/classroom/answer/9095575
- Moodle Assignment Settings: https://docs.moodle.org/en/Assignment_settings

---

*Báo cáo được tạo: 26/11/2025*
*Người tạo: Kiro AI Assistant*
*Phiên bản: 1.0*

**Xin chuyên gia tư vấn hướng tiếp cận tốt nhất để chúng tôi có thể triển khai một cách có hệ thống và chuyên nghiệp.** 🚢
