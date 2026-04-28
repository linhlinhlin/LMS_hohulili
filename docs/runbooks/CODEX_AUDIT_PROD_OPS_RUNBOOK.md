# Codex Audit / Prod Ops Runbook

**Last updated**: 2026-04-28  
**Scope**: Quy trình cho Codex khi audit code, tạo issue spec, kiểm tra production/local, dùng Browser Use và bàn giao việc cho Claude/maintainer.  
**Status**: Active handoff document.

---

## 1. Mục Tiêu

Runbook này giúp agent không bị lệch bối cảnh giữa nhiều session. Trước mỗi lượt audit hoặc prod ops, Codex phải xác minh nguồn sự thật hiện tại thay vì chỉ dựa vào prompt cũ, vì project có nhiều thay đổi nhanh về VM zone, trạng thái deploy, seed data và workflow PR.

Áp dụng cho các việc:

- Audit code/schema/UX rồi tạo GitHub issue spec.
- Kiểm tra production hoặc local Docker.
- Test UI bằng Browser Use trên `localhost` hoặc domain thật.
- Điều tra CI/logs/PR nhưng không tự merge.
- Handoff rõ cho Claude Code hoặc maintainer implement.

---

## 2. Tài Liệu Phải Đọc Trước Khi Hành Động

Đọc theo thứ tự, chỉ mở sâu vào file liên quan khi cần:

1. `CLAUDE.md` — trạng thái dự án, quick start, known gotchas.
2. `AGENTS.md` nếu có trong workspace/local context — rule cho Codex.
3. `docs/reference/DOCUMENTATION_POLICY.md` — vị trí và lifecycle của docs.
4. `docs/reference/MULTI_AGENT_COLLABORATION.md` — branch, issue, PR, merge gate.
5. `docs/reference/PRODUCTION_SURFACES.md` — topology production hiện hành.
6. `docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md` — pause/resume VM và checkpoint log.
7. Runbook theo surface: PWA, video, payment, learner flow, Google login, publication.

Nếu tài liệu mâu thuẫn, ưu tiên evidence mới hơn theo thứ tự:

1. Lệnh read-only hiện tại (`gcloud`, `gh`, `docker compose ps`, `curl`, SQL read-only).
2. Checkpoint mới nhất trong runbook.
3. `CLAUDE.md`.
4. Prompt cũ trong chat.

Ghi rõ mâu thuẫn trong báo cáo/issue thay vì tự đoán.

---

## 3. Production Truth Hiện Tại

Verified ngày 2026-04-28 bằng:

```bash
gcloud config get-value project
gcloud compute instances list \
  --format="table(name,zone.basename(),status,machineType.basename(),networkInterfaces[0].networkIP,networkInterfaces[0].accessConfigs[0].natIP)"
```

Kết quả hiện tại:

| Surface | Value |
|---|---|
| GCP project | `the-wiii-lab` |
| App VM | `lms-production` |
| Zone | `asia-southeast1-c` |
| Status | `RUNNING` |
| Machine type | `e2-standard-2` |
| Public IP | `35.187.245.201` |
| Private IP | `10.148.0.4` |
| Prod URL | `https://holilihu.online` |

Quan trọng: checklist/prompt cũ có thể còn dùng `asia-southeast1-b`. Runbook production ghi ngày 2026-04-27 đã migrate `-b` sang `-c` do `ZONE_RESOURCE_POOL_EXHAUSTED`. Vì vậy nếu SSH báo không thấy instance ở `-b`, không kết luận production down; trước tiên chạy `gcloud compute instances list`.

Canonical read-only SSH pattern hiện hành:

```bash
gcloud compute ssh lms-production \
  --zone=asia-southeast1-c \
  --ssh-key-file=~/.ssh/google_compute_engine \
  --command="cd /home/Admin/LMS_hohulili && <LENH_READ_ONLY>"
```

Docker Compose args trên VM vẫn là:

```bash
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml <command>
```

Không restart container trừ khi service đang P0 down và user/maintainer đã chấp nhận phạm vi.

---

## 4. Production Checklist Read-Only

Khi được giao kiểm tra production, chạy theo thứ tự:

```bash
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml logs backend --tail=200 2>&1 | grep -iE 'ERROR|WARN|Exception|FATAL'
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml logs frontend --tail=100 2>&1 | grep -iE 'error|ERR!|warn'
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml logs caddy --tail=100
curl -sf https://holilihu.online/actuator/health && echo OK || echo FAIL
curl -sf -o /dev/null -w '%{http_code}' https://holilihu.online/
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml exec -T db pg_isready -U lms
df -h / && free -h && docker system df
```

Nếu truy vấn DB production, chỉ dùng `SELECT`. Không chạy `ALTER`, `UPDATE`, `DELETE`, `TRUNCATE`, `DROP`, `pg_restore`, hoặc migration từ Codex audit session.

---

