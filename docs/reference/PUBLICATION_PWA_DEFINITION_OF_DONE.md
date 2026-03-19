# Definition of Done - Publication / PWA

> Ngay: 2026-03-16  
> Pham vi: publication model, offline package, PWA sync, stale handling, certificate exam gating  
> Muc dich: khoa tieu chi ket thuc de Codex va Claude Code dung chung mot chuan

## 1. Nguyen tac chung

Nhanh publication / PWA chi duoc goi la `Done` khi:

- dung boundary san pham
- da pass production smoke o dung contract canonical
- khong con blocker P0/P1
- team co du evidence de tai hien va audit

Khong duoc goi la `Done` chi vi:

- backend test pass
- local branch xanh
- mot vai endpoint tra `200`
- PWA "co ve chay"

## 2. Boundary phai dung

Tat ca cac dieu sau phai dung dong thoi:

- teacher sua `draft`, learner doc `publication`
- self-paced theo `FOLLOW_LATEST`
- instructor-led class theo `PINNED` cho toi khi adopt publication moi
- `PRACTICE` duoc offline
- `ASSESSMENT` va `EXAM` online-only
- certificate exam la lesson-owned quiz trong course, khong phai class-owned object

Neu mot trong cac boundary tren bi vo, nhanh nay chua duoc coi la done.

## 3. Functional DoD

### 3.1 Publication

Phai dat:

- course co publication snapshot hop le
- learner/public endpoints doc publication thay vi doc draft
- class co `courseVersionId` va `versionMode` dung boundary
- course cu chua co publication van chay duoc o che do `LEGACY`

### 3.2 Offline package

Phai dat:

- package luu du:
  - `publicationId`
  - `publicationNumber`
  - `contentVersion`
  - `versionModeSnapshot`
  - `staleReason`
- self-paced package stale dung khi co publication moi
- pinned class package chi stale sau khi class adopt publication moi
- legacy package bi danh dau dung la `LEGACY_PACKAGE`

### 3.3 Offline sync

Phai dat:

- queue item co:
  - `clientOperationId`
  - `occurredAt`
  - `courseId`
  - `publicationId`
  - `entityId`
  - `baseServerUpdatedAt`
- queue chi duoc coi la synced khi server ack dung `clientOperationId`
- lesson progress sync theo huong tien len
- video progress merge duoc, khong bi mat
- practice quiz offline submit duoc va sync lai duoc

### 3.4 Certificate exam gating

Phai dat:

- learner chua pass `EXAM` co `countsTowardCertificate = true` thi chua issue certificate
- learner da pass day du thi issue duoc certificate
- PDF download duoc
- verification token dung

## 4. Production smoke DoD

Khong duoc sign-off khi chua pass tat ca nhom nay tren production:

### A. Self-paced

- course list / content / versions dung
- stale package hien dung khi co publication moi
- refresh package giu progress hop le

### B. Instructor-led

- class listing canonical dung
- class pin publication dung
- adopt publication xong stale state dung

### C. Offline

- text lesson offline dung
- internal video offline dung
- practice quiz offline dung
- assessment/exam bi chan offline dung policy

### D. Sync

- push/pull contract dung
- conflict tra ve co cau truc ro
- queue khong bi ket vo han

### E. Certificate

- issue logic dung
- PDF dung
- verify dung

## 5. Regression DoD

Tat ca regression sau phai van xanh:

- section quiz FREE course van `200`
- canonical student endpoints van `200`
- offline policy metadata van dung:
  - `quizType`
  - `allowOffline`
- legacy course van duoc FE handle dung

## 6. Evidence DoD

De sign-off, team phai nop du:

- 1 bao cao smoke moi nhat
- 1 matrix PASS / PARTIAL / FAIL theo sub-phase
- raw failing requests neu co
- screenshot cho cac moc quan trong
- note ro local vs production

Neu thieu evidence, chua duoc coi la done.

## 7. Non-functional DoD

Phai dat:

- khong co crash blocker tren learner shell
- khong co console spam nghiem trong lien quan den publication/PWA
- khong co stale state sai boundary
- docs truth da duoc cap nhat

## 8. Sign-off rules

### Duoc goi la Done khi

- Phase A da production-complete
- Phase B pass tat ca sub-phase hoac chi con lai UX nho khong chan luong chinh
- khong con blocker P0/P1
- docs, changelog, runbook, va report da duoc cap nhat

### Chua duoc goi la Done khi

- mat progress sau refresh
- class tu nhay publication sai boundary
- certificate issue sai rule exam
- practice quiz offline khong sync lai duoc
- team chi moi verify local

## 9. Tai lieu lien quan

- `docs/architecture/2026-03-16-course-publication-pwa-sync-model.md`
- `docs/runbooks/PHASE_B_PUBLICATION_PWA_CHECKLIST.md`
- `docs/runbooks/PWA_OFFLINE_RUNBOOK.md`
- `docs/runbooks/PUBLICATION_REFRESH_RUNBOOK.md`
- `docs/runbooks/SYNC_CONFLICT_RUNBOOK.md`
- `docs/reports/2026-03-16-phase-a-final-verification.md`
- `docs/reports/PHASE_B_EXECUTION_REPORT_TEMPLATE.md`
