# H5P-Like Interactive Video Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native H5P-like interactive video experience for teachers and learners while preserving HoliLihu's Shaka/Angular playback architecture.

**Architecture:** Add a backward-compatible V2 spec, centralize pure runtime and normalization logic, then layer focused Angular components for learner in-video controls and teacher canvas authoring. Backend changes stay at contract validation/publication boundaries; learner event recording remains in `learning_delivery`.

**Tech Stack:** Angular 20.3 signals/OnPush, TypeScript, Shaka Player 5.x, YouTube IFrame API, Java 21, Spring Boot 3.2.6, JUnit/Angular component tests.

---

## Reference Spec

Read `docs/superpowers/specs/2026-05-07-h5p-like-interactive-video-design.md` before implementing.

## File Map

- Modify: `fe/src/app/api/types/interactive-video.types.ts`
- Create: `fe/src/app/core/utils/interactive-video-normalizer.ts`
- Create: `fe/src/app/core/utils/interactive-video-normalizer.spec.ts`
- Create: `fe/src/app/core/utils/interactive-video-runtime.ts`
- Create: `fe/src/app/core/utils/interactive-video-runtime.spec.ts`
- Modify: `fe/src/app/shared/blocks/video-block/interactive-video-overlay.component.ts`
- Modify: `fe/src/app/shared/blocks/video-block/interactive-video-markers.component.ts`
- Create: `fe/src/app/shared/blocks/video-block/interactive-video-layer.component.ts`
- Create: `fe/src/app/shared/blocks/video-block/interactive-video-layer.component.spec.ts`
- Create: `fe/src/app/shared/blocks/video-block/interactive-video-end-screen.component.ts`
- Create: `fe/src/app/shared/blocks/video-block/interactive-video-end-screen.component.spec.ts`
- Modify: `fe/src/app/features/learning/components/adaptive-video-player/adaptive-video-player.component.ts`
- Modify: `fe/src/app/features/learning/components/youtube-player/youtube-player.component.ts`
- Modify: `fe/src/app/shared/blocks/video-block/quiz-video-player.component.ts`
- Modify: `fe/src/app/features/teacher/course-editor/utils/interactive-video-authoring.ts`
- Modify: `fe/src/app/features/teacher/course-editor/utils/interactive-video-authoring.spec.ts`
- Modify: `fe/src/app/features/teacher/course-editor/utils/interactive-video-interoperability.ts`
- Modify: `fe/src/app/features/teacher/course-editor/utils/interactive-video-interoperability.spec.ts`
- Modify: `fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-panel.component.ts`
- Modify: `fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-panel.component.html`
- Modify: `fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-panel.component.scss`
- Create: `fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-canvas.component.ts`
- Create: `fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-properties.component.ts`
- Later backend phase, if needed: create centralized Java normalizer under `backend/src/main/java/com/example/lms/course_authoring/application/service/` and replace duplicated controller/service normalization.

## Chunk 1: Spec V2 And Pure Normalization

### Task 1: Extend TypeScript contract

**Files:**
- Modify: `fe/src/app/api/types/interactive-video.types.ts`

- [ ] **Step 1: Add V2-compatible optional fields without removing V1 fields**

Add interfaces for `InteractiveVideoBehavior`, `InteractiveVideoBookmark`, `InteractiveVideoEndScreen`, `InteractiveVideoPosition`, `InteractiveVideoAdaptivity`, and `InteractiveVideoAction`.

Expected shape:

```ts
export type InteractiveVideoDisplayType = 'button' | 'poster';
export type InteractiveVideoPreventSkippingMode = 'none' | 'forward' | 'both';
```

- [ ] **Step 2: Keep V1 code compiling**

Ensure `InteractiveVideoSpec.version` can support existing `1` and new `2` during migration:

```ts
export interface InteractiveVideoSpec {
  version: 1 | 2;
  enabled?: boolean;
  behavior?: InteractiveVideoBehavior;
  bookmarks?: InteractiveVideoBookmark[];
  endScreen?: InteractiveVideoEndScreen | null;
  timeline: InteractiveVideoInteraction[];
}
```

- [ ] **Step 3: Run targeted type check through tests**

Run: `cd fe; npm run test:ci -- --include src/app/features/teacher/course-editor/utils/interactive-video-authoring.spec.ts`

Expected: existing tests still pass or fail only because normalization has not been updated yet.

### Task 2: Add normalizer utility

**Files:**
- Create: `fe/src/app/core/utils/interactive-video-normalizer.ts`
- Create: `fe/src/app/core/utils/interactive-video-normalizer.spec.ts`
- Modify: `fe/src/app/features/teacher/course-editor/utils/interactive-video-authoring.ts`
- Modify: `fe/src/app/features/learning/services/learning.service.ts`

