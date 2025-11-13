# 🎓 Frontend Integration Guide - Teacher Module
**Last Updated**: November 13, 2025  
**Target**: Angular v20 Frontend (fe/)  
**Status**: ✅ Ready for Integration

---

## 📌 Quick Summary

- ✅ **Backend**: 100% Ready - No changes needed
- 🔄 **Frontend**: Copy components + Update routing
- ⏱️ **Timeline**: ~1 day to complete
- 📊 **Total Components**: 30+ Angular components ready to integrate

---

## 🚀 Start Here

### Prerequisites
```bash
# Ensure you have:
✓ Git access to repo
✓ Node.js v18+
✓ Angular CLI latest
✓ Backend running: http://localhost:8080
✓ Postman (for API testing)
```

### Folder Structure
```
ThamKhao/
├── README.md                    ← Overview
├── FRONTEND_INTEGRATION_GUIDE.md ← YOU ARE HERE
├── backend/                     ← Backend files (no changes needed)
│   └── api/src/main/java/...   (35 Java files - ready to use)
│
└── frontend/                    ← Copy components from here
    └── fe/src/app/features/teacher/
        ├── teacher.component.ts
        ├── teacher.routes.ts
        ├── types/
        ├── services/
        ├── shared/
        ├── dashboard/
        ├── courses/
        ├── students/
        ├── assignments/
        ├── quiz/
        ├── grading/
        ├── analytics/
        └── notifications/
```

---

## 📋 Components to Integrate

| Component | Type | Source | Action |
|-----------|------|--------|--------|
| **Dashboard** | Page | `dashboard/teacher-dashboard.component.ts` | Copy + Test |
| **Courses** | Page | `courses/*.ts` | Copy |
| **Assignments** | Page | `assignments/*.ts` | Copy |
| **Quiz System** | Page | `quiz/*.ts` | Copy |
| **Grading** | Page | `grading/*.ts` | Copy (NEW) |
| **Analytics** | Page | `analytics/*.ts` | Copy (NEW) |
| **Students** | Page | `students/*.ts` | Copy |
| **Notifications** | Widget | `notifications/*.ts` | Copy |
| **TeacherService** | Service | `services/teacher.service.ts` | Merge |
| **TeacherTypes** | Types | `types/teacher.types.ts` | Sync |
| **Routes** | Config | `teacher.routes.ts` | Merge |

---

## ⚙️ Step-by-Step Integration

### Phase 1: Backup & Setup (5 minutes)

**Step 1.1: Create backup branch**
```bash
git checkout -b backup/frontend-$(date +%Y%m%d)
git push origin backup/frontend-$(date +%Y%m%d)
git checkout main
```

**Step 1.2: Verify backend is running**
```bash
# Terminal 1
cd api
mvn spring-boot:run

# Verify: http://localhost:8080/swagger-ui.html
# Should show 25+ teacher API endpoints
```

---

### Phase 2: Copy Components (30 minutes)

**Step 2.1: Copy Dashboard**
```bash
# FROM ThamKhao:
cp ThamKhao/frontend/fe/src/app/features/teacher/dashboard/* \
   fe/src/app/features/teacher/dashboard/

# Files: teacher-dashboard.component.ts, .html, .scss
```

**Step 2.2: Copy Courses Module**
```bash
cp -r ThamKhao/frontend/fe/src/app/features/teacher/courses/* \
   fe/src/app/features/teacher/courses/

# Files:
# - course-management.component.ts
# - course-creation.component.ts
# - course-editor.component.ts
# - section-list.component.ts
# - section-editor.component.ts
```

**Step 2.3: Copy Assignments Module**
```bash
cp -r ThamKhao/frontend/fe/src/app/features/teacher/assignments/* \
   fe/src/app/features/teacher/assignments/

# Files:
# - assignment-management.component.ts
# - assignment-creation.component.ts
# - assignment-editor.component.ts
# - assignment-detail.component.ts
# - assignment-submissions.component.ts
# - assignment-grader.component.ts
```

**Step 2.4: Copy Quiz Module**
```bash
cp -r ThamKhao/frontend/fe/src/app/features/teacher/quiz/* \
   fe/src/app/features/teacher/quiz/

# Files: quiz-*.component.ts, question-*.component.ts, quiz.routes.ts
```

**Step 2.5: Copy Grading System (NEW)**
```bash
mkdir -p fe/src/app/features/teacher/grading
cp -r ThamKhao/frontend/fe/src/app/features/teacher/grading/* \
   fe/src/app/features/teacher/grading/

# Files:
# - advanced-grading-system.component.ts
# - rubric-manager.component.ts
# - rubric-creator.component.ts
# - rubric-editor.component.ts
```

