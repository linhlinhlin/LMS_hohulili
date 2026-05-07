# H5P-Like Interactive Video Native Layer Design

Date: 2026-05-07
Status: Approved direction, ready for implementation planning

## Decision

Build an H5P-like native interactive video layer for HoliLihu. The learner runtime will stay native Angular on top of the existing Shaka/HTML5 and YouTube players; H5P remains a UX, authoring, and interchange reference, not the playback engine.

This preserves the current architecture decision in `docs/architecture/INTERACTIVE_VIDEO_NATIVE_LAYER.md` while expanding the current MVP toward the experience teachers expect from H5P Interactive Video.

## References

- H5P Interactive Video: https://h5p.org/interactive-video
- H5P Interactive Video tutorial: https://h5p.org/tutorial-interactive-video
- H5P xAPI coverage: https://h5p.org/node/617/xapi-coverage
- H5P semantics guide: https://h5p.org/semantics
- H5P Interactive Video semantics source: https://raw.githubusercontent.com/h5p/h5p-interactive-video/master/semantics.json
- WAI-ARIA modal dialog pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- Existing HoliLihu architecture: `docs/architecture/INTERACTIVE_VIDEO_NATIVE_LAYER.md`

## Problem

The current implementation has a solid MVP: section-level sidecar spec, checkpoints, single-choice prompts, branch choices, learner markers, dialog overlay, event tracking, H5P import/export subset, and offline queueing for uploaded/adaptive video events.

It does not yet feel like H5P Interactive Video because the authoring and learning experience are still form-first and popup-first:

- Teacher authoring is a panel with cards and a flow rail, not a video canvas where interactions are placed directly.
- Student runtime only shows markers plus a modal overlay, not in-video buttons/posters that appear during a configured time range.
- Required prompts only require a selection, not correctness or completion policies.
- Bookmarks, end screen, submit screen, summary task, and behaviour settings are not first-class.
- The `hotspot` model exists but is not implemented in authoring or runtime.
- Backend spec handling is map-based and duplicated, which becomes risky when the spec grows.

## Goals

- Let teachers create interactive videos through an H5P-like workflow: source video, add interactions on the video canvas, then configure summary and behavior.
- Let students experience interactions as in-video buttons/posters, dialogs, bookmarks, branches, and end-screen review rather than only timeline popups.
- Keep playback native to the project, preserving Shaka adaptive playback, signed media, offline downloaded sections, and current YouTube support boundaries.
- Keep the implementation incremental, testable, and compatible with existing V1 specs.
- Preserve Clean Architecture: frontend authoring/runtime logic stays focused; backend validates and publishes spec contracts without making controllers own business rules.

## Non-Goals

- Do not embed the H5P JavaScript runtime or H5P editor into the learner path.
- Do not implement every H5P interaction library in one pass.
- Do not turn interactive video into the full quiz/gradebook engine in the first phase.
- Do not rewrite the video pipeline, Shaka integration, offline download system, or course editor shell.

## Current Baseline

Important current files:

- `fe/src/app/api/types/interactive-video.types.ts`: V1 contract with `checkpoint`, `single_choice`, `branch`, `hotspot`.
- `fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/interactive-video-authoring-panel.component.*`: teacher panel.
- `fe/src/app/features/teacher/course-editor/utils/interactive-video-authoring.ts`: authoring normalization, validation, suggestions.
- `fe/src/app/features/teacher/course-editor/utils/interactive-video-interoperability.ts`: HoliLihu JSON and H5P package import/export subset.
- `fe/src/app/shared/blocks/video-block/interactive-video-overlay.component.ts`: learner dialog overlay.
- `fe/src/app/shared/blocks/video-block/interactive-video-markers.component.ts`: learner timeline marker rail.
- `fe/src/app/features/learning/components/adaptive-video-player/adaptive-video-player.component.ts`: Shaka/HTML5 runtime integration.
- `fe/src/app/features/learning/components/youtube-player/youtube-player.component.ts`: YouTube runtime integration.
- `fe/src/app/shared/blocks/video-block/quiz-video-player.component.ts`: teacher preview runtime.
- `backend/src/main/java/com/example/lms/course_authoring/infrastructure/service/CoursePublicationService.java`: publish snapshot spec passthrough.
- `backend/src/main/java/com/example/lms/course_authoring/infrastructure/web/CourseQueryControllerV3.java`: learner response spec passthrough and locking.
- `backend/src/main/java/com/example/lms/learning_delivery/application/usecase/LearningActivityUseCase.java`: interactive event persistence.

## H5P Capabilities To Mirror

The H5P semantics model shows these relevant authoring/runtime concepts:

