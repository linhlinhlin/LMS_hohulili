# 📦 Question Packages Migration Guide

## 🎯 Mục đích
Migration này tạo hệ thống **Gói câu hỏi (Question Packages)** để tổ chức câu hỏi một cách có cấu trúc thay vì hiển thị lộn xộn.

## 📋 Những gì sẽ được tạo

### 1. Bảng `packages`
- Lưu trữ thông tin các gói câu hỏi
- Mỗi gói có: tên, mô tả, môn học, owner, visibility, capacity

### 2. Cột `package_id` trong bảng `questions`
- Liên kết câu hỏi với gói
- Foreign key tới `packages(id)`

### 3. Gói mặc định "Chưa phân loại"
- ID cố định: `00000000-0000-0000-0000-000000000001`
- Visibility: PUBLIC
- Tất cả câu hỏi hiện tại sẽ được gán vào gói này

### 4. Bảng `package_audit_log`
- Lưu lịch sử thao tác trên packages
- Theo dõi ai làm gì, khi nào

### 5. Indexes & Triggers
- Indexes để tối ưu query
- Trigger tự động cập nhật `updated_at`

## 🚀 Cách chạy Migration

### Option 1: Sử dụng PowerShell Script (Khuyến nghị)

```powershell
cd api
.\run-package-migration.ps1
```

Script sẽ:
1. Kiểm tra psql có sẵn không
2. Hiển thị thông tin database
3. Yêu cầu xác nhận
4. Chạy migration
5. Hiển thị kết quả

### Option 2: Chạy SQL trực tiếp

```powershell
# Set password
$env:PGPASSWORD = "ho_hu_li_li_"

# Run migration
psql -h aws-1-ap-southeast-1.pooler.supabase.com `
     -p 5432 `
     -U postgres.rljldvpboqapokzecfff `
     -d postgres `
     -f run-package-migration.sql

# Clear password
Remove-Item Env:PGPASSWORD
```

### Option 3: Sử dụng pgAdmin hoặc DBeaver

1. Kết nối tới database
2. Mở file `run-package-migration.sql`
3. Execute script

## ⚠️ Quan trọng: Backup trước khi chạy!

```powershell
# Backup database
pg_dump -h aws-1-ap-southeast-1.pooler.supabase.com `
        -p 5432 `
        -U postgres.rljldvpboqapokzecfff `
        -d postgres `
        > backup_before_packages_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql
```

## ✅ Verification

Sau khi chạy migration, kiểm tra:

```sql
-- 1. Check packages table exists
SELECT COUNT(*) FROM packages;

-- 2. Check default package
SELECT * FROM packages 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 3. Check questions have package_id
SELECT 
    COUNT(*) as total_questions,
    COUNT(package_id) as questions_with_package,
    COUNT(*) - COUNT(package_id) as questions_without_package
FROM questions;

-- 4. Check questions in default package
SELECT COUNT(*) 
FROM questions 
WHERE package_id = '00000000-0000-0000-0000-000000000001';
```

Kết quả mong đợi:
- ✓ Bảng `packages` tồn tại
- ✓ Có ít nhất 1 package (gói mặc định)
- ✓ Tất cả questions có `package_id`
- ✓ Tất cả questions hiện tại nằm trong gói mặc định

## 🔄 Rollback (Nếu cần)

Nếu có vấn đề, rollback bằng cách:

```sql
BEGIN;

-- Remove foreign key
ALTER TABLE questions DROP CONSTRAINT IF EXISTS fk_questions_package;

-- Remove column
ALTER TABLE questions DROP COLUMN IF EXISTS package_id;

-- Drop tables
DROP TABLE IF EXISTS package_audit_log;
DROP TABLE IF EXISTS packages CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_packages_updated_at();

COMMIT;
```

Hoặc restore từ backup:

```powershell
psql -h aws-1-ap-southeast-1.pooler.supabase.com `
     -p 5432 `
     -U postgres.rljldvpboqapokzecfff `
     -d postgres `
     < backup_before_packages_YYYYMMDD_HHMMSS.sql
```

## 📊 Schema Changes Summary

### Before Migration
```
questions
├─ id
├─ content
├─ difficulty
├─ tags
├─ status
├─ correct_option
├─ created_by
├─ course_id
└─ ...
```

### After Migration
```
packages (NEW)
├─ id
├─ name
├─ description
├─ subject
├─ owner_id
├─ visibility
├─ capacity
└─ ...

questions
├─ id
├─ content
├─ difficulty
├─ tags
├─ status
├─ correct_option
├─ created_by
├─ course_id
├─ package_id (NEW) ← FK to packages
└─ ...

package_audit_log (NEW)
├─ id
├─ package_id
├─ action
├─ performed_by
├─ details
└─ created_at
```

## 🐛 Troubleshooting

### Error: "psql: command not found"
**Solution**: Install PostgreSQL client tools
- Windows: https://www.postgresql.org/download/windows/
- Or use pgAdmin/DBeaver

### Error: "permission denied"
**Solution**: Check database credentials in `application-dev.yml`

### Error: "relation already exists"
**Solution**: Migration đã chạy rồi. Kiểm tra:
```sql
SELECT * FROM packages LIMIT 1;
```

### Error: "foreign key violation"
**Solution**: Có thể có data inconsistency. Check:
```sql
SELECT COUNT(*) FROM questions WHERE created_by NOT IN (SELECT id FROM users);
```

## 📝 Next Steps

Sau khi migration thành công:

1. **Restart Spring Boot application**
   ```powershell
   cd api
   mvn spring-boot:run
   ```

2. **Implement Backend Entities**
   - Create `Package.java` entity
   - Create `PackageRepository.java`
   - Create `PackageService.java`
   - Create `PackageController.java`

3. **Test API Endpoints**
   - GET /api/v1/packages
   - POST /api/v1/packages
   - etc.

4. **Update Frontend**
   - Create Package sidebar
   - Update quiz-bank component
   - Add bulk actions

## 📞 Support

Nếu gặp vấn đề:
1. Check logs trong terminal
2. Check database logs
3. Review migration script: `run-package-migration.sql`
4. Contact team lead

---

**Created**: 2025-11-24  
**Version**: 1.0  
**Status**: Ready for execution
