# Documentation Map

Docs tree được chia thành 4 nhóm:

1. **Canonical** — nguồn sự thật vận hành hiện tại
2. **Architecture** — boundary & pattern đang sống
3. **Working** — proposal, spec, bug đang chạy
4. **Archive / Academic** — lưu trữ lịch sử và artifact học thuật

Nếu tài liệu mâu thuẫn với runtime, ưu tiên theo thứ tự: **(1) code → (2) runbook/reference → (3) CHANGELOG → (4) archive**.

Quy tắc phân loại và archive đầy đủ: [`docs/reference/DOCUMENTATION_POLICY.md`](reference/DOCUMENTATION_POLICY.md).

## Đọc trước tiên

- [README.md](../README.md) · [AGENTS.md](../AGENTS.md) · [CHANGELOG.md](../CHANGELOG.md) · [CLAUDE.md](../CLAUDE.md)
- [reference/RUNTIME_CONVENTIONS.md](reference/RUNTIME_CONVENTIONS.md)
- [reference/PRODUCTION_SURFACES.md](reference/PRODUCTION_SURFACES.md)
- [testing/TEST_CHECKLIST.md](testing/TEST_CHECKLIST.md)

## 1. Canonical docs

### Reference

- [reference/README.md](reference/README.md)
- [reference/DOCUMENTATION_POLICY.md](reference/DOCUMENTATION_POLICY.md)
- [reference/GITHUB_GOVERNANCE.md](reference/GITHUB_GOVERNANCE.md)
- [reference/BACKEND_OVERVIEW.md](reference/BACKEND_OVERVIEW.md)
- [reference/FRONTEND_OVERVIEW.md](reference/FRONTEND_OVERVIEW.md)
- [reference/RUNTIME_CONVENTIONS.md](reference/RUNTIME_CONVENTIONS.md)
- [reference/LOCAL_DEV_MATRIX.md](reference/LOCAL_DEV_MATRIX.md)
- [reference/ROLE_ACCESS_MATRIX.md](reference/ROLE_ACCESS_MATRIX.md)
- [reference/PRODUCTION_SURFACES.md](reference/PRODUCTION_SURFACES.md)
- [reference/PUBLICATION_PWA_DEFINITION_OF_DONE.md](reference/PUBLICATION_PWA_DEFINITION_OF_DONE.md)

### Runbooks

- [runbooks/README.md](runbooks/README.md)
- [runbooks/GITHUB_PROFESSIONAL_SETUP_RUNBOOK.md](runbooks/GITHUB_PROFESSIONAL_SETUP_RUNBOOK.md)
- [runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md](runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md)
- [runbooks/PRODUCTION_SMOKE_TEST.md](runbooks/PRODUCTION_SMOKE_TEST.md)
- [runbooks/GOOGLE_LOGIN_GIS_SETUP_RUNBOOK.md](runbooks/GOOGLE_LOGIN_GIS_SETUP_RUNBOOK.md)
- [runbooks/PWA_OFFLINE_RUNBOOK.md](runbooks/PWA_OFFLINE_RUNBOOK.md)
- [runbooks/OFFLINE_STORAGE_CORRUPTION_RUNBOOK.md](runbooks/OFFLINE_STORAGE_CORRUPTION_RUNBOOK.md)
- [runbooks/PUBLICATION_REFRESH_RUNBOOK.md](runbooks/PUBLICATION_REFRESH_RUNBOOK.md)
- [runbooks/SYNC_CONFLICT_RUNBOOK.md](runbooks/SYNC_CONFLICT_RUNBOOK.md)
- [runbooks/PAYMENT_PAYOUT_RUNBOOK.md](runbooks/PAYMENT_PAYOUT_RUNBOOK.md)
- [runbooks/LEARNER_FLOW_RUNBOOK.md](runbooks/LEARNER_FLOW_RUNBOOK.md)
- Video: [CLOUDFLARE_R2_VIDEO_SETUP.md](runbooks/CLOUDFLARE_R2_VIDEO_SETUP.md), [VIDEO_R2_SHAKA_CUTOVER_CHECKLIST.md](runbooks/VIDEO_R2_SHAKA_CUTOVER_CHECKLIST.md), [DEDICATED_VIDEO_WORKER_RUNBOOK.md](runbooks/DEDICATED_VIDEO_WORKER_RUNBOOK.md), [CLOUDFLARE_MEDIA_DOMAIN_EDGE_AUTH_RUNBOOK.md](runbooks/CLOUDFLARE_MEDIA_DOMAIN_EDGE_AUTH_RUNBOOK.md)
- PWA Phase B: [PHASE_B_PUBLICATION_PWA_CHECKLIST.md](runbooks/PHASE_B_PUBLICATION_PWA_CHECKLIST.md)