- Wizard groups: upload/embed video, add interactions, summary task.
- Video source metadata: multiple video files, poster, start screen, text tracks.
- Interactions list: display time, pause video, display as button/poster, mobile button fallback.
- Spatial placement: `x`, `y`, `width`, `height` on the video canvas.
- Interaction action payload: H5P library-backed content such as text, image, link, multiple choice, and other tasks.
- Adaptivity: completion requirement, correct/wrong paths, seek targets, optional opt-out.
- Bookmarks: menu of time-labelled navigation points.
- End screens: submit/review screens near the end of playback.
- Behavioural settings: autoplay, loop, deactivate auto-pause, show rewind, disable navigation, retry/show solution behavior.
- xAPI-style events for answered, interacted, progressed, and completed actions.

HoliLihu should mirror the user experience and data concepts where they fit the LMS, while keeping native components and project-owned contracts.

## Proposed Spec V2

V2 should be additive and backward-compatible. V1 specs load normally and normalize to V2 at frontend boundaries. Backend can accept V1 or V2 during migration.

```ts
export interface InteractiveVideoSpecV2 {
  version: 2;
  enabled?: boolean;
  behavior?: InteractiveVideoBehavior;
  bookmarks?: InteractiveVideoBookmark[];
  endScreen?: InteractiveVideoEndScreen | null;
  timeline: InteractiveVideoInteractionV2[];
}

export interface InteractiveVideoBehavior {
  preventSkippingMode?: 'none' | 'forward' | 'both';
  showBookmarksOnLoad?: boolean;
  showRewind10?: boolean;
  pauseOnInteraction?: boolean;
}

export interface InteractiveVideoBookmark {
  id: string;
  timeSeconds: number;
  label: string;
}

export interface InteractiveVideoEndScreen {
  enabled: boolean;
  atSeconds?: number | null;
  requireAnswerBeforeSubmit?: boolean;
  showScore?: boolean;
  title?: string | null;
  body?: string | null;
}

export interface InteractiveVideoInteractionV2 {
  id: string;
  type: 'checkpoint' | 'single_choice' | 'branch' | 'hotspot';
  atSeconds: number;
  endSeconds?: number | null;
  title?: string | null;
  body?: string | null;
  pause?: boolean;
  required?: boolean;
  displayType?: 'button' | 'poster';
  position?: InteractiveVideoPosition | null;
  choices?: InteractiveVideoChoiceV2[];
  hotspots?: InteractiveVideoHotspot[];
  adaptivity?: InteractiveVideoAdaptivity | null;
}

export interface InteractiveVideoPosition {
  xPercent: number;
  yPercent: number;
  widthPercent?: number | null;
  heightPercent?: number | null;
}

export interface InteractiveVideoChoiceV2 {
  id: string;
  label: string;
  feedback?: string | null;
  isCorrect?: boolean;
  targetTimeSeconds?: number | null;
  targetInteractionId?: string | null;
}

export interface InteractiveVideoAdaptivity {
  requireCorrectBeforeContinue?: boolean;
  onCorrect?: InteractiveVideoAction | null;
  onWrong?: InteractiveVideoAction | null;
  allowOptOut?: boolean;
}

export interface InteractiveVideoAction {
  type: 'continue' | 'seek' | 'interaction';
  targetTimeSeconds?: number | null;
  targetInteractionId?: string | null;
  message?: string | null;
}
```

Default V1-to-V2 behavior:

- `displayType = 'poster'` for required interactions and `button` for optional interactions.
- `position = { xPercent: 50, yPercent: 50 }` when missing.
- V1 `choices.targetTimeSeconds` and `targetInteractionId` remain valid for branch choices.
- `behavior.preventSkippingMode = 'none'` initially, so existing courses do not become stricter unexpectedly.

## Teacher Experience

The teacher workflow should become a three-step authoring surface inside the existing section editor:

1. Source and compatibility: show upload/YouTube status, offline capability, poster/text-track readiness, and whether the current source supports full native behavior.
2. Add interactions: show a video preview canvas with an interaction toolbar, in-video handles, timeline rail, bookmarks, and a property panel.
3. Summary and behavior: configure end screen, score summary, bookmarks menu, and navigation policy.

The existing card/list editor should not be deleted. It should become an advanced list panel below or beside the canvas so teachers can still bulk-edit exact times and content.

Teacher canvas behavior:

- Click a toolbar item then click the video to place it.
- Drag an existing interaction handle to change `position`.
- Drag timeline dots or edit numeric time fields to change `atSeconds`.
- Resize poster/hotspot bounds through handles if feasible in phase 2; otherwise start with position-only and fixed size.
- Select an interaction to edit title, body, choices, display type, required, pause, adaptivity, and targets.
- Warn when branch targets self, duplicate timestamps, interaction after duration, missing choices, missing correct answer, or hidden required interaction.

## Student Experience

Learner runtime should evaluate active interactions as a visible window, not only as a single due popup:

