# Requirements Document - Teacher Domain

## Introduction

Tài liệu này định nghĩa các yêu cầu chi tiết cho **Teacher Domain** trong hệ thống LMS chuyên sâu về lĩnh vực hàng hải. Teacher Domain bao gồm toàn bộ nghiệp vụ, API, và dữ liệu mà giảng viên (teacher) sẽ sử dụng và tương tác, tuân thủ nghiêm ngặt các nguyên tắc Domain-Driven Design (DDD), Clean Architecture, và RESTful API best practices.

Hệ thống được xây dựng với backend Spring Boot và frontend Angular, với mục tiêu tái cấu trúc và hoàn thiện kiến trúc DDD chuyên nghiệp.

## Glossary

- **Teacher System**: Hệ thống con quản lý toàn bộ nghiệp vụ liên quan đến giảng viên
- **Course Management Module**: Module quản lý khóa học (tạo, chỉnh sửa, phê duyệt)
- **Assignment Management Module**: Module quản lý bài tập và đánh giá
- **Student Progress Tracker**: Module theo dõi tiến độ học viên
- **Quiz Management Module**: Module quản lý bài kiểm tra trắc nghiệm
- **Analytics Dashboard**: Bảng điều khiển phân tích dữ liệu giảng dạy
- **Teacher Repository**: Repository pattern cho truy xuất dữ liệu giảng viên
- **Course Aggregate**: Aggregate root trong DDD cho Course domain
- **Assignment Aggregate**: Aggregate root trong DDD cho Assignment domain
- **Domain Service**: Service chứa business logic thuần túy theo DDD
- **Application Service**: Service điều phối các domain service và infrastructure
- **Value Object**: Đối tượng giá trị bất biến trong DDD
- **Entity**: Đối tượng có định danh duy nhất trong DDD
- **Bounded Context**: Ranh giới ngữ cảnh trong DDD

## Requirements

### Requirement 1: Course Management

**User Story:** Là một giảng viên, tôi muốn quản lý toàn bộ vòng đời của khóa học (tạo mới, chỉnh sửa, xuất bản, theo dõi), để có thể tổ chức nội dung giảng dạy một cách hiệu quả và chuyên nghiệp.

#### Acceptance Criteria

1. WHEN giảng viên tạo khóa học mới, THE Course Management Module SHALL tạo Course entity với trạng thái DRAFT và gán teacher_id là ID của giảng viên hiện tại
2. WHILE khóa học ở trạng thái DRAFT, THE Course Management Module SHALL cho phép giảng viên chỉnh sửa toàn bộ thông tin khóa học (title, description, code, sections)
3. WHEN giảng viên gửi khóa học để phê duyệt, THE Course Management Module SHALL chuyển trạng thái từ DRAFT sang PENDING và ghi lại timestamp
4. THE Course Management Module SHALL trả về danh sách tất cả khóa học của giảng viên với phân trang (page size 20 items)
5. WHERE giảng viên có quyền sở hữu khóa học, THE Course Management Module SHALL cho phép xóa khóa học nếu không có học viên đã đăng ký
6. WHEN giảng viên truy vấn khóa học theo ID, THE Course Management Module SHALL trả về đầy đủ thông tin khóa học bao gồm sections, lessons, và enrolled students count
7. THE Course Management Module SHALL validate mã khóa học (code) là duy nhất trong toàn hệ thống

### Requirement 2: Section and Lesson Management

**User Story:** Là một giảng viên, tôi muốn tổ chức nội dung khóa học thành các sections và lessons có cấu trúc rõ ràng, để học viên có thể theo dõi tiến trình học tập một cách logic và tuần tự.

#### Acceptance Criteria

1. WHEN giảng viên tạo section mới trong khóa học, THE Course Management Module SHALL tạo Section entity với orderIndex tự động tăng
2. THE Course Management Module SHALL cho phép giảng viên sắp xếp lại thứ tự sections thông qua cập nhật orderIndex
3. WHEN giảng viên tạo lesson trong section, THE Course Management Module SHALL tạo Lesson entity với orderIndex tự động trong phạm vi section đó
4. THE Course Management Module SHALL hỗ trợ nhiều loại lesson content (VIDEO, DOCUMENT, TEXT, QUIZ, ASSIGNMENT)
5. WHERE lesson có type là VIDEO hoặc DOCUMENT, THE Course Management Module SHALL lưu trữ file path và metadata trong lesson entity
6. WHEN giảng viên xóa section, THE Course Management Module SHALL xóa cascade tất cả lessons thuộc section đó
7. THE Course Management Module SHALL validate rằng mỗi section phải có ít nhất một lesson trước khi xuất bản khóa học

### Requirement 3: Assignment Creation and Management

**User Story:** Là một giảng viên, tôi muốn tạo và quản lý các bài tập đa dạng (essay, quiz, programming, project, file submission) với rubric chấm điểm chi tiết, để đánh giá năng lực học viên một cách toàn diện và công bằng.

#### Acceptance Criteria

1. WHEN giảng viên tạo assignment mới, THE Assignment Management Module SHALL tạo Assignment entity với assignment_type được chỉ định và trạng thái DRAFT
2. THE Assignment Management Module SHALL lưu trữ assignment configuration dưới dạng JSONB trong trường assignment_config
3. WHERE assignment có due_date, THE Assignment Management Module SHALL validate due_date phải sau thời điểm hiện tại
4. WHEN giảng viên thêm rubric cho assignment, THE Assignment Management Module SHALL tạo AssignmentRubric entity với criteria và max_points
5. THE Assignment Management Module SHALL tính tổng max_points của tất cả rubrics và validate không vượt quá max_score của assignment
6. WHEN giảng viên xuất bản assignment, THE Assignment Management Module SHALL chuyển trạng thái từ DRAFT sang PUBLISHED và gửi thông báo cho học viên đã đăng ký
7. THE Assignment Management Module SHALL cho phép giảng viên đính kèm files (attachments) vào assignment với validation file size và file type

### Requirement 4: Assignment Grading and Feedback

**User Story:** Là một giảng viên, tôi muốn chấm điểm và cung cấp feedback chi tiết cho bài nộp của học viên, để họ hiểu rõ điểm mạnh, điểm yếu và cách cải thiện.

#### Acceptance Criteria

1. WHEN giảng viên truy cập danh sách submissions của assignment, THE Assignment Management Module SHALL trả về tất cả submissions với thông tin student, submitted_at, và grading_status
2. WHERE submission chưa được chấm điểm, THE Assignment Management Module SHALL hiển thị grading_status là PENDING
3. WHEN giảng viên chấm điểm theo rubric, THE Assignment Management Module SHALL lưu điểm cho từng rubric criterion và tính tổng điểm tự động
4. THE Assignment Management Module SHALL validate tổng điểm không vượt quá max_score của assignment
5. WHEN giảng viên cung cấp feedback, THE Assignment Management Module SHALL lưu feedback text và timestamp vào submission entity
6. THE Assignment Management Module SHALL cho phép giảng viên đính kèm files feedback (annotated documents, audio comments)
7. WHEN giảng viên hoàn tất chấm điểm, THE Assignment Management Module SHALL chuyển grading_status sang GRADED và gửi thông báo cho học viên

### Requirement 5: Quiz Creation and Management

**User Story:** Là một giảng viên, tôi muốn tạo và quản lý bài kiểm tra trắc nghiệm với ngân hàng câu hỏi, để đánh giá kiến thức học viên một cách nhanh chóng và tự động.

#### Acceptance Criteria

1. WHEN giảng viên tạo quiz mới, THE Quiz Management Module SHALL tạo Quiz entity với title, description, time_limit, và max_attempts
2. THE Quiz Management Module SHALL cho phép giảng viên thêm questions từ question bank hoặc tạo mới
3. WHERE question có type là MULTIPLE_CHOICE, THE Quiz Management Module SHALL validate có ít nhất 2 options và đúng 1 correct option
4. WHERE question có type là MULTIPLE_ANSWER, THE Quiz Management Module SHALL validate có ít nhất 2 options và ít nhất 1 correct option
5. WHEN giảng viên xuất bản quiz, THE Quiz Management Module SHALL validate quiz có ít nhất 1 question
6. THE Quiz Management Module SHALL tính tổng điểm quiz bằng tổng points của tất cả questions
7. THE Quiz Management Module SHALL cho phép giảng viên xem thống kê kết quả quiz (average score, completion rate, question difficulty)

### Requirement 6: Student Progress Tracking

**User Story:** Là một giảng viên, tôi muốn theo dõi tiến độ học tập của từng học viên trong khóa học, để kịp thời hỗ trợ những học viên gặp khó khăn.

#### Acceptance Criteria

1. WHEN giảng viên truy cập course detail, THE Student Progress Tracker SHALL hiển thị danh sách enrolled students với completion percentage
2. THE Student Progress Tracker SHALL tính completion percentage dựa trên số lessons đã hoàn thành trên tổng số lessons
3. WHEN giảng viên xem chi tiết progress của student, THE Student Progress Tracker SHALL hiển thị danh sách lessons với trạng thái (NOT_STARTED, IN_PROGRESS, COMPLETED)
4. THE Student Progress Tracker SHALL hiển thị thời gian học viên dành cho mỗi lesson (time_spent)
5. WHERE student có submissions, THE Student Progress Tracker SHALL hiển thị điểm số và grading status của từng assignment
6. THE Student Progress Tracker SHALL cho phép giảng viên filter students theo completion percentage range
7. THE Student Progress Tracker SHALL cho phép giảng viên export progress report dưới dạng CSV hoặc Excel

### Requirement 7: Analytics and Reporting

**User Story:** Là một giảng viên, tôi muốn xem các báo cáo phân tích về hiệu quả giảng dạy và học tập, để cải thiện chất lượng khóa học và phương pháp giảng dạy.

#### Acceptance Criteria

1. WHEN giảng viên truy cập analytics dashboard, THE Analytics Dashboard SHALL hiển thị tổng số courses, total students, average completion rate
2. THE Analytics Dashboard SHALL hiển thị biểu đồ enrollment trend theo thời gian (daily, weekly, monthly)
3. THE Analytics Dashboard SHALL hiển thị top performing students và struggling students dựa trên completion rate và assignment scores
4. WHERE course có assignments, THE Analytics Dashboard SHALL hiển thị average assignment score và submission rate
5. WHERE course có quizzes, THE Analytics Dashboard SHALL hiển thị average quiz score và most difficult questions
6. THE Analytics Dashboard SHALL hiển thị student engagement metrics (login frequency, time spent, lesson completion rate)
7. THE Analytics Dashboard SHALL cho phép giảng viên filter analytics theo date range và specific course

### Requirement 8: Course Collaboration and Communication

**User Story:** Là một giảng viên, tôi muốn giao tiếp và cộng tác với học viên thông qua announcements, discussions, và messaging, để tạo môi trường học tập tương tác và hỗ trợ kịp thời.

#### Acceptance Criteria

1. WHEN giảng viên tạo announcement, THE Teacher System SHALL gửi thông báo đến tất cả enrolled students của course
2. THE Teacher System SHALL lưu trữ announcement với title, content, và created_at timestamp
3. WHERE announcement có priority là HIGH, THE Teacher System SHALL gửi email notification đến students
4. WHEN giảng viên trả lời discussion thread, THE Teacher System SHALL lưu reply với teacher_id và timestamp
5. THE Teacher System SHALL cho phép giảng viên pin important discussions lên đầu danh sách
6. THE Teacher System SHALL cho phép giảng viên gửi direct message đến individual student hoặc group of students
7. THE Teacher System SHALL hiển thị unread message count và notification badge cho giảng viên

