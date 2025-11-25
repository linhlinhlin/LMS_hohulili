# 🎯 Quiz Bank - Tóm tắt nhanh

## Hiện trạng
- ❌ Câu hỏi hiển thị lộn xộn, không có tổ chức
- ❌ Không có khái niệm "Gói câu hỏi"
- ❌ Không có phân trang
- ❌ Bulk actions chưa hoạt động
- ❌ Không có drag & drop

## Yêu cầu chính (từ đồng nghiệp)
1. **Gói câu hỏi**: Tổ chức câu hỏi theo packages
2. **Gói mặc định**: "Chưa phân loại" cho câu chưa phân loại
3. **CRUD gói**: Tạo/Sửa/Xóa gói
4. **Bulk operations**: Chuyển nhiều câu giữa các gói
5. **Drag & Drop**: Kéo thả câu vào gói
6. **Phân trang**: 20 câu/trang
7. **Export/Import**: Backup gói

## Cần làm gì?

### Database
```sql
-- Tạo bảng packages
CREATE TABLE packages (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    owner_id UUID,
    capacity INTEGER,
    ...
);

-- Thêm cột package_id vào questions
ALTER TABLE questions ADD COLUMN package_id UUID;

-- Tạo gói mặc định
INSERT INTO packages VALUES ('00000000...', 'Chưa phân loại', ...);
```

### Backend API (Cần thêm)
```
GET    /api/v1/packages                    - List packages
POST   /api/v1/packages                    - Create package
PUT    /api/v1/packages/{id}               - Update
DELETE /api/v1/packages/{id}               - Delete
POST   /api/v1/questions/bulk-move         - Move nhiều câu
POST   /api/v1/questions/bulk-delete       - Xóa nhiều câu
GET    /api/v1/packages/{id}/export        - Export
POST   /api/v1/packages/import             - Import
```

### Frontend (Cần thêm)
```
├─ Sidebar: Danh sách gói (với số lượng câu)
├─ Main: Câu hỏi trong gói đã chọn
├─ Bulk selection: Checkbox + action bar
├─ Drag & Drop: Kéo câu vào gói
├─ Pagination: 20 items/page
└─ Package modal: Create/Edit form
```

## Timeline (4 tuần)
- **Week 1**: Database + Backend Core
- **Week 2**: Frontend Package Management
- **Week 3**: Drag & Drop + Bulk Actions
- **Week 4**: Export/Import + Polish

## Bước tiếp theo
1. Review document chi tiết: `QUIZ_BANK_PACKAGE_ANALYSIS.md`
2. Tạo branch: `feature/question-packages`
3. Bắt đầu với database migration
4. Implement backend API
5. Build frontend UI

---
📄 **Chi tiết đầy đủ**: Xem file `QUIZ_BANK_PACKAGE_ANALYSIS.md`