- Interactions become visible when `currentTime >= atSeconds` and before `endSeconds` when configured.
- Button interactions render as compact labelled buttons on the video.
- Poster interactions render as larger cards on the video and may pause/open automatically when required.
- Clicking an interaction opens the existing dialog overlay, upgraded with focus trap, clear feedback, branch outcome copy, and continue behavior.
- Required interactions pause playback and block continuation until their policy is satisfied.
- Optional interactions may be dismissed or ignored unless the course behavior says otherwise.
- Bookmarks render as a menu and timeline navigation aids.
- End screen renders near the end or after playback completion with answered/unanswered state, score when applicable, and review actions.

Anti-skip should be explicit:

- `none`: current behavior, no forward lock beyond required interaction evaluation.
- `forward`: learner cannot seek beyond the furthest watched time plus a small grace window while required interactions remain incomplete.
- `both`: strict review mode, navigation is constrained to visited/completed ranges.

## Runtime Architecture

Introduce focused utilities before growing components:

- `interactive-video-normalizer.ts`: normalize V1/V2 specs and clamp invalid fields.
- `interactive-video-runtime.ts`: pure logic for active interaction windows, due required interactions, completion state, branch target resolution, and anti-skip decisions.
- `interactive-video-results.ts`: pure scoring/answered-state helpers.

Then keep visual components small:

- `InteractiveVideoLayerComponent`: positions in-video buttons/posters/hotspots.
- `InteractiveVideoOverlayComponent`: continues to own dialog content.
- `InteractiveVideoMarkersComponent`: continues to own marker rail, with bookmark awareness later.
- `InteractiveVideoEndScreenComponent`: owns summary/submit UI.
- `InteractiveVideoAuthoringCanvasComponent`: owns teacher canvas handles and placement.
- `InteractiveVideoAuthoringPropertiesComponent`: owns selected interaction form controls.

The Shaka, YouTube, and teacher preview players should consume the same pure runtime utility so behavior does not drift across players.

## Backend Architecture

Do not spread V2 parsing deeper into controllers. The backend should add a small application-level validator/normalizer boundary for `interactiveVideoSpec`:

- Normalize version, timeline, bookmarks, behavior, end screen.
- Clamp numeric fields and drop unsupported fields.
- Enforce size limits for title/body/choice text and total timeline count.
- Preserve locking behavior for paid/hidden lessons.
- Keep event recording in `learning_delivery`.
- Add a separate assessment/result use case only when end-screen scoring becomes grade-bearing.

For phase 1 and 2, backend may continue storing JSON as section data, but normalization should be centralized instead of duplicated in publication and query controllers.

## Security And Accessibility

Rich content must stay allowlisted. Existing rendering escapes HTML before marker replacement, but V2 should add tests and limits:

- Only allow `http`, `https`, `assets/`, and trusted content IDs for media.
- Escape teacher text before rendering.
- Keep KaTeX `throwOnError: false`.
- Add payload length limits for body, choices, feedback, and marker values.
- Use focus trap and focus restoration for modal overlays.
- Ensure all in-video controls are keyboard reachable and have labels.
- Announce appearing interactions with `aria-live` without spamming.

## Offline And YouTube Boundaries

Uploaded/adaptive video remains the full-feature path. It supports offline package download, offline event queueing, signed media, and Shaka adaptive playback.

YouTube remains online-only. It can support in-video interaction UI and tracking while online, but should show clear authoring warnings when teachers choose behavior that depends on offline or strict playback control.

## Phased Delivery

### Phase 1: Spec V2 and learner in-video layer

Deliver V2 normalization, runtime pure tests, in-video button/poster rendering, focus-safe overlay, and behavior parity across Shaka, YouTube, and teacher preview.

### Phase 2: Teacher canvas authoring

Deliver H5P-like add-interactions canvas, toolbar, property panel, position editing, and improved validation.

### Phase 3: Behavior and adaptivity

Deliver prevent-skipping mode, require-correct-before-continue, correct/wrong adaptivity actions, and branch-loop safety.

### Phase 4: Bookmarks and end screen

Deliver bookmark menu, summary/end screen, answered-state review, score display, and submit event.

### Phase 5: H5P interchange parity

Extend import/export for position, display type, bookmarks, end screen, behavior, and adaptivity where H5P semantics map cleanly.

## Verification

- Frontend unit tests for V1-to-V2 normalization, runtime active-window selection, anti-skip decisions, branch target resolution, and scoring.
- Component tests for in-video layer, overlay focus behavior, marker/bookmark rendering, and teacher canvas selection.
- Backend unit tests for centralized spec normalization when backend is touched.
- Interoperability tests for H5P import/export fields.
- Manual smoke path: teacher creates video interaction on canvas, saves, learner sees in-video interaction, answers/branches, event is recorded or queued offline.
- Build checks: `npm run test:ci`, targeted frontend specs, backend targeted tests when modified, `npm run build` before final integration.

## Open Decisions

- Whether end-screen scores affect gradebook in the first release or stay analytics-only.
- Whether teacher canvas resizing is required in phase 2 or can wait until after position-only placement.
- Whether strict anti-skip should be default for all interactive videos or opt-in per section.
- Which H5P content types beyond text, image, link, and multiple choice should be supported first.
