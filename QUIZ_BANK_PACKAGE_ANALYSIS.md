# 📊 Phân tích Quiz Bank - Hệ thống Gói Câu hỏi (Question Packages)

## 🎯 Tổng quan

Tài liệu này phân tích hiện trạng trang Quiz Bank (`/teacher/quiz/quiz-bank`) và đề xuất kế hoạch cải thiện dựa trên yêu cầu của đồng nghiệp về hệ thống **Gói câu hỏi (Question Packages)**.

---

## 📸 Hiện trạng hệ thống

### 1. Frontend (Angular)
**File**: `fe/src/app/features/teacher/quiz/quiz-bank.component.ts`

**Chức năng hiện tại**:
- ✅ Hiển thị danh sách câu hỏi dạng bảng
- ✅ Tìm kiếm theo nội dung câu hỏi
- ✅ Lọc theo môn học (hardcoded: Luật Hàng hải, Điều động tàu, An toàn hàng hải)
- ✅ CRUD câu hỏi cơ bản (Create, Edit, Delete)
- ✅ Hiển thị độ khó (Dễ, Trung bình, Khó)
- ✅ Checkbox cho bulk selection (chưa có chức năng)

**Vấn đề**:
- ❌ **KHÔNG có khái niệm "Gói câu hỏi"** - tất cả câu hỏi hiển thị lộn xộn
- ❌ Không có phân trang - load tất cả câu hỏi cùng lúc
- ❌ Bulk actions chưa hoạt động
- ❌ Không có drag & drop
- ❌ Không có gói mặc định "Chưa phân loại"
- ❌ Filters cứng trong code, không linh hoạt

### 2. Backend API (Spring Boot)
**File**: `api/src/main/java/com/example/lms/controller/QuestionController.java`

**Endpoints hiện tại**:
```
POST   /api/v1/questions                    - Tạo câu hỏi
GET    /api/v1/questions                    - Lấy danh sách (có filter)
GET    /api/v1/questions/my-questions       - Câu hỏi của tôi
GET    /api/v1/questions/{id}               - Chi tiết câu hỏi
PUT    /api/v1/questions/{id}               - Cập nhật
DELETE /api/v1/questions/{id}               - Xóa
GET    /api/v1/questions/course/{courseId}  - Theo khóa học
POST   /api/v1/questions/by-ids             - Lấy nhiều câu theo IDs
```

**Vấn đề**:
- ❌ **KHÔNG có API cho Packages**
- ❌ Không có bulk move/delete
- ❌ Không có pagination parameters
- ❌ Không có export/import

### 3. Database Schema
**File**: `api/src/main/java/com/example/lms/entity/Question.java`

**Cấu trúc hiện tại**:
```java
@Entity
@Table(name = "questions")
class Question {
    UUID id;
    String content;
    Difficulty difficulty;      // EASY, MEDIUM, HARD
    String tags;                // JSON array
    Status status;              // DRAFT, ACTIVE, INACTIVE
    String correctOption;       // A, B, C, D
    User createdBy;
    Course course;              // FK to course
    Integer usageCount;
    BigDecimal correctRate;
    List<QuestionOption> options;
    Instant createdAt;
    Instant updatedAt;
}
```

**Vấn đề**:
- ❌ **KHÔNG có trường `package_id`**
- ❌ Không có bảng `packages`
- ❌ Không có quan hệ Question ↔ Package

---

## 🎯 Yêu cầu từ đồng nghiệp (Tóm tắt)

### Mục tiêu chính
1. **Tổ chức câu hỏi theo gói** thay vì hiển thị lộn xộn
2. **Gói mặc định "Chưa phân loại"** cho câu hỏi chưa được phân loại
3. **CRUD gói**: Tạo/Sửa/Xóa gói
4. **Bulk operations**: Chuyển nhiều câu hỏi giữa các gói
5. **Drag & Drop**: Kéo thả câu hỏi vào gói
6. **Phân trang**: Load từng gói, không load tất cả
7. **Tìm kiếm nâng cao**: Trong gói hoặc toàn bộ
8. **Export/Import**: Backup và di chuyển gói

