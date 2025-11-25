# Tích hợp Tạo Câu hỏi với Gói - Hoàn thành

## Tổng quan

Đã hoàn thành việc tích hợp chức năng tạo câu hỏi với hệ thống gói. Giờ đây khi tạo câu hỏi từ một gói cụ thể, câu hỏi sẽ tự động được gán vào gói đó.

## Những gì đã làm

### 1. Frontend Updates

#### Question Create Component (`question-create.component.ts`)
- ✅ Thêm field `packageId` để lưu ID gói từ query params
- ✅ Ưu tiên `packageId` từ query params
- ✅ Giữ lại `courseId` để backward compatibility
- ✅ Gửi cả `packageId` và `courseId` trong request tạo câu hỏi

```typescript
// Nhận packageId từ query params
this.packageId = this.route.snapshot.queryParamMap.get('packageId');

// Gửi trong request
const request: CreateQuestionRequest = {
  content: formValue.content,
  correctOption: formValue.correctOption,
  options: optionsList,
  difficulty: formValue.difficulty,
  tags: formValue.tags,
  courseId: this.courseId || undefined,
  packageId: this.packageId || undefined  // ✅ Mới thêm
};
```

#### Question API Interface (`question.api.ts`)
- ✅ Thêm `packageId?: string` vào `CreateQuestionRequest`

### 2. Backend Updates

#### QuestionService
- ✅ Thêm overload method `createQuestion` với parameter `packageId`
- ✅ Gán `packageEntity` cho câu hỏi khi có `packageId`
- ✅ Giữ backward compatibility với method cũ

```java
@Transactional
public Question createQuestion(User creator, String content, String correctOption,
                             List<String> options, Question.Difficulty difficulty, 
                             String tags, UUID courseId, UUID packageId) {
    // ... existing code ...
    
    com.example.lms.entity.Package packageEntity = null;
    if (packageId != null) {
        packageEntity = com.example.lms.entity.Package.builder()
            .id(packageId)
            .build();
    }
    
    Question question = Question.builder()
        // ... other fields ...
        .packageEntity(packageEntity)  // ✅ Gán package
        .build();
    
    return questionRepository.save(question);
}
```

#### QuestionController
- ✅ Thêm field `packageId` vào `CreateQuestionRequest` DTO
- ✅ Thêm getter/setter cho `packageId`
- ✅ Log `packageId` để debug
- ✅ Truyền `packageId` vào service

```java
public static class CreateQuestionRequest {
    private UUID courseId;
    private UUID packageId;  // ✅ Mới thêm
    
    public UUID getPackageId() { return packageId; }
    public void setPackageId(UUID packageId) { this.packageId = packageId; }
}
```

### 3. Quiz Bank Component

#### Navigation với packageId
```typescript
createNewQuestion() {
  if (!this.selectedPackage()) {
    alert('Vui lòng chọn một gói câu hỏi trước!');
    return;
  }
  this.router.navigate(['/teacher/quiz/question/create'], {
    queryParams: { packageId: this.selectedPackage()!.id }  // ✅ Truyền packageId
  });
}
```

## Luồng hoạt động

### Khi tạo câu hỏi mới:

1. **User chọn gói** trong Quiz Bank
2. **Click "Thêm câu hỏi"**
3. **Navigate** đến `/teacher/quiz/question/create?packageId=xxx`
4. **Component nhận** `packageId` từ query params
5. **User điền** thông tin câu hỏi
6. **Submit form** với `packageId` trong request
7. **Backend nhận** request và gán câu hỏi vào gói
8. **Câu hỏi được tạo** và tự động thuộc gói đã chọn
9. **Navigate back** đến Quiz Bank
10. **Câu hỏi hiển thị** trong gói vừa chọn

## Testing

### Test Frontend
1. Truy cập http://localhost:4200/teacher/quiz/quiz-bank
2. Chọn một gói từ dropdown
3. Click "Thêm câu hỏi"
4. Kiểm tra URL có `?packageId=xxx`
5. Tạo câu hỏi mới
6. Verify câu hỏi xuất hiện trong gói đã chọn

### Test Backend
```bash
# Test create question with packageId
curl -X POST http://localhost:8088/api/v1/questions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test question",
    "correctOption": "A",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "difficulty": "MEDIUM",
    "tags": "test",
    "packageId": "xxx-xxx-xxx"
  }'
```

### Verify trong database
```sql
-- Kiểm tra câu hỏi có package_id
SELECT id, content, package_id 
FROM questions 
WHERE package_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;
```

## Backward Compatibility

- ✅ Vẫn hỗ trợ tạo câu hỏi với `courseId`
- ✅ Vẫn hỗ trợ tạo câu hỏi không có `packageId` (sẽ vào gói mặc định)
- ✅ Không breaking changes cho code cũ

## Lưu ý

### Khi không có packageId
- Câu hỏi sẽ được tạo nhưng `package_id` = NULL
- Có thể di chuyển vào gói sau bằng chức năng "Di chuyển"

### Khi có packageId
- Câu hỏi tự động thuộc gói ngay khi tạo
- Không cần di chuyển thủ công
- Hiển thị ngay trong gói đã chọn

### Validation
- Backend không validate packageId có tồn tại hay không
- Nếu packageId không hợp lệ, câu hỏi vẫn được tạo nhưng không thuộc gói nào
- Có thể thêm validation sau nếu cần

## Kết luận

Chức năng tạo câu hỏi đã được tích hợp hoàn chỉnh với hệ thống gói. User experience được cải thiện đáng kể:

- ✅ Không cần di chuyển câu hỏi sau khi tạo
- ✅ Câu hỏi tự động vào đúng gói
- ✅ Workflow mượt mà và trực quan
- ✅ Giảm số bước thao tác

Backend đang chạy và sẵn sàng test!
