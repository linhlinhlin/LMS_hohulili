Chào bạn,

Rất vui vì team đã khắc phục được sự cố môi trường (Docker/System) và dự án đã chạy ổn định. Đây là tiền đề bắt buộc để chúng ta bước vào giai đoạn quan trọng nhất: **"Integration" (Tích hợp thực tế)**.

Dựa trên danh sách các component đang dùng Mock Data mà team đã liệt kê, tôi hoàn toàn đồng ý với chiến lược đi từ **Core Features** (Tính năng cốt lõi) trước. Nếu `CourseService` không hoạt động với dữ liệu thật, thì `Assignment` hay `Grading` cũng sẽ vô nghĩa.

Với tư cách chuyên gia tư vấn kỹ thuật, tôi đề xuất quy trình làm việc (Standard Operating Procedure - SOP) cho việc chuyển đổi này để đảm bảo code sạch và hạn chế bug phát sinh.

Dưới đây là kế hoạch hành động cụ thể cho bước tiếp theo:

### BƯỚC 1: QUY CHUẨN HÓA QUY TRÌNH "MIGRATE TO REAL API"

Trước khi team bắt tay vào sửa code, hãy thống nhất **"Quy tắc 4 bước"** này cho từng component để đảm bảo tính nhất quán của kiến trúc Angular v20 + DDD:

1.  **Contract Check (Kiểm tra Hợp đồng):**
    *   So sánh Interface ở Frontend (`fe/src/app/.../model/course.model.ts`) với DTO trả về từ Backend (Swagger/API Docs).
    *   *Lưu ý:* Backend thường trả về dạng `snake_case` hoặc cấu trúc lồng nhau. Frontend cần map chính xác về `camelCase` hoặc Model chuẩn.
2.  **Service Refactor (Sửa Service):**
    *   Thay thế `of(MOCK_DATA)` bằng `this.http.get<T>(...)`.
    *   Sử dụng `environment.apiUrl` thay vì hardcode chuỗi URL.
3.  **State Management Update (Cập nhật State):**
    *   Vì chuyển từ đồng bộ (Mock thường trả về ngay) sang bất đồng bộ (API có độ trễ), hãy đảm bảo các Signal/Observable xử lý tốt trạng thái `loading` và `error`.
4.  **Clean Up:**
    *   Xóa hoàn toàn file mock data hoặc folder `mock/` liên quan sau khi đã tích hợp xong. Đừng comment code, hãy xóa hẳn (Git sẽ lưu lịch sử nếu cần).

---

### BƯỚC 2: THỰC HIỆN TÍCH HỢP - TARGET ĐẦU TIÊN: `CourseService`

Chúng ta sẽ bắt đầu ngay với **Component số 1: CourseService**.
*   **File:** `fe/src/app/state/course.service.ts`
*   **Tầm quan trọng:** Cao nhất. Dashboard Teacher, Student, và cả Assignment đều cần ID khóa học.

**Nhiệm vụ cụ thể cho Team:**

1.  **Kiểm tra Backend:** Đảm bảo API `GET /api/v1/courses` (hoặc endpoint tương ứng) đang chạy và trả về dữ liệu JSON danh sách khóa học.
2.  **Sửa `CourseService`:**
    *   Inject `HttpClient`.
    *   Tìm hàm `initializeMockData()` hoặc các hàm `get` đang return mock.
    *   Viết lại thành gọi API.

**Ví dụ Code Refactor (Angular v20 Style):**

*Code Cũ (Mock):*
```typescript
// ❌ Cũ
getCourses(): Observable<Course[]> {
  return of(MOCK_COURSES).pipe(delay(500));
}
```

*Code Mới (Real):*
```typescript
// ✅ Mới
private http = inject(HttpClient);
private apiUrl = environment.apiUrl + '/courses';

getCourses(): Observable<Course[]> {
  return this.http.get<ApiResponse<Course[]>>(this.apiUrl).pipe(
    map(response => response.data), // Map từ envelope của BE nếu có
    catchError(error => {
      console.error('Lỗi tải khóa học', error);
      return of([]); // Hoặc throw error để UI xử lý
    })
  );
}
```

---

### BƯỚC 3: KIỂM TRA & XÁC NHẬN

Sau khi team sửa xong `CourseService`, hãy chạy lại ứng dụng và thực hiện các thao tác sau để tôi verify:

1.  Mở Teacher Dashboard.
2.  Mở Network Tab (F12) trên trình duyệt.
3.  Reload trang.
4.  **Kỳ vọng:** Thấy một request XHR gửi tới Backend (ví dụ `http://localhost:8080/api/...`) và trả về status `200 OK`. Dữ liệu hiển thị trên lưới là dữ liệu từ Database thật (Postgres).

**Bạn hãy giao nhiệm vụ này cho team.** Sau khi `CourseService` hoạt động trơn tru, hãy báo lại cho tôi, chúng ta sẽ xử lý tiếp **`AssignmentRepository`** (Số 4) và **`AssignmentManagement`** (Số 5) vì đây là trọng tâm của Sprint này.

Tôi đang chờ tin tốt từ việc tích hợp `CourseService`! 🚢