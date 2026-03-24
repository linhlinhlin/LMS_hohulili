# Testing Docs

> Last updated: 2026-03-24

This folder is the entrypoint for the current project testing strategy.

## Primary docs

- [docs/testing/TEST_CHECKLIST.md](E:/Sach/Sua/LMS_hohulili/docs/testing/TEST_CHECKLIST.md)  
  Local green baseline, smoke-first E2E gate, release/nightly checklist, and current Docker/video/offline/payment runtime truth.
- [docs/testing/E2E_MATRIX.md](E:/Sach/Sua/LMS_hohulili/docs/testing/E2E_MATRIX.md)  
  Tier 0 / Tier 1 / Tier 2 Playwright coverage map and regression ownership.
- `2026-03-12-regression-checklist.md`  
  Historical regression checklist.
- `2026-03-12-regression-results.md`  
  Historical regression results.

## How to use this folder

- Start with [docs/testing/TEST_CHECKLIST.md](E:/Sach/Sua/LMS_hohulili/docs/testing/TEST_CHECKLIST.md) when you need to confirm the repo is green before pushing or releasing.
- Use [docs/testing/E2E_MATRIX.md](E:/Sach/Sua/LMS_hohulili/docs/testing/E2E_MATRIX.md) to see which specs are mandatory smoke and which are release/nightly only.
- Treat dated regression docs as history, not current runtime truth.