### Requirement 9: Course Content Upload and Management

**User Story:** Là một giảng viên, tôi muốn upload và quản lý các tài liệu học tập (videos, PDFs, documents, slides), để cung cấp tài nguyên học tập đa dạng cho học viên.

#### Acceptance Criteria

1. WHEN giảng viên upload file, THE Teacher System SHALL validate file type thuộc danh sách allowed types (mp4, pdf, docx, pptx, xlsx)
2. THE Teacher System SHALL validate file size không vượt quá 500MB cho video và 50MB cho documents
3. WHEN upload thành công, THE Teacher System SHALL lưu file vào storage và trả về file path
4. THE Teacher System SHALL tạo thumbnail cho video files và preview cho PDF files
5. WHERE file là video, THE Teacher System SHALL extract video duration và resolution metadata
6. THE Teacher System SHALL cho phép giảng viên organize files theo folders và tags
7. WHEN giảng viên xóa file, THE Teacher System SHALL kiểm tra file không được sử dụng trong bất kỳ lesson nào trước khi xóa

### Requirement 10: Teacher Profile and Settings

**User Story:** Là một giảng viên, tôi muốn quản lý profile và settings cá nhân, để cung cấp thông tin chuyên môn và tùy chỉnh trải nghiệm sử dụng hệ thống.

#### Acceptance Criteria

1. WHEN giảng viên cập nhật profile, THE Teacher System SHALL validate và lưu full_name, email, bio, và avatar
2. THE Teacher System SHALL validate email format và uniqueness trong toàn hệ thống
3. WHERE giảng viên upload avatar, THE Teacher System SHALL resize image về 200x200 pixels và lưu vào storage
4. THE Teacher System SHALL cho phép giảng viên thêm professional credentials (certifications, degrees, experience)
5. THE Teacher System SHALL cho phép giảng viên cấu hình notification preferences (email, in-app, push)
6. THE Teacher System SHALL cho phép giảng viên thay đổi password với validation password strength
7. THE Teacher System SHALL hiển thị teacher profile công khai cho students với bio, credentials, và courses taught

## Non-Functional Requirements

### Performance Requirements

1. THE Teacher System SHALL trả về course list trong vòng 500ms với pagination 20 items
2. THE Teacher System SHALL xử lý file upload 100MB trong vòng 30 seconds
3. THE Analytics Dashboard SHALL render charts và metrics trong vòng 2 seconds

### Security Requirements

1. THE Teacher System SHALL validate teacher_id trong JWT token khớp với resource owner trước khi cho phép thao tác
2. THE Teacher System SHALL không cho phép teacher truy cập hoặc chỉnh sửa courses của teacher khác
3. THE Teacher System SHALL hash và salt passwords sử dụng BCrypt với cost factor 12

### Data Integrity Requirements

1. THE Teacher System SHALL sử dụng database transactions cho tất cả operations thay đổi nhiều entities
2. THE Teacher System SHALL validate foreign key constraints trước khi xóa entities
3. THE Teacher System SHALL maintain audit trail cho tất cả critical operations (course publish, grade submission)

### Scalability Requirements

1. THE Teacher System SHALL hỗ trợ 1000 concurrent teachers sử dụng hệ thống
2. THE Teacher System SHALL hỗ trợ courses với tối đa 1000 enrolled students
3. THE Teacher System SHALL hỗ trợ file storage lên đến 1TB per teacher

## Technical Constraints

1. Backend MUST sử dụng Spring Boot 3.x với Java 17+
2. Database MUST là PostgreSQL 14+ với JSONB support
3. File storage MUST sử dụng local filesystem hoặc S3-compatible storage
4. API MUST tuân thủ RESTful principles và OpenAPI 3.0 specification
5. Authentication MUST sử dụng JWT tokens với refresh token mechanism
6. Frontend MUST sử dụng Angular 17+ với standalone components và signals