### Deployment

- [deployment/GITHUB_ACTIONS_DEPLOY.md](deployment/GITHUB_ACTIONS_DEPLOY.md)
- [deployment/2026-04-19-staging-pwa-deploy-blueprint.md](deployment/2026-04-19-staging-pwa-deploy-blueprint.md)

### Testing

- [testing/README.md](testing/README.md)
- [testing/TEST_CHECKLIST.md](testing/TEST_CHECKLIST.md)
- [testing/E2E_MATRIX.md](testing/E2E_MATRIX.md)

### Top-level guides

- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
- [EDITOR_PAGE_DESIGN_GUIDE.md](EDITOR_PAGE_DESIGN_GUIDE.md)
- [TEAM_WORKFLOW_GUIDE.md](TEAM_WORKFLOW_GUIDE.md)
- [PWA_OFFLINE_RESEARCH.md](PWA_OFFLINE_RESEARCH.md)

## 2. Architecture (live)

Chỉ các boundary đang sống, tên cố định. Snapshot date-stamp đã chuyển sang `archive/2026-Q1/architecture-snapshots/`.

- [architecture/README.md](architecture/README.md)
- [architecture/LESSON_VIEW_ARCHITECTURE.md](architecture/LESSON_VIEW_ARCHITECTURE.md)
- [architecture/OBJECT_STORAGE_CDN_STRATEGY.md](architecture/OBJECT_STORAGE_CDN_STRATEGY.md)
- [architecture/COURSE_VS_CLASS_LESSON_BOUNDARY.md](architecture/COURSE_VS_CLASS_LESSON_BOUNDARY.md)
- [architecture/STUDENT_COURSE_FIRST_EXPERIENCE.md](architecture/STUDENT_COURSE_FIRST_EXPERIENCE.md)
- [architecture/TEACHER_ASSESSMENTS_CONTEXT_SPLIT.md](architecture/TEACHER_ASSESSMENTS_CONTEXT_SPLIT.md)
- [architecture/STREAMING_PWA_ROADMAP.md](architecture/STREAMING_PWA_ROADMAP.md)

## 3. Working docs

Docs đang trong quá trình thiết kế hoặc handoff. **Không coi là runtime truth** cho tới khi nội dung lõi được promote sang `reference/` / `runbook/`.

- [plans/README.md](plans/README.md) — in-flight plans (folder empty sau archive Q1)
- [superpowers/README.md](superpowers/README.md) — in-flight specs
- [bugs/README.md](bugs/README.md) — active bug index
- [reports/README.md](reports/README.md) — tracker + template (resolved reports đã archive)

## 4. Research

Kiến thức tham khảo dài hạn, không time-box:

- [research/README.md](research/README.md)
- [research/PWA_ACADEMIC_RESEARCH_PAPER.md](research/PWA_ACADEMIC_RESEARCH_PAPER.md)
- [research/course-delivery-modes-comparison.md](research/course-delivery-modes-comparison.md)
- [research/2026-03-04-sota-file-upload-patterns.md](research/2026-03-04-sota-file-upload-patterns.md)
- [research/2026-03-09-authoring-frontend-design-audit.md](research/2026-03-09-authoring-frontend-design-audit.md)

## 5. Archive

Lịch sử thiết kế và shipped work, chia theo quý. Append-only.

- [archive/README.md](archive/README.md) — archive policy + index quý
- [archive/2026-Q1/README.md](archive/2026-Q1/README.md)

## 6. Academic

Artifact phục vụ luận văn / phản biện:

- [academic/README.md](academic/README.md)