**Step 2.6: Copy Analytics (NEW)**
```bash
mkdir -p fe/src/app/features/teacher/analytics
cp -r ThamKhao/frontend/fe/src/app/features/teacher/analytics/* \
   fe/src/app/features/teacher/analytics/

# Files: teacher-analytics.component.ts, .html, .scss
```

**Step 2.7: Copy Other Modules**
```bash
# Students
cp -r ThamKhao/frontend/fe/src/app/features/teacher/students/* \
   fe/src/app/features/teacher/students/

# Notifications
mkdir -p fe/src/app/features/teacher/notifications
cp -r ThamKhao/frontend/fe/src/app/features/teacher/notifications/* \
   fe/src/app/features/teacher/notifications/

# Types
cp ThamKhao/frontend/fe/src/app/features/teacher/types/teacher.types.ts \
   fe/src/app/features/teacher/types/
```

---

### Phase 3: Update Routes (20 minutes)

**Step 3.1: Review Current Routes**
```bash
# Check current teacher routes
cat fe/src/app/features/teacher/teacher.routes.ts

# Should already have basic structure
```

**Step 3.2: Merge New Routes from ThamKhao**

File: `fe/src/app/features/teacher/teacher.routes.ts`

Update to include ALL these routes:
```typescript
import { Routes } from '@angular/router';
import { teacherGuard } from '../../core/guards/role.guard';
import { quizRoutes } from './quiz/quiz.routes';

export const teacherRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shared/teacher-layout-simple.component')
      .then(m => m.TeacherLayoutSimpleComponent),
    canActivate: [teacherGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      
      // Dashboard
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/teacher-dashboard.component')
          .then(m => m.TeacherDashboardComponent),
        data: { title: 'Bảng điều khiển' }
      },
      
      // Courses
      {
        path: 'courses',
        children: [
          {
            path: '',
            loadComponent: () => import('./courses/course-management.component')
              .then(m => m.CourseManagementComponent),
            data: { title: 'Quản lý khóa học' }
          },
          {
            path: 'create',
            loadComponent: () => import('./courses/course-creation.component')
              .then(m => m.CourseCreationComponent),
            data: { title: 'Tạo khóa học' }
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./courses/course-editor.component')
              .then(m => m.CourseEditorComponent),
            data: { title: 'Chỉnh sửa khóa học' }
          },
        ]
      },
      
      // Assignments
      {
        path: 'assignments',
        children: [
          {
            path: '',
            loadComponent: () => import('./assignments/assignment-management.component')
              .then(m => m.AssignmentManagementComponent),
            data: { title: 'Quản lý bài tập' }
          },
          {
            path: 'create',
            loadComponent: () => import('./assignments/assignment-creation.component')
              .then(m => m.AssignmentCreationComponent),
            data: { title: 'Tạo bài tập' }
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./assignments/assignment-editor.component')
              .then(m => m.AssignmentEditorComponent),
            data: { title: 'Chỉnh sửa bài tập' }
          },
          {
            path: ':id/submissions',
            loadComponent: () => import('./assignments/assignment-submissions.component')
              .then(m => m.AssignmentSubmissionsComponent),
            data: { title: 'Bài nộp' }
          },
          {
            path: ':id/grade',
            loadComponent: () => import('./assignments/assignment-grader.component')
              .then(m => m.AssignmentGraderComponent),
            data: { title: 'Chấm bài' }
          },
        ]
      },
      
      // Quiz
      {
        path: 'quiz',
        children: quizRoutes
      },
      
      // Grading
      {
        path: 'grading',
        children: [
          {
            path: '',
            loadComponent: () => import('./grading/advanced-grading-system.component')
              .then(m => m.AdvancedGradingSystemComponent),
            data: { title: 'Hệ thống chấm điểm' }
          },
          {
            path: 'rubrics',
            loadComponent: () => import('./grading/rubric-manager.component')
              .then(m => m.RubricManagerComponent),
            data: { title: 'Quản lý rubric' }
          },
          {
            path: 'rubrics/create',
            loadComponent: () => import('./grading/rubric-creator.component')
              .then(m => m.RubricCreatorComponent),
            data: { title: 'Tạo rubric' }
          },
        ]
      },
      
      // Analytics
      {
        path: 'analytics',
        loadComponent: () => import('./analytics/teacher-analytics.component')
          .then(m => m.TeacherAnalyticsComponent),
        data: { title: 'Phân tích' }
      },
      
      // Students
      {
        path: 'students',
        children: [
          {
            path: '',
            loadComponent: () => import('./students/student-management.component')
              .then(m => m.StudentManagementComponent),
            data: { title: 'Quản lý học viên' }
          },
          {
            path: ':id',
            loadComponent: () => import('./students/student-detail.component')
              .then(m => m.StudentDetailComponent),
            data: { title: 'Chi tiết học viên' }
          },
        ]
      },
      
      // Notifications
      {
        path: 'notifications',
        loadComponent: () => import('./notifications/teacher-notifications.component')
          .then(m => m.TeacherNotificationsComponent),
        data: { title: 'Thông báo' }
      },
    ]
  }
];
```

**Step 3.3: Verify App Routes Include Teacher**

File: `fe/src/app/app.routes.ts`

Ensure it has:
```typescript
import { teacherRoutes } from './features/teacher/teacher.routes';
import { teacherGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // ... other routes ...
  {
    path: 'teacher',
    children: teacherRoutes,
    // canActivate: [teacherGuard]  // Optional if guard in teacherRoutes
  },
  // ... other routes ...
];
```

---

### Phase 4: Service & Type Verification (15 minutes)

**Step 4.1: Update TeacherService**

File: `fe/src/app/features/teacher/infrastructure/services/teacher.service.ts`

Verify it has these methods:
```typescript
export class TeacherService {
  // State signals
  private _courses = signal<TeacherCourse[]>([]);
  private _students = signal<TeacherStudent[]>([]);
  private _assignments = signal<TeacherAssignment[]>([]);
  private _isLoading = signal(false);
  
  // Computed signals
  readonly courses = computed(() => this._courses());
  readonly students = computed(() => this._students());
  readonly assignments = computed(() => this._assignments());
  readonly totalStudents = computed(() => this._students().length);
  readonly totalCourses = computed(() => this._courses().length);
  
  // API Methods
  loadMyCourses(page: number = 0, size: number = 10) { /* ... */ }
  loadStudents(courseId: string) { /* ... */ }
  loadAssignments() { /* ... */ }
  createCourse(data: CreateCourseRequest): Observable<TeacherCourse> { /* ... */ }
  updateCourse(id: string, data: UpdateCourseRequest): Observable<TeacherCourse> { /* ... */ }
  deleteCourse(id: string): Observable<void> { /* ... */ }
  enrollStudent(courseId: string, studentId: string): Observable<any> { /* ... */ }
  bulkEnrollStudents(courseId: string, file: File): Observable<any> { /* ... */ }
}
```

**Step 4.2: Sync TeacherTypes**

File: `fe/src/app/features/teacher/types/teacher.types.ts`

Ensure includes:
```typescript
export interface TeacherCourse {
  id: string;
  code: string;
  title: string;
  description: string;
  status: 'draft' | 'pending' | 'approved' | 'published';
  teacherId: string;
  teacherName: string;
  studentCount: number;
  sections: Section[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherStudent {
  id: string;
  name: string;
  email: string;
  enrollmentDate: Date;
  progress: number;
  coursesEnrolled: number;
}

export interface TeacherAssignment {
  id: string;
  title: string;
  courseId: string;
  dueDate: Date;
  submitted: number;
  pending: number;
  status: 'pending' | 'submitted' | 'graded';
}

export interface CreateCourseRequest {
  code: string;
  title: string;
  description: string;
}

export interface CreateAssignmentRequest {
  title: string;
  description: string;
  courseId: string;
  dueDate: Date;
  maxScore: number;
}

export interface CreateQuizRequest {
  title: string;
  description: string;
  lessonId: string;
  timeLimit: number;
  passingScore: number;
}

// ... more interfaces as needed
```

---

### Phase 5: Build & Test (20 minutes)

**Step 5.1: Install Dependencies**
```bash
cd fe
npm install
```

**Step 5.2: Build**
```bash
ng build
# or
npm run build

# Should complete WITHOUT errors
```

**Step 5.3: Run Development Server**
```bash
ng serve --open
# or
npm start

# Browser opens to http://localhost:4200
```

**Step 5.4: Test Routes**

Navigate to these URLs and verify they load:
- ✅ http://localhost:4200/teacher/dashboard
- ✅ http://localhost:4200/teacher/courses
- ✅ http://localhost:4200/teacher/assignments
- ✅ http://localhost:4200/teacher/quiz
- ✅ http://localhost:4200/teacher/grading
- ✅ http://localhost:4200/teacher/analytics
- ✅ http://localhost:4200/teacher/students
- ✅ http://localhost:4200/teacher/notifications

