# Teacher Domain Analysis & Refactoring Plan

## 1. Khảo sát hệ thống hiện tại

### Kiến trúc tổng quan
- **Mô hình hiện tại**: Layered Architecture (Controller -> Service -> Repository -> Entity).
- **Package Structure**: `com.example.lms` (phẳng, không chia theo domain module).
- **Tình trạng**:
  - Logic nghiệp vụ bị phân tán giữa Controller và Service.
  - Entity còn sơ sài (Anemic Domain Model), chứa logic hiển thị (JSON strings) thay vì quan hệ thực sự.
  - Thiếu các khái niệm DDD như Aggregate Root, Value Object, Domain Event.

### Các thành phần liên quan đến Teacher
Teacher trong hệ thống hiện tại không phải là một Entity riêng biệt mà là `User` với role `TEACHER`. Các luồng nghiệp vụ chính của Teacher xoay quanh:
1.  **Quản lý Khóa học (Course Management)**: Tạo, sửa, duyệt khóa học.
2.  **Quản lý Nội dung (Content Management)**: Lesson, Section, Attachment.
3.  **Đánh giá & Kiểm tra (Assessment)**: Quiz, Question, Assignment.
4.  **Theo dõi tiến độ (Progress Tracking)**: Xem kết quả học tập của học viên.

---

## 2. Tài liệu chi tiết Domain Teacher

### Entities & Aggregates
Hiện tại chưa có ranh giới Aggregate rõ ràng. Các entity chính bao gồm:

1.  **Course** (Root?)
    - Quan hệ: `teacher` (User), `sections` (OneToMany), `enrolledStudents` (ManyToMany).
    - Trạng thái: `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`.
    - *Vấn đề*: Logic duyệt bài, logic enroll đang nằm rải rác ở Service.

2.  **Quiz**
    - Quan hệ: `lesson` (OneToOne), `quizQuestions` (OneToMany - đang migrate từ JSON), `attempts` (OneToMany).
    - Thuộc tính: `questionIds` (JSON string - Legacy), `timeLimit`, `passingScore`.
    - *Vấn đề*: Lưu trữ `questionIds` dưới dạng JSON string là bad practice, khó query và đảm bảo integrity. Logic trộn câu hỏi (shuffle) đang thực hiện thủ công trong Service.

3.  **Question**
    - Quan hệ: `course` (ManyToOne), `createdBy` (User).
    - Thuộc tính: `content`, `options` (List<QuestionOption>), `correctOption`.
    - *Vấn đề*: `correctOption` lưu string ("A", "B"...) thay vì ID của option hoặc index, dễ gây lỗi nếu text option thay đổi.

4.  **QuizAttempt**
    - Quan hệ: `student` (User), `quiz` (ManyToOne), `items` (OneToMany - chi tiết từng câu trả lời).
    - *Vấn đề*: Logic chấm điểm đang nằm trong `QuizService.submitAttempt`.

### API hiện có (Teacher sử dụng)

| Method | Endpoint | Mô tả | Vấn đề hiện tại |
|--------|----------|-------|-----------------|
| POST | `/api/v1/quizzes/lessons/{lessonId}` | Tạo quiz cho lesson | Payload quá lớn, validation lỏng lẻo. |
| POST | `/api/v1/questions` | Tạo câu hỏi | Trộn lẫn logic tạo option. |
| GET | `/api/v1/questions/course/{courseId}` | Lấy câu hỏi theo khóa học | Filter logic nằm trong Service/Repo. |
| GET | `/api/v1/quizzes/lessons/{lessonId}/statistics` | Thống kê quiz | Logic tính toán thống kê nằm trong Service (nên tách ra Domain Service hoặc Read Model). |
| POST | `/api/v1/quizzes/lessons/{lessonId}/questions/add` | Thêm câu hỏi vào quiz | Đang dùng cả JSON string và bảng `quiz_questions`. |

