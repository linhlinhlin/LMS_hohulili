# Reports Guide

Thu muc nay chua cac bao cao dieu tra, audit, handoff, va runtime snapshot.

## Bao cao moi nhat

- `2026-04-24-repo-health-audit.md` — Full repo health audit tai checkpoint cap khoa (disk footprint, code quality, branch hygiene, documentation gaps, open PR list, recommendations)

## Bao cao con gia tri hien hanh

- `PHASE_B_EXECUTION_REPORT_TEMPLATE.md`
- `2026-03-16-claude-code-deploy-prompt.md`
- `2026-03-16-production-deploy-storage-pwa-batch.md`
- `2026-03-16-offline-storage-corruption-hotfix.md`
- `2026-03-16-offline-storage-telemetry-ingest-v1.md`
- `2026-03-16-admin-offline-storage-telemetry-ui.md`
- `2026-03-16-admin-offline-storage-telemetry-analytics-light.md`
- `2026-03-16-production-telemetry-normalization-and-vm-recovery.md`
- `2026-03-17-console-noise-cleanup-and-offline-reset-hardening.md`
- `2026-03-17-production-showcase-seed-and-assignment-fixes.md`
- `2026-03-25-main-landing-summary.md`
- `2026-03-16-phase-a-final-verification.md`
- `2026-03-16-claude-code-handoff-platform-status.md`
- `2026-03-07-authoring-and-runtime-status.md`
- `2026-03-14-payment-runtime-status.md`

Day la nhom bao cao gan nhat con phan anh kha sat trang thai thuc te cua he thong.

Trong do:

- `2026-03-16-claude-code-deploy-prompt.md` la prompt deploy + smoke de gui cho Claude Code khi can dua batch publication/PWA/storage len moi truong.
- `2026-03-16-production-deploy-storage-pwa-batch.md` la bao cao deploy production thuc te do Codex thuc hien, kem health, API smoke, lesson/quiz verification, va xac nhan UI `/student/storage` da len live.
- `2026-03-16-offline-storage-corruption-hotfix.md` la bao cao deploy va smoke rieng cho failure mode `IndexedDB` backing store/corruption, gom recovery ladder, UI fallback, va xac nhan card reset tren production.
- `2026-03-16-offline-storage-telemetry-ingest-v1.md` la bao cao cho batch ingest telemetry toi thieu, ghi ro endpoint client/admin, bang luu telemetry, va checklist verify sau deploy.
- `2026-03-16-admin-offline-storage-telemetry-ui.md` la bao cao deploy cho man hinh admin V1, bao gom route, sidebar, filter theo email, va verify quyen `ADMIN-only`.
- `2026-03-16-admin-offline-storage-telemetry-analytics-light.md` la bao cao deploy cho lop analytics nhe, ghi ro endpoint aggregate, trend, top route/platform, va smoke production.
- `2026-03-16-production-telemetry-normalization-and-vm-recovery.md` la bao cao incident + recovery khi deploy pass chuan hoa telemetry, ghi ro VM timeout, reset instance, redeploy tuan tu, Playwright smoke, va residual Wiii console noise.
- `2026-03-17-console-noise-cleanup-and-offline-reset-hardening.md` la bao cao follow-up cho batch don console noise, lazy-mount Wiii iframe, suppress AI tren man admin van hanh, va hardening `resetOfflineStorage()` bang nhanh rotate DB name moi.
- `2026-03-17-production-showcase-seed-and-assignment-fixes.md` la bao cao seed du lieu showcase production tu dau den cuoi, gom 2 khoa hoc, 1 lop hoc, assignment thuc te, certificate PDF, va cac fix phat sinh trong qua trinh tao du lieu.
- `2026-03-25-main-landing-summary.md` la handoff ngan cho team sau khi snapshot cross-team duoc day len `main`, ghi ro commit landing, pham vi thay doi, muc validation da co, va cach tiep can docs canonicals.
- `PHASE_B_EXECUTION_REPORT_TEMPLATE.md` la template bao cao de Claude Code dien ket qua moi sub-phase cua Phase B.
- `2026-03-16-phase-a-final-verification.md` la ket luan cuoi cung sau deploy + smoke Phase A-E tren production.
- `2026-03-16-claude-code-handoff-platform-status.md` la bao cao handoff cho team Claude Code, tap trung vao local vs production, publication/PWA/offline, video, quiz/exam, certificate, va checklist deploy-smoke tiep theo.
- Hai bao cao con lai la runtime snapshot da duoc verify o cac batch truoc.

## Bao cao lich su

- `AUDIT_REPORT_S62.md`
- `AUDIT_TRACKER.md`
- `BAO_CAO_HE_THONG_LMS.md`
- `BAO_CAO_TOAN_BO_HE_THONG_S53.md`

Nhom nay duoc giu lai de:

- truy vet quyet dinh cu
- so sanh tien hoa he thong
- tham chieu cac audit finding truoc day

Khong dung chung nhu source of truth hien tai neu chua doi chieu voi code va runtime report moi hon.
