# E2E Matrix

> Last updated: 2026-03-24

This file maps Playwright coverage into tiers so the team can keep local/PR checks fast while still protecting the most important runtime surfaces.

## Tier 0 - mandatory smoke

Run on local validation and PRs:

```bash
cd fe && npm run test:e2e:smoke
```

| Spec | Goal | Notes |
|---|---|---|
| `fe/e2e/pwa-recovery-smoke.spec.ts` | Confirm repair surfaces still load when PWA state is broken | Protects offline recoverability |
| `fe/e2e/student-learning-video-smoke.spec.ts` | Confirm adaptive video lesson still boots and requests an HLS session | Protects media-domain + player path |
| `fe/e2e/offline-learning-smoke.spec.ts` | Confirm download -> offline lesson work -> reconnect sync convergence | Highest-priority offline learning smoke |
| `fe/e2e/student-learning-progress-smoke.spec.ts` | Confirm online lesson completion keeps UI and backend progress aligned | Guards learning truth in normal mode |

## Tier 1 - core learning release slice

Run before release/nightly, or when touching learning/offline/payment:

```bash
cd fe && npm run test:e2e:release
```

| Spec / area | Goal | Notes |
|---|---|---|
| Tier 0 smoke set | Keep the fast safety net | Always included |
| `fe/e2e/payment-smoke.spec.ts` | Verify free vs paid gating, deterministic local unlock, and post-payment access states without faking enrollment | Uses backend-truth flows; no live VNPay dependency |
| Offline full-path extensions | Download, offline quiz-allowed path, stale/conflict surfaces | Expand here as coverage grows |
| Certificate edge checks | Verify visibility + verify-token flow after completion | Release-only unless risk rises |

## Tier 2 - broader regression

Run selectively before larger releases or after risky refactors:

| Area | Why it is Tier 2 |
|---|---|
| Messaging / notifications | Important, but no longer worth blocking every local pass once smoke is green |
| Admin CRUD / moderation | Large surface, lower value than learning/offline for every PR |
| Teacher authoring deep flows | Better as release regression than every-day local validation |
| Large media / long-form runtime scenarios | Better handled by dedicated smoke/load scripts than default Playwright gates |

## Execution rules

- Keep offline/stateful specs on `workers: 1`
- Reset browser/app origin state at the start of smoke specs
- Reuse seeded accounts and discovery helpers instead of inventing new test-only fixtures
- Prefer seeded-student discovery helpers for payment/offline smoke instead of hardcoding one learner account
- Treat offline settings and downloads as **device-local**, not account-roaming
- Keep external live gateways out of Tier 0 unless they are simulated locally