- [ ] **Step 1: Write failing normalizer tests**

Test cases:

```ts
it('normalizes a V1 interaction to V2 defaults', () => {});
it('clamps invalid positions into 0..100 percent', () => {});
it('drops unsupported bookmark rows', () => {});
it('keeps existing branch target fields intact', () => {});
```

- [ ] **Step 2: Implement minimal normalizer**

Implement:

```ts
export function normalizeInteractiveVideoSpecV2(value: unknown): InteractiveVideoSpec | null
export function normalizeInteractiveVideoInteractionV2(value: unknown, index: number): InteractiveVideoInteraction | null
```

Rules:

- V1 input returns `version: 2`.
- Missing display type becomes `poster` for required interactions, otherwise `button`.
- Missing position becomes centered.
- Invalid numbers clamp to safe ranges.
- Existing `enabled: false` with empty timeline returns `null`.

- [ ] **Step 3: Replace duplicated frontend normalization call sites**

Use the new normalizer in:

- `interactive-video-authoring.ts`
- `learning.service.ts`
- H5P interoperability import paths

- [ ] **Step 4: Run tests**

Run: `cd fe; npm run test:ci -- --include src/app/core/utils/interactive-video-normalizer.spec.ts --include src/app/features/teacher/course-editor/utils/interactive-video-authoring.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe/src/app/api/types/interactive-video.types.ts fe/src/app/core/utils/interactive-video-normalizer.ts fe/src/app/core/utils/interactive-video-normalizer.spec.ts fe/src/app/features/teacher/course-editor/utils/interactive-video-authoring.ts fe/src/app/features/learning/services/learning.service.ts
git commit -m "feat(video): add interactive video v2 normalization"
```

## Chunk 2: Learner Runtime Layer

### Task 3: Add pure runtime helper

**Files:**
- Create: `fe/src/app/core/utils/interactive-video-runtime.ts`
- Create: `fe/src/app/core/utils/interactive-video-runtime.spec.ts`

- [ ] **Step 1: Write failing runtime tests**

Test:

- visible interactions include button/poster within `atSeconds..endSeconds`
- required overdue interaction is returned even after seek
- completed interactions are ignored
- branch target resolves by time or interaction id
- anti-skip `forward` blocks seeking past furthest watched time with incomplete required interaction

- [ ] **Step 2: Implement pure helpers**

Functions:

```ts
export function getVisibleInteractiveVideoInteractions(...)
export function getDueInteractiveVideoInteraction(...)
export function resolveInteractiveVideoChoiceTarget(...)
export function shouldBlockInteractiveVideoSeek(...)
```

- [ ] **Step 3: Run tests**

Run: `cd fe; npm run test:ci -- --include src/app/core/utils/interactive-video-runtime.spec.ts`

Expected: PASS.

### Task 4: Render in-video buttons/posters

**Files:**
- Create: `fe/src/app/shared/blocks/video-block/interactive-video-layer.component.ts`
- Create: `fe/src/app/shared/blocks/video-block/interactive-video-layer.component.spec.ts`
- Modify: `fe/src/app/features/learning/components/adaptive-video-player/adaptive-video-player.component.ts`
- Modify: `fe/src/app/features/learning/components/youtube-player/youtube-player.component.ts`
- Modify: `fe/src/app/shared/blocks/video-block/quiz-video-player.component.ts`

- [ ] **Step 1: Write component tests**

Verify:

- button display renders compact control at computed position
- poster display renders larger card
- required interactions expose accessible label
- click emits selected interaction

- [ ] **Step 2: Implement component**

Inputs:

```ts
timeline: InteractiveVideoInteraction[]
currentTimeSeconds: number
durationSeconds: number | null
completedInteractionIds: ReadonlySet<string>
activeInteractionId: string | null
```

Output:

```ts
interactionSelected: InteractiveVideoInteraction
```

- [ ] **Step 3: Wire into Shaka player**

In `adaptive-video-player.component.ts`, render layer between video controls and overlay. Selecting an interaction sets `activeInteraction` and pauses if needed.

- [ ] **Step 4: Wire into YouTube and preview players**

Use the same layer and runtime helpers. Respect YouTube online-only tracking boundary.

- [ ] **Step 5: Run tests**

Run: `cd fe; npm run test:ci -- --include src/app/shared/blocks/video-block/interactive-video-layer.component.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add fe/src/app/core/utils/interactive-video-runtime.ts fe/src/app/core/utils/interactive-video-runtime.spec.ts fe/src/app/shared/blocks/video-block/interactive-video-layer.component.ts fe/src/app/shared/blocks/video-block/interactive-video-layer.component.spec.ts fe/src/app/features/learning/components/adaptive-video-player/adaptive-video-player.component.ts fe/src/app/features/learning/components/youtube-player/youtube-player.component.ts fe/src/app/shared/blocks/video-block/quiz-video-player.component.ts
git commit -m "feat(video): render in-video interactive controls"
```