---

### Phase 6: API Integration Testing (30 minutes)

**Step 6.1: Test Authentication**

Login to application:
- Navigate to login page
- Use test credentials
- Should redirect to teacher dashboard

**Step 6.2: Test API Calls**

In browser console while on `/teacher/dashboard`:

```javascript
// Test 1: Get courses
fetch('http://localhost:8080/api/v1/courses/my-courses', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => r.json())
.then(d => console.log('Courses:', d));

// Test 2: Get students
fetch('http://localhost:8080/api/v1/courses/{courseId}/students', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => r.json())
.then(d => console.log('Students:', d));
```

**Step 6.3: Manual User Testing**

| Feature | Test Case | Expected Result |
|---------|-----------|-----------------|
| **Dashboard** | Load dashboard | Shows courses, assignments, students count |
| **Create Course** | Click create → fill form → submit | Course created in backend |
| **View Courses** | Navigate to courses page | Lists all my courses |
| **Edit Course** | Click edit → modify → save | Changes saved to backend |
| **Delete Course** | Click delete → confirm | Course removed |
| **Enroll Student** | Single enroll student | Student added to course |
| **Bulk Enroll** | Upload Excel with emails | Multiple students enrolled |
| **Create Assignment** | Dashboard → create assignment | Assignment saved |
| **Create Quiz** | Navigate to quiz → create | Quiz saved with questions |
| **Grade Assignment** | View submissions → grade → submit | Grades saved |
| **View Analytics** | Go to analytics | Stats display correctly |

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Cannot find module"
```
Error: Cannot find module '@app/features/teacher/...'
```
**Solution:**
- Check import paths are correct
- Verify files were copied successfully
- Run: `ng build --prod` to see full errors

### Issue 2: "TeacherService not found"
```
Error: NullInjectorError: No provider for TeacherService
```
**Solution:**
- Ensure TeacherService is marked `@Injectable({ providedIn: 'root' })`
- Check it's imported in component
- Verify module/component standalone setup

### Issue 3: "API 404 - endpoint not found"
```
Error: 404 /api/v1/courses/my-courses
```
**Solution:**
- Verify backend is running on :8080
- Check endpoint spelling
- Confirm JWT token is valid
- Test with Postman: `curl -H "Authorization: Bearer TOKEN" http://localhost:8080/api/v1/courses/my-courses`

### Issue 4: "CORS error"
```
Error: Access to XMLHttpRequest blocked by CORS policy
```
**Solution:**
- Backend SecurityConfig already allows CORS
- Check if backend is actually running
- Verify API URL in environment.ts

### Issue 5: "Signals not updating"
```
No data shown on dashboard even though API returns data
```
**Solution:**
- Check TeacherService is calling `.set()` on signals
- Verify `changeDetection: ChangeDetectionStrategy.OnPush` exists
- Ensure signals are wrapped in `computed()` if needed

---

## ✅ Validation Checklist

### Before Deployment

**Code Quality**
- [ ] `ng build` passes without errors
- [ ] No console errors in browser
- [ ] No TypeScript compilation errors
- [ ] All imports resolved correctly

**Functionality**
- [ ] Can login as teacher
- [ ] Dashboard loads and shows data
- [ ] Can create/edit/delete courses
- [ ] Can create/edit/delete assignments
- [ ] Can create quizzes with questions
- [ ] Can view student list
- [ ] Can enroll students (single & bulk)
- [ ] Can grade assignments
- [ ] Can view analytics

**Performance**
- [ ] Dashboard loads in < 2 seconds
- [ ] Lists are paginated (no 1000+ rows loaded at once)
- [ ] No memory leaks (browser DevTools)

**Backend Integration**
- [ ] All API calls return correct data
- [ ] Token refresh works
- [ ] Permission checks enforced (can't access other teacher's courses)
- [ ] Error messages display properly

---

## 📞 Support

**If stuck:**

1. **Check error message** - Usually tells what's wrong
2. **Look at console** - Browser F12 → Console tab
3. **Verify backend** - Is it running? Can you access Swagger?
4. **Check routes** - Are all routes properly defined?
5. **Test API** - Use Postman to test endpoint directly

---

## 🎯 Next Steps

1. ✅ Copy this folder to team
2. ✅ Follow Phase 1-6 step by step
3. ✅ Test each phase before moving to next
4. ✅ Run validation checklist before go-live
5. ✅ Deploy to production

**Estimated Time**: ~1 full workday  
**Team**: Frontend developers only  
**Backend**: Already ready ✅

---

**Good luck! 🚀**