## 5. Local Docker / Localhost Workflow

Khi production không phù hợp để test hoặc cần reproduce an toàn:

```bash
cp .env.dev.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db backend
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
curl -s http://localhost:8088/actuator/health
```

Nếu cần frontend:

```bash
cd fe
npm install
npm start
```

UI local mặc định:

- Backend: `http://localhost:8088`
- Swagger: `http://localhost:8088/swagger-ui`
- Frontend: `http://localhost:4200`

Nếu cần restore backup để audit data:

- Chỉ restore vào DB tạm có tên rõ, ví dụ `audit_seed_review_YYYYMMDD`.
- Drop DB tạm sau khi xong.
- Không restore đè database dev chính nếu user chưa yêu cầu.

---

## 6. Browser Use Policy

Dùng Browser Use khi cần xác minh UI thực tế:

- Login flow.
- Admin/teacher/student workflow.
- PWA/offline behavior.
- Console/network UI errors.
- Visual regressions/responsive checks.

Không cần Browser Use cho:

- Đọc code/schema/docs.
- Query DB.
- Tạo GitHub issues.
- Kiểm tra container health bằng CLI.

### Browser Use prerequisites

Trước khi hứa test UI bằng Browser Use, kiểm tra nhanh điều kiện runtime:

- Browser Use phải chạy qua `node_repl` với backend `iab`.
- `node_repl` phải resolve được Node.js `>= 22.22.0`.
- Nếu lỗi kiểu `Node runtime too old`, đây là blocker tooling, không phải lỗi LMS.
- Khi blocker xảy ra, ghi lại bằng chứng, dùng CLI/curl read-only để smoke tạm thời, rồi quay lại Browser Use sau khi runtime được sửa.

Known local blocker ngày 2026-04-28:

- `node_repl` đang resolve `C:\Program Files\nodejs\node.exe` version `22.19.0`.
- Browser Use yêu cầu `>= 22.22.0`.
- Workspace bundled Node tồn tại tại `C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`, nhưng Browser Use chỉ được coi là pass khi `node_repl` thực sự bootstrap được `browser-client`.
- `NODE_REPL_NODE_PATH` đã được set ở User/Process env tới bundled Node `v24.14.0`, nhưng MCP `node_repl` vẫn đang dùng process env cũ. Cần restart Codex app/thread hoặc update Node hệ thống để Browser Use nhận runtime mới.

Khi dùng Browser Use:

1. Khởi tạo qua `browser-client` với backend `iab`.
2. Nếu test local, đảm bảo backend/frontend đang chạy trước.
3. Sau navigation hoặc thay đổi UI, lấy DOM snapshot hoặc screenshot mới.
4. Không reload trang nếu user đang nhập dở, trừ khi cần verify sau build/code change.
5. Không nhập password/secret vào trang bên thứ ba nếu user chưa yêu cầu rõ.

---

## 7. Issue / PR Workflow

### Audit-only mode

Khi user yêu cầu “audit + spec issue”:

- Không sửa code.
- Không tạo branch/commit/PR.
- Tạo issue body đủ evidence, root cause, SOTA reference, schema impact, SQL acceptance criteria, risks, effort.
- Nếu production không query được, ghi rõ lý do và dùng backup/local evidence thay thế.

### Fix mode

Khi user yêu cầu “giải quyết PR luôn”:

1. Sync main và kiểm tra worktree.
2. Không revert dirty file không thuộc task.
3. Tạo branch đúng prefix repo/team.
4. Sửa code bằng patch nhỏ, đúng DDD/Angular convention.
5. Chạy test phù hợp.
6. Commit conventional.
7. Push + tạo PR.
8. Báo user: `review PR #X`.

Không deploy trực tiếp. Maintainer/human là gate merge cuối.

### Branch guard

Trước khi phát triển hoặc review WIP:

1. Luôn chạy `git branch --show-current` và `git status --short --branch`.
2. Nếu branch hiện tại là branch feature của Claude/maintainer, không commit thay đổi tài liệu/ops không liên quan vào cùng PR nếu chưa được yêu cầu.
3. Nếu cần tách tài liệu/prod-ops khỏi feature PR, tạo branch riêng từ `main` sau khi đã bảo toàn WIP.
4. Dirty files không do Codex tạo phải được coi là tài sản của teammate; không sửa, không stage, không revert.

Checkpoint 2026-04-28:

- Current branch: `seed/quiz-attempts-realistic-distribution`.
- Branch này phù hợp cho issue seed quiz attempts (`#264`) và đang có WIP `V122__seed_quiz_attempts_realistic.sql`.
- Không nên trộn docs/prod-ops changes vào PR seed nếu mục tiêu PR là data migration thuần.

### Post-PR review gate

Khi Claude Code hoặc maintainer báo đã mở PR:

1. Dùng GitHub plugin/`gh` để đọc PR metadata, diff, review comments và CI checks.
2. Nếu có CI fail, dùng workflow fix-ci để đọc log trước khi kết luận.
3. Review theo thứ tự: correctness, data safety, security/auth, DDD/layering, UX/a11y, tests.
4. Nếu PR đạt chất lượng, báo rõ “có thể merge” kèm điều kiện CI/review đã pass.
5. Nếu phát hiện blocker, comment cụ thể file/dòng/log và yêu cầu fix trước merge.
6. Chỉ xác nhận merge khi user/maintainer yêu cầu; không tự merge nếu chưa có chỉ đạo rõ.

---

## 8. Current Seed-Data Issue Handoff

Đợt audit ngày 2026-04-28 đã tạo 5 GitHub issues:

| Issue | Priority | Purpose |
|---|---|---|
| `#263` | Medium | Bulk seed rich lesson content for NAV-101 and SAF-101 |
| `#264` | Critical | Bulk seed `quiz_attempts` with realistic score and answer distribution |
| `#265` | Critical | Seed lesson/video progress, announcements, reads, notifications |
| `#266` | Medium | Attach uploaded 720MB video to correct NAV-101 lesson |
| `#267` | High | Retrospective seed coverage, DTO count contract, query-risk audit |

Khuyến nghị thứ tự implement:

1. `#264`
2. `#265`
3. `#263`
4. `#266`
5. `#267`

Lưu ý schema: hiện không có bảng `quiz_question_responses`; answers quiz nằm trong `quiz_attempts.answers JSONB`. Implementer không được seed vào table không tồn tại nếu chưa có migration schema riêng.

---

## 9. Báo Cáo Chuẩn

Với prod ops:

```markdown
## Prod Check Report

### Tổng quan
- Containers: X up / Y down
- Health: ...

### Errors
- [P0/P1/P2/P3] source — raw log excerpt — impact

### Warnings
- Type: count + examples

### Resources
- Disk:
- Memory:
- Docker:

### Actions / Recommendation
- Issue/PR needed:
- No deploy performed:
```

Với audit issue:

```markdown
## Audit Summary

### Evidence
- Code:
- DB:
- Runtime:

### Issues Created
- #...

### Risks
- ...

### Next Maintainer Action
- Review/implement in order:
```

---

## 10. Safety Rules

- Không sửa `.env.prod` hoặc secret.
- Không push thẳng `main`.
- Không force push.
- Không restart production trừ P0 service down.
- Không sửa archived docs trừ `ERRATUM.md`.
- Không dùng production DB cho destructive testing.
- Không che giấu uncertainty: nếu source mâu thuẫn, ghi rõ source và ngày xác minh.

---

## 11. Latest Verified Smoke Checkpoints

### 2026-04-28 production smoke

Read-only checks against `https://holilihu.online`:

| Surface | Result | Evidence |
|---|---|---|
| Home page | PASS | `curl -w "%{http_code}" https://holilihu.online/` returned `200` |
| Health endpoint | PASS | `GET /actuator/health` returned `{"status":"UP"}` |
| Login page | PASS | `HEAD /auth/login` returned `200 OK` |
| Default organization public endpoint | PASS | `GET /api/v3/organizations/default` returned `200 OK`, `HoLiLiHu Org`, `HOLILIHU`, `PLATFORM`, `isDefault=true` |

Interpretation:

- The earlier P0 concern "default org endpoint is blocked for unauthenticated users" is fixed on production at this checkpoint.
- This does not replace full browser E2E. Browser Use was attempted but blocked locally by the Node runtime prerequisite described in section 6.

### 2026-04-28 courses page browser fallback smoke

Browser Use could not bootstrap because of the local `node_repl` runtime blocker, so a fallback Playwright smoke used bundled Node `v24.14.0`.

| Surface | Result | Evidence |
|---|---|---|
| `/courses` page load | PASS | HTTP `200`, title `Khóa học - LMS Maritime`, H1 `Khóa học Hàng hải` |
| Course listing | PASS | 12 visible courses, 24 course detail links, 12 article cards |
| Console/page errors | PASS | No console errors, no page errors on initial load |
| Search no-diacritic query | PASS | Query `an toan` reduced visible result set to 3 relevant courses |
| Course detail navigation | PASS | First filtered result opened `/courses/060b5b31-088e-4197-9ab9-1c21bf4eab5b`, title `Lái Tàu An Toàn - LMS Maritime` |

Artifacts:

- `artifacts/browser-smoke/prod-courses-2026-04-28.png`
- `artifacts/browser-smoke/prod-courses-search-an-toan-2026-04-28.png`
- `artifacts/browser-smoke/prod-course-detail-first-2026-04-28.png`

Note: one `net::ERR_ABORTED` appeared for `GET /api/v3/courses?page=0&size=12` during navigation after filtering. This is consistent with an in-flight list request being cancelled during route transition; monitor only if it becomes user-visible or repeats without navigation.