## Chunk 3: Overlay Hardening And Policies

### Task 5: Improve overlay accessibility and required policies

**Files:**
- Modify: `fe/src/app/shared/blocks/video-block/interactive-video-overlay.component.ts`
- Modify: `fe/src/app/shared/blocks/video-block/interactive-video-overlay.component.spec.ts`

- [ ] **Step 1: Add tests for required correctness**

Test that `requireCorrectBeforeContinue` disables continue until a correct choice is selected.

- [ ] **Step 2: Add focus trap and restore focus**

Implement lightweight focus cycling or use existing Angular CDK if already present. Do not add a dependency unless the project already has it.

- [ ] **Step 3: Add branch/adaptivity feedback copy**

Show teacher-entered adaptivity message after choice selection when present.

- [ ] **Step 4: Run tests**

Run: `cd fe; npm run test:ci -- --include src/app/shared/blocks/video-block/interactive-video-overlay.component.spec.ts`

Expected: PASS.

### Task 6: Implement anti-skip policy in players

**Files:**
- Modify: `fe/src/app/features/learning/components/adaptive-video-player/adaptive-video-player.component.ts`
- Modify: `fe/src/app/features/learning/components/youtube-player/youtube-player.component.ts`
- Modify: `fe/src/app/shared/blocks/video-block/quiz-video-player.component.ts`

- [ ] **Step 1: Add tests around seek blocking if existing player tests support it**

Focus on pure helper tests first; component tests only where practical.

- [ ] **Step 2: Track furthest watched time**

Update players to maintain `furthestWatchedSeconds`.

- [ ] **Step 3: Snap blocked seeks back safely**

Use `shouldBlockInteractiveVideoSeek` to snap back before evaluating due interactions. Avoid loops by ignoring the programmatic correction seek.

- [ ] **Step 4: Run targeted tests**

Run runtime tests and relevant player component specs.

- [ ] **Step 5: Commit**

```bash
git add fe/src/app/shared/blocks/video-block/interactive-video-overlay.component.ts fe/src/app/shared/blocks/video-block/interactive-video-overlay.component.spec.ts fe/src/app/features/learning/components/adaptive-video-player/adaptive-video-player.component.ts fe/src/app/features/learning/components/youtube-player/youtube-player.component.ts fe/src/app/shared/blocks/video-block/quiz-video-player.component.ts
git commit -m "feat(video): harden interactive overlay and seek policy"
```

## Chunk 4: Teacher H5P-Like Canvas

### Task 7: Add authoring canvas component

**Files:**
- Create: `fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-canvas.component.ts`
- Modify: `fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-panel.component.ts`
- Modify: `fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-panel.component.html`
- Modify: `fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-panel.component.scss`
- Modify: `fe/src/app/features/teacher/course-editor/services/curriculum-editor.service.ts`

- [ ] **Step 1: Write tests for placement utility if canvas math is extracted**

Convert pointer coordinates to percent with clamping.

- [ ] **Step 2: Implement canvas shell**

Show video preview area, toolbar buttons for checkpoint/question/branch/hotspot, and overlay handles for current interactions.

- [ ] **Step 3: Add click-to-place flow**

Click toolbar item, click canvas, create interaction at current preview time and clicked position.

- [ ] **Step 4: Add drag-to-move**

Drag handle updates `position`.

- [ ] **Step 5: Keep existing list editor**

Render the current card/list editor under an "Advanced list" disclosure. Do not remove existing fields.

- [ ] **Step 6: Run tests**

Run authoring tests and component smoke tests.

### Task 8: Add property panel

**Files:**
- Create: `fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-properties.component.ts`
- Modify: `interactive-video-authoring-panel.component.*`
- Modify: `curriculum-editor.service.ts`

- [ ] **Step 1: Add selected interaction signal**

Track selected interaction id in the panel.

- [ ] **Step 2: Move selected interaction fields into focused component**

Fields: type, title, body, display type, required, pause, at/end seconds, position, choices, branch targets, adaptivity.

- [ ] **Step 3: Keep old list editor compatible**

Ensure changing fields in either place updates the same service state.

- [ ] **Step 4: Commit**

```bash
git add fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-canvas.component.ts fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-properties.component.ts fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-panel.component.ts fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-panel.component.html fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-panel.component.scss fe/src/app/features/teacher/course-editor/services/curriculum-editor.service.ts
git commit -m "feat(video): add h5p-like authoring canvas"
```

## Chunk 5: Bookmarks And End Screen

### Task 9: Add bookmarks

