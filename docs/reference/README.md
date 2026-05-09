# Reference Docs

Day la nhom tai lieu tham chieu chuan cua du an.

Doc nhom nay khi can cau tra loi ngan, chinh xac, va on dinh cho cac cau hoi kieu:

- runtime hien tai chay the nao
- local dev nen bat gi
- vai tro nao duoc lam gi
- production co nhung be mat nao can kiem tra
- nhanh publication / PWA da du dieu kien sign-off chua
- GitHub governance, PR quality bar, labels, and branch ruleset nen van hanh ra sao

## Tai lieu hien co

- `PUBLICATION_PWA_DEFINITION_OF_DONE.md`
- `BACKEND_OVERVIEW.md`
- `FRONTEND_OVERVIEW.md`
- `DOCUMENTATION_POLICY.md` - quy tac tai lieu (ngon ngu, phan loai, promote, archive)
- `GITHUB_GOVERNANCE.md` - GitHub operating model, labels, PR quality bar, branch rules, and contributor flow
- `RUNTIME_CONVENTIONS.md`
- `LOCAL_DEV_MATRIX.md`
- `ROLE_ACCESS_MATRIX.md`
- `PRODUCTION_SURFACES.md`
- `COMMIT_CONVENTION.md` - format commit message cho moi contributor (human + agent)
- `MULTI_AGENT_COLLABORATION.md` - rule cho Claude Code + Codex + agent khac cung work tren repo
- `AGENT_ONBOARDING.md` - huong dan setup agent moi lam viec trong du an
- `FRONTEND_GOTCHAS.md` - catalog pitfall FE (Angular 20, PWA, SSR, dev server, deps) kem trieu chung + fix + PR reference

Neu mot reference doc lech voi code thuc te, phai cap nhat lai ngay sau khi xac minh.

`PRODUCTION_SURFACES.md` la noi tom tat topology production hien hanh tren GCP + Cloudflare, bao gom app VM, dedicated video-worker VM, media domain, va cac bucket R2 dang la source of truth.
