# ORG Logic Completion Goal

> Status: active goal, created 2026-06-25
> Owner mode: Codex + team, minimal-change execution
> Goal: hoàn thiện logic ORG theo hướng tenant + academic domain, không hardcode VMU, không phá Clean Architecture.

## 1. Mục tiêu cuối cùng

HoHoLiHu phải vận hành được nhiều tổ chức độc lập. `ADMIN` là quản trị hệ thống, còn `ORG_ADMIN` chỉ quản lý tổ chức của mình. Với VMU, tổ chức có thể cấu hình các khái niệm học thuật như khoa, ngành, khóa, lớp hành chính, học kỳ, môn học, gói học và quan hệ môn học mà không cần viết nhánh logic riêng trong code.

Kết quả cuối cùng cần đạt:

| Mảng | Trạng thái mong muốn |
| --- | --- |
| Quyền hạn | `ADMIN` toàn hệ thống, `ORG_ADMIN` chỉ trong org của mình, không tạo org mới, không chạm org khác |
| Ownership | Course, class, payment, media/report quan trọng có org ownership rõ ràng |
| Academic model | VMU quản lý được subject, cohort, class group, curriculum/package/course mapping |
| Org-admin portal | `/org-admin` là portal vận hành tổ chức, không chỉ là bản đổi tên của `/admin` |
| Payment/SePay | Cấu hình và đối soát theo org, không rò doanh thu hoặc giao dịch chéo org |
| Verification | Có test và smoke cho boundary hệ thống, không chỉ nhìn UI thấy ổn |

## 2. Phạm vi và non-goals

In scope:

- Audit và khóa chặt tenant boundary cho ORG.
- Bổ sung org ownership còn thiếu bằng Flyway migration forward-only.
- Thiết kế academic domain dùng chung cho nhiều org, VMU chỉ là dữ liệu cấu hình đầu tiên.
- Hoàn thiện workflow org-admin theo nghiệp vụ: người dùng, môn học, khóa học, lớp, gói, thanh toán, báo cáo.
- Cập nhật tài liệu, test và smoke sau mỗi vòng lặp.

Out of scope trong goal này:

- Không chuyển toàn bộ backend sang microservices.
- Không hardcode `if org == VMU`.
- Không redesign UI lớn nếu workflow/logic chưa đúng.
- Không thêm dependency nếu repo hiện tại hoặc nền tảng sẵn có đã xử lý được.
- Không tạo bảng/cột “để sau này có thể cần” nếu chưa có luồng sử dụng và tiêu chí kiểm chứng.

## 3. Evidence hiện tại trong codebase

| Evidence | File | Kết luận |
| --- | --- | --- |
| Multi-org foundation đã có `organizations.type`, `is_default`, default platform org | `backend/src/main/resources/db/migration/V119__multi_org_foundation.sql`, `V120__repair_default_platform_org.sql` | Có nền tảng tenant, nhưng chưa đủ cho academic domain |
| User đã bắt buộc có `organization_id` | `V119__multi_org_foundation.sql` | Boundary người dùng đã rõ hơn trước |
| Domain `Organization` có `type`, `isDefault`, `tokenExpiryDays` | `backend/src/main/java/com/example/lms/identity/domain/model/Organization.java` | Có model org, nhưng chưa có capabilities/policies riêng |
| `CourseJpaEntity` chưa có `organization_id` trực tiếp | `backend/src/main/java/com/example/lms/course_authoring/infrastructure/persistence/entity/CourseJpaEntity.java` | Course ownership đang suy luận qua teacher, chưa đủ chắc cho ORG |
| `LearningClassJpaEntity` chưa có `organization_id` trực tiếp | `backend/src/main/java/com/example/lms/learning_delivery/infrastructure/persistence/entity/LearningClassJpaEntity.java` | Class ownership cũng chưa đủ rõ |
| `/org-admin` đã tách route nhưng reuse nhiều admin component | `fe/src/app/features/org-admin/org-admin.routes.ts` | Route đã có, workflow vẫn cần tách nghiệp vụ đúng org-admin |
| SePay/org payment đã có test scoped theo org | `backend/src/test/java/com/example/lms/shared/infrastructure/web/PaymentControllerV3Test.java`, `OrgPaymentConfigControllerV3Test.java` | Có nền kiểm thử payment, cần audit tiếp toàn luồng |

## 4. Luật SKILL bắt buộc

Trước khi sửa một mảng ORG, phải chọn đúng SKILL và đọc lại nếu turn mới yêu cầu. Luật áp dụng:

| Tình huống | SKILL bắt buộc |
| --- | --- |
| Phân tích kiến trúc, workflow, root cause | `cot-research` |
| Sửa backend Spring Boot, DDD, role, use case | `01-backend-ddd-development` |
| Sửa schema, Flyway, index, ownership DB | `lms-schema-audit`, thêm `postgresql` hoặc `sql-optimization-patterns` nếu truy vấn phức tạp |
| Sửa FE org-admin Angular | `angular-v20-frontend-development` |
| Sửa Docker/deploy/smoke production | `docker-compose-production`, `docker-expert` nếu build/runtime phức tạp |
| Cần tránh over-engineering | `ponytail` |
| Cần tránh lỗi LLM coding, đặt success criteria | `karpathy-guidelines` |

Ponytail rule cho goal ORG:

- Sửa ít nhất có thể nhưng phải đúng boundary.
- Dùng DB constraint, query scoped, guard và test trước khi tạo abstraction.
- Một interface chỉ có một implementation mới thì không tạo thêm nếu repo chưa cần.
- Không tạo “org plugin system” khi `org_capabilities` và `org_policies` đủ dùng.
- Không tách service mới nếu modular monolith xử lý được.

Karpathy rule cho goal ORG:

- Mọi thay đổi phải có assumption rõ.
- Mọi thay đổi non-trivial phải có check chạy được.
- Không sửa lan sang UX, deploy, SEO nếu không liên quan goal ORG.
- Nếu phát hiện unrelated dirty file, giữ nguyên và báo lại.

## 5. Domain model đích

Không biến `Course` thành “môn học”. Dùng phân tách:

| Khái niệm | Ý nghĩa |
| --- | --- |
| Organization | Tenant hoặc đơn vị vận hành, ví dụ VMU |
| Department | Khoa/viện/bộ môn trong org |
| Program | Ngành hoặc chương trình đào tạo |
| Cohort | Khóa tuyển sinh hoặc niên khóa |
| ClassGroup | Lớp hành chính, ví dụ `CNT63ĐH` |
| AcademicTerm | Học kỳ/năm học |
| Subject | Môn học học thuật, ví dụ An toàn hàng hải |
| CurriculumPlan | Khung chương trình cho program/cohort |
| LearningPackage | Gói học hoặc gói môn theo nhu cầu org |
| Course | Nội dung LMS online để dạy một subject hoặc kỹ năng |
| LearningClass | Lớp triển khai course cho một nhóm học viên |

Minimal schema hướng tới:

| Table dự kiến | Vai trò | Ghi chú Ponytail |
| --- | --- | --- |
| `organization_capabilities` | bật/tắt chức năng theo org | Chỉ dùng key-value hoặc jsonb khi chưa cần domain giàu |
| `organization_policies` | rule vận hành như offline devices, payment, enrollment | Tránh hardcode trong service |
| `departments` | khoa/bộ môn theo org | Có `organization_id` |
| `programs` | ngành/chương trình | Có `organization_id`, optional `department_id` |
| `cohorts` | khóa học/niên khóa | Có `organization_id` |
| `class_groups` | lớp hành chính | Có `organization_id`, `program_id`, `cohort_id` |
| `academic_terms` | học kỳ | Có `organization_id` |
| `subjects` | môn học học thuật | Có `organization_id`, `department_id` |
| `subject_relations` | tiên quyết/liên quan | Chỉ thêm khi UI/API dùng thật |
| `curriculum_plans` | khung chương trình | Có `organization_id`, `program_id`, `cohort_id` |
| `curriculum_subjects` | môn trong khung | Có thứ tự, học kỳ gợi ý |
| `subject_courses` | map subject với course LMS | Nối academic model với content |
| `learning_packages` | gói học theo org | Có `organization_id`, price/policy nếu cần |
| `learning_package_items` | item trong gói | Nối subject/course/package |

## 6. Vòng lặp thực thi

Mỗi vòng lặp phải nhỏ, có diff rõ, có check rõ.

| Phase | Việc làm | Verification |
| --- | --- | --- |
| 0. Baseline | Ghi lại current tests, routes, schema, smoke status | `git status`, backend test subset, FE build nếu liên quan |
| 1. ORG audit | Quét API/queries/guards có nguy cơ cross-org | Báo danh sách P0/P1/P2 kèm file/line |
| 2. Tenant ownership | Thêm org ownership trực tiếp cho bảng lõi còn thiếu | Flyway migrate local, repository tests, API scoping tests |
| 3. Payment/SePay | Audit config, webhook, refund, payout theo org | Payment tests, webhook unauthorized/authorized tests |
| 4. Academic domain | Thêm model học thuật tối thiểu cho VMU | Domain/usecase tests, migration rollback plan bằng backup |
| 5. Org-admin FE | Tách workflow cần thiết cho `/org-admin` | FE build, route smoke, role guard smoke |
| 6. Data seed/import | Seed VMU sample hoặc import CSV có kiểm soát | Count checks, duplicate checks, UI smoke |
| 7. Production smoke | Deploy nếu được yêu cầu | Health, login, org-admin, payment config, course/class/package smoke |

## 7. Definition of Done

Goal chỉ được coi là hoàn thiện khi tất cả điều kiện sau đạt:

- `ORG_ADMIN` không thể tạo org mới, không xem/sửa/xóa org khác.
- `ORG_ADMIN` không thể promote user thành `ADMIN` hoặc thao tác system-only.
- Course, learning class, package, payment đều truy ra org ownership rõ ràng.
- VMU có thể cấu hình môn, lớp, khóa, chương trình, gói học bằng dữ liệu.
- SePay/payment admin list, refund, payout, org payment config không rò dữ liệu chéo org.
- `/admin` và `/org-admin` tách rõ về route, guard, text, permission và workflow.
- Các migration mới forward-only, idempotent khi hợp lý, có index cho cột scoping.
- Backend test liên quan role/org/payment/academic pass.
- FE build pass nếu có sửa FE.
- Production hoặc local smoke được ghi lại trong tài liệu/runbook nếu deploy.

## 8. Quy tắc quyết định khi bị hỏi sửa trực tiếp

Nếu người xem yêu cầu sửa trong buổi demo hoặc review:

| Yêu cầu | Cách phản ứng đúng |
| --- | --- |
| Đổi text/màu/layout org-admin | Sửa FE tối thiểu, không đổi business logic |
| Thêm field học thuật | Kiểm tra có thuộc academic domain không, nếu có thì migration + entity/usecase + UI |
| ORG_ADMIN thấy dữ liệu sai | Ưu tiên audit query/backend scoping trước UI |
| Thêm rule VMU riêng | Chuyển thành `organization_policies` hoặc data config, không hardcode VMU |
| Thêm gói học | Dùng `learning_packages` nếu đã có, không nhét vào `courses` |
| Payment/SePay lỗi | Giữ source of truth ở backend, log/audit transaction, không tin query param từ client |
| Cần demo nhanh | Dùng seed data hoặc config, không sửa production DB thủ công nếu chưa ghi migration/runbook |

## 9. Tài liệu liên quan

- `docs/reports/2026-04-26-org-admin-mega-audit.md`
- `docs/reference/ROLE_ACCESS_MATRIX.md`
- `docs/runbooks/PAYMENT_PAYOUT_RUNBOOK.md`
- `docs/runbooks/PRODUCTION_SMOKE_TEST.md`
- `docs/architecture/COURSE_VS_CLASS_LESSON_BOUNDARY.md`
- `docs/database/schemaspy/full-column/index.html`

## 10. Phase 1 audit snapshot - 2026-06-25

Mục tiêu của vòng này là không mở rộng domain vội, mà khóa lại các luồng ORG đang có để tránh rò dữ liệu chéo tổ chức.

Kết quả đã xác minh:

- `OrganizationControllerV3`: `ORG_ADMIN` chỉ xem/quản lý tổ chức của mình, không tạo tổ chức mới, không thêm/xóa role `ADMIN` hoặc `ORG_ADMIN`.
- `UserControllerV3`: danh sách và thao tác user của `ORG_ADMIN` đã bị scope theo `organization_id`; delete user vẫn là quyền `ADMIN`.
- `AdminCoursesControllerV3`: duyệt/từ chối/revoke/review-history có kiểm tra khóa học thuộc giáo viên cùng tổ chức; delete course vẫn là quyền `ADMIN`.
- `PaymentControllerV3`: danh sách payment và refund của `ORG_ADMIN` đi qua course/teacher cùng tổ chức.
- `AdminRevenueControllerV3`: payout list/approve/reject của `ORG_ADMIN` lọc theo teacher cùng tổ chức; complete payout vẫn là quyền `ADMIN`.
- `OrgPaymentConfigControllerV3`: cấu hình payment theo org chỉ cho `ADMIN` hoặc `ORG_ADMIN` của chính org đó.

Fix đã thực hiện trong vòng này:

- `CourseQueryControllerV3#getLessonById` không còn coi mọi `ORG_ADMIN` là author được xem draft lesson.
- Draft lesson detail bây giờ luôn gọi `verifyCourseAccess(course, currentUser)` trước khi dựng response.
- Regression test mới: `ORG_ADMIN` của tổ chức A không đọc được draft lesson của khóa thuộc tổ chức B.

Verification:

```bash
cd backend
mvn -Dtest=CourseQueryControllerV3ContractTest test
# Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
```

Debt còn lại cho các vòng tiếp theo:

- Course, learning class, payment và payout vẫn suy org chủ yếu qua `teacher_id`/`course_id`; Phase 2 nên thêm ownership trực tiếp bằng `organization_id` cho bảng lõi để query rõ hơn, index tốt hơn và ít phụ thuộc join hơn.
- `ClassControllerV3` còn thiên về teacher/co-teacher ownership; cần định nghĩa rõ `ORG_ADMIN` được quản lý lớp học cùng org tới mức nào trước khi sửa.
- Luồng org-admin preview nên có API review/draft riêng nếu người quản lý cần xem thay đổi chưa publish một cách ổn định.
- Assessment/quiz có vài comment/use case nói `ORG_ADMIN` bypass ownership; trước khi mở workflow assessment cho org-admin cần đổi thành org-scoped access, không bypass rộng.
- VMU academic model vẫn chưa có bảng chính thức cho `department`, `program`, `cohort`, `class_group`, `subject`, `curriculum`, `learning_package`.

## 11. Phase 2 tenant ownership progress - 2026-06-25

Mục tiêu của vòng này là đặt ownership trực tiếp cho bảng lõi đầu tiên (`courses`) thay vì chỉ suy qua `teacher_id`.

Thay đổi đã thực hiện:

- Thêm migration `V136__courses_organization_ownership.sql`.
- `courses.organization_id` được backfill từ `users.organization_id` theo `teacher_id`.
- Nếu còn course thiếu org sau backfill, gán về default platform org `a0000000-0000-0000-0000-000000000001` để migration không để dữ liệu mồ côi.
- Thêm FK `fk_courses_organization`, `NOT NULL`, index `idx_courses_organization_id` và `idx_courses_org_status_updated`.
- `Course` domain có `organizationId` và method `assignOrganization`.
- `CourseJpaEntity` và `CourseEntityMapper` map `organization_id` hai chiều.
- `TeacherCoursesControllerV3#createCourse` truyền `user.organizationId` xuống use case khi tạo khóa mới.
- `CourseRepositoryImpl#save` có fallback ở infrastructure: nếu course chưa có `organizationId`, lấy từ teacher trước khi insert. Fallback này giữ các call path cũ như AI shell không làm insert null.
- Các access check nhạy cảm ưu tiên `course.organizationId` trước, fallback qua teacher nếu dữ liệu cũ/null:
  - `CourseQueryControllerV3#hasOrgScopedCourseAccess`
  - `AdminCoursesControllerV3#verifyCourseOrgAccess`
  - `DocumentPreviewService#hasOrgScopedCourseAccess`
  - `PaymentControllerV3#verifyCourseAccess`

Verification:

```bash
cd backend
mvn "-Dtest=CourseAuthoringUseCaseTest,CourseQueryControllerV3ContractTest,PaymentControllerV3Test" test
# Tests run: 27, Failures: 0, Errors: 0, Skipped: 0
```

Debt còn lại sau Phase 2.1:

- `AdminCoursesControllerV3` list/query path vẫn lọc bằng tập `teacherIds`; nên chuyển dần sang query trực tiếp `courses.organization_id` để không phụ thuộc teacher membership hiện tại.
- `learning_classes` chưa có `organization_id`; cần thêm vì lớp học là đơn vị vận hành chính của ORG/VMU.
- `payment_transactions` và `payout_requests` chưa có `organization_id`; hiện vẫn suy qua course/teacher.
- AI course shell nên truyền org rõ trong request hoặc dùng dedicated command có actor context, thay vì dựa vào fallback ở repository.
- Academic model VMU vẫn chưa bắt đầu: `department`, `program`, `cohort`, `class_group`, `subject`, `curriculum`, `learning_package`.
## 12. Phase 2.2 admin course query ownership - 2026-06-25

Mục tiêu của vòng này là xóa debt rõ nhất sau Phase 2.1: `ORG_ADMIN` không nên xem danh sách course bằng cách lấy danh sách giáo viên hiện tại của org rồi lọc theo `teacher_id`. Ownership của course phải là dữ liệu ổn định trên chính `courses.organization_id`.

Thay đổi đã thực hiện:

- Thêm các port tối thiểu vào `CourseRepository`: `findByOrganizationId`, `findByOrganizationIdAndStatus`, `findByOrganizationIdAndTitleContaining`, `findByOrganizationIdAndStatusAndTitleContaining`, `findReviewQueueByOrganizationId`.
- Thêm query JPA/native tương ứng trong `JpaCourseRepository`, dùng trực tiếp `CourseJpaEntity.organizationId` hoặc cột `courses.organization_id`.
- `CourseRepositoryImpl` map các query mới về domain `Course`, trả `Page.empty` khi actor không có `organizationId`.
- `AdminCoursesControllerV3#getAllCourses` của `ORG_ADMIN` chuyển sang `currentUser.getOrganizationId()` thay vì `getOrgTeacherIds(...)`.
- `AdminCoursesControllerV3#getPendingCourses` chuyển sang `findReviewQueueByOrganizationId(...)`.
- Giữ các method theo `teacherIds` vì analytics/revenue cũ vẫn cần trong các vòng sau; không xóa vội để tránh refactor rộng.

Verification:

```bash
cd backend
mvn "-Dtest=AdminCoursesControllerV3PendingFilterTest,CourseAuthoringUseCaseTest,CourseQueryControllerV3ContractTest,PaymentControllerV3Test" test
# Tests run: 34, Failures: 0, Errors: 0, Skipped: 0
```

Debt còn lại sau Phase 2.2:

- `buildOrgScopedAnalytics` vẫn đếm course/enrollment/revenue qua `teacherIds`; vòng sau nên chuyển course count và course IDs sang `organization_id`.
- `payment_transactions` và `payout_requests` vẫn chưa lưu `organization_id`; SePay/org payment chưa đạt chuẩn tenant-first.
- `learning_classes` chưa có `organization_id`; đây là bảng tiếp theo cần làm vì lớp học là đơn vị triển khai thực tế của ORG/VMU.
- VMU academic model chưa bắt đầu ở database/domain: `department`, `program`, `cohort`, `class_group`, `subject`, `curriculum`, `learning_package`.
## 13. Phase 2.3 org analytics course ownership - 2026-06-25

Mục tiêu của vòng này là tiếp tục xóa phụ thuộc `teacherIds` trong `AdminCoursesControllerV3` sau khi list/pending đã chuyển sang `courses.organization_id`.

Thay đổi đã thực hiện:

- Thêm các port analytics tối thiểu vào `CourseRepository`: `countByOrganizationId`, `countByStatusAndOrganizationId`, `countReviewQueueByOrganizationId`, `findCourseIdsByOrganizationId`.
- Thêm query JPA/native tương ứng trong `JpaCourseRepository`.
- `CourseRepositoryImpl` trả `0` hoặc `List.of()` khi `organizationId` null, tránh rò dữ liệu nếu `ORG_ADMIN` chưa được gắn org.
- `AdminCoursesControllerV3#buildOrgScopedAnalytics` chuyển course counts và org course IDs sang `organization_id`.
- Enrollment/revenue trong analytics vẫn đi theo danh sách `orgCourseIds`; vì vậy hành vi hiện tại giữ nguyên nhưng nguồn course ID đã ổn định theo tenant ownership.
- Xóa helper `getOrgTeacherIds` khỏi `AdminCoursesControllerV3` vì không còn caller trong controller này.

Verification:

```bash
cd backend
mvn "-Dtest=AdminCoursesControllerV3Test,AdminCoursesControllerV3PendingFilterTest,CourseAuthoringUseCaseTest,CourseQueryControllerV3ContractTest,PaymentControllerV3Test" test
# Tests run: 42, Failures: 0, Errors: 0, Skipped: 0
```

Debt còn lại sau Phase 2.3:

- `GetWindowedAnalyticsUseCase` và admin analytics port có thể vẫn suy course theo teacher IDs; cần audit riêng vì đó là application use case khác.
- `payment_transactions` và `payout_requests` vẫn chưa có `organization_id`; cần migration + backfill để SePay/org payment không phải suy qua course khi đối soát.
- `learning_classes` chưa có `organization_id`; cần làm trước khi xây VMU academic model vì lớp là đơn vị triển khai/học tập chính.
- Một số payment/revenue controller test vẫn mô tả “courses owned by teachers in same organization”; cần đổi sau khi schema payment được nâng lên org-first.

## 14. Phase 2.4 learning class organization ownership - 2026-06-25

Mục tiêu của vòng này là đưa `learning_classes` về tenant ownership trực tiếp. Đây là lớp vận hành thật của ORG/VMU: phân công giảng viên, danh sách học viên, phiên bản course đang dùng, enrollment và roster đều đi qua class. Nếu class chỉ suy org qua course/teacher thì ORG_ADMIN dễ bị lệ thuộc vào teacher membership hiện tại thay vì owner ổn định của bản ghi lớp.

Thay đổi đã thực hiện:

- Thêm migration `V137__learning_classes_organization_ownership.sql`.
- `learning_classes.organization_id` được backfill theo thứ tự an toàn: từ `courses.organization_id`, sau đó fallback từ `users.organization_id` theo `teacher_id`, cuối cùng fallback về default platform org nếu dữ liệu cũ còn mồ côi.
- Thêm FK `fk_learning_classes_organization`, `NOT NULL`, index `idx_learning_classes_organization_id` và `idx_learning_classes_org_status_updated`.
- `LearningClass` domain, `LearningClassJpaEntity` và `LearningClassEntityMapper` map `organizationId` hai chiều.
- `LearningClassRepositoryImpl#save` tự điền `organization_id` từ course nếu domain call path cũ chưa truyền org. Đây là fallback hẹp ở infrastructure, không tạo service/abstraction mới.
- `ClassControllerV3` mở route class-management cho `ORG_ADMIN`, nhưng quyền thật được kiểm bằng tenant boundary:
  - `ADMIN` vẫn là system-admin toàn hệ thống.
  - `ORG_ADMIN` chỉ truy cập course/class cùng `organization_id`.
  - Endpoint theo `classId` ưu tiên `learningClass.organizationId`; chỉ fallback sang course org khi dữ liệu cũ chưa có org.
  - `TEACHER` giữ logic owner/co-teacher như cũ.
- Khi `ORG_ADMIN` hoặc `ADMIN` tạo class mà không chỉ định teacher, hệ thống mặc định dùng `course.teacherId`, không tự gán ORG_ADMIN làm giảng viên.
- Khi tạo/cập nhật class hoặc thêm co-teacher, teacher được chọn phải thuộc cùng organization với course nếu course đã có `organization_id`.
- Sửa hai message mới trong `ClassControllerV3` sang tiếng Việt UTF-8 chuẩn để không tạo thêm nợ mojibake.

Verification:

```bash
cd backend
mvn "-Dtest=ClassControllerSecurityTest,LearningClassTest,CreateLearningClassUseCaseV3Test" test
# Tests run: 37, Failures: 0, Errors: 0, Skipped: 0

mvn "-Dtest=ClassControllerSecurityTest,LearningClassTest,CreateLearningClassUseCaseV3Test,AdminCoursesControllerV3Test,AdminCoursesControllerV3PendingFilterTest,CourseAuthoringUseCaseTest,CourseQueryControllerV3ContractTest,PaymentControllerV3Test" test
# Tests run: 79, Failures: 0, Errors: 0, Skipped: 0
```

Debt còn lại sau Phase 2.4:

- `payment_transactions`, `payout_requests`, revenue/payout reports vẫn cần org ownership trực tiếp để SePay/org payment đạt chuẩn tenant-first.
- `class_teachers` hiện vẫn nối teacher/class; khi mở rộng org-admin phân công giảng viên, nên audit thêm rule teacher cùng org ở use case `ManageClassTeachersUseCase`, không chỉ controller.
- `enrollments` có thể vẫn suy org qua `learning_classes`; chỉ thêm `organization_id` vào enrollment nếu có query/report cần chạy trực tiếp theo org với tải lớn.
- VMU academic model vẫn chưa được triển khai: `department`, `program`, `cohort`, `class_group`, `subject`, `curriculum`, `learning_package`.
- Một số chuỗi tiếng Việt cũ trong test/log vẫn bị mojibake, ví dụ log trong `PaymentControllerV3Test`; chưa sửa trong slice này để tránh diff lan rộng.

## 15. Phase 2.5 payout request organization ownership - 2026-06-25

Mục tiêu của vòng này là đưa `payout_requests` về tenant ownership trực tiếp. Trước đó ORG_ADMIN xem/duyệt payout bằng cách suy qua `payout_requests.teacher_id -> users.organization_id`. Cách này chạy được nhưng không bền cho audit tài chính: nếu giảng viên đổi tổ chức, yêu cầu rút tiền cũ có thể bị diễn giải sai org.

Thay đổi đã thực hiện:

- Thêm migration `V138__payout_requests_organization_ownership.sql`.
- `payout_requests.organization_id` được backfill từ `users.organization_id` theo `teacher_id`, fallback về default platform org nếu dữ liệu cũ còn mồ côi.
- Thêm FK `fk_payout_requests_organization`, `NOT NULL` và index `idx_payout_requests_organization_status_requested`.
- `PayoutRequest` domain giữ thêm `organizationId`, có overload backward-compatible cho các call cũ.
- `PayoutRequestJpaEntity`, `PayoutRequestRepository`, `PayoutRequestRepositoryAdapter` map/query được `organization_id`.
- `RequestPayoutUseCase` snapshot `orgId` của teacher ngay khi tạo yêu cầu rút tiền.
- `AdminRevenueControllerV3` chuyển ORG_ADMIN list payout sang `findAllByStatusAndOrganizationId(...)`.
- ORG_ADMIN approve/reject payout ưu tiên kiểm `payout.organizationId`; chỉ fallback sang teacher org khi gặp domain object legacy/null trong test hoặc dữ liệu cũ.
- Giữ `findAllByStatusAndTeacherIds(...)` tạm thời để tránh xóa rộng nếu còn caller/legacy test; có thể dọn sau khi payment schema ổn định.

Verification:

```bash
cd backend
mvn "-Dtest=AdminRevenueControllerV3Test,RequestPayoutUseCaseTest" test
# Tests run: 9, Failures: 0, Errors: 0, Skipped: 0
```

Debt còn lại sau Phase 2.5:

- `payment_transactions` vẫn chưa có `organization_id`; đây là bước tiếp theo để SePay/VNPay transaction list, refund, receipt và revenue query không phải suy qua course.
- `revenue_splits` đang có `org_id`; cần audit xem tên cột có nên giữ `org_id` hay normalize dần về `organization_id` ở code/API để tránh nhầm thuật ngữ.
- `teacher_bank_accounts` chưa snapshot org; hiện payout đã có org nên chưa bắt buộc, nhưng nếu cần ORG_ADMIN quản lý tài khoản ngân hàng theo org thì nên thêm sau.
- VMU academic model vẫn chưa được triển khai: `department`, `program`, `cohort`, `class_group`, `subject`, `curriculum`, `learning_package`.

## 16. Phase 2.6 payment transaction organization ownership - 2026-06-25

Mục tiêu của vòng này là đưa `payment_transactions` về tenant ownership trực tiếp. Đây là bảng quan trọng nhất của SePay/VNPay vì admin list, refund, receipt, webhook và revenue đều xuất phát từ giao dịch. Trước đó ORG_ADMIN phải đi vòng qua course/teacher để xác định quyền truy cập.

Thay đổi đã thực hiện:

- Thêm migration `V139__payment_transactions_organization_ownership.sql`.
- `payment_transactions.organization_id` được backfill theo thứ tự: từ `courses.organization_id`, fallback từ `courses.teacher_id -> users.organization_id`, cuối cùng fallback về default platform org nếu dữ liệu cũ mồ côi.
- Thêm FK `fk_payment_transactions_organization`, `NOT NULL`, index `idx_payment_transactions_organization_status_created` và `idx_payment_transactions_organization_paid_at`.
- `PaymentTransaction` domain giữ thêm `organizationId`, có overload backward-compatible cho `reconstitute(...)` cũ.
- `PaymentTransactionJpaEntity` và `PaymentEntityMapper` map `organization_id` hai chiều.
- `PaymentRepositoryAdapter#save` tự snapshot `organization_id` từ `courses.organization_id` khi payment domain chưa có org. Đây là fallback hẹp ở infrastructure để không đổi rộng chữ ký `CheckoutUseCase`, `CreateVnPayUrlUseCase`, `CreateSepayPaymentUseCase`.
- `PaymentTransactionJpaRepository` có query theo `organizationId` và `organizationId + status`.
- `PaymentControllerV3#adminListPayments` chuyển ORG_ADMIN từ `teacherIds -> courseIds -> payments` sang query trực tiếp theo `payment_transactions.organization_id`.
- `PaymentControllerV3#adminRefundPayment` ưu tiên kiểm `payment.organizationId`; chỉ fallback course org khi gặp dữ liệu legacy/null.
- Thêm `PaymentRepositoryAdapterTest` để khóa hành vi snapshot org từ course khi lưu payment mới.

Verification:

```bash
cd backend
mvn "-Dtest=PaymentControllerV3Test" test
# Tests run: 13, Failures: 0, Errors: 0, Skipped: 0

mvn "-Dtest=PaymentRepositoryAdapterTest" test
# Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
```

Debt còn lại sau Phase 2.6:

- `revenue_splits` đã có `org_id`, nhưng `CreateRevenueSplitUseCase` vẫn resolve org từ course teacher. Vòng tiếp theo nên ưu tiên dùng `payment.organizationId` làm source of truth cho split org để lịch sử tài chính ổn định hơn.
- Các query revenue tổng hợp vẫn cần audit để dùng org ownership trực tiếp khi có thể.
- `teacher_bank_accounts` chưa snapshot org; chỉ cần làm nếu ORG_ADMIN quản lý bank account theo org.
- VMU academic model vẫn chưa được triển khai: `department`, `program`, `cohort`, `class_group`, `subject`, `curriculum`, `learning_package`.

## 17. Phase 2.7 revenue split uses payment organization snapshot - 2026-06-25

Mục tiêu của vòng này là hoàn tất chuỗi tài chính cơ bản sau khi `payment_transactions.organization_id` đã tồn tại. Revenue split là ledger bất biến, nên org của split phải lấy từ snapshot transaction tại thời điểm thanh toán, không resolve lại qua teacher hiện tại.

Thay đổi đã thực hiện:

- `CreateRevenueSplitUseCase` ưu tiên `payment.getOrganizationId()` làm source of truth cho `RevenueSplit.orgId`.
- Fallback `teacherId -> users.organization_id` vẫn được giữ khi gặp payment legacy/null để tránh phá dữ liệu cũ hoặc test cũ.
- Thêm `CreateRevenueSplitUseCaseTest` chứng minh khi payment đã có org snapshot thì use case không gọi `UserRepository.findById(...)` để resolve teacher org nữa.

Verification:

```bash
cd backend
mvn "-Dtest=CreateRevenueSplitUseCaseTest" test
# Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
```

Debt còn lại sau Phase 2.7:

- Cần audit các query revenue/report để tránh dùng teacher membership cho ORG_ADMIN khi đã có `payment_transactions.organization_id` và `revenue_splits.org_id`.
- `teacher_bank_accounts` chưa snapshot org; chỉ cần làm khi đưa bank-account approval/visibility vào ORG_ADMIN.
- VMU academic model vẫn chưa được triển khai: `department`, `program`, `cohort`, `class_group`, `subject`, `curriculum`, `learning_package`.

## 18. Phase 2.8 org analytics uses direct organization ownership - 2026-06-25

Mục tiêu của vòng này là sửa lát cắt báo cáo còn suy ORG qua teacher membership. Sau Phase 2.1 và 2.6, `courses.organization_id` và `payment_transactions.organization_id` đã là source of truth tốt hơn cho dashboard ORG. Nếu dashboard vẫn đi qua `teacherIds`, dữ liệu lịch sử có thể lệch khi giáo viên đổi tổ chức.

Thay đổi đã thực hiện:

- `GetWindowedAnalyticsUseCase` không còn resolve `teacherIds` cho org dashboard.
- `AdminAnalyticsPort` chuyển từ các method theo `teacherIds/courseIds` sang method org-first:
  - `countCoursesByOrganization`
  - `countCoursesCreatedBetweenInOrganization`
  - `sumRevenueBetweenInOrganization`
  - `findCourseIdsByOrganization`
- `AdminAnalyticsAdapter` dùng trực tiếp `JpaCourseRepository.countByOrganizationId(...)`, `JpaCourseRepository.findCourseIdsByOrganizationId(...)` và `PaymentTransactionJpaRepository.sumRevenueByOrganizationIdAndDateRange(...)`.
- `PaymentTransactionJpaRepository` có query tổng doanh thu theo `organization_id` và khoảng thời gian.
- `JpaCourseRepository` có query đếm course theo `organization_id` và khoảng thời gian.
- Test `GetWindowedAnalyticsUseCaseTest` khóa lại hành vi mới: org dashboard không còn gọi `findTeacherIdsByOrganization(...)`.

Verification:

```bash
cd backend
mvn "-Dtest=GetWindowedAnalyticsUseCaseTest" test
# Tests run: 23, Failures: 0, Errors: 0, Skipped: 0

mvn test
# Tests run: 1163, Failures: 0, Errors: 0, Skipped: 0
```

Debt còn lại sau Phase 2.8:

- `countEnrollmentsByCourseIds(...)` vẫn đi qua course IDs của org. Hiện chấp nhận được vì enrollment chưa có `organization_id`; chỉ thêm cột trực tiếp nếu báo cáo enrollment theo org trở thành điểm nghẽn hoặc cần audit ledger độc lập.
- `revenue_splits.org_id` đã ổn cho ledger split, nhưng các báo cáo sử dụng revenue split cần audit riêng nếu mở thêm màn hình revenue nâng cao cho ORG_ADMIN.
- `teacher_bank_accounts` chưa snapshot org; chỉ cần làm khi đưa bank-account approval/visibility vào ORG_ADMIN.
- VMU academic model vẫn chưa được triển khai: `department`, `program`, `cohort`, `class_group`, `subject`, `curriculum`, `learning_package`.

## 19. Phase 3.1 academic catalog core for organization-scoped VMU model - 2026-06-25

Mục tiêu của vòng này là đặt nền dữ liệu học thuật cho ORG mà không hardcode VMU trong code. Theo ponytail, chỉ triển khai lát cắt nhỏ nhất có luồng dùng rõ: khoa/phòng ban học thuật, chương trình/ngành, khóa tuyển sinh, lớp hành chính, môn học, và mapping môn học với course LMS. Chưa triển khai curriculum/package vì cần API/UX riêng và chưa cần để khóa tenant boundary.

Thay đổi đã thực hiện:

- Thêm migration `V140__academic_catalog_core.sql` với 6 bảng org-scoped:
  - `academic_departments`
  - `academic_programs`
  - `academic_cohorts`
  - `academic_class_groups`
  - `academic_subjects`
  - `academic_subject_courses`
- Tất cả bảng academic đều có `organization_id` và index theo org để ORG_ADMIN không phải suy quyền qua teacher.
- Thêm module backend mới `academic` theo Clean Architecture:
  - domain model thuần Java record trong `academic/domain/model`
  - domain port `AcademicCatalogRepository`
  - use case `ManageAcademicCatalogUseCase`
  - JPA entity/repository/adapter trong `academic/infrastructure/persistence`
  - REST controller `AcademicCatalogControllerV3`
- Thêm API nền dưới `/api/v3/organizations/{orgId}/academic`:
  - `GET /catalog`
  - `POST /departments`
  - `POST /programs`
  - `POST /cohorts`
  - `POST /class-groups`
  - `POST /subjects`
  - `POST /subject-courses`
- `AcademicCatalogControllerV3` cho `ADMIN` truy cập mọi org nhưng chỉ cho `ORG_ADMIN` truy cập đúng `currentUser.organizationId`.
- `ManageAcademicCatalogUseCase#linkSubjectCourse` kiểm tra course phải thuộc cùng `organizationId` với subject trước khi tạo mapping, tránh lỗi cross-org course reuse.
- Thêm test boundary:
  - `ManageAcademicCatalogUseCaseTest`: khóa rule không link subject sang course của org khác.
  - `AcademicCatalogControllerV3Test`: khóa rule ORG_ADMIN không đọc academic catalog của org khác, ADMIN vẫn thao tác được mọi org.

Verification:

```bash
cd backend
mvn -DskipTests compile
# BUILD SUCCESS

mvn "-Dtest=ManageAcademicCatalogUseCaseTest,AcademicCatalogControllerV3Test" test
# Tests run: 4, Failures: 0, Errors: 0, Skipped: 0

mvn "-Dtest=ManageAcademicCatalogUseCaseTest,AcademicCatalogControllerV3Test,GetWindowedAnalyticsUseCaseTest,PaymentControllerV3Test,ClassControllerSecurityTest,CreateRevenueSplitUseCaseTest" test
# Tests run: 58, Failures: 0, Errors: 0, Skipped: 0
```

Debt còn lại sau Phase 3.1:

- Chưa có FE org-admin để quản lý academic catalog. Vòng tiếp theo nên nối màn `/org-admin` tối thiểu: danh sách + tạo khoa/ngành/khóa/lớp/môn + link course.
- Chưa có `academic_curriculums`, `academic_curriculum_subjects`, `academic_learning_packages`. Chỉ thêm khi đã chốt workflow gói/môn/kỳ học để tránh over-engineering.
- Chưa seed dữ liệu VMU mẫu. Nên seed sau khi API/FE ổn để dữ liệu demo phản ánh workflow thật.
- Chưa smoke qua Docker runtime. Cần chạy sau khi nối FE hoặc trước khi deploy review.

## 20. Phase 3.2 org-admin academic catalog frontend slice - 2026-06-25

Mục tiêu của vòng này là nối phần backend academic catalog vào portal ORG_ADMIN để người vận hành có thể thao tác thử workflow thật. Vẫn giữ nguyên nguyên tắc tối thiểu: chưa làm wizard, modal phức tạp, bulk import hay course picker nâng cao khi API nền mới vừa được thêm.

Thay đổi đã thực hiện:

- Thêm type-safe FE API layer:
  - `fe/src/app/api/types/academic.types.ts`
  - `fe/src/app/api/endpoints/academic.endpoints.ts`
  - `fe/src/app/api/client/academic.api.ts`
- Thêm màn `OrgAcademicCatalogComponent` tại `fe/src/app/features/org-admin/academic-catalog.component.ts`.
- Thêm route `/org-admin/academic` với title `Cấu trúc đào tạo`.
- Thêm menu ORG_ADMIN `Cấu trúc đào tạo` trong sidebar.
- Màn mới lấy `organizationId` từ session hiện tại và chỉ gọi API trong org đó.
- Màn mới hỗ trợ thao tác tối thiểu:
  - xem số lượng khoa/ngành/khóa/lớp/môn/course mapping
  - tạo khoa/bộ môn
  - tạo ngành/chương trình
  - tạo khóa tuyển sinh
  - tạo lớp hành chính
  - tạo môn học
  - liên kết môn học với course LMS bằng Course UUID
- UI dùng design token hiện có: primary `#0056D2`, card trắng, border slate, nền `bg-slate-50`; không đổi hệ thiết kế toàn cục.

Verification:

```bash
cd fe
npx ng build --configuration development
# Application bundle generation complete
```

Ghi chú verification:

- Build FE thành công.
- Các warning hiển thị trong build là warning cũ ở component khác (`admin-storage`, `student-analytics`, `tiptap-editor`, một số Sass `@import`), không phát sinh từ màn academic mới.

Debt còn lại sau Phase 3.2:

- Runtime Docker smoke đã hoàn thành ở Phase 3.3.
- Trường `Course UUID` thủ công đã được thay bằng course picker org-scoped ở Phase 3.4.
- Chưa có update/delete/disable academic item. Chỉ thêm khi có rule nghiệp vụ rõ về dữ liệu đã được dùng bởi lớp, enrollment hoặc curriculum.
- Chưa có seed VMU mẫu; nên thêm sau smoke API để tránh seed sai workflow.
- Chưa có curriculum/package. Đây là lát cắt tiếp theo, không nhồi vào Phase 3.2 để tránh over-engineering.

## 21. Phase 3.3 Docker runtime smoke for academic catalog - 2026-06-25

Mục tiêu của vòng này là kiểm chứng phần academic catalog không chỉ đúng khi compile/test mà còn chạy được trong Docker runtime thật. Đây là checkpoint quan trọng trước khi nối tiếp workflow ORG phức tạp hơn như course picker, curriculum, package hoặc seed VMU.

Kết quả đã xác minh:

- Backend image build thành công trước đó và container `lms-backend-1` khởi động bằng Docker Compose dev.
- Flyway chạy từ schema version `131` lên `140`, bao gồm migration mới `V140__academic_catalog_core.sql`.
- `docker compose` báo `lms-backend-1` healthy và actuator health trả `{"status":"UP"}`.
- PostgreSQL có đủ 6 bảng academic mới:
  - `academic_class_groups`
  - `academic_cohorts`
  - `academic_departments`
  - `academic_programs`
  - `academic_subject_courses`
  - `academic_subjects`
- Đăng nhập bằng tài khoản thật `orgadmin@maritime.edu` thành công và lấy được `organizationId = a0000000-0000-0000-0000-000000000001`.
- `ORG_ADMIN` gọi được `GET /api/v3/organizations/{orgId}/academic/catalog` trong org của mình.
- `ORG_ADMIN` tạo được department smoke trong org của mình qua `POST /departments`; số department tăng từ `0` lên `1`.
- `ORG_ADMIN` truy cập catalog của org khác bị chặn đúng với HTTP `403`.

Verification:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d backend
# lms-backend-1: healthy, 127.0.0.1:8088->8080/tcp

curl http://localhost:8088/actuator/health
# {"status":"UP"}

docker exec lms-db-1 psql -U lms -d lms -c "select table_name from information_schema.tables where table_schema='public' and table_name like 'academic_%' order by table_name;"
# 6 academic tables
```

API smoke evidence:

```text
orgId: a0000000-0000-0000-0000-000000000001
beforeDepartments: 0
createdDepartmentCode: SMOKE-234652
afterDepartments: 1
wrongOrgStatus: 403
```

Debt còn lại sau Phase 3.3:

- Local Docker DB hiện có một department smoke `SMOKE-234652`. Đây là dữ liệu dev-only, không phải seed production.
- Input `Course UUID` đã được thay bằng course picker org-scoped ở Phase 3.4.
- Cần seed VMU mẫu sau khi thống nhất taxonomy thật: khoa, ngành, khóa, lớp, môn.
- Cần thêm curriculum/package theo lát cắt tối thiểu khi đã chốt workflow gói học và quan hệ môn học.
- Cần smoke bằng trình duyệt `/org-admin/academic` sau khi FE dev server chạy, để kiểm tra route/sidebar/session ngoài API.

## 22. Phase 3.4 org-scoped course picker for subject-course mapping - 2026-06-25

Mục tiêu của vòng này là bỏ điểm thao tác thô nhất trong màn academic catalog: nhập `Course UUID` thủ công khi liên kết môn học với course LMS. Theo ponytail, không tạo endpoint mới vì hệ thống đã có `/api/v3/admin/courses/all` và backend đã scope danh sách course theo `ORG_ADMIN`.

Thay đổi đã thực hiện:

- `OrgAcademicCatalogComponent` tái dùng `AdminService#getAllCourses({ page: 0, size: 100 })`.
- Thêm `availableCourses` signal để giữ danh sách course LMS hiện tại trong tổ chức.
- Nút `Tải lại dữ liệu` reload cả catalog học thuật và danh sách course LMS.
- Form liên kết môn-course đổi từ input UUID sang `select`:
  - người vận hành chọn course bằng `code - title`
  - giá trị gửi lên backend vẫn là `course.id`
  - khi chưa có course khả dụng, UI hiển thị ghi chú ngắn thay vì buộc người dùng đoán UUID
- Danh sách liên kết đã tạo hiển thị `code - title` nếu course còn trong picker, fallback về UUID nếu course không có trong trang tải hiện tại.

Verification:

```bash
cd fe
npx ng build --configuration development
# Application bundle generation complete
```

API smoke cho nguồn dữ liệu picker:

```text
GET /api/v3/admin/courses/all?page=0&size=5 as orgadmin@maritime.edu
success: true
returned: 5
totalElements: 11
firstCourse: ENG-202 - 312
```

Ghi chú verification:

- Build FE thành công.
- Các warning còn lại là warning cũ ở component khác (`admin-storage`, `student-analytics`, `quiz-list`, `tiptap-editor`, Sass `@import`), không phát sinh từ `OrgAcademicCatalogComponent`.

Debt còn lại sau Phase 3.4:

- Picker hiện tải tối đa `100` course đầu tiên. Đủ cho demo và org nhỏ; khi VMU có nhiều course thật, cần thêm search/debounce hoặc endpoint picker nhẹ.
- Cần smoke bằng trình duyệt `/org-admin/academic` sau khi FE dev server chạy để kiểm tra session/sidebar/route thực tế.
- Seed VMU mẫu đã được thêm ở Phase 3.5; cần smoke trình duyệt để kiểm tra toàn bộ luồng thao tác.
- Curriculum/package vẫn chưa triển khai; chỉ thêm khi workflow gói học đã được chốt.

## 23. Phase 3.5 VMU-style academic seed data - 2026-06-25

Mục tiêu của vòng này là có dữ liệu mẫu đủ thuyết phục cho phân hệ ORG/VMU mà không hardcode nhánh logic trong ứng dụng. Dữ liệu VMU được đưa vào bằng Flyway, dựa trên `organization.is_default = true`; code ứng dụng vẫn xử lý theo tenant/org chung.

Thay đổi đã thực hiện:

- Thêm migration `V141__seed_vmu_academic_catalog.sql`.
- Seed idempotent bằng `ON CONFLICT`, có thể chạy lại an toàn trên cùng org.
- Seed các nhóm dữ liệu:
  - 4 khoa: Hàng hải, Máy tàu biển, Kinh tế, Công nghệ thông tin
  - 4 chương trình/ngành: Điều khiển tàu biển, Máy tàu biển, Logistics và vận tải biển, Công nghệ thông tin hàng hải
  - 3 khóa tuyển sinh: K63, K64, K65
  - 4 lớp hành chính mẫu: `DKT63DH`, `MTB63DH`, `LOG63DH`, `CNT63DH`
  - 9 môn học hàng hải có tiếng Việt chuẩn
  - 9 mapping môn học -> course LMS bằng `course.code`, không hardcode UUID
- Mapping subject-course dùng `JOIN courses ON course.organization_id = target_org.id AND course.code = ...`; nếu môi trường không có course code tương ứng thì mapping đó tự bỏ qua, không làm hỏng migration.

Verification:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml build backend --progress=plain
# BUILD SUCCESS

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d backend
# Flyway migrated schema public to version 141 - seed vmu academic catalog

curl http://localhost:8088/actuator/health
# {"status":"UP"}
```

DB count sau migration local:

```text
departments: 5
programs: 4
cohorts: 3
class_groups: 4
subjects: 9
subject_courses: 9
```

Ghi chú: `departments = 5` vì local Docker DB còn department smoke `SMOKE-234652` từ Phase 3.3. Seed chính thức của V141 chỉ thêm 4 khoa mẫu.

API catalog smoke:

```text
GET /api/v3/organizations/a0000000-0000-0000-0000-000000000001/academic/catalog
departments: 5
programs: 4
cohorts: 3
classGroups: 4
subjects: 9
subjectCourses: 9
sampleSubject: HH-SAF101 - An toàn cơ bản STCW
```

Debt còn lại sau Phase 3.5:

- Browser smoke `/org-admin/academic` đã hoàn tất ở Phase 3.6.
- Cần quyết định mô hình curriculum/package trước khi thêm bảng mới. Không thêm chỉ vì “có thể cần”.
- Cần bổ sung search/debounce cho course picker khi số course của một org vượt quá 100.
- Nếu muốn production review có dữ liệu academic mới, cần deploy migration V141 lên VM và smoke lại bằng tài khoản ORG_ADMIN thật.

## 24. Phase 3.6 browser smoke + persisted-role guard hardening - 2026-06-25

Mục tiêu của vòng này là kiểm chứng route thật trong FE dev server, không chỉ kiểm chứng API/build. Smoke dùng Playwright headless, đăng nhập bằng backend thật rồi bơm session vào `localStorage` giống phiên đã đăng nhập.

Phát hiện quan trọng:

- Backend trả role dạng `ORG_ADMIN`, trong khi frontend guard dùng enum `org_admin`.
- Luồng đăng nhập thật đã normalize role qua `applyAuthenticatedSession`, nhưng session cũ hoặc smoke bơm trực tiếp `lms_user` vào `localStorage` có thể giữ role uppercase.
- Với persisted role uppercase, `orgAdminPortalGuard` có thể redirect về chính `/org-admin/academic`, gây guard loop và làm browser headless treo sau navigation.

Thay đổi đã thực hiện:

- `AuthService#getSavedUser()` normalize user khi hydrate từ `localStorage`.
- `AuthService#userRole()` luôn trả role lowercase.
- `AuthService#hasRole()` so sánh lowercase để chống lệch casing.

Browser smoke evidence:

```text
route: http://localhost:4200/org-admin/academic
selectCount: 6
courseOptionCount: 12
hasSeedCourseOption: true
courseApi: /api/v3/admin/courses/all?page=0&size=100 -> 200
consoleErrorCount: 0
pageErrorCount: 0
requestFailureCount: 0
```

DOM verification:

- Academic route render đúng với ORG_ADMIN.
- VMU seed có mặt qua các mã ổn định: `KHOA-HH`, `HH-SAF101`.
- Course picker render 12 option, gồm seed course `SAF-101`.
- FE dev proxy `/api -> http://localhost:8088` hoạt động đúng.

Verification:

```bash
cd fe
npx ng build --configuration development
# Application bundle generation complete

python <Playwright DOM smoke>
# ok: true
```

Ghi chú verification:

- Playwright screenshot trên Windows/headless có lúc timeout ở compositor; DOM smoke được dùng làm tiêu chí chính vì mục tiêu là logic route/API/render, không phải kiểm thử engine chụp ảnh.
- Tránh viết smoke Python qua PowerShell với literal tiếng Việt nếu không set encoding cẩn thận. Dùng mã nghiệp vụ ASCII ổn định (`KHOA-HH`, `HH-SAF101`, `SAF-101`) hoặc đọc/ghi file UTF-8.

Debt còn lại sau Phase 3.6:

- Course picker vẫn tải tối đa `100` course; cần search/debounce khi tổ chức lớn hơn.
- Academic catalog hiện là CRUD nền tảng, chưa có mô hình curriculum/package/semester rule.
- Cần deploy V140/V141 và bản vá role normalization lên VM review khi bắt đầu vòng production smoke.

## 25. Phase 3.7 org payment config invariant hardening - 2026-06-26

Mục tiêu của vòng này là tiếp tục khóa phần SePay/payment theo hướng tenant-safe nhưng không mở rộng hệ thống quá mức. Audit cho thấy `org_payment_configs` đã có check phần trăm và tổng phần trăm từ `V81`, nhưng domain model vẫn có thể nhận số âm và `min_payout_amount` chưa có DB constraint không âm.

Thay đổi đã thực hiện:

- `OrgPaymentConfig` reject `null` và giá trị âm cho `platformFeePct`, `teacherSharePct`, `minPayoutAmount`.
- Giữ invariant cũ: `platformFeePct + teacherSharePct <= 100`.
- Thêm migration `V142__org_payment_config_min_payout_check.sql` để DB cũng chặn `min_payout_amount < 0`.
- Thêm `OrgPaymentConfigTest` thuần domain, không mock, để khóa các rule tài chính cơ bản.

Verification:

```bash
cd backend
mvn "-Dtest=OrgPaymentConfigTest,ManageOrgPaymentConfigUseCaseTest,OrgPaymentConfigControllerV3Test,PaymentControllerV3Test,AdminRevenueControllerV3Test,CreateRevenueSplitUseCaseTest,RequestPayoutUseCaseTest" test
# Tests run: 31, Failures: 0, Errors: 0, Skipped: 0

docker compose -f docker-compose.yml -f docker-compose.dev.yml build backend
# BUILD SUCCESS

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d backend
# backend recreated and healthy

docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T db psql -U lms -d lms -c "select version, description, success from flyway_schema_history where version in ('140','141','142') order by installed_rank;"
# 142 | org payment config min payout check | t

docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T db psql -U lms -d lms -c "select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'chk_org_payment_configs_min_payout_nonnegative';"
# CHECK ((min_payout_amount >= (0)::numeric))
```

Kết luận:

- Payment config hiện không còn cho phép cấu hình âm ở domain layer.
- Database có thêm hàng rào cho minimum payout, khớp với ý nghĩa nghiệp vụ của payout.
- Không thêm per-org SePay bank account hoặc payment subsystem mới vì chưa có bằng chứng workflow hiện tại cần; theo ponytail, chỉ thêm khi ORG_ADMIN thật sự cần quản lý bank account theo org.

Debt còn lại sau Phase 3.7:

- Audit FE org-admin xem màn cấu hình payment có đủ loading/error/permission chưa; chỉ sửa UX tối thiểu sau khi xác định route đang dùng thật.
- Nếu mở workflow bank-account approval cho ORG_ADMIN, khi đó mới cần `teacher_bank_accounts.organization_id` hoặc policy rõ hơn.
- Deploy V140/V141/V142 và role normalization lên VM review khi bắt đầu vòng production smoke tiếp theo.

## 26. Phase 3.8 org-admin payment config FE validation smoke - 2026-06-26

Mục tiêu của vòng này là nối invariant backend ở Phase 3.7 với trải nghiệm ORG_ADMIN hiện có, nhưng chỉ sửa tối thiểu. Route `/org-admin/organization?tab=payment-config` đang reuse `OrganizationDetailComponent`, gọi đúng API `/api/v3/organizations/{orgId}/payment-config` và lấy `orgId` từ user hiện tại khi không có route param.

Phát hiện:

- Backend/domain đã chặn tỷ lệ âm.
- FE `savePaymentConfig(...)` cũng đã chặn tỷ lệ âm khi bấm lưu.
- Nhưng preview/live validation `configError` chưa báo lỗi ngay khi nhập tỷ lệ âm, nên người dùng có thể thấy preview lệch trước khi submit.

Thay đổi đã thực hiện:

- `OrganizationDetailComponent#configError` trả lỗi `Tỷ lệ không thể âm` ngay khi `platformFeePct` hoặc `teacherSharePct` trong preview nhỏ hơn `0`.
- Không thêm component mới, không đổi layout, không tạo route mới vì workflow hiện tại đã đủ cho lát cắt payment config.

Verification:

```bash
cd fe
npx ng build --configuration development
# Application bundle generation complete
```

Browser smoke:

```text
route: http://localhost:4200/org-admin/organization?tab=payment-config
numberInputCount: 3
payment-config API: 200
negative percentage input: error hint visible
saveDisabledWhenNegative: true
consoleErrorCount: 0
pageErrorCount: 0
artifact: artifacts/org-admin-payment-config-smoke.json
```

API direct smoke:

```text
GET /api/v3/organizations/{orgId}: 200
GET /api/v3/organizations/{orgId}/members: 200
GET /api/v3/organizations/{orgId}/invites: 200
GET /api/v3/organizations/{orgId}/payment-config: 200
```

Ghi chú verification:

- Một số request trong Playwright có thể báo `requestfailed` do điều hướng/abort của dev server, nhưng API direct smoke cùng token ORG_ADMIN đều trả `200`, và browser smoke cuối không có console/page error.
- Build FE vẫn có các warning cũ ở `admin-storage`, `student-analytics`, `quiz-list`, `tiptap-editor`, Sass `@import`; không phát sinh từ payment-config change.

Debt còn lại sau Phase 3.8:

- Nếu muốn UX tài chính chặt hơn, có thể chuyển `minPayoutAmount` thành signal để live-validate giống phần trăm. Phase 3.10 đã xử lý live validation cho `< 10.000 VND`; backend/DB vẫn là hàng rào cuối cho giá trị âm.
- Chưa deploy V140/V141/V142, role normalization và FE payment validation lên VM review.
- Cần audit `/org-admin` payment/payout navigation tổng thể: ORG_ADMIN xem payout queue, approve/reject same-org, còn complete payout vẫn ADMIN-only. Phase 3.9 đã xử lý route/menu/smoke cho payout queue.

## 27. Phase 3.9 org-admin payout route exposure smoke - 2026-06-26

Mục tiêu của vòng này là hoàn thiện phần navigation cho payout theo đúng boundary đã có ở backend: ORG_ADMIN được xem và duyệt/từ chối payout trong phạm vi tổ chức; thao tác hoàn tất chuyển khoản vẫn chỉ dành cho SYSTEM_ADMIN. Audit cho thấy `AdminPayoutsComponent` đã gọi endpoint org-scoped `/api/v3/admin/revenue/payouts` và backend test đã khóa cùng tổ chức/khác tổ chức, nhưng FE chưa expose route `/org-admin/payouts`.

Thay đổi đã thực hiện:

- Thêm `/payouts` vào `ORG_ADMIN_SHARED_SUFFIXES` để các đường `/admin/payouts` được map an toàn về `/org-admin/payouts` cho ORG_ADMIN.
- Thêm route `/org-admin/payouts`, reuse `AdminPayoutsComponent` hiện có thay vì tạo component mới.
- Thêm sidebar item `Rút tiền` cho ORG_ADMIN, nhóm `Tài chính`.
- Không đổi backend vì endpoint/policy hiện tại đã có test org-scoped và component đã phân biệt SYSTEM_ADMIN khi copy/complete payout.

Verification:

```bash
cd fe
npx ng build --configuration development
# Application bundle generation complete
```

Browser smoke:

```text
route: http://localhost:4200/org-admin/payouts
pageTitle: Quản lý rút tiền
sidebarPayoutLinks: 1
GET /api/v3/admin/revenue/payouts?status=PENDING&page=0&size=20: 200
GET /api/v3/admin/revenue/payouts?status=PENDING&page=0&size=1: 200
GET /api/v3/admin/revenue/payouts?status=APPROVED&page=0&size=1: 200
GET /api/v3/admin/revenue/payouts?status=COMPLETED&page=0&size=1: 200
GET /api/v3/admin/revenue/payouts?status=REJECTED&page=0&size=1: 200
consoleErrorCount: 0
pageErrorCount: 0
artifact: artifacts/org-admin-payouts-smoke.json
```

Kết luận:

- ORG_ADMIN hiện có đường chính quy để quản lý payout queue theo phạm vi tổ chức.
- Route/menu không bypass quyền: backend vẫn là nguồn sự thật cho approve/reject/complete.
- Giữ đúng ponytail: reuse component đã có và thêm route/menu thiếu, không tạo workflow tài chính mới khi chưa có yêu cầu thật.

Debt còn lại sau Phase 3.9:

- Cần deploy toàn bộ V140/V141/V142 + FE route/payment validation lên VM review rồi chạy production smoke.
- Cần audit dữ liệu payout seed/fixture để có case PENDING/APPROVED thật khi demo luồng duyệt/từ chối/chờ SYSTEM_ADMIN hoàn tất.
- Nếu tổ chức cần tài khoản nhận tiền riêng, lúc đó mới thiết kế `org_bank_accounts` hoặc mở rộng `org_payment_configs`; hiện chưa nên thêm bảng.

## 28. Phase 3.10 org payment min-payout live validation - 2026-06-26

Mục tiêu của vòng này là đóng nốt debt nhỏ sau Phase 3.8: `minPayoutAmount` đã được chặn khi bấm lưu, nhưng chưa phản hồi trực tiếp như hai tỷ lệ phần trăm. Đây là một chỉnh logic FE nhỏ, không phải redesign.

Thay đổi đã thực hiện:

- Thêm `configPreviewMinPayout` signal để input số tiền rút tối thiểu có source of truth giống `platformFeePct` và `teacherSharePct`.
- Thêm `minPayoutError` computed:
  - reject giá trị không hợp lệ;
  - reject `< 10.000 VND`.
- Bind input min payout vào signal.
- Disable nút `Lưu cấu hình` khi có `minPayoutError`.
- Thêm style lỗi bằng token `$error` hiện có, không tạo token mới.

Verification:

```bash
cd fe
npx ng build --configuration development
# Application bundle generation complete
```

Browser smoke:

```text
route: http://localhost:4200/org-admin/organization?tab=payment-config
numberInputCount: 3
payment-config API: 200
input minPayoutAmount = 5000
lowMinPayoutHintVisible: true
saveDisabledWhenLowMinPayout: true
consoleErrorCount: 0
pageErrorCount: 0
artifact: artifacts/org-admin-payment-config-min-payout-smoke.json
```

Kết luận:

- Payment config FE hiện phản hồi trực tiếp cho cả phần trăm âm, tổng phần trăm vượt 100%, tổ chức âm và minimum payout quá thấp.
- Không đổi backend vì Phase 3.7 đã khóa domain + DB constraint cho giá trị âm; rule `< 10.000 VND` hiện là rule workflow FE/usecase khi lưu.

Debt còn lại sau Phase 3.10:

- Deploy các thay đổi ORG mới lên VM review rồi chạy production smoke.
- Audit payout data seed/fixture để demo được PENDING/APPROVED thật.
- Khi có yêu cầu nghiệp vụ thật, mới thiết kế tiếp org-specific bank account hoặc package/tuition policy.

## 29. Phase 3.11 clean branch packaging and verification - 2026-06-26

Mục tiêu của vòng này là đưa toàn bộ phần ORG mới ra khỏi workspace local đang rất dirty để có một nhánh sạch, có thể review/CI/deploy theo chuẩn production.

Quy tắc đã áp dụng:

- `karpathy-guidelines`: không giả định production đã nhận code mới khi chưa có image mới; mọi bước đều có check chạy được.
- `ponytail`: chỉ đóng gói scope ORG/payment/academic/runtime tối thiểu, không kéo artifacts Unity, SchemaSpy HTML, docs-site hoặc report lớn vào nhánh.
- `docker-compose-production`: giữ đường deploy bằng prebuilt GHCR image, không build backend/frontend trực tiếp trên VM review để tránh OOM và drift runtime.

Nhánh sạch:

```text
worktree: E:\Sach\Sua\LMS_hohulili_org_goal_clean
branch: codex/org-logic-completion-clean
base: origin/main @ b8267c9e
```

Scope được đưa vào nhánh:

- Tenant ownership trực tiếp cho `courses`, `learning_classes`, `payout_requests`, `payment_transactions`.
- Academic catalog tối thiểu cho VMU theo hướng tenant chung, không hardcode logic VMU trong code.
- Org payment config hardening: domain validation, DB check, FE live validation.
- Org-admin route/menu cho academic catalog và payout queue.
- Runtime guardrails đã có trên VM: `LMS_SITE_ADDRESS`, IP fallback, `VIDEO_INGEST_ENABLED` từ `.env.prod`.
- Tài liệu goal và redeploy plan.

Verification đã chạy trên worktree sạch:

```bash
git diff --check
# pass; chỉ có cảnh báo line-ending Windows/Unix

cd backend
mvn "-Dtest=ManageAcademicCatalogUseCaseTest,AcademicCatalogControllerV3Test,CourseQueryControllerV3ContractTest,AdminCoursesControllerV3PendingFilterTest,AdminCoursesControllerV3Test,ClassControllerSecurityTest,LearningClassTest,CreateRevenueSplitUseCaseTest,OrgPaymentConfigTest,RequestPayoutUseCaseTest,PaymentControllerV3Test,AdminRevenueControllerV3Test" test
# Tests run: 88, Failures: 0, Errors: 0

mvn test -B
# Tests run: 1169, Failures: 0, Errors: 0

cd ../fe
npm ci
npm run build
# Application bundle generation complete

docker compose --env-file .env.prod.example -f docker-compose.yml -f docker-compose.prod.yml config -q
# pass
```

Ghi chú verification:

- `npm ci` báo `32 vulnerabilities` trong dependency tree hiện tại. Không chạy `npm audit fix` trong vòng này vì sẽ đổi lockfile ngoài scope ORG.
- FE build vẫn có các warning nền hiện có: Node 25 không-LTS, Angular optional-chain/nullish warnings, Sass `@import` deprecation, CommonJS dependency warnings từ `mammoth`. Không có build error.
- `fe/public/sitemap-courses.xml` được build script generate lại trong quá trình build thử và đã được loại khỏi commit scope.
- VM production review hiện vẫn ở `origin/main @ b8267c9e`; các thay đổi ORG chưa được deploy production cho đến khi branch sạch được commit/push/merge và GHCR image mới được build.

Deployment gate tiếp theo:

1. Commit và push branch `codex/org-logic-completion-clean`.
2. Mở PR hoặc merge theo quy tắc repo.
3. Đợi CI backend/FE/compose/docker smoke pass và GHCR image mới được build.
4. Deploy bằng workflow hoặc VM `git checkout <sha>` + `./deploy.sh`.
5. Chạy production smoke: health, login ORG_ADMIN, `/org-admin/academic`, `/org-admin/organization?tab=payment-config`, `/org-admin/payouts`, course/class/payment scoped API.

Debt còn lại sau Phase 3.11:

- Chưa chạy production smoke vì chưa có image mới trên GHCR.
- Cần tạo payout sample thật cho demo nếu muốn trình bày approve/reject/complete rõ ràng.
- Curriculum/package/tuition policy vẫn là bước sau, chỉ thêm khi workflow học thuật và gói học được chốt.

## 30. Phase 3.12 merge, deploy, and production smoke - 2026-06-26

Mục tiêu của vòng này là đóng loop từ branch sạch đến runtime thật, thay vì chỉ dừng ở code đã build được.

GitHub flow:

- PR: `#517` - `ORG tenant workflows: academic catalog, scoped ownership, payments`.
- Merge commit: `9e6e09401804e75e472b95da948b860c2bcfd2e9`.
- PR CI: backend, frontend, compose, Cloudflare Worker, Docker smoke đều pass.
- Main `Build & Deploy`: build/push backend + frontend GHCR image pass.

Sự cố deploy đã gặp và cách xử lý:

- Lần deploy đầu fail ở SSH vì GitHub Environment `production` vẫn trỏ VM cũ `35.187.245.201` và app dir cũ `/home/Admin/LMS_hohulili`.
- Đã cập nhật Environment variables:
  - `DEPLOY_HOST=34.87.45.168`
  - `DEPLOY_USER=Admin`
  - `DEPLOY_APP_DIR=/home/Admin/apps/LMS_hohulili`
- Đã cập nhật Environment secrets:
  - `DEPLOY_SSH_PRIVATE_KEY` theo key quản trị VM mới.
  - `DEPLOY_KNOWN_HOSTS` theo host key của `34.87.45.168`.
- Rerun `Build & Deploy` thành công.

Production runtime sau deploy:

```text
VM HEAD: 9e6e09401804e75e472b95da948b860c2bcfd2e9
containers: db, gotenberg, backend, frontend, caddy, video-worker healthy
```

Production smoke:

```text
GET https://holilihu.online/actuator/health -> 200 / UP
GET https://holilihu.online/api/v3/courses?page=0&size=3 -> 200, totalElements=174
HEAD https://holilihu.online/org-admin/academic -> 200
```

ORG_ADMIN smoke:

```text
login: orgadmin@maritime.edu / orgadmin123
role: ORG_ADMIN
organizationId: a0000000-0000-0000-0000-000000000001
GET /api/v3/organizations/{orgId}/academic/catalog -> 200
catalog counts: 4 departments, 4 programs, 3 cohorts, 4 class groups, 9 subjects, 9 subject-course links
GET /api/v3/payments/admin/all?page=0&size=1 -> 200
GET /api/v3/admin/revenue/payouts?page=0&size=1 -> 200
```

Kết luận:

- Mục tiêu nền tảng của logic ORG đã vào main và chạy được trên production review runtime.
- ORG_ADMIN đã có luồng demo thật: đăng nhập, vào route org-admin, đọc catalog học thuật VMU, xem payment/payout theo organization.
- Chưa chuyển sang microservice; đây là quyết định đúng hiện tại theo `ponytail` và `karpathy-guidelines`: giữ monolith sạch, tenant-scoped, có test và deploy được.

Debt còn lại:

- Cần tạo dữ liệu payout pending/approved/completed có chủ ý nếu muốn demo thao tác duyệt rút tiền end-to-end.
- Cần smoke UI bằng browser cho các màn `/org-admin/academic`, payment config và payout queue sau khi người dùng mở web.
- Package/tuition/enrollment policy theo từng ORG vẫn là phase sau, chỉ thiết kế khi rule nghiệp vụ VMU được chốt cụ thể.

## 31. Phase 4.1 VMU learning package foundation - 2026-06-26

Mục tiêu của vòng này là mở rộng academic catalog từ khung chương trình sang gói học/học phí theo cách an toàn cho nhiều tổ chức. VMU được seed như dữ liệu mẫu đầu tiên, không hardcode logic VMU trong service/controller.

Quyết định chính:

- Không dùng lại bảng `packages` hiện có vì bảng đó thuộc workflow assessment/question-bank.
- Thêm bảng mới `learning_packages` và `learning_package_items` trong academic/org domain.
- Chưa nối package vào checkout/SePay ở vòng này vì payment hiện tại là course-level và tự enroll theo course/class; package checkout cần workflow riêng để tránh rò logic tài chính.

Thay đổi đã thực hiện:

- Thêm migration `V145__academic_learning_packages.sql`.
- Thêm seed `V146__seed_vmu_learning_packages.sql` cho gói `VMU-DKT-K63-FOUNDATION`.
- Thêm domain/JPA/repository/usecase/controller cho learning package và package item.
- Mở rộng `/api/v3/organizations/{orgId}/academic/catalog` trả về `learningPackages` và `learningPackageItems`.
- Thêm API tạo learning package và thêm subject/course vào package.
- Mở rộng `/org-admin/academic` để ORG_ADMIN tạo gói học và thêm môn/course vào gói.

Verification:

```bash
cd backend
mvn "-Dtest=ManageAcademicCatalogUseCaseTest,AcademicCatalogControllerV3Test" test
# Tests run: 8, Failures: 0, Errors: 0

mvn resources:resources flyway:migrate \
  "-Dflyway.url=jdbc:postgresql://localhost:55433/lms" \
  "-Dflyway.user=lms" \
  "-Dflyway.password=lms"
# Successfully applied migrations through v146 on a temporary PostgreSQL 16 container

cd ../fe
npm run build -- --configuration development
# Application bundle generation complete
```

Debt còn lại sau Phase 4.1:

- Cần thêm `organization_capabilities` để bật/tắt module như academic catalog, curriculum plan, learning packages theo từng ORG.
- Cần thiết kế package enrollment/payment flow sau khi rule nghiệp vụ được chốt: miễn phí, cần ORG duyệt, invite-only, hoặc bắt buộc thanh toán.
- Cần browser/API smoke sau khi branch được merge/deploy để xác nhận VMU package seed hiển thị trên review runtime.

## 32. Phase 4.2 VMU learning package seed hotfix - 2026-06-26

Production smoke sau khi merge Phase 4.1 cho thấy API mới hoạt động nhưng `learningPackages = 0`. Root cause là V146 chọn tổ chức theo `code = 'VMU'` hoặc tên chứa `Hàng hải`, trong khi dữ liệu academic demo đang nằm ở default organization từ V144.

Thay đổi hotfix:

- Thêm migration forward-only `V147__seed_vmu_learning_package_default_org_fix.sql`.
- Chọn org từ chính `curriculum_plans.code = 'DKT-K63-CDIO'`, không phụ thuộc tên/code organization.
- Insert/update package `VMU-DKT-K63-FOUNDATION`.
- Insert sáu item subject thuộc cùng org với curriculum plan.

Verification cần chạy trước khi coi vòng này xong:

- Flyway migrate qua V147 trên DB tạm.
- Merge/deploy lên review runtime.
- Smoke catalog để xác nhận `learningPackages = 1` và `learningPackageItems = 6`.

Kết quả sau deploy:

- PR `#523` đã merge vào main với merge commit `7e1029c9be80e3f0be18765b338aa60e350bf543`.
- Main CI và `Build & Deploy` đều thành công.
- Production health: `UP`.
- ORG_ADMIN catalog smoke:
  - `learningPackages = 1`;
  - `learningPackageItems = 6`;
  - seed package: `Gói nền tảng Điều khiển tàu biển K63`;
  - policy: `ORG_APPROVAL`;
  - price: `0 VND`;
  - item count by `packageId`: `6`.
- Browser smoke `/org-admin/academic`:
  - metric `GÓI HỌC 1` hiển thị;
  - metric `MỤC TRONG GÓI 6` hiển thị;
  - package code/name hiển thị;
  - console errors: `0`;
  - screenshot: `artifacts/org-admin-learning-packages-production-debug.png`.

Kết luận:

- Phase 4.2 đã đóng xong lỗi seed rỗng.
- Gói học VMU hiện đã tồn tại thật trên review runtime và được đọc qua org-admin academic catalog.
- Bước tiếp theo của goal là `organization_capabilities` để bật/tắt academic/curriculum/package module theo từng tổ chức, trước khi nối package enrollment/payment.

## 33. Phase 4.3 organization capabilities foundation - 2026-06-26

Mục tiêu của vòng này là thêm lớp cấu hình module theo tổ chức trước khi đi sâu vào package enrollment/payment. Đây là bước nhỏ nhưng quan trọng để hệ thống có thể phục vụ nhiều ORG khác VMU mà không hardcode nhánh logic riêng.

Thay đổi đã thực hiện:

- Thêm migration `V148__organization_capabilities.sql`.
- Thêm bảng `organization_capabilities` với:
  - `organization_id`;
  - `capability_key`;
  - `enabled`;
  - unique `(organization_id, capability_key)`;
  - check regex `^[a-z][a-z0-9_]{1,63}$`.
- Seed default organization với 5 capability đang dùng cho luồng ORG hiện tại:
  - `academic_catalog`;
  - `curriculum_plan`;
  - `learning_packages`;
  - `org_payment_config`;
  - `org_payout_approval`.
- Thêm domain model `OrganizationCapability`, repository port, JPA entity/repository/adapter, DTO và use case `ManageOrganizationCapabilitiesUseCase`.
- Thêm API:
  - `GET /api/v3/organizations/{id}/capabilities`: `ADMIN` hoặc `ORG_ADMIN` cùng tổ chức;
  - `PUT /api/v3/organizations/{id}/capabilities/{key}`: `ADMIN` only.
- Mở rộng `/org-admin/academic` để đọc và hiển thị các capability đang bật cho ORG hiện tại.
- Sửa default `APP_JWT_SECRET` trong `docker-compose.yml` về Base64 dev secret giống `.env.dev.example`, vì backend decode JWT secret bằng Base64 và local runtime không có `.env` sẽ bị lỗi login.

Quyết định thiết kế:

- Không tạo plugin system.
- Không hardcode VMU.
- Không ẩn workflow theo capability ở vòng đầu tiên, vì các ORG cũ chưa có seed capability sẽ có nguy cơ mất chức năng đột ngột. Phase này chỉ expose trạng thái cấu hình; enforcement sâu sẽ đi sau khi policy rule rõ ràng.
- `ORG_ADMIN` chỉ đọc capability của org mình. Bật/tắt capability vẫn là quyền `ADMIN` để tránh ORG tự mở module chưa được vận hành/hợp đồng.

Verification:

```bash
cd backend
mvn "-Dtest=ManageOrganizationCapabilitiesUseCaseTest" test
# Tests run: 5, Failures: 0, Errors: 0

cd ../fe
npm run build
# Application bundle generation complete
```

Local runtime/API smoke trước khi Docker Desktop bị treo daemon:

```text
Flyway V148 applied successfully.
organization_capabilities has 5 default enabled capabilities.
POST /api/v3/auth/login as orgadmin@maritime.edu -> ORG_ADMIN.
GET /api/v3/organizations/{orgId}/capabilities -> 5 enabled capabilities:
academic_catalog, curriculum_plan, learning_packages, org_payment_config, org_payout_approval.
```

Ghi chú runtime:

- Browser smoke local `/org-admin/academic` chưa hoàn tất vì Docker Desktop daemon bị kẹt sau một lần build frontend Docker timeout.
- Angular dev server build được và `curl -I http://127.0.0.1:4200/auth/login` trả `200`.
- Docker service local cần được khôi phục thủ công hoặc smoke lại sau khi branch được deploy lên review runtime.

Debt còn lại sau Phase 4.3:

- Cần PR/merge/deploy Phase C để production review runtime có V148.
- Cần smoke browser `/org-admin/academic` sau deploy để xác nhận capability strip hiển thị.
- Phase tiếp theo nên tập trung vào policy enforcement: package enrollment policy, tuition policy, hoặc package checkout chỉ khi rule nghiệp vụ VMU đã chốt rõ.

## 34. Phase 4.4 learning package enrollment policy workflow - 2026-06-26

Mục tiêu của vòng này là biến `learning_packages.enrollment_policy` từ dữ liệu cấu hình thành workflow nghiệp vụ thật. Trước thay đổi này, VMU đã có chương trình đào tạo, môn học, khung chương trình và gói học, nhưng chưa có trạng thái để học viên đăng ký gói và ORG_ADMIN duyệt/từ chối.

Thay đổi đã thực hiện:

- Thêm migration `V149__learning_package_enrollments.sql`.
- Thêm bảng `learning_package_enrollments` với:
  - `organization_id`;
  - `package_id`;
  - `student_id`;
  - `status`;
  - `requested_at`;
  - `decided_at`;
  - `decided_by`;
  - `decision_note`.
- Enforce unique `(package_id, student_id)` để đăng ký gói là idempotent.
- Thêm trạng thái:
  - `PENDING_APPROVAL`;
  - `PENDING_PAYMENT`;
  - `ACTIVE`;
  - `REJECTED`;
  - `CANCELLED`.
- Thêm migration `V150__seed_vmu_learning_package_enrollment_request.sql` để tạo một yêu cầu demo `PENDING_APPROVAL` cho package `VMU-DKT-K63-FOUNDATION` nếu có học viên cùng tổ chức.
- Thêm domain model `AcademicLearningPackageEnrollment` với rule:
  - `OPEN` -> `ACTIVE`;
  - `ORG_APPROVAL` -> `PENDING_APPROVAL`;
  - `PAYMENT_REQUIRED` -> `PENDING_PAYMENT`;
  - `INVITE_ONLY` -> chặn đăng ký trực tiếp.
- Thêm use case `ManageLearningPackageEnrollmentUseCase`.
- Thêm API:
  - `POST /api/v3/organizations/{orgId}/academic/learning-packages/{packageId}/enrollments/me` cho `STUDENT` cùng tổ chức;
  - `GET /api/v3/organizations/{orgId}/academic/learning-package-enrollments` cho `ADMIN` hoặc `ORG_ADMIN` cùng tổ chức;
  - `PATCH /api/v3/organizations/{orgId}/academic/learning-package-enrollments/{enrollmentId}/approve`;
  - `PATCH /api/v3/organizations/{orgId}/academic/learning-package-enrollments/{enrollmentId}/reject`.
- Mở rộng `/org-admin/academic` bằng card "Yêu cầu gói học" để ORG_ADMIN xem, duyệt và từ chối yêu cầu gói học.

Quyết định thiết kế:

- Không tự động enroll vào từng course trong phase này. Package hiện có thể chứa `subject_id`; course enrollment hiện có rule riêng về delivery mode/payment. Nối vội sẽ dễ làm sai quyền truy cập hoặc thanh toán.
- Không hardcode VMU trong code. VMU chỉ xuất hiện ở seed data và package code demo.
- Không tạo microservice/plugin. Đây vẫn là modular monolith với workflow nhỏ, dễ kiểm thử.

Verification:

```bash
cd backend
mvn "-Dtest=ManageLearningPackageEnrollmentUseCaseTest,LearningPackageEnrollmentControllerV3Test,ManageAcademicCatalogUseCaseTest,AcademicCatalogControllerV3Test" test
# Tests run: 20, Failures: 0, Errors: 0

cd ../fe
npm run build
# Application bundle generation complete
```

Debt còn lại sau Phase 4.4:

- Cần Docker/Flyway smoke để xác nhận V149/V150 migrate sạch trên DB runtime.
- Cần browser smoke `/org-admin/academic` sau khi backend chạy để xác nhận hàng chờ package enrollment hiển thị và approve/reject gọi API 200.
- Phase kế tiếp nên nối `ACTIVE` package enrollment sang quyền học thật:
  - nếu item là `course_id`, enroll course theo rule hiện có;
  - nếu item là `subject_id`, tìm primary `subject_course` trước khi enroll;
  - nếu package `PAYMENT_REQUIRED`, cần package-level checkout hoặc mapping sang payment hiện có trước khi active.

## 35. Phase 4.5 package entitlement grants real course access - 2026-06-26

Mục tiêu của vòng này là đóng vòng nghiệp vụ sau khi ORG_ADMIN duyệt gói học: học viên không chỉ có package enrollment `ACTIVE`, mà còn được cấp quyền học thật vào các khóa học phù hợp trong gói.

Thay đổi đã thực hiện:

- Thêm `GrantCourseAccessUseCase` trong module `learning_delivery`.
- Use case mới cấp quyền học từ một entitlement đã được xác thực, ví dụ gói học tổ chức, và không thay thế `SelfEnrollUseCase`.
- `SelfEnrollUseCase` vẫn giữ trách nhiệm kiểm tra thanh toán course-level cho tự đăng ký cá nhân.
- `GrantCourseAccessUseCase`:
  - kiểm tra course thuộc đúng `organization_id`;
  - yêu cầu course `APPROVED`;
  - chỉ cấp tự động cho course `SELF_PACED`;
  - tạo hoặc tái sử dụng lớp `DEFAULT`;
  - set `learning_classes.organization_id` đúng tenant;
  - trả lại enrollment hiện có nếu học viên đã `ACTIVE` hoặc `COMPLETED`;
  - tái kích hoạt enrollment `DROPPED` hoặc `SUSPENDED`.
- `ManageLearningPackageEnrollmentUseCase` giờ cấp quyền course khi:
  - package policy `OPEN` tạo enrollment `ACTIVE`;
  - ORG_ADMIN approve enrollment `PENDING_APPROVAL` sang `ACTIVE`;
  - enrollment đã `ACTIVE` được gọi lại idempotently.
- Package item resolution:
  - item có `course_id` -> grant course trực tiếp;
  - item có `subject_id` -> resolve qua các `subject_courses` đang `ACTIVE`;
  - loại trùng course bằng `LinkedHashSet` để không tạo enrollment lặp.

Quyết định thiết kế:

- Không bypass payment trong luồng tự đăng ký course cá nhân.
- Không tự động cấp quyền cho `INSTRUCTOR_LED` course vì loại này cần class placement rõ ràng, ví dụ lớp CNT63ĐH, KPM63ĐH hoặc lớp học kỳ cụ thể.
- Không hardcode VMU. VMU chỉ là dữ liệu cấu hình qua organization, curriculum, subject, package, subject-course mapping.
- Nếu package không resolve ra course hợp lệ, workflow báo lỗi thay vì kích hoạt package “rỗng”.

Verification:

```bash
cd backend
mvn "-Dtest=ManageLearningPackageEnrollmentUseCaseTest,GrantCourseAccessUseCaseTest" test
# Tests run: 13, Failures: 0, Errors: 0
```

Debt còn lại sau Phase 4.5:

- `PAYMENT_REQUIRED` package vẫn cần slice package checkout/payment completion trước khi auto-grant.
- `INSTRUCTOR_LED` package cần rule xếp lớp cụ thể, không nên dùng lớp `DEFAULT`.
- Cần Docker/Flyway/browser smoke khi Docker Desktop daemon phản hồi lại, vì lượt này Docker CLI timeout ở bước `docker compose ps`.

## 36. Phase 4.6 package class placement for instructor-led courses - 2026-06-26

Mục tiêu của vòng này là xử lý phần còn thiếu của Phase 4.5: khi một gói học chứa course có giảng viên hoặc cần triển khai theo lớp/kỳ/khóa, hệ thống phải biết cấp học viên vào lớp học cụ thể nào. Đây là workflow rất quan trọng với VMU vì nghiệp vụ thật thường đi qua lớp như CNT63ĐH, KPM63ĐH, khóa K63, học kỳ và môn học, không chỉ qua course tự học.

Thay đổi đã thực hiện:

- Thêm migration `V151__learning_package_class_targets.sql`.
- Thêm bảng `learning_package_class_targets` với:
  - `organization_id`;
  - `package_id`;
  - `course_id`;
  - `learning_class_id`;
  - `status`.
- Thêm unique `(package_id, course_id)` để một course trong một package chỉ có một class target vận hành chính.
- Thêm FK theo tenant:
  - `(package_id, organization_id)` -> `learning_packages`;
  - `(course_id, organization_id)` -> `courses`;
  - `(learning_class_id, organization_id)` -> `learning_classes`.
- Thêm domain/JPA/repository mapping `AcademicLearningPackageClassTarget`.
- Mở rộng academic catalog response bằng `learningPackageClassTargets`.
- Thêm API:
  - `POST /api/v3/organizations/{orgId}/academic/learning-package-class-targets`.
- `ManageAcademicCatalogUseCase` validate:
  - package thuộc đúng org;
  - course thuộc đúng org;
  - learning class thuộc đúng org;
  - learning class thuộc đúng course;
  - package/course chưa có target trùng.
- `GrantCourseAccessUseCase` thêm `grantClass(...)` để cấp quyền vào lớp cụ thể:
  - course phải thuộc đúng org và đã `APPROVED`;
  - class phải thuộc đúng org/course;
  - class phải `OPEN`;
  - class chưa vượt `maxStudents`;
  - enrollment cùng class là idempotent;
  - enrollment `DROPPED` hoặc `SUSPENDED` trong class được tái kích hoạt.
- `ManageLearningPackageEnrollmentUseCase` giờ ưu tiên class target:
  - nếu package/course có `learning_package_class_targets` `ACTIVE` -> gọi `grantClass`;
  - nếu không có target -> giữ đường `grant` self-paced hiện tại;
  - vì vậy `INSTRUCTOR_LED` course không bị nhét vào lớp `DEFAULT` sai nghiệp vụ.

Quyết định thiết kế:

- Không hardcode VMU. VMU chỉ là dữ liệu: organization, curriculum, subject, package, course và learning class.
- Không thêm UI lớn trong phase này. Backend/API/schema là nguồn sự thật trước; org-admin UI có thể bọc endpoint này ở phase sau.
- Không tạo plugin/microservice. Đây vẫn là modular monolith, đúng hướng ponytail: thêm đúng bảng mapping còn thiếu.
- Không bỏ qua rule `maxStudents`; package entitlement không được vượt sức chứa lớp.
- Không coi enrollment ở lớp khác cùng course là thành công. Nếu học viên đã `ACTIVE`/`COMPLETED` ở lớp khác, `grantClass` trả lỗi `COURSE_ALREADY_ENROLLED_DIFFERENT_CLASS` để ORG xử lý chuyển lớp rõ ràng.

Verification:

```bash
cd backend
mvn "-Dtest=ManageAcademicCatalogUseCaseTest,ManageLearningPackageEnrollmentUseCaseTest,GrantCourseAccessUseCaseTest,AcademicCatalogControllerV3Test,LearningPackageEnrollmentControllerV3Test" test
# Tests run: 31, Failures: 0, Errors: 0

mvn test
# Tests run: 1201, Failures: 0, Errors: 0

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build backend
curl http://localhost:8088/actuator/health
# {"status":"UP"}

docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T db psql -U lms -d lms -c "SELECT version, description, success FROM flyway_schema_history WHERE version='151'; SELECT to_regclass('public.learning_package_class_targets');"
# V151 success=true; table learning_package_class_targets exists
```

Debt còn lại sau Phase 4.6:

- Cần FE nhỏ cho ORG_ADMIN chọn class target từ `/org-admin/academic`.
- `PAYMENT_REQUIRED` package vẫn cần checkout/payment completion trước khi auto-grant.

## 37. Phase 4.7 org-admin package class-target UI - 2026-06-26

Mục tiêu của vòng này là làm cho Phase 4.6 dùng được trực tiếp trong giao diện ORG_ADMIN: người quản trị tổ chức có thể chọn gói học, chọn course thuộc gói, rồi gắn course đó vào một lớp học cụ thể. Với VMU, đây là bước nối nghiệp vụ gói/môn/lớp: ví dụ gói đào tạo có course ECDIS và được triển khai cho lớp `ECDIS-2026A`.

Thay đổi đã thực hiện:

- Mở rộng FE academic API type bằng `learningPackageClassTargets`.
- Thêm endpoint client `POST /api/v3/organizations/{orgId}/academic/learning-package-class-targets`.
- Thêm chỉ số `Lớp trong gói` trên `/org-admin/academic`.
- Thêm card `Lớp triển khai trong gói học`.
- Dropdown course chỉ hiện course thuộc gói: course item trực tiếp trong package, hoặc course được map từ subject item thông qua `subject_courses`.
- Dropdown lớp học dùng lại `ClassService.getClassesByCourse(courseId)`, không tạo API mới khi API hiện có đã đủ.
- Thêm `data-testid` ASCII cho smoke test ổn định, không ảnh hưởng UX thật.

Quyết định thiết kế:

- Không hardcode VMU. VMU vẫn là dữ liệu seed/config gồm organization, subject, package, course, class.
- Không thêm schema hoặc backend API mới trong vòng này vì Phase 4.6 đã có endpoint cần thiết.
- Không làm redesign lớn; chỉ thêm workflow thiếu để tránh trộn mục tiêu logic với UX.
- Không auto phân lớp theo cohort/class group ở vòng này. Rule tự động chỉ nên làm khi VMU thật sự cần, vì nó có rủi ro nghiệp vụ cao hơn explicit target.

Verification:

```bash
cd fe
npm run build
# Application bundle generation complete
```

Browser smoke:

```text
Route: http://localhost:4200/org-admin/academic
Login: orgadmin@maritime.edu / orgadmin123
POST /api/v3/organizations/{orgId}/academic/learning-package-class-targets -> OK
packageId: 6ccee955-cc2d-4bed-b1cc-aa46f9fa0a72
courseId: f6bfe202-c0cd-40d6-ae60-7066a5e5aaec
classId: d360f383-31dc-4c67-ac6a-d12c5007ad66
classCode: ECDIS-2026A
API responses observed: 9
5xx: 0
console errors: 0
page errors: 0
```

Ghi chú:

- `fe/public/sitemap-courses.xml` có thể bị sinh lại khi chạy FE build vì script SEO lấy dữ liệu production; file đó không thuộc slice ORG này và không được stage.

Debt còn lại sau Phase 4.7:

- `PAYMENT_REQUIRED` package vẫn cần checkout/payment completion trước khi auto-grant.
- Có thể thêm rule auto class allocation theo cohort/class group nếu VMU cần vận hành hàng loạt.

## 38. Phase 4.8 paid package payment completion - 2026-06-26

Mục tiêu của vòng này là hoàn thiện lát cắt tối thiểu để gói học trả phí có thể vận hành trong org-admin: khi học viên đăng ký gói có `enrollmentPolicy = PAYMENT_REQUIRED`, hệ thống giữ trạng thái `PENDING_PAYMENT`; sau khi ORG_ADMIN đối soát học phí hoặc chuyển khoản, ORG_ADMIN xác nhận thanh toán để kích hoạt gói và cấp quyền học theo đúng package/class target.

Thay đổi đã thực hiện:

- Thêm domain transition `AcademicLearningPackageEnrollment.completePayment(...)`.
- Chỉ cho phép `PENDING_PAYMENT -> ACTIVE`; các trạng thái khác trả lỗi nghiệp vụ `PACKAGE_PAYMENT_NOT_COMPLETABLE`.
- Thêm use case `ManageLearningPackageEnrollmentUseCase.completePayment(...)`.
- Sau khi xác nhận thanh toán, use case gọi lại `grantActivePackageCourses(...)`, nên vẫn tôn trọng rule Phase 4.6:
  - nếu package/course có class target `ACTIVE` thì enroll vào lớp cụ thể;
  - nếu không có class target thì dùng self-paced grant hiện có.
- Thêm API:
  - `PATCH /api/v3/organizations/{orgId}/academic/learning-package-enrollments/{enrollmentId}/complete-payment`.
- API chỉ cho `ADMIN` hoặc `ORG_ADMIN`; `ORG_ADMIN` vẫn bị chặn nếu khác organization.
- `/org-admin/academic` thêm nút `Xác nhận thanh toán` cho yêu cầu gói học đang `PENDING_PAYMENT`.
- FE academic API client/endpoints được mở rộng tương ứng.

Quyết định thiết kế:

- Không hardcode VMU. VMU chỉ cần cấu hình gói học, học phí, lớp triển khai và policy.
- Không mở rộng `payment_transactions` trong vòng này. Bảng payment hiện đang gắn chặt với course-level payment, revenue split và refund; ép package payment vào đó ngay sẽ tạo debt lớn hơn lợi ích demo.
- Không triển khai checkout public SePay/VNPay trong vòng này. Lát cắt hiện tại phục vụ mô hình ORG/VMU thực tế: bộ phận quản trị đối soát học phí rồi xác nhận thủ công.
- Không thêm schema mới vì trạng thái `PENDING_PAYMENT`, `ACTIVE`, `decided_by`, `decision_note` đã đủ cho completion tối thiểu.

Verification:

```bash
cd backend
mvn "-Dtest=ManageLearningPackageEnrollmentUseCaseTest,LearningPackageEnrollmentControllerV3Test" test
# Tests run: 18, Failures: 0, Errors: 0

cd fe
npm run build
# Application bundle generation complete

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build backend
curl http://localhost:8088/actuator/health
# {"status":"UP"}
```

API smoke:

```text
Created temporary PAYMENT_REQUIRED package.
Added package course item.
Added package -> course -> class target.
Student request enrollment -> PENDING_PAYMENT.
ORG_ADMIN complete-payment -> ACTIVE.
Latest smoke enrollment: 9ef2fd5d-d580-4e16-b3d9-39434c8d52e4
Latest smoke package: 1a546650-7f5d-4355-9f37-7366f5243b8a
```

Browser smoke:

```text
Route: http://localhost:4200/org-admin/academic
Login: orgadmin@maritime.edu / orgadmin123
Rendered package-class target card: 1
Buttons rendered: 19
API failures: 0
console errors: 0
page errors: 0
```

Debt còn lại sau Phase 4.8:

- Public package checkout bằng SePay/VNPay vẫn là phase riêng.
- Nếu bán gói học trực tiếp, cần mô hình doanh thu/refund package-level thay vì tái dùng vội course-level payment.
- Có thể thêm auto class allocation theo cohort/class group nếu VMU cần phân lớp hàng loạt.

## 39. Phase 4.9 organization capability enforcement - 2026-06-26

Mục tiêu của vòng này là biến `organization_capabilities` từ dữ liệu hiển thị thành policy thật ở server boundary. Trước vòng này, ORG_ADMIN có thể thấy capability pill trên `/org-admin/academic`, nhưng backend chưa dùng capability để chặn workflow. Với mục tiêu “mỗi ORG có chức năng đặc thù riêng”, đây là điểm phải sửa trước khi mở rộng VMU.

Thay đổi đã thực hiện:

- `ManageOrganizationCapabilitiesUseCase` thêm `isEnabled(organizationId, key)`.
- Capability thiếu được xem là chưa bật (`false`). Điều này giúp tổ chức mới không tự có module chuyên biệt nếu system ADMIN chưa cấu hình.
- `AcademicCatalogControllerV3` enforce:
  - `academic_catalog` cho catalog/học vụ cơ bản: khoa, chương trình, khóa, lớp hành chính, môn học, liên kết môn-course;
  - `curriculum_plan` cho kỳ học, chương trình đào tạo, môn trong chương trình;
  - `learning_packages` cho gói học, item trong gói, class target của gói.
- `LearningPackageEnrollmentControllerV3` enforce `learning_packages` cho student request, ORG_ADMIN list/approve/reject/complete payment.
- `OrgPaymentConfigControllerV3` enforce `org_payment_config` cho đọc/cập nhật cấu hình chia doanh thu.
- `AdminRevenueControllerV3` enforce `org_payout_approval` cho ORG_ADMIN list/approve/reject payout của org. System ADMIN vẫn giữ quyền toàn hệ thống.

Quyết định thiết kế:

- Không thêm schema vì bảng `organization_capabilities` đã tồn tại từ V148.
- Không hardcode VMU; VMU chỉ là org có các capability cần thiết được bật.
- Không dùng FE-only hiding làm bảo mật. FE có thể hiển thị capability pill, nhưng backend mới là nguồn policy.
- Không chặn system ADMIN ở payout list toàn hệ thống vì endpoint đó là quyền nền tảng, không thuộc một org cụ thể.

Verification:

```bash
cd backend
mvn "-Dtest=ManageOrganizationCapabilitiesUseCaseTest,AcademicCatalogControllerV3Test,LearningPackageEnrollmentControllerV3Test,OrgPaymentConfigControllerV3Test,AdminRevenueControllerV3Test" test
# Tests run: 27, Failures: 0, Errors: 0

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build backend
curl http://localhost:8088/actuator/health
# {"status":"UP"}
```

API smoke:

```text
ADMIN toggled academic_catalog off for local org 04f4775f-3334-40f7-b1be-8569808cb8ce -> 200.
GET /api/v3/organizations/{orgId}/academic/catalog while disabled -> 403.
ADMIN toggled academic_catalog back on -> 200.
GET /api/v3/organizations/{orgId}/academic/catalog while enabled -> 200.
```

Debt còn lại sau Phase 4.9:

- Có thể nâng cấp UX capability thành nhóm module/card lớn hơn nếu số capability tăng mạnh.
- Public package checkout SePay/VNPay vẫn là phase riêng.

## 40. Phase 4.10 organization capability settings UI - 2026-06-26

Mục tiêu của vòng này là hoàn thiện đường vận hành cho system ADMIN: capability không chỉ được seed hoặc gọi API thủ công, mà có thể bật/tắt ngay trong trang chi tiết tổ chức. Backend vẫn là nơi enforce policy; UI chỉ là control plane cho dữ liệu capability.

Thay đổi đã thực hiện:

- `/admin/organizations/:id` và `/org-admin/organization` có thêm tab `Phân hệ`.
- Tab hiển thị tất cả capability hiện có của tổ chức với tên nghiệp vụ và mô tả tiếng Việt:
  - `academic_catalog`: Học vụ nền tảng;
  - `curriculum_plan`: Chương trình đào tạo;
  - `learning_packages`: Gói học;
  - `org_payment_config`: Cấu hình doanh thu;
  - `org_payout_approval`: Duyệt payout theo tổ chức.
- System `ADMIN` có thể bật/tắt capability qua API `PUT /api/v3/organizations/{orgId}/capabilities/{key}`.
- `ORG_ADMIN` chỉ xem trạng thái capability; không thể chỉnh sửa từ UI.
- Overview tổ chức có thêm hành động nhanh `Phân hệ tổ chức`.
- UI có trạng thái loading, empty, saving và responsive cho mobile/tablet.

Quyết định thiết kế:

- Không tạo màn hình mới vì trang chi tiết tổ chức đã là nơi quản trị org settings.
- Không thêm dependency UI. Toggle dùng CSS/Sass và design token hiện có.
- Không rely vào UI để bảo mật. Nếu user gọi API trực tiếp, backend Phase 4.9 vẫn chặn theo capability.
- Không hardcode VMU. VMU chỉ là tổ chức được bật bộ capability phù hợp.

Verification:

```bash
cd fe
npm run build
# Application bundle generation complete
```

Ghi chú verification:

- Build pass với các warning cũ của project: Angular optional-chain/nullish warnings ở admin-storage/Tiptap, Sass `@import` deprecated, CommonJS warnings từ mammoth.
- `fe/public/sitemap-courses.xml` tiếp tục bị script SEO sinh lại khi build; không thuộc slice ORG và không được stage.

Debt còn lại sau Phase 4.10:

- Public package checkout SePay/VNPay vẫn là phase riêng.
- Package-level revenue/refund model vẫn nên tách khỏi course-level payment hiện tại.
- Nếu số capability tăng nhiều, có thể nhóm UI theo domain: Học vụ, Gói học, Thanh toán, Báo cáo.

## 41. Phase 4.11 learning package tuition audit snapshot - 2026-06-26

Mục tiêu của vòng này là làm cho luồng gói học trả phí đủ đáng tin để demo và vận hành nội bộ theo kiểu VMU: học phí của gói phải được snapshot tại thời điểm học viên yêu cầu, ORG_ADMIN phải ghi được mã đối soát/chuyển khoản khi xác nhận, và hệ thống phải lưu người xác nhận + thời điểm xác nhận. Đây là lát cắt audit tối thiểu trước khi làm checkout public bằng SePay/VNPay.

Thay đổi đã thực hiện:

- Thêm migration `V152__learning_package_enrollment_payment_audit.sql`.
- `learning_package_enrollments` có thêm `payment_amount`, `payment_currency`, `payment_reference`, `payment_confirmed_at`, `payment_confirmed_by`.
- Migration backfill `payment_amount/payment_currency` từ `learning_packages.price/currency`, đặt `NOT NULL`, default an toàn và check constraint non-negative/currency 3 ký tự.
- Domain `AcademicLearningPackageEnrollment` lưu payment snapshot và validate amount/currency/reference.
- Khi student request gói học, `ManageLearningPackageEnrollmentUseCase` snapshot học phí từ `LearningPackage`.
- Khi ORG_ADMIN complete payment, hệ thống lưu mã đối soát, thời điểm xác nhận và người xác nhận trước khi cấp quyền học.
- DTO/API trả payment audit fields để FE hiển thị được trạng thái đối soát.
- `/org-admin/academic` hiển thị chip học phí, mã đối soát, người đối soát và input `Mã giao dịch` cho enrollment `PENDING_PAYMENT`.

Quyết định thiết kế:

- Không nhét package tuition vào `payment_transactions` ở vòng này vì bảng đó đang course-centric, kéo theo revenue split/refund/course auto-enrollment.
- Không hardcode VMU. VMU là dữ liệu: org, curriculum, package, price, enrollment policy, class target.
- Không cho kích hoạt package rỗng. Nếu package không resolve được course hợp lệ, backend vẫn trả lỗi nghiệp vụ thay vì active sai.
- Public SePay/VNPay package checkout là phase riêng, cần model package-level payment/revenue/refund rõ ràng trước khi triển khai.

Verification:

```bash
cd backend
mvn "-Dtest=ManageLearningPackageEnrollmentUseCaseTest,LearningPackageEnrollmentControllerV3Test" test
# Tests run: 19, Failures: 0, Errors: 0

cd ../fe
npm run build
# Application bundle generation complete

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build backend
curl http://localhost:8088/actuator/health
# {"status":"UP"}
```

Local Flyway/schema smoke:

```text
Flyway V152 applied successfully.
learning_package_enrollments columns verified:
payment_amount, payment_currency, payment_reference, payment_confirmed_at, payment_confirmed_by.
```

API smoke:

```text
Created PAYMENT_REQUIRED package with course item.
Student request enrollment -> PENDING_PAYMENT.
Snapshot amount -> 1,250,000 VND.
ORG_ADMIN complete-payment with reference SEPAY-VMU-* -> ACTIVE.
payment_reference/payment_confirmed_at/payment_confirmed_by persisted.
Course access granted to SAF-101 through DEFAULT class.
```

Browser smoke:

```text
Route: http://localhost:4200/org-admin/academic
Login: orgadmin@maritime.edu / orgadmin123
Markers visible: ORG ACADEMIC CATALOG, SMOKE-PAY-COURSE, SEPAY-VMU, 1.250.000
API failures: 0
console errors: 0
page errors: 0
Screenshot: tmp-org-academic-smoke.png
```

Debt còn lại sau Phase 4.11:

- Public package checkout bằng SePay/VNPay vẫn là phase riêng.
- Package-level revenue split/refund model vẫn chưa nên dùng chung vội với course-level payment.
- Cần cleanup smoke package/enrollment nếu local DB cần sạch tuyệt đối trước demo khác.

## 42. Phase 4.12 class-group-aware package placement - 2026-06-26

Mục tiêu của vòng này là làm đúng nghiệp vụ VMU hơn: sinh viên không chỉ thuộc một `LearningClass` triển khai course, mà còn thuộc một lớp hành chính học thuật như `CNT63ĐH`, `ĐKT63ĐH`, `MTB63ĐH`. Khi một gói học có cùng course nhưng mỗi lớp hành chính cần vào lớp triển khai khác nhau, backend phải chọn đúng target theo lớp hành chính của sinh viên, không dùng nhánh `if VMU`.

Thay đổi đã thực hiện:

- Thêm migration `V153__academic_class_group_memberships.sql`.
- Thêm bảng `academic_class_group_memberships` để lưu sinh viên thuộc lớp hành chính theo `organization_id`, `class_group_id`, `student_id`.
- DB enforce mỗi sinh viên chỉ có một membership `ACTIVE` trong một tổ chức tại một thời điểm.
- `learning_package_class_targets` có thêm `class_group_id` tùy chọn.
- Class target mặc định giữ `class_group_id IS NULL`; target riêng cho lớp hành chính dùng cùng `package_id + course_id + class_group_id`.
- `ManageAcademicCatalogUseCase` có workflow gán sinh viên vào lớp hành chính, validate class group, student, role và same-org boundary.
- `ManageLearningPackageEnrollmentUseCase` khi kích hoạt package sẽ ưu tiên class-specific target theo membership lớp hành chính, sau đó fallback về target mặc định, rồi mới dùng self-paced grant path hiện có.
- `/org-admin/academic` có card gán sinh viên vào lớp hành chính và dropdown `Lớp hành chính áp dụng` cho package class target.

Quyết định thiết kế:

- Không hardcode VMU. VMU chỉ là dữ liệu: class group, membership, package, course, learning class và target.
- Không tự động đoán lớp triển khai từ tên lớp hoặc tên course. Rule chọn target dựa trên FK rõ ràng.
- Không thêm engine rule phức tạp cho cohort/program ở vòng này. Membership lớp hành chính + default fallback đã đủ cho lát cắt vận hành đầu tiên.
- Không tách microservice. Đây vẫn là domain slice nhỏ trong modular monolith.

Verification:

```bash
cd backend
mvn "-Dtest=ManageAcademicCatalogUseCaseTest,ManageLearningPackageEnrollmentUseCaseTest" test
# Tests run: 25, Failures: 0, Errors: 0

mvn "-Dtest=AcademicCatalogControllerV3Test,LearningPackageEnrollmentControllerV3Test,ManageAcademicCatalogUseCaseTest,ManageLearningPackageEnrollmentUseCaseTest" test
# Tests run: 35, Failures: 0, Errors: 0

cd ../fe
npm run build
# Application bundle generation complete

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build backend
curl http://localhost:8088/actuator/health
# {"status":"UP"}
```

Local Flyway/schema smoke:

```text
Flyway V153 applied successfully.
academic_class_group_memberships table exists.
learning_package_class_targets.class_group_id exists.
Unique indexes for default target and class-group target exist.
```

API/UI smoke:

```text
POST /api/v3/organizations/{orgId}/academic/class-group-memberships -> 200.
GET /api/v3/organizations/{orgId}/academic/catalog -> memberships=1.
/org-admin/academic desktop smoke -> membership card rendered, class target class-group select rendered, API 200, console errors 0.
/org-admin/academic mobile 390x844 smoke -> membership card rendered, class target class-group select rendered, API 200.
```

Debt còn lại sau Phase 4.12:

- Cần bulk import/transfer lớp hành chính nếu VMU vận hành danh sách sinh viên lớn.
- Public package checkout bằng SePay/VNPay vẫn là phase riêng.
- Package-level revenue/refund/accounting vẫn chưa nên dùng chung vội với course-level payment.