### Điểm yếu & Nợ kỹ thuật
1.  **Mixed Concerns trong Quiz Entity**: `Quiz` vừa chứa cấu hình (time, score) vừa chứa danh sách câu hỏi dạng JSON (legacy) và Relation (new). Cần loại bỏ hoàn toàn JSON `questionIds`.
2.  **Service "Thần thánh"**: `QuizService` quá lớn (600+ dòng), xử lý từ tạo quiz, chấm điểm, thống kê, đến parse JSON. Vi phạm Single Responsibility Principle.
3.  **Thiếu Domain Validation**: Validation chủ yếu dựa vào Annotation `@Valid` hoặc check `null` trong Service. Logic nghiệp vụ (ví dụ: "Không được sửa quiz khi đã có người làm") chưa được đóng gói trong Domain.
4.  **Hardcoding**: Các trạng thái, role, thông báo lỗi đang hardcode chuỗi string.

---

## 3. Kế hoạch Refactor (Hướng tới DDD/Clean Architecture)

### Giai đoạn 1: Chuẩn hóa Domain Model (Core)
Mục tiêu: Tạo ra lớp Domain thuần khiết, không phụ thuộc Framework.

1.  **Tách Package Structure**:
    ```
    com.example.lms
      ├── domain
      │   ├── model (Entities, Value Objects)
      │   │   ├── course
      │   │   ├── assessment (Quiz, Question)
      │   │   └── user (Teacher, Student)
      │   ├── repository (Interfaces only)
      │   └── service (Domain Services)
      ├── application (Use Cases, DTOs, Mappers)
      ├── infrastructure (Persistence, External APIs)
      └── interfaces (Controllers)
    ```

2.  **Refactor Quiz Aggregate**:
    - `Quiz` là Aggregate Root.
    - `QuizQuestion` là Entity con hoặc Value Object (nếu chỉ là link).
    - Loại bỏ trường `questionIds` (JSON).
    - Chuyển logic `shuffle`, `calculateScore` vào trong `Quiz` entity hoặc `GradingService` (Domain Service).

3.  **Refactor Question Aggregate**:
    - `Question` là Aggregate Root (vì câu hỏi có thể tồn tại độc lập trong Ngân hàng câu hỏi).
    - `QuestionOption` nên có ID riêng và `correctOption` nên tham chiếu tới ID này.

### Giai đoạn 2: Tách Application Layer
Mục tiêu: Giảm tải cho Controller và Service hiện tại.

1.  **Tạo Use Case Classes**:
    - Thay vì `QuizService` khổng lồ, tách thành:
      - `CreateQuizUseCase`
      - `SubmitQuizAttemptUseCase`
      - `GetQuizStatisticsUseCase`
    - Mỗi Use Case chỉ làm một việc cụ thể.

2.  **DTO & Mapper**:
    - Dùng MapStruct hoặc thủ công để tách biệt hoàn toàn Entity và DTO. Không để Entity lọt ra Controller.

### Giai đoạn 3: Infrastructure & Optimization
1.  **Repository Implementation**: Implement các interface từ Domain layer bằng Spring Data JPA.
2.  **Performance**: Sử dụng `@EntityGraph` để fetch dữ liệu liên quan (Quiz + Questions) hiệu quả hơn, tránh N+1 query.
3.  **Caching**: Cache ngân hàng câu hỏi hoặc cấu hình Quiz ít thay đổi.

### Đề xuất cụ thể cho Teacher Flow
1.  **API Tạo Quiz**:
    - Input: `CreateQuizCommand` (DTO).
    - Logic: Validate quyền Teacher -> Kiểm tra Lesson thuộc Course của Teacher -> Tạo Quiz Aggregate -> Save.
2.  **API Ngân hàng câu hỏi**:
    - Cần tách riêng `QuestionBank` context. Câu hỏi có thể được tag, filter theo độ khó, môn học.
    - API `GET /questions` nên hỗ trợ filter mạnh mẽ hơn (Specification pattern).

---

## 4. Kết luận
Hệ thống hiện tại hoạt động được nhưng khó bảo trì và mở rộng. Việc refactor theo hướng DDD sẽ giúp logic Teacher rõ ràng hơn, đặc biệt là phần Quản lý thi cử (Assessment) vốn phức tạp. Nên bắt đầu từ việc **làm sạch Entity Quiz** và **tách nhỏ QuizService** trước.
