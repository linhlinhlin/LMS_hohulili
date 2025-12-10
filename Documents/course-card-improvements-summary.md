# Tổng hợp cải tiến giao diện Card Khóa học

## Tổng quan
Đã áp dụng thiết kế Coursera-style cho các card khóa học trong cả Dashboard và My Courses page với layout grid chuyên nghiệp và spacing hợp lý.

## Các thay đổi chính

### 1. Layout Grid (thay vì Flexbox)

**Trước:**
```scss
.course-card-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

**Sau:**
```scss
.course-card-wrapper {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto;
  grid-template-areas:
    "logo metadata actions"
    "logo progress actions";
  column-gap: 16px;
  row-gap: 10px;
  padding: 16px;
  align-items: start;
}
```

### 2. Cấu trúc HTML mới

**Thứ tự các phần tử:**
1. Partner Logo (grid-area: logo)
2. Course Metadata (grid-area: metadata)
3. Action Buttons (grid-area: actions)
4. Progress Bar (grid-area: progress)

**HTML Template:**
```html
<div class="course-card-wrapper">
  <!-- Partner Logo -->
  <div class="partner-logo">
    <app-icon name="academic-cap" size="sm" />
  </div>

  <!-- Course Metadata -->
  <div class="course-metadata">
    <div class="partner-info">
      <span class="partner-name">LMS Maritime</span>
    </div>
    <h3 class="course-title">
      <a [routerLink]="['/student/course', course.id]">
        {{ course.title }}
      </a>
    </h3>
    <div class="course-meta">
      <span>Khóa học</span>
      <span class="separator">·</span>
      <span>{{ course.progress }}% hoàn thành</span>
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="action-buttons">
    <app-button variant="primary" (clicked)="continueCourse(course.id)">
      Tiếp tục học
    </app-button>
    <button class="dropdown-button" (click)="toggleModules(course.id)">
      <app-icon [name]="course.showModules ? 'chevron-up' : 'chevron-down'" size="sm" />
    </button>
  </div>

  <!-- Progress Bar -->
  <div class="progress-bar-thin">
    <div class="progress-fill" [style.width.%]="course.progress"></div>
  </div>
</div>
```

### 3. Styling cải tiến

#### Partner Logo
```scss
.partner-logo {
  grid-area: logo;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $blue-primary;
  background: #E3F2FD;
  border-radius: 8px;
  flex-shrink: 0;
  align-self: center;
}
```

#### Course Metadata
```scss
.course-metadata {
  grid-area: metadata;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  overflow: visible;
}

.partner-name {
  font-size: 11px;
  color: #6B7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.course-title a {
  font-size: 15px;
  font-weight: 600;
  color: #1F1F1F;
  text-decoration: none;
  line-height: 1.4;
  
  &:hover {
    color: $blue-primary;
    text-decoration: underline;
  }
}

.course-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 12px;
  color: #6B7280;
}
```

#### Progress Bar
```scss
.progress-bar-thin {
  grid-area: progress;
  width: 100%;
  height: 6px;
  background: #E5E7EB;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  align-self: start;
  margin-top: 2px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $blue-primary 0%, #2563EB 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}
```

#### Action Buttons
```scss
.action-buttons {
  grid-area: actions;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-self: end;
  align-self: center;

  app-button {
    white-space: nowrap;
    font-size: 14px;
    font-weight: 600;
    padding: 8px 20px;
    height: 36px;
  }
}

.dropdown-button {
  padding: 4px;
  background: transparent;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  cursor: pointer;
  color: #6B7280;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;

  &:hover {
    background: #F9FAFB;
    border-color: #D1D5DB;
    color: #374151;
  }
}
```

### 4. Modules Dropdown

```scss
.modules-dropdown {
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 16px;
  margin: -8px 16px 0 16px; // Dashboard
  // hoặc
  margin: -8px 0 0 0; // My Courses
}

.module-item {
  margin-bottom: 16px;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.module-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.lessons-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 22px;
}

.lesson-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &:hover {
    background: #E5E7EB;
    border-color: #D1D5DB;
  }

  &.completed {
    .lesson-title {
      color: #9CA3AF;
      text-decoration: line-through;
    }
  }
}

.lesson-title {
  font-size: 13px;
  color: #374151;
  flex: 1;
  line-height: 1.4;
}

.check-icon {
  color: #10B981;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
}
```

### 5. Card Container Styling

```scss
.course-card-wrapper {
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  overflow: visible;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  margin: 0 16px; // Dashboard
  // hoặc không có margin cho My Courses

  &:hover {
    background: #F9FAFB;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
}
```

### 6. Courses List Layout

**Dashboard:**
```scss
.courses-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

**My Courses (có thể dùng grid nếu muốn):**
```scss
.courses-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

### 7. Responsive Design

```scss
@media (max-width: 640px) {
  .course-card-wrapper {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto auto;
    grid-template-areas:
      "logo metadata"
      "logo progress"
      "actions actions";
    row-gap: 8px;
    padding: 12px;
    margin: 0 8px;
  }

  .action-buttons {
    justify-self: stretch;
    
    app-button {
      flex: 1;
    }
  }
}
```

### 8. Spacing và Typography

**Header:**
```scss
.dashboard-header {
  margin-bottom: 24px;
  padding: 24px 16px 16px 16px;
}

.greeting {
  font-size: 32px;
  font-weight: 700;
  color: #1F1F1F;
  margin: 0 0 12px 0;
  line-height: 1.2;
  letter-spacing: -0.8px;
}
```

**Sections:**
```scss
.courses-section {
  margin-bottom: 24px;
  padding: 0 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
```

**Sidebar:**
```scss
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 16px 16px 0;
}

.widget {
  padding: 20px;
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }
}
```

## Lợi ích của thiết kế mới

1. **Layout chuyên nghiệp**: Grid layout giúp các phần tử được sắp xếp chính xác và nhất quán
2. **Responsive tốt hơn**: Dễ dàng điều chỉnh layout cho mobile với grid areas
3. **Visual hierarchy rõ ràng**: Progress bar nằm đúng vị trí, không gây nhầm lẫn
4. **Spacing hợp lý**: Khoảng cách giữa các phần tử được tối ưu
5. **Hover effects mượt mà**: Transitions và shadows tạo cảm giác tương tác tốt
6. **Typography cải thiện**: Font sizes và weights phù hợp với từng cấp độ thông tin
7. **Modules dropdown đẹp**: Kết nối mượt mà với card, styling nhất quán

## Files đã cập nhật

1. **fe/src/app/features/student/dashboard/student-dashboard.component.html**
   - Cập nhật cấu trúc HTML cho course cards
   - Di chuyển progress bar xuống dưới metadata
   - Cập nhật modules dropdown structure

2. **fe/src/app/features/student/dashboard/student-dashboard.component.scss**
   - Chuyển từ flexbox sang grid layout
   - Cập nhật tất cả styling cho các phần tử
   - Thêm responsive design cho mobile

3. **fe/src/app/features/student/student-my-courses.component.ts**
   - Cập nhật inline template với cấu trúc mới
   - Cập nhật inline styles với grid layout
   - Thêm responsive design

## Kết luận

Giao diện card khóa học đã được cải thiện đáng kể với thiết kế Coursera-style chuyên nghiệp. Layout grid giúp các phần tử được sắp xếp chính xác, spacing hợp lý tạo cảm giác thoáng đãng, và hover effects mượt mà tạo trải nghiệm người dùng tốt hơn.
