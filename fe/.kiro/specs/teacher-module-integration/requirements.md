# Requirements Document - Teacher Module Integration

## Introduction

Dự án này nhằm sáp nhập Teacher Module từ code mới (folder ThamKhao) vào dự án Angular v20 hiện tại. Nhóm phát triển đã vô tình đẩy code cũ lên repository và làm mất code mới. Code mới trong ThamKhao đã được hoàn thiện với đầy đủ chức năng backend (Spring Boot) và frontend (Angular v20) theo kiến trúc DDD. Nhiệm vụ là sáp nhập code mới này trong khi vẫn giữ lại các cải tiến UI/UX mà nhóm đã thực hiện trên code cũ.

## Glossary

- **ThamKhao**: Folder chứa code mới đã hoàn thiện của Teacher Module
- **Current Project**: Dự án Angular v20 hiện tại đang chạy
- **Teacher Module**: Module quản lý giảng viên bao gồm courses, assignments, quiz, grading, analytics, students
- **DDD**: Domain-Driven Design - kiến trúc phân tầng theo domain
- **Angular Signals**: Cơ chế reactive state management mới của Angular v20
- **Standalone Components**: Kiến trúc component độc lập không cần NgModule trong Angular v20
- **UI/UX Improvements**: Các cải tiến giao diện người dùng đã được thực hiện trên code cũ

## Requirements

### Requirement 1: Phân tích và so sánh code

**User Story:** Là một developer, tôi muốn hiểu rõ sự khác biệt giữa code mới (ThamKhao) và code hiện tại, để có thể lập kế hoạch sáp nhập chính xác

#### Acceptance Criteria

1. WHEN phân tích cấu trúc folder, THE System SHALL xác định tất cả các file và component tồn tại trong ThamKhao nhưng chưa có trong dự án hiện tại
2. WHEN so sánh các file trùng tên, THE System SHALL liệt kê chi tiết những thay đổi về logic, API calls, và state management
3. WHEN kiểm tra UI components, THE System SHALL xác định các cải tiến UI/UX trong code hiện tại cần được giữ lại
4. WHEN phân tích services, THE System SHALL so sánh TeacherService giữa hai phiên bản và xác định các method mới
5. THE System SHALL tạo báo cáo chi tiết về sự khác biệt giữa hai codebase với danh sách file cần merge, file cần copy, và file cần giữ nguyên

### Requirement 2: Backup và chuẩn bị môi trường

**User Story:** Là một developer, tôi muốn tạo backup đầy đủ trước khi sáp nhập, để có thể rollback nếu có vấn đề xảy ra

#### Acceptance Criteria

1. THE System SHALL tạo git branch backup với tên có timestamp trước khi thực hiện bất kỳ thay đổi nào
2. WHEN tạo backup, THE System SHALL verify rằng branch đã được push lên remote repository thành công
3. THE System SHALL kiểm tra và confirm rằng dự án hiện tại build thành công trước khi bắt đầu merge
4. THE System SHALL verify rằng tất cả dependencies cần thiết đã được cài đặt trong package.json
5. WHEN chuẩn bị môi trường, THE System SHALL document lại trạng thái hiện tại của các file quan trọng

### Requirement 3: Sáp nhập Services và Types

**User Story:** Là một developer, tôi muốn sáp nhập các service và type definitions trước, để đảm bảo foundation vững chắc cho các components

#### Acceptance Criteria

1. WHEN merge TeacherService, THE System SHALL giữ lại tất cả Angular Signals và computed properties từ code mới
2. WHEN merge teacher.types.ts, THE System SHALL đảm bảo tất cả interfaces mới được thêm vào mà không làm mất interfaces cũ
3. THE System SHALL verify rằng NotificationService từ ThamKhao được copy vào đúng vị trí
4. WHEN merge services, THE System SHALL đảm bảo tất cả API endpoints match với backend documentation
5. THE System SHALL kiểm tra và fix tất cả import paths sau khi merge services

### Requirement 4: Sáp nhập Components với bảo toàn UI/UX

**User Story:** Là một developer, tôi muốn sáp nhập logic mới từ ThamKhao trong khi giữ lại các cải tiến UI/UX đã có, để có được cả chức năng mới và giao diện đẹp

#### Acceptance Criteria

1. WHEN merge component TypeScript files, THE System SHALL giữ lại template HTML và SCSS files từ code hiện tại nếu chúng có cải tiến UI
2. WHEN component chỉ tồn tại trong ThamKhao, THE System SHALL copy toàn bộ component (TS, HTML, SCSS) sang dự án hiện tại
3. WHEN merge component logic, THE System SHALL đảm bảo tất cả Angular Signals và reactive patterns được giữ nguyên
4. THE System SHALL verify rằng tất cả @Input, @Output, và lifecycle hooks hoạt động đúng sau merge
5. WHEN merge xong, THE System SHALL đảm bảo không có TypeScript compilation errors trong bất kỳ component nào

### Requirement 5: Cập nhật Routing Configuration

**User Story:** Là một developer, tôi muốn routing configuration được cập nhật đầy đủ, để tất cả các trang mới có thể được truy cập

#### Acceptance Criteria

1. WHEN merge teacher.routes.ts, THE System SHALL đảm bảo tất cả routes từ ThamKhao được thêm vào
2. THE System SHALL verify rằng quiz.routes.ts được import và sử dụng đúng trong teacher.routes.ts
3. WHEN cập nhật routes, THE System SHALL đảm bảo teacherGuard được apply đúng cho tất cả protected routes
4. THE System SHALL verify rằng lazy loading configuration hoạt động đúng cho tất cả components
5. WHEN routing hoàn tất, THE System SHALL test rằng tất cả routes có thể navigate thành công

### Requirement 6: Testing và Validation

**User Story:** Là một developer, tôi muốn verify rằng tất cả chức năng hoạt động đúng sau khi merge, để đảm bảo không có regression bugs

#### Acceptance Criteria

1. THE System SHALL build dự án thành công với lệnh `ng build` không có errors
2. WHEN chạy development server, THE System SHALL verify rằng application khởi động không có console errors
3. THE System SHALL test navigation đến tất cả teacher routes và verify chúng load thành công
4. WHEN test API integration, THE System SHALL verify rằng tất cả API calls trả về data đúng format
5. THE System SHALL verify rằng Angular Signals update UI correctly khi data thay đổi

### Requirement 7: Documentation và Handover

**User Story:** Là một team member, tôi muốn có documentation đầy đủ về những gì đã được merge, để dễ dàng maintain và debug sau này

#### Acceptance Criteria

1. THE System SHALL tạo file INTEGRATION_REPORT.md chi tiết tất cả thay đổi đã thực hiện
2. WHEN tạo report, THE System SHALL liệt kê tất cả files đã được merged, copied, hoặc modified
3. THE System SHALL document tất cả breaking changes hoặc API changes cần team biết
4. THE System SHALL tạo danh sách các UI/UX improvements đã được preserved từ code cũ
5. WHEN hoàn tất, THE System SHALL cung cấp checklist để team verify integration thành công
