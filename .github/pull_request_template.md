<!--
Title format: conventional commit style.
Examples:
  feat(student): add offline package refresh prompt
  fix(auth): preserve Google login redirect state
  chore(ci): tighten GitHub label taxonomy
-->

## Summary

<!-- 1-3 sentences: what changed, why now, and who is affected. -->

## Linked work

<!-- Use Closes #123 when this PR resolves an issue. -->

Closes #

## Change type

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor / cleanup
- [ ] Documentation
- [ ] Infra / CI
- [ ] Security / privacy
- [ ] Breaking change

## Scope

- [ ] Frontend
- [ ] Backend
- [ ] Database / migration
- [ ] PWA / offline
- [ ] Video / media
- [ ] Auth / RBAC
- [ ] Payment
- [ ] GitHub / DevOps
- [ ] Documentation only

## What changed

<!-- Bullet the meaningful behavior or architecture changes, not every edited file. -->

-

## Risk and rollback

| Item | Notes |
|---|---|
| User-visible risk | |
| Data/security risk | |
| Deployment risk | |
| Rollback plan | Revert this PR, or describe the feature flag/config toggle. |

## Verification

<!-- Be concrete. Prefer command output summaries, routes checked, accounts used, and screenshots for UI work. -->

- [ ] Backend: `cd backend && mvn test -B`
- [ ] Frontend: `cd fe && npm run build`
- [ ] Compose: `docker compose --env-file .env.dev.example -f docker-compose.yml -f docker-compose.dev.yml config -q`
- [ ] Browser/manual smoke:
- [ ] Not applicable, docs/config-only change

## Screenshots / artifacts

<!-- Required for UI changes. For API changes, include sample curl/response. -->

## Reviewer checklist

- [ ] Smallest reasonable diff for the goal
- [ ] No secrets, credentials, or generated junk committed
- [ ] Clean Architecture / Angular 20 conventions preserved
- [ ] Vietnamese text is meaningful and renders with correct accents
- [ ] Public API, migration, deploy, or runtime behavior has matching docs
- [ ] CI is green and conversations are resolved before merge