### User Stories
1. Tạo gói với tên, mô tả, môn học, giới hạn số câu
2. Xem danh sách gói ở sidebar, click vào xem câu hỏi trong gói
3. Thêm câu hỏi mới trực tiếp vào gói
4. Chọn nhiều câu hỏi và chuyển vào gói (bulk move)
5. Kéo-thả câu hỏi vào gói
6. Tìm kiếm với filters: Môn, Chủ đề, Loại, Độ khó, Ngày tạo
7. Phân trang/load more cho từng gói
8. Xuất/nhập gói (CSV/JSON)

---

## 🏗️ Kiến trúc đề xuất

### 1. Database Schema Changes

#### Bảng mới: `packages`
```sql
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject_id UUID,                    -- FK to subjects (if exists)
    owner_id UUID NOT NULL,             -- FK to users
    visibility VARCHAR(20) DEFAULT 'PRIVATE',  -- PUBLIC, PRIVATE
    capacity INTEGER,                   -- Max questions (nullable)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(name, owner_id, subject_id)  -- Unique per owner+subject
);
```

#### Thay đổi bảng `questions`
```sql
ALTER TABLE questions 
ADD COLUMN package_id UUID REFERENCES packages(id) ON DELETE SET NULL;

CREATE INDEX idx_questions_package_id ON questions(package_id);
```

#### Gói mặc định
```sql
INSERT INTO packages (id, name, description, owner_id, visibility)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Chưa phân loại',
    'Gói mặc định cho câu hỏi chưa được phân loại',
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1),
    'PUBLIC'
);

-- Gán tất cả câu hỏi hiện tại vào gói mặc định
UPDATE questions 
SET package_id = '00000000-0000-0000-0000-000000000001'
WHERE package_id IS NULL;
```

### 2. Backend API Changes

#### Package Entity
```java
@Entity
@Table(name = "packages")
public class Package {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @ManyToOne
    @JoinColumn(name = "subject_id")
    private Subject subject;  // If exists
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Visibility visibility = Visibility.PRIVATE;
    
    @Column
    private Integer capacity;
    
    @OneToMany(mappedBy = "package")
    private List<Question> questions;
    
    @CreationTimestamp
    private Instant createdAt;
    
    @UpdateTimestamp
    private Instant updatedAt;
    
    public enum Visibility {
        PUBLIC, PRIVATE
    }
}
```

#### New API Endpoints
```java
// Package Management
GET    /api/v1/packages                          // List packages (with counts)
POST   /api/v1/packages                          // Create package
GET    /api/v1/packages/{id}                     // Get package details
PUT    /api/v1/packages/{id}                     // Update package
DELETE /api/v1/packages/{id}                     // Delete package
       ?reassignTo={packageId}                   // Reassign questions

// Question Management (Enhanced)
GET    /api/v1/questions                         // Add package_id filter
       ?packageId={id}&page=1&size=20
POST   /api/v1/questions                         // Add packageId in body
PUT    /api/v1/questions/{id}                    // Allow changing packageId

// Bulk Operations
POST   /api/v1/questions/bulk-move               // Move multiple questions
       Body: {questionIds: [], targetPackageId}
POST   /api/v1/questions/bulk-delete             // Delete multiple
       Body: {questionIds: []}

// Export/Import
GET    /api/v1/packages/{id}/export              // Export as JSON/CSV
POST   /api/v1/packages/import                   // Import package
```

### 3. Frontend UI Changes

#### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Toolbar: [+ Add Question] [+ Create Package] [Search]  │
├──────────────┬──────────────────────────────────────────┤
│  Sidebar     │  Main Content Area                       │
│              │                                           │
│  📦 Packages │  📋 Questions in Selected Package        │
│  ├─ Chưa    │  ┌────────────────────────────────────┐  │
│  │  phân    │  │ [✓] Question 1                     │  │
│  │  loại(5) │  │ [✓] Question 2                     │  │
│  ├─ Toán    │  │ [ ] Question 3                     │  │
│  │  lớp 6(12│  └────────────────────────────────────┘  │
│  ├─ Vật lý  │  [Move to Package ▼] [Delete]            │
│  │  (8)     │  Pagination: [1] [2] [3] ... [10]        │
│              │                                           │
└──────────────┴──────────────────────────────────────────┘
```

#### Key Components

**1. Package Sidebar**
- List all packages with question counts
- Highlight selected package
- Drag & drop target zones
- Search/filter packages

**2. Question List**
- Checkbox for bulk selection
- Pagination (20 items/page)
- Drag handles for drag & drop
- Quick actions (Edit, Delete)

**3. Bulk Action Bar**
- Appears when items selected
- "Move to Package" dropdown
- "Delete" button
- "Select All" / "Deselect All"

**4. Package Modal**
- Create/Edit package form
- Fields: Name, Description, Subject, Capacity, Visibility
- Validation

---

## 📋 Implementation Plan (MVP)

### Phase 1: Database & Backend Core (Week 1)
- [ ] 1.1 Create `packages` table migration
- [ ] 1.2 Add `package_id` to `questions` table
- [ ] 1.3 Create default package "Chưa phân loại"
- [ ] 1.4 Migrate existing questions to default package
- [ ] 1.5 Create Package entity
- [ ] 1.6 Create PackageRepository
- [ ] 1.7 Create PackageService (CRUD)
- [ ] 1.8 Create PackageController (REST API)

### Phase 2: Question-Package Integration (Week 1-2)
- [ ] 2.1 Update QuestionService to support packageId
- [ ] 2.2 Add pagination to getQuestions()
- [ ] 2.3 Implement bulk-move endpoint
- [ ] 2.4 Implement bulk-delete endpoint
- [ ] 2.5 Add package filter to search
- [ ] 2.6 Update Question entity with package relationship

### Phase 3: Frontend - Package Management (Week 2)
- [ ] 3.1 Create Package API service
- [ ] 3.2 Create Package sidebar component
- [ ] 3.3 Create Package modal (Create/Edit)
- [ ] 3.4 Implement package list with counts
- [ ] 3.5 Implement package selection
- [ ] 3.6 Update quiz-bank component layout

### Phase 4: Frontend - Question Management (Week 2-3)
- [ ] 4.1 Add pagination to question list
- [ ] 4.2 Implement bulk selection (checkboxes)
- [ ] 4.3 Create bulk action bar
- [ ] 4.4 Implement "Move to Package" functionality
- [ ] 4.5 Update filters to work with packages
- [ ] 4.6 Add package selector to question create/edit

### Phase 5: Drag & Drop (Week 3)
- [ ] 5.1 Install @angular/cdk/drag-drop
- [ ] 5.2 Make questions draggable
- [ ] 5.3 Make package sidebar droppable
- [ ] 5.4 Implement drop handler (call bulk-move API)
- [ ] 5.5 Add visual feedback (drag preview, drop zones)

### Phase 6: Export/Import (Week 4)
- [ ] 6.1 Implement export endpoint (JSON/CSV)
- [ ] 6.2 Implement import endpoint
- [ ] 6.3 Add export button to UI
- [ ] 6.4 Add import modal with file upload
- [ ] 6.5 Validation and error handling

### Phase 7: Polish & Testing (Week 4)
- [ ] 7.1 Add loading states
- [ ] 7.2 Add error handling
- [ ] 7.3 Add confirmation modals
- [ ] 7.4 Optimize queries (N+1 problem)
- [ ] 7.5 Add audit logging
- [ ] 7.6 Write integration tests
- [ ] 7.7 Performance testing

---

## 🎨 UI/UX Mockup (Text-based)

### Main Screen
```
╔═══════════════════════════════════════════════════════════════════╗
║  🎓 Ngân hàng câu hỏi                                             ║
║  ┌──────────┐ ┌──────────────┐ ┌─────────┐ ┌──────────────────┐ ║
║  │ + Câu hỏi│ │ + Tạo gói    │ │ 🔍 Tìm  │ │ Lọc: Môn học ▼  │ ║
║  └──────────┘ └──────────────┘ └─────────┘ └──────────────────┘ ║
╠═══════════════╦═══════════════════════════════════════════════════╣
║ 📦 GÓI CÂU HỎI║  📋 DANH SÁCH CÂU HỎI                            ║
║               ║  ┌─────────────────────────────────────────────┐ ║
║ 🔍 [Tìm gói]  ║  │ [✓] Câu 1: Luật hàng hải quốc tế...        │ ║
║               ║  │ [✓] Câu 2: Điều động tàu trong bão...       │ ║
║ ┌───────────┐ ║  │ [ ] Câu 3: An toàn lao động trên tàu...    │ ║
║ │📁 Chưa    │ ║  └─────────────────────────────────────────────┘ ║
║ │  phân loại│ ║  ┌──────────────────────────────────────────────┐║
║ │  (15)     │ ║  │ 3 câu đã chọn                                │║
║ └───────────┘ ║  │ [Chuyển vào gói ▼] [Xóa]                    │║
║ ┌───────────┐ ║  └──────────────────────────────────────────────┘║
║ │📦 Toán    │ ║  Trang: [1] 2 3 ... 10  (200 câu hỏi)          ║
║ │  lớp 6    │ ║                                                  ║
║ │  (45)     │ ║                                                  ║
║ └───────────┘ ║                                                  ║
║ ┌───────────┐ ║                                                  ║
║ │📦 Vật lý  │ ║                                                  ║
║ │  (23)     │ ║                                                  ║
║ └───────────┘ ║                                                  ║
╚═══════════════╩═══════════════════════════════════════════════════╝
```

---

## ⚠️ Edge Cases & Business Rules

### 1. Default Package
- System creates "Chưa phân loại" on first run
- Cannot be deleted
- All new questions without packageId go here
- ID: `00000000-0000-0000-0000-000000000001`

### 2. Package Deletion
- When deleting package with questions:
  - Option 1: Move to another package (user selects)
  - Option 2: Move to "Chưa phân loại"
  - Cannot delete if no option selected

### 3. Capacity Limits
- If package has capacity limit (e.g., 50 questions)
- Prevent adding more when limit reached
- Show warning in UI: "Gói đã đầy (50/50)"

### 4. Permissions
- Teachers can only manage their own packages
- Admins can manage all packages
- Public packages visible to all, but only owner can edit

### 5. Uniqueness
- Package name must be unique per (owner + subject)
- Allow same name for different subjects

### 6. Audit Trail
- Log all package operations (create, update, delete)
- Log all bulk moves (who, when, from where, to where)

---

## 🧪 Test Cases

### TC1: Create Package
```
Given: User is logged in as teacher
When: User clicks "Create Package"
And: Fills name="Toán lớp 6", description="Câu hỏi toán cơ bản"
And: Clicks "Save"
Then: Package appears in sidebar
And: Count shows (0)
```

### TC2: Add Question to Package
```
Given: Package "Toán lớp 6" exists
When: User creates new question
And: Selects package "Toán lớp 6"
And: Saves question
Then: Package count increases to (1)
And: Question appears when package is selected
```

### TC3: Bulk Move
```
Given: 5 questions in "Chưa phân loại"
When: User selects all 5 questions
And: Clicks "Move to Package" → "Toán lớp 6"
And: Confirms action
Then: 5 questions disappear from "Chưa phân loại"
And: 5 questions appear in "Toán lớp 6"
And: Counts update correctly
```

### TC4: Delete Package with Questions
```
Given: Package "Toán lớp 6" has 10 questions
When: User clicks delete on package
Then: Modal appears asking "Move questions to?"
When: User selects "Chưa phân loại"
And: Confirms
Then: Package is deleted
And: 10 questions moved to "Chưa phân loại"
```

### TC5: Pagination
```
Given: Package has 120 questions
And: Page size = 20
When: User opens package
Then: Shows questions 1-20
And: Shows pagination: [1] 2 3 4 5 6
When: User clicks page 2
Then: Shows questions 21-40
```

### TC6: Drag & Drop
```
Given: Question list is visible
When: User drags question from list
And: Drops on "Toán lớp 6" in sidebar
Then: Question moves to that package
And: Counts update
And: Success message shows
```

---

## 📊 Performance Considerations

### 1. Query Optimization
```java
// BAD: N+1 problem
packages.forEach(pkg -> {
    int count = questionRepo.countByPackageId(pkg.getId());
});

// GOOD: Single query with JOIN
@Query("SELECT p, COUNT(q) FROM Package p LEFT JOIN p.questions q GROUP BY p")
List<Object[]> getPackagesWithCounts();
```

### 2. Pagination
- Always use pagination for question lists
- Default page size: 20
- Max page size: 100

### 3. Caching
- Cache package list (invalidate on create/update/delete)
- Cache question counts per package

### 4. Indexing
```sql
CREATE INDEX idx_questions_package_id ON questions(package_id);
CREATE INDEX idx_questions_created_by ON questions(created_by);
CREATE INDEX idx_packages_owner_id ON packages(owner_id);
```

---

## 🚀 Migration Strategy

### Step 1: Backup
```bash
pg_dump -U postgres -d lms > backup_before_packages.sql
```

### Step 2: Run Migration
```sql
-- Create packages table
CREATE TABLE packages (...);

-- Create default package
INSERT INTO packages (...) VALUES (...);

-- Add package_id to questions
ALTER TABLE questions ADD COLUMN package_id UUID;

-- Migrate existing data
UPDATE questions SET package_id = '00000000-0000-0000-0000-000000000001';

-- Add foreign key
ALTER TABLE questions 
ADD CONSTRAINT fk_questions_package 
FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL;
```

### Step 3: Deploy Backend
- Deploy new API endpoints
- Test with Postman/Swagger

### Step 4: Deploy Frontend
- Deploy new UI
- Show onboarding modal: "Tính năng mới: Gói câu hỏi!"

### Step 5: Monitor
- Check error logs
- Monitor query performance
- Gather user feedback

---

## 📝 Next Steps

### Immediate Actions (This Week)
1. ✅ Review this analysis document
2. ⏳ Get approval from team/stakeholders
3. ⏳ Create database migration scripts
4. ⏳ Set up development branch: `feature/question-packages`

### Short Term (Next 2 Weeks)
1. Implement Phase 1-3 (Backend + Basic UI)
2. Internal testing
3. Fix bugs

### Medium Term (Week 3-4)
1. Implement Phase 4-6 (Advanced features)
2. User acceptance testing
3. Performance optimization

### Long Term (After MVP)
1. Analytics dashboard for packages
2. Package templates
3. Auto-grouping suggestions
4. Collaborative packages (sharing between teachers)

---

## 🤝 Collaboration với đồng nghiệp

Đồng nghiệp đã cung cấp một bản thiết kế rất chi tiết và chuyên nghiệp. Tôi đề xuất:

1. **Họp review**: Cùng đồng nghiệp review document này
2. **Phân công**: 
   - Backend: [Tên người]
   - Frontend: [Tên người]
   - Testing: [Tên người]
3. **Timeline**: 4 tuần cho MVP
4. **Daily standup**: 15 phút mỗi sáng để sync progress

---

## 📚 Tài liệu tham khảo

- [Angular CDK Drag & Drop](https://material.angular.io/cdk/drag-drop/overview)
- [Spring Data JPA Pagination](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#repositories.query-methods)
- [PostgreSQL UUID Best Practices](https://www.postgresql.org/docs/current/datatype-uuid.html)

---

**Tác giả**: Kiro AI Assistant  
**Ngày tạo**: 2025-11-24  
**Phiên bản**: 1.0  
**Trạng thái**: Draft - Chờ review
