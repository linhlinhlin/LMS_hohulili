# 📋 Báo cáo: Flow Giao Bài Tập (Assignment Distribution)

**Ngày:** 28/11/2025  
**Trạng thái:** ✅ Hoàn thành Backend + Frontend Integration

---

## 1. Vấn đề ban đầu

- Chức năng chọn đối tượng giao bài chỉ có ở trang Overview, không có ở trang Create Assignment
- DistributionService sử dụng in-memory state (signal), không persist vào database
- Mock data ở nhiều nơi: `loadEnrolledStudents()`, `getStudentTasks()`, etc.
- Không có Backend API để lưu allocation

---

## 2. Giải pháp đã triển khai

### 2.1 Backend - Database Schema

**Entities mới:**

```
AssignmentAllocation
├── id (UUID)
├── assignment_id (FK → assignments)
├── distribution_type (ALL_STUDENTS | SPECIFIC_STUDENTS)
├── created_by (FK → users)
├── is_individual (boolean)
├── created_at, updated_at
└── allocatedStudents (OneToMany)

AssignmentAllocationStudent
├── allocation_id (FK)
├── student_id (FK)
├── custom_deadline (LocalDateTime)
├── note (TEXT)
└── assigned_at
```

### 2.2 Backend - API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/v1/assignments/{id}/allocation` | Tạo/cập nhật allocation |
| GET | `/api/v1/assignments/{id}/allocation` | Lấy thông tin allocation |
| GET | `/api/v1/assignments/{id}/allocation/stats` | Lấy thống kê |
| POST | `/api/v1/assignments/{id}/allocation/individual` | Giao bài riêng cho học viên |
| DELETE | `/api/v1/assignments/{id}/allocation/students/{studentId}` | Xóa học viên khỏi danh sách |
| PATCH | `/api/v1/assignments/{id}/allocation/students/{studentId}/deadline` | Cập nhật deadline riêng |
| GET | `/api/v1/courses/{id}/students` | Lấy danh sách học viên của khóa học |

### 2.3 Frontend - API Client

**File mới:** `fe/src/app/api/client/allocation.api.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class AllocationApi {
  createOrUpdateAllocation(assignmentId, request): Observable<...>
  getAllocation(assignmentId): Observable<...>
  getAllocationStats(assignmentId, totalEnrolledStudents): Observable<...>
  assignIndividual(assignmentId, request): Observable<...>
  removeStudentFromAllocation(assignmentId, studentId): Observable<...>
  updateStudentDeadline(assignmentId, studentId, request): Observable<...>
}
```

### 2.4 Frontend - DistributionService

**Cập nhật:** `fe/src/app/core/services/distribution.service.ts`

- Inject `AllocationApi`
- `createAllocation()` → gọi real API
- `extendDeadline()` → gọi real API
- `assignIndividualTask()` → gọi real API
- `removeIndividualAssignment()` → gọi real API
- Thêm `loadAllocation()` để load từ API

### 2.5 Frontend - Assignment Creation

**Cập nhật:** `fe/src/app/features/teacher/assignments/assignment-creation.component.ts`

- Thêm `DistributionSelectorComponent` vào form tạo bài tập
- Load danh sách học viên khi chọn khóa học
- Lưu distribution settings sau khi tạo assignment thành công

---

## 3. Flow hoạt động

```
1. Giáo viên vào trang Create Assignment
2. Chọn khóa học → Load danh sách học viên
3. Chọn đối tượng giao bài:
   - Tất cả học viên (ALL_STUDENTS)
   - Học viên cụ thể (SPECIFIC_STUDENTS)
4. Điền thông tin bài tập
5. Submit → Tạo Assignment → Lưu Allocation
6. Học viên được giao sẽ thấy bài tập trong danh sách
```

---

## 4. Files đã tạo/sửa

### Backend (Java)
- ✅ `AssignmentAllocation.java` - Entity mới
- ✅ `AssignmentAllocationStudent.java` - Entity mới
- ✅ `AssignmentAllocationStudentId.java` - Composite key
- ✅ `AssignmentAllocationRepository.java` - Repository mới
- ✅ `AllocationService.java` - Service mới
- ✅ `AllocationController.java` - Controller mới
- ✅ `CourseController.java` - Thêm endpoint `/students`

### Frontend (TypeScript)
- ✅ `allocation.api.ts` - API client mới
- ✅ `distribution.service.ts` - Cập nhật sử dụng real API
- ✅ `assignment-creation.component.ts` - Thêm Distribution Selector
- ✅ `course.api.ts` - Thêm `getEnrolledStudents()`

---

## 5. Cần làm tiếp

1. **Restart Backend** để áp dụng thay đổi database
2. **Test flow** tạo bài tập với chọn đối tượng
3. **Kiểm tra** học viên có thấy bài tập được giao không
4. **Cập nhật** trang Overview để load allocation từ API

---

## 6. So sánh với Google Classroom

| Tính năng | Google Classroom | LMS của chúng ta |
|-----------|------------------|------------------|
| Giao cho tất cả | ✅ | ✅ |
| Giao cho học viên cụ thể | ✅ | ✅ |
| Deadline riêng cho từng học viên | ✅ | ✅ |
| Ghi chú riêng | ✅ | ✅ |
| Lên lịch đăng bài | ✅ | ❌ (chưa có) |
| Chủ đề/Topic | ✅ | ❌ (chưa có) |

---

**Người thực hiện:** AI Assistant  
**Review bởi:** Chuyên gia kỹ thuật
