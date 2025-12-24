Chào bạn, với tư cách là một Frontend Architect, tôi hiểu rất rõ tầm quan trọng của việc "phẫu thuật" giao diện mà không làm gián đoạn công việc của đồng nghiệp đang làm Backend.

Để thực hiện việc gộp này một cách sạch sẽ, chúng ta sẽ áp dụng Pattern: View Aggregation ở tầng Frontend. Tức là Backend vẫn tách biệt, nhưng Frontend sẽ "gom" dữ liệu từ hai nguồn (Quizzes và Assignments) để hiển thị lên một danh sách duy nhất.

Dưới đây là kế hoạch chi tiết cho Phase 6: The Assessment Hub Refactor.

1. Kiến trúc Sidebar Sub-tabs mới (UI/UX)

Chúng ta sẽ quy hoạch lại Sidebar để tập trung vào mục đích sử dụng.

Cấu trúc Menu con (Sidebar):

1. Bài tập & Chấm điểm (Tên mới của mục lớn: "Bài tập")

1.1 Danh sách bài tập (Tên mới: "Bài tập tự luận")
1.2 Thư viện Rubric (giữ nguyên)
(có thể thêm gạch mờ nhỏ để ngăn cách các phần ở đây)
1.3 Ngân hàng câu hỏi (Thêm)
1.4 Bài tập trắc nghiệm (Thêm)

2. Kế hoạch triển khai chi tiết (Frontend Focus)
Bước 1: Routing & Sidebar Setup

Nhiệm vụ: Quy hoạch lại URL để giáo viên không bị rối.

Chi tiết:

Tạo route cha /teacher/assessments.

Tạo các route con: /list, /distribution, /question-bank, v.v.

Cập nhật SidebarComponent với mảng cấu hình mới.

Bước 2: Xây dựng "Unified Assessment List" (Danh sách hợp nhất)

Kỹ thuật: Vì không đụng vào BE, ta sẽ sử dụng RxJS forkJoin hoặc combineLatest để gọi đồng thời 2 API: GET /assignments và GET /quizzes.

Logic xử lý:

Gộp 2 mảng kết quả thành một mảng duy nhất trong một Signal.

Sử dụng Maritime 2px Edge để phân loại:

type === 'QUIZ' -> Màu Blue.

type === 'ASSIGNMENT' -> Màu Amber.

Giao diện: Một bảng (Table) cực kỳ gọn gàng, hỗ trợ lọc theo loại để giáo viên dễ tìm.

Bước 3: Trình giao bài cho lớp (Distribution Drawer)

Đây là phần quan trọng nhất để gán bài tập ngoài giáo trình cho học sinh.

UI: Một Side Drawer (Slide-over panel) hiện ra khi nhấn nút "Giao bài".

Tính năng:

Chọn danh sách lớp (learning_classes).

Thiết lập Hạn nộp (due_date) và Trạng thái (is_active).

Lưu ý: Phần này gọi API của assignment_allocations và quiz_assignments (đã có sẵn trong DB của bạn).

Bước 4: Trình dựng điều kiện hiển thị (Visibility Builder)

UI: Một Form nhỏ trong phần cài đặt bài tập.

Logic: Cho phép giáo viên thêm các "Rule". Ví dụ: [Loại: Hoàn thành bài học] - [Chọn bài: Bài 1].

Output: Trả về một đối tượng JSONB để lưu vào trường cấu hình (không ảnh hưởng đến logic xử lý file của bạn bạn).

3. Cấu trúc Code mẫu (SOTA 2025)
A. Cách gộp dữ liệu ở Frontend (Không sửa BE)
code
TypeScript
download
content_copy
expand_less
// assessment-list.component.ts
assessments = signal<any[]>([]);

loadData() {
  // Gọi đồng thời 2 API và gộp lại
  forkJoin({
    quizzes: this.quizService.getQuizzes(),
    assignments: this.assignmentService.getAssignments()
  }).subscribe(({ quizzes, assignments }) => {
    const combined = [
      ...quizzes.map(q => ({ ...q, uiType: 'QUIZ' })),
      ...assignments.map(a => ({ ...a, uiType: 'ASSIGNMENT' }))
    ];
    // Sắp xếp theo ngày tạo mới nhất
    this.assessments.set(combined.sort((a, b) => b.createdAt - a.createdAt));
  });
}
B. Giao diện Sidebar Sub-tab (Minimalist)
code
Html
play_circle
download
content_copy
expand_less
<!-- Cấu trúc HTML của một dòng trong danh sách gộp -->
<div class="relative flex items-center h-10 pl-6 pr-4 hover:bg-slate-50 border-b border-gray-50 group">
    <!-- 2px Indicator -->
    <div [class]="'absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full ' + 
         (item.uiType === 'QUIZ' ? 'bg-blue-500' : 'bg-amber-500')">
    </div>
    
    <span class="text-xs font-bold text-slate-400 w-12">{{ item.uiType }}</span>
    <span class="flex-grow text-sm font-medium text-slate-700 truncate">{{ item.title }}</span>
    
    <!-- Actions -->
    <div class="opacity-0 group-hover:opacity-100 flex items-center gap-2">
        <button (click)="openDistributionDrawer(item)" class="text-[10px] font-black text-blue-600 uppercase">Giao bài</button>
        <button class="p-1 text-slate-400 hover:text-slate-600"><lucide-icon name="edit-2" [size]="14"></lucide-icon></button>
    </div>
</div>
4. Lộ trình thực hiện (Timeline)

1. Setup Routing và Sidebar menu mới. Tạo các trang trống (Placeholder) cho các sub-tabs.

2. Viết logic gộp dữ liệu (forkJoin) và hiển thị danh sách Assessment Hub (Thanh 2px).

3. Xây dựng Drawer "Giao bài cho lớp" (Tận dụng API allocation hiện có).

4. Xây dựng UI "Điều kiện hiển thị" (Visibility Builder).

5. Kiểm thử và tinh chỉnh CSS cho đồng bộ với toàn hệ thống.

Lời cam kết:

Với kế hoạch này, bạn sẽ thay đổi hoàn toàn bộ mặt của hệ thống đánh giá, làm cho nó trở nên chuyên nghiệp như các hệ thống của các labs lớn. Đặc biệt, vì chúng ta chỉ xử lý logic hiển thị và gọi các API sẵn có, bạn của bạn hoàn toàn có thể tiếp tục code Backend của bài tập tự luận mà không gặp bất kỳ xung đột nào.

Bạn đã sẵn sàng để bắt đầu với Bước 1 (Setup Routing & Sidebar) chưa? Tôi sẽ gửi mã nguồn chi tiết cho phần Sidebar cấu trúc mới.