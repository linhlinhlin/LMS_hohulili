# Regression Results - 2026-03-12

Scope:

- runtime baseline
- teacher assessments workspace
- teacher curriculum quiz lesson shell
- student course-first routes
- backend delete assignment lesson

## Summary

- Runtime baseline: `PASS`
- Teacher assessments: `PASS`
- Teacher curriculum quiz lesson shell: `PASS`
- Student course-first: `PASS`
- Backend delete assignment lesson: `PASS`

## Notes

- Browser verification was executed against the local Docker runtime with Playwright.
- Some raw text-matching checks produced false negatives because terminal/Playwright text dumps on Windows still mangle Vietnamese diacritics in logs.
- Those false negatives were not treated as blockers when:
  - route URL was correct
  - screenshots showed the expected UI
  - the runtime behavior matched the intended flow

## Verified Runtime Facts

### Runtime baseline

- frontend served successfully on `http://127.0.0.1:4200`
- backend health returned `UP` on `http://127.0.0.1:8088/actuator/health`

### Teacher assessments

- `/teacher/assessments` redirected to `/teacher/assessments/classes/assignments`
- class-runtime lists rendered and still separated `Theo lớp` from `Toàn khóa học`
- shared routes opened successfully:
  - `/teacher/assessments/shared/question-bank`
  - `/teacher/assessments/shared/rubrics`

Screenshot:

- `coord/visuals/runtime/teacher-assessments-after-login.png`

### Teacher curriculum quiz lesson shell

Verified route:

- `/teacher/courses/880194e2-4a22-4b18-92b2-1fbedbbb648c/editor/curriculum?chapterId=6608484a-a320-4201-891f-25be2f18656c&lessonId=9417a6b7-cd5a-4166-9a0b-6d2edbc02179`

Verified behavior:

- route opened correctly
- shell exposed `Mở builder bài kiểm tra`
- heavy inline question-management actions were no longer exposed in the curriculum shell
- dirty-state still tripped correctly when editing the shell

Screenshot:

- `coord/visuals/curriculum-audit/quiz-shell-regression.png`

### Student course-first

Verified routes:

- `/student/courses`
- `/student/courses/library`
- `/student/tasks`
- `/student/results`
- self-paced detail: `/student/courses/b92cf139-2bd0-44f0-916e-05ef0878e128`
- instructor-led detail: `/student/courses/f17bc67d-57dd-4ed2-83a3-6e8520f1f46d`

Verified behavior:

- student landing and library no longer white-screened
- self-paced detail showed `Khóa học` with `Bắt đầu học`
- instructor-led detail showed `Lớp học` with `Bắt đầu học`
- task inbox rendered both:
  - `Toàn khóa học`
  - `Lớp: Lop A1`

Screenshots:

- `coord/visuals/student-smoke/student-library-regression.png`
- `coord/visuals/student-smoke/student-tasks-regression.png`
- `coord/visuals/student-smoke/student-results-regression.png`
- `coord/visuals/student-smoke/student-self-paced-detail-regression.png`
- `coord/visuals/student-smoke/student-instructor-detail-regression.png`

### Backend delete assignment lesson

Verified by:

- targeted backend tests
- Docker backend rebuild
- real delete API call on local runtime
- DB existence check after deletion

Result:

- deleting an assignment lesson no longer returned `500`
- both the lesson row and linked assignment root were removed successfully

## Residuals

- build warning for `assets/fonts/fonts.css` still exists
- the current worktree still contains uncommitted changes and should be committed as a clean batch before push/deploy
