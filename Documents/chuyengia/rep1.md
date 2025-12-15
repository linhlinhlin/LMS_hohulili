Kế hoạch của bạn về cơ bản là **Rất Tốt (Solid)** và đã đi đúng hướng để hiển thị file sau khi upload thành công.

Tuy nhiên, tôi có **3 bổ sung kỹ thuật quan trọng** để giúp bạn tránh các lỗi UX/UI phổ biến khi làm việc với File trong Angular & Spring Boot:

### 1. Đánh giá chi tiết (Feedback)

*   **Về Model (`course.types.ts`):** ✅ Chuẩn. Việc thêm `fileUrl` và cập nhật Type là bắt buộc.
*   **Về Component Logic:** ✅ Đúng. Sử dụng `FormData` là bắt buộc khi upload file.
*   **Về Template:** ✅ Đúng. Input file và Link download là cần thiết.

### 2. Góp ý bổ sung (Technical Improvements)

#### A. Xử lý tên File hiển thị (UX Issue)
Hiện tại Database của bạn chỉ lưu `file_url` (thường là tên file đã bị mã hóa hoặc UUID để tránh trùng lặp). Nếu hiển thị URL lên giao diện sẽ rất xấu.
*   **Giải pháp:** Viết một hàm helper nhỏ ở `utils` hoặc trong Component để lấy tên file gốc từ URL.
*   *Ví dụ:* URL là `uploads/12345-bai-tap.pdf` -> Hiển thị: **"bai-tap.pdf"**.

#### B. Validate bắt buộc chọn file
*   Trong plan bạn chưa nhắc đến validate: Nếu user chọn Type = **FILE** mà chưa chọn file nào -> Nút "Lưu" phải bị Disabled hoặc báo lỗi.

#### C. Lưu ý quan trọng về `FormData` (Tránh lỗi Backend)
Khi gửi `FormData` lên Backend Spring Boot:
*   Nếu Backend dùng `@RequestBody` cho JSON -> Code sẽ lỗi vì `FormData` không phải JSON.
*   **Cách đúng:** Bạn phải append từng trường dữ liệu vào `formData`.
    ```typescript
    const formData = new FormData();
    formData.append('title', this.form.get('title').value);
    formData.append('type', 'FILE');
    if (this.selectedFile) {
        formData.append('file', this.selectedFile); // Tên 'file' phải khớp với @RequestParam bên Controller
    }
    // Gửi formData đi
    ```

---

### 3. Cập nhật Plan (Revised Action Items)

Dựa trên các góp ý trên, đây là Plan chi tiết để bạn code một lần ăn ngay:

#### 1. Frontend - Data Model
*   Update `SectionDetail`: Thêm `fileUrl`.
*   Update `CreateSectionRequest`: Đổi logic gửi từ JSON thuần sang hỗ trợ `FormData` bên Service.

#### 2. Frontend - Component Logic (`course-curriculum.component.ts`)
*   **Helper:** Thêm hàm `getFileNameFromUrl(url: string): string` để cắt chuỗi lấy tên file.
*   **Event:** Thêm hàm `onFileSelected(event: any)` để gán vào biến `selectedFile`.
*   **Validation:** Cập nhật biến `isFormValid`: Nếu type là FILE thì `selectedFile` hoặc `sectionFileUrl` (nếu edit) phải tồn tại.

#### 3. Frontend - Template (HTML)
Cập nhật phần hiển thị khi chọn Type = File:

```html
<div *ngIf="sectionType === 'FILE'" class="mt-4">
  <!-- Input Upload -->
  <label class="block text-sm font-medium mb-1">Tải lên tài liệu</label>
  <input type="file" (change)="onFileSelected($event)" 
         class="w-full border rounded p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
  
  <!-- Hiển thị File đã lưu (nếu có) -->
  <div *ngIf="sectionFileUrl()" class="mt-3 flex items-center p-3 bg-gray-50 rounded border border-gray-200">
    <span class="material-icons text-red-500 mr-2">picture_as_pdf</span> <!-- Icon file -->
    <a [href]="sectionFileUrl()" target="_blank" class="text-blue-600 hover:underline text-sm font-medium truncate">
      {{ getFileNameFromUrl(sectionFileUrl()!) }}
    </a>
  </div>
</div>
```

Bạn có thể tiến hành theo Plan này. Phần Logic xử lý `FormData` là quan trọng nhất để Backend nhận được file.