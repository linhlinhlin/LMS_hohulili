# 🧪 Hướng dẫn Test - Admin Course Approval Workflow

## 🚀 Khởi động Backend

```bash
cd api
mvn spring-boot:run
```

Đợi cho đến khi thấy:
```
Started BackendLmsPostgresApplication in X seconds
```

## 🌐 Truy cập Swagger UI

Mở browser: **http://localhost:8088/swagger-ui/index.html**

---

## 📝 Test Scenarios

### Scenario 1: Teacher tạo khóa học mới

#### Step 1: Login as Teacher
1. Tìm endpoint: `POST /api/v1/auth/login`
2. Click "Try it out"
3. Request body:
```json
{
  "email": "teacher@example.com",
  "password": "password123"
}
```
4. Click "Execute"
5. **Copy JWT token** từ response

#### Step 2: Authorize
1. Click button "Authorize" ở đầu trang
2. Paste JWT token vào field "Value"
3. Click "Authorize"
4. Click "Close"

#### Step 3: Create Course
1. Tìm endpoint: `POST /api/v1/courses`
2. Click "Try it out"
3. Request body:
```json
{
  "code": "TEST101",
  "title": "Test Course - Approval Workflow",
  "description": "This is a test course to verify the approval workflow"
}
```
4. Click "Execute"
5. **Verify Response**:
   - `status` = `"PENDING"` ✅
   - `teacherName` = tên teacher
   - `enrolledCount` = 0

#### Step 4: Verify Course in My Courses
1. Tìm endpoint: `GET /api/v1/courses/my-courses`
2. Click "Try it out"
3. Click "Execute"
4. **Verify**: Course vừa tạo xuất hiện trong list với status = PENDING

#### Step 5: Verify Course NOT in Public List
1. Logout (clear authorization)
2. Tìm endpoint: `GET /api/v1/courses` (public courses)
3. Click "Try it out"
4. Click "Execute"
5. **Verify**: Course TEST101 KHÔNG xuất hiện (vì chưa approve)

---

### Scenario 2: Admin duyệt khóa học

#### Step 1: Login as Admin
1. Tìm endpoint: `POST /api/v1/auth/login`
2. Request body:
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```
3. **Copy JWT token** và Authorize

#### Step 2: View Pending Courses
1. Tìm endpoint: `GET /api/v1/admin/courses/pending`
2. Click "Try it out"
3. Click "Execute"
4. **Verify**: Course TEST101 xuất hiện trong list
5. **Copy courseId** từ response

#### Step 3: View Course Details
1. Tìm endpoint: `GET /api/v1/courses/{courseId}`
2. Click "Try it out"
3. Paste courseId vào field
4. Click "Execute"
5. **Verify**: Xem đầy đủ thông tin khóa học

#### Step 4: Approve Course
1. Tìm endpoint: `PATCH /api/v1/admin/courses/{courseId}/approve`
2. Click "Try it out"
3. Paste courseId
4. Click "Execute"
5. **Verify Response**:
   - `success` = true
   - `message` = "Khóa học đã được duyệt"

#### Step 5: Verify Course is Now Public
1. Logout (clear authorization)
2. Tìm endpoint: `GET /api/v1/courses` (public courses)
3. Click "Execute"
4. **Verify**: Course TEST101 BÂY GIỜ xuất hiện (status = APPROVED)

---

### Scenario 3: Admin từ chối khóa học

#### Step 1: Create Another Course (as Teacher)
```json
{
  "code": "TEST102",
  "title": "Test Course - To Be Rejected",
  "description": "This course will be rejected"
}
```

#### Step 2: Login as Admin
(Same as Scenario 2 Step 1)

#### Step 3: Reject Course
1. Tìm endpoint: `PATCH /api/v1/admin/courses/{courseId}/reject`
2. Click "Try it out"
3. Paste courseId của TEST102
4. Request body:
```json
{
  "reason": "Nội dung khóa học chưa đầy đủ. Cần bổ sung thêm: 1) Video hướng dẫn, 2) Bài tập thực hành, 3) Tài liệu tham khảo"
}
```
5. Click "Execute"
6. **Verify Response**: success = true

#### Step 4: Verify Rejection (as Teacher)
1. Login as Teacher
2. Tìm endpoint: `GET /api/v1/courses/{courseId}`
3. **Verify Response**:
   - `status` = "REJECTED"
   - `reviewComment` = lý do từ chối
   - `reviewedAt` = timestamp
   - `reviewedBy` = admin info

---

### Scenario 4: Teacher sửa và gửi lại

#### Step 1: Login as Teacher
(Same as Scenario 1 Step 1-2)

#### Step 2: Update Rejected Course
1. Tìm endpoint: `PUT /api/v1/courses/{courseId}`
2. Click "Try it out"
3. Paste courseId của TEST102
4. Request body:
```json
{
  "description": "Updated description with more details: 1) Added video tutorials, 2) Added practice exercises, 3) Added reference materials"
}
```
5. Click "Execute"
6. **Verify**: Status vẫn là REJECTED (chưa submit)

#### Step 3: Submit for Re-approval
1. Tìm endpoint: `PATCH /api/v1/courses/{courseId}/publish`
2. Click "Try it out"
3. Paste courseId
4. Click "Execute"
5. **Verify Response**: success = true

#### Step 4: Verify Status Changed
1. Tìm endpoint: `GET /api/v1/courses/{courseId}`
2. **Verify**:
   - `status` = "PENDING"
   - `reviewComment` = null (cleared)
   - `reviewedAt` = null (cleared)

---

### Scenario 5: Edit approved course

#### Step 1: Login as Teacher
(Same as Scenario 1 Step 1-2)

#### Step 2: Edit Approved Course (TEST101)
1. Tìm endpoint: `PUT /api/v1/courses/{courseId}`
2. Paste courseId của TEST101 (đã approve)
3. Request body:
```json
{
  "title": "Test Course - Approval Workflow (Updated)",
  "description": "Updated description - this should trigger re-review"
}
```
4. Click "Execute"

#### Step 3: Verify Status Reset
1. Tìm endpoint: `GET /api/v1/courses/{courseId}`
2. **Verify**:
   - `status` = "PENDING" (changed from APPROVED)
   - `reviewComment` = null
   - `reviewedAt` = null
   - `updatedAt` = new timestamp

#### Step 4: Verify Course Removed from Public
1. Logout
2. Tìm endpoint: `GET /api/v1/courses`
3. **Verify**: TEST101 KHÔNG còn trong public list

---

### Scenario 6: Error Cases

#### Test 6.1: Submit PENDING course
1. Login as Teacher
2. Create new course (status = PENDING)
3. Try to submit: `PATCH /api/v1/courses/{courseId}/publish`
4. **Expected Error**: "Khóa học đang chờ admin duyệt"

#### Test 6.2: Reject without reason
1. Login as Admin
2. Try reject: `PATCH /api/v1/admin/courses/{courseId}/reject`
3. Request body:
```json
{
  "reason": ""
}
```
4. **Expected Error**: "Vui lòng nhập lý do từ chối khóa học"

#### Test 6.3: Approve non-PENDING course
1. Login as Admin
2. Try approve course with status = APPROVED
3. **Expected Error**: "Chỉ có thể duyệt khóa học ở trạng thái chờ duyệt"

#### Test 6.4: Student enroll in PENDING course
1. Login as Student
2. Try enroll: `POST /api/v1/courses/{courseId}/enroll`
3. Use courseId of PENDING course
4. **Expected Error**: "Chỉ có thể đăng ký vào khóa học đã được duyệt"

---

## 📊 Verification Checklist

### ✅ Course Creation
- [ ] Teacher tạo course → status = PENDING
- [ ] Course xuất hiện trong My Courses
- [ ] Course KHÔNG xuất hiện trong public list

### ✅ Admin Approval
- [ ] Admin thấy course trong pending list
- [ ] Admin approve → status = APPROVED
- [ ] Course xuất hiện trong public list
- [ ] reviewedAt và reviewedBy được set

### ✅ Admin Rejection
- [ ] Admin reject với reason → status = REJECTED
- [ ] reviewComment được lưu
- [ ] Teacher thấy rejection reason

### ✅ Resubmit
- [ ] Teacher edit REJECTED course
- [ ] Teacher submit → status = PENDING
- [ ] Review info được clear

### ✅ Edit Approved Course
- [ ] Teacher edit APPROVED course
- [ ] Status tự động → PENDING
- [ ] Review info được clear
- [ ] Course removed from public list

### ✅ Error Handling
- [ ] Cannot submit PENDING course
- [ ] Cannot reject without reason
- [ ] Cannot approve non-PENDING course
- [ ] Cannot enroll in PENDING course

---

## 🗄️ Database Verification

### Connect to Database
```bash
# If using Docker
docker exec -it lms-postgres psql -U lms -d lms