**Files:**
- Modify: `interactive-video.types.ts`
- Modify: `interactive-video-authoring.ts`
- Modify: `interactive-video-markers.component.ts`
- Modify: players and authoring panel files as needed

- [ ] **Step 1: Add tests for bookmark normalization**

- [ ] **Step 2: Add teacher bookmark controls**

- [ ] **Step 3: Add learner bookmark menu**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(video): add interactive video bookmarks"
```

### Task 10: Add end screen

**Files:**
- Create: `fe/src/app/shared/blocks/video-block/interactive-video-end-screen.component.ts`
- Create: `fe/src/app/shared/blocks/video-block/interactive-video-end-screen.component.spec.ts`
- Create: `fe/src/app/core/utils/interactive-video-results.ts`
- Create: `fe/src/app/core/utils/interactive-video-results.spec.ts`
- Modify: players and authoring panel files as needed

- [ ] **Step 1: Write results helper tests**

Test answered count, score count, unanswered required interactions, and review target list.

- [ ] **Step 2: Implement end screen component**

Show title, answered/unanswered count, score when enabled, review buttons, and submit button.

- [ ] **Step 3: Emit submit event**

Initially store as analytics event, not gradebook result.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(video): add interactive video end screen"
```

## Chunk 6: H5P Interchange Parity

### Task 11: Expand import/export mapping

**Files:**
- Modify: `fe/src/app/features/teacher/course-editor/utils/interactive-video-interoperability.ts`
- Modify: `fe/src/app/features/teacher/course-editor/utils/interactive-video-interoperability.spec.ts`

- [ ] **Step 1: Add tests for H5P position/display type**

Expected: H5P `x`, `y`, `width`, `height`, `displayType` map to native V2 fields.

- [ ] **Step 2: Add tests for bookmarks and adaptivity**

Expected: H5P bookmarks map to native bookmarks; correct/wrong seek targets map to adaptivity/branch targets.

- [ ] **Step 3: Implement export mapping**

- [ ] **Step 4: Implement import mapping**

- [ ] **Step 5: Commit**

```bash
git add fe/src/app/features/teacher/course-editor/utils/interactive-video-interoperability.ts fe/src/app/features/teacher/course-editor/utils/interactive-video-interoperability.spec.ts
git commit -m "feat(video): expand h5p interactive video interchange"
```

## Chunk 7: Backend Contract Hardening

### Task 12: Centralize backend normalization

**Files:**
- Create: `backend/src/main/java/com/example/lms/course_authoring/application/service/InteractiveVideoSpecNormalizer.java`
- Create: `backend/src/test/java/com/example/lms/course_authoring/application/service/InteractiveVideoSpecNormalizerTest.java`
- Modify: `backend/src/main/java/com/example/lms/course_authoring/infrastructure/service/CoursePublicationService.java`
- Modify: `backend/src/main/java/com/example/lms/course_authoring/infrastructure/web/CourseQueryControllerV3.java`

- [ ] **Step 1: Write backend tests**

Test V1 passthrough, V2 field preservation, invalid timeline removal, max length trimming or rejection, and disabled empty spec returns null.

- [ ] **Step 2: Implement normalizer**

Keep it dependency-light. Use `Map<String, Object>` at persistence boundary, but centralize rules.

- [ ] **Step 3: Replace duplicated methods**

Remove private duplicate normalizers from publication/query after wiring centralized normalizer.

- [ ] **Step 4: Run backend tests**

Run: `cd backend; mvn -Dtest=InteractiveVideoSpecNormalizerTest test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/example/lms/course_authoring/application/service/InteractiveVideoSpecNormalizer.java backend/src/test/java/com/example/lms/course_authoring/application/service/InteractiveVideoSpecNormalizerTest.java backend/src/main/java/com/example/lms/course_authoring/infrastructure/service/CoursePublicationService.java backend/src/main/java/com/example/lms/course_authoring/infrastructure/web/CourseQueryControllerV3.java
git commit -m "feat(video): centralize interactive spec normalization"
```

## Final Verification

- [ ] Run: `cd fe; npm run test:ci`
- [ ] Run: `cd fe; npm run build`
- [ ] Run backend targeted tests touched by implementation.
- [ ] Run: `git diff --check`
- [ ] Manual smoke: teacher creates uploaded video interaction on canvas, saves, learner sees in-video poster, answers, continues, event is recorded.
- [ ] Manual smoke: YouTube section warns online-only and learner interaction works online.
- [ ] Manual smoke: imported H5P package maps display type, position, bookmarks, and adaptivity where supported.

## Rollout Notes

- Ship V2 support behind backward-compatible defaults.
- Existing V1 courses must continue loading and saving without data loss.
- Keep strict anti-skip opt-in until teachers can understand the behavior in the UI.
- Keep gradebook integration out of the first release unless explicitly approved.
