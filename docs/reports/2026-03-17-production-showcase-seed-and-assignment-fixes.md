# Production Showcase Seed and Assignment Fixes

Ngay lap: 2026-03-17  
Moi truong: production `https://holilihu.online`

## Muc tieu

Hoan thien du lieu showcase production de test he thong theo dung luong day du:

- 2 khoa hoc noi dung tieng Viet co dau, bai ban, dai, co cau truc ro rang
- 1 lop hoc instructor-led gan vao 1 trong 2 khoa hoc
- cover image, handbook PDF, intro video, lesson videos
- quiz luyen tap, bai kiem tra, bai thi, certificate PDF
- assignment lop hoc co bai nop thuc te
- smoke lai teacher, student, certificate, assignment, lesson runtime

## Ket qua tong quan

Da tao thanh cong:

- 1 khoa hoc `SELF_PACED` showcase
- 1 khoa hoc `INSTRUCTOR_LED` showcase
- 1 lop hoc showcase gan vao khoa hoc instructor-led
- 1 assignment lop hoc co bai nop that
- 2 certificate PDF da cap va tai duoc

Production hien o trang thai:

- backend health `UP`
- student nhin thay assignment lop hoc
- teacher list + detail assignment dong bo metadata `CLASS`
- lesson/quiz/certificate routes hoat dong
- UI student tasks va teacher assignments smoke qua Playwright khong co console error

## Showcase du lieu da tao

### 1. Khoa tu hoc

- Tieu de: `An toàn boong tàu và Permit to Work thực hành (17-03-2026 03:51)`
- `courseId`: `b786ee0c-175d-4b6c-8b4b-c1e42171d061`
- `publicationId`: `b5b873b0-2fd0-4833-acc1-63f2a4ff1beb`
- `certificateId`: `e2a77c63-70ad-4152-b65d-bdc4a25b6459`
- `enrollmentId`: `d5c40e5f-897c-4eca-b124-12b81cf25c58`
- `deliveryMode`: `SELF_PACED`

Tai san local:

- Cover: [an-toan-boong...cover.png](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/assets/an-toan-boong-tau-va-permit-to-work-thuc-hanh-17-03-2026-03-51-cover.png)
- Handbook: [an-toan-boong...handbook.pdf](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/assets/an-toan-boong-tau-va-permit-to-work-thuc-hanh-17-03-2026-03-51-handbook.pdf)
- Intro video: [an-toan-boong...intro.mp4](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/assets/an-toan-boong-tau-va-permit-to-work-thuc-hanh-17-03-2026-03-51-intro.mp4)
- Certificate PDF: [an-toan-boong...certificate.pdf](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/assets/an-toan-boong-tau-va-permit-to-work-thuc-hanh-17-03-2026-03-51-certificate.pdf)

Route mau:

- Course learn: [self-paced lesson screenshot](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/playwright/self-paced-lesson-auth.png)
- Certificate list: [student certificates screenshot](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/playwright/student-certificates-auth.png)

### 2. Khoa hoc lop hoc

- Tieu de: `Radar ARPA và phối hợp buồng lái trong mật độ giao thông cao (17-03-2026 03:51)`
- `courseId`: `3d65ffed-8129-45fa-a736-305fcebc53bd`
- `publicationId`: `31d5e5b6-0205-46a8-8ec9-d072f8106f8c`
- `classId`: `bce93631-a606-4ab2-a7b6-3239b0160ce7`
- `assignmentId`: `0701bfba-8384-4b2a-bee9-f6bea834166e`
- `certificateId`: `886fd5b9-38d5-4efb-97df-cf9e640591b4`
- `enrollmentId`: `5a140065-d145-478f-913f-fe940fbf55ed`
- `deliveryMode`: `INSTRUCTOR_LED`

Tai san local:

- Cover: [radar-arpa...cover.png](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/assets/radar-arpa-va-phoi-hop-buong-lai-trong-mat-do-giao-thong-cao-17-03-2026-03-51-cover.png)
- Handbook: [radar-arpa...handbook.pdf](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/assets/radar-arpa-va-phoi-hop-buong-lai-trong-mat-do-giao-thong-cao-17-03-2026-03-51-handbook.pdf)
- Intro video: [radar-arpa...intro.mp4](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/assets/radar-arpa-va-phoi-hop-buong-lai-trong-mat-do-giao-thong-cao-17-03-2026-03-51-intro.mp4)
- Certificate PDF: [radar-arpa...certificate.pdf](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/assets/radar-arpa-va-phoi-hop-buong-lai-trong-mat-do-giao-thong-cao-17-03-2026-03-51-certificate.pdf)

Route mau:

- Lesson runtime: [instructor lesson screenshot](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/playwright/instructor-lesson-auth.png)
- Student task inbox: [student tasks screenshot](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/playwright/student-tasks-auth.png)
- Teacher assignment list: [teacher assignments screenshot](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/playwright/teacher-assignment-list-auth.png)

## Cac fix phat sinh trong qua trinh tao showcase

### 1. Xac nhan xoa du lieu offline

- Da bo sung confirm modal cho quick-delete download button.
- File: [course-download-button.component.ts](E:/Sach/Sua/LMS_hohulili/fe/src/app/shared/components/course-download-button/course-download-button.component.ts)

### 2. Certificate PDF Unicode

- Sua PDF service de embed font Unicode dung cach, khong con vo dau tren certificate.
- File: [CertificatePdfService.java](E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/learning_delivery/infrastructure/pdf/CertificatePdfService.java)

### 3. FK cho `learning_classes.course_version_id`

- Them migration de tro dung sang `course_publications(id)`.
- File: [V94__learning_classes_publication_fk.sql](E:/Sach/Sua/LMS_hohulili/backend/src/main/resources/db/migration/V94__learning_classes_publication_fk.sql)

### 4. Create assignment suy ra `distributionType`

- Neu request gui `classId` ma bo trong `distributionType`, backend gio tu suy ra `CLASS`.
- Files:
  - [CreateAssignmentUseCaseV3.java](E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/assessment/application/usecase/CreateAssignmentUseCaseV3.java)
  - [AssignmentControllerV3.java](E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/assessment/infrastructure/web/AssignmentControllerV3.java)

### 5. Student assignment visibility khi enrollment da `COMPLETED`

- Goc loi:
  - student showcase cua khoa hoc instructor-led da dat `progress = 100` va `status = completed`
  - luong assignment list/access lai chi doc enrollment `ACTIVE`
  - ket qua la assignment lop hoc co that, co bai nop that, nhung student inbox khong hien
- Fix:
  - doi access/query layer sang `findActiveAndCompletedWithClass(studentId)`
- Files:
  - [StudentAssessmentAccessAdapter.java](E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/assessment/infrastructure/persistence/StudentAssessmentAccessAdapter.java)
  - [StudentAssignmentQueryAdapter.java](E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/assessment/infrastructure/persistence/StudentAssignmentQueryAdapter.java)
  - [StudentAssessmentAccessAdapterTest.java](E:/Sach/Sua/LMS_hohulili/backend/src/test/java/com/example/lms/assessment/infrastructure/persistence/StudentAssessmentAccessAdapterTest.java)
  - [StudentAssignmentQueryAdapterTest.java](E:/Sach/Sua/LMS_hohulili/backend/src/test/java/com/example/lms/assessment/infrastructure/persistence/StudentAssignmentQueryAdapterTest.java)

### 6. Teacher course assignment list bi thieu `classId/distributionType`

- Goc loi:
  - endpoint `/teacher/assignments/courses/{courseId}` tra thang use case result thô
  - endpoint summary tong va detail thi da enrich allocation metadata
- Fix:
  - cho endpoint theo course di qua `enrichAssignmentSummaries(...)`
- Files:
  - [AssignmentControllerV3.java](E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/assessment/infrastructure/web/AssignmentControllerV3.java)
  - [AssignmentControllerV3CreateFlowTest.java](E:/Sach/Sua/LMS_hohulili/backend/src/test/java/com/example/lms/assessment/infrastructure/web/AssignmentControllerV3CreateFlowTest.java)

## Kiem tra sau khi fix

### Student

- `GET /api/v3/student/assignments` co assignment `0701bfba-8384-4b2a-bee9-f6bea834166e`
- `GET /api/v3/student/assignments/0701bfba-8384-4b2a-bee9-f6bea834166e` tra `200`
- `GET /api/v3/student/assignments/0701bfba-8384-4b2a-bee9-f6bea834166e/submission` tra `200`
- `GET /api/v3/student/certificates` tra du 2 chung chi showcase

### Teacher

- `GET /api/v3/teacher/assignments/courses/3d65ffed-8129-45fa-a736-305fcebc53bd` tra:
  - `distributionType = CLASS`
  - `classId = bce93631-a606-4ab2-a7b6-3239b0160ce7`
  - `totalStudents = 1`
- `GET /api/v3/teacher/assignments/0701bfba-8384-4b2a-bee9-f6bea834166e` tra dung class metadata

### UI smoke

- File summary: [showcase-ui-summary.json](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/playwright/showcase-ui-summary.json)
- Student route `/student/tasks`:
  - title `Bài cần làm`
  - screenshot: [student-tasks-auth.png](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/playwright/student-tasks-auth.png)
  - console events: `[]`
- Teacher route `/teacher/assessments/classes/assignments`:
  - title `Vận hành bài tập`
  - screenshot: [teacher-assignment-list-auth.png](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/playwright/teacher-assignment-list-auth.png)
  - console events: `[]`

## Artifacts chinh

- Bao cao JSON nguon: [showcase-report.json](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/showcase-report.json)
- Thu muc assets: [assets](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/assets)
- Thu muc Playwright: [playwright](E:/Sach/Sua/LMS_hohulili/.tmp/showcase-production-seed/playwright)

## Ghi chu van hanh

- Da xoa 3 showcase course tao hong truoc do; production hien chi giu 2 showcase course ban 03:51.
- Production clone tren server van la working tree dirty do day la chuoi hotfix + seed trien khai truc tiep. Ve van hanh site dang on, nhung ve git hygiene nen gom commit sach sau.