# If using local PostgreSQL
psql -h localhost -U lms -d lms
```

### Check Course Status
```sql
SELECT 
    code,
    title,
    status,
    review_comment,
    reviewed_at,
    created_at
FROM courses
ORDER BY created_at DESC
LIMIT 5;
```

### Check Pending Courses
```sql
SELECT 
    c.code,
    c.title,
    c.status,
    u.full_name as teacher_name
FROM courses c
JOIN users u ON c.teacher_id = u.id
WHERE c.status = 'PENDING';
```

### Check Review History
```sql
SELECT 
    c.code,
    c.title,
    c.status,
    c.review_comment,
    c.reviewed_at,
    reviewer.full_name as reviewed_by
FROM courses c
LEFT JOIN users reviewer ON c.reviewed_by_id = reviewer.id
WHERE c.reviewed_at IS NOT NULL
ORDER BY c.reviewed_at DESC;
```

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" error
**Solution**: 
1. Make sure you logged in
2. Copy JWT token correctly
3. Click "Authorize" button
4. Token expires after 24h - login again

### Issue: Course not found
**Solution**:
1. Verify courseId is correct UUID
2. Check if course exists in database
3. Make sure you're using the right environment

### Issue: "Access denied" error
**Solution**:
1. Verify you're logged in with correct role
2. Admin endpoints need ADMIN role
3. Teacher endpoints need TEACHER role

### Issue: Cannot see course in public list
**Solution**:
1. Verify course status = APPROVED
2. Only APPROVED courses are public
3. Check filter parameters

---

## 📝 Test Data

### Test Users
```
Admin:
- Email: admin@example.com
- Password: admin123

Teacher:
- Email: teacher@example.com
- Password: password123

Student:
- Email: student@example.com
- Password: password123
```

### Test Courses
```
TEST101: Test Course - Approval Workflow
TEST102: Test Course - To Be Rejected
TEST103: Test Course - Edit Approved
```

---

## ✅ Success Criteria

Tất cả test scenarios pass:
- ✅ Course creation → PENDING
- ✅ Admin approve → APPROVED
- ✅ Admin reject → REJECTED
- ✅ Teacher resubmit → PENDING
- ✅ Edit approved → PENDING
- ✅ Error cases handled correctly

---

**Status**: Ready for Testing  
**Environment**: Development (localhost:8088)  
**Updated**: 2025-12-01
