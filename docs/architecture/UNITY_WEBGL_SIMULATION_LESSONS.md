# Unity WebGL Simulation Lessons

Date: 2026-05-12
Status: Research-backed architecture direction
Scope: Merge the Unity maritime bridge lesson into HoliLihu as a web-delivered, offline-capable LMS lesson type.

Implementation note:

- 2026-05-12: `fe/nginx.conf` now reserves `/simulations/**` for Unity WebGL packages and serves `index.html`, manifests, `.wasm`, `.data`, `.js`, `.br`, `.gz`, and `.unityweb` files with Unity-compatible static, MIME, cache, and compression headers.
- 2026-05-12: `Caddyfile` now allows WebAssembly compilation through CSP `wasm-unsafe-eval` and defines `worker-src 'self' blob:` for simulation/runtime workers.
- 2026-05-12: Phase-0 merge scaffolding added `SIMULATION` data typing, backend publication/query preservation, and learner-facing support notices.
- 2026-05-12: PWA offline scaffolding now downloads approved simulation package assets into `offline-simulations:<userId>` and the service worker serves `/simulations/**` with network-first/cache-fallback behavior.
- 2026-05-12: Learner notices now cover desktop/WebGL2/WebAssembly requirements, mobile/tablet temporary non-support, VR-lab availability, estimated offline package size, and a 500 MB package guardrail.
- 2026-05-12: Production hosting baseline now uses the existing private `lms-storage` R2 bucket under the `simulations/` prefix, behind a Cloudflare Worker route on `/simulations/*`; see `docs/runbooks/UNITY_WEBGL_R2_PROD_RUNBOOK.md`.

## Executive Decision

Yes, we can merge the Unity maritime simulation into `LMS_hohulili` and ship it through `holilihu.online`.

The correct product shape is not a standalone executable. It should be a first-class LMS lesson section:

- Teacher authors a `SIMULATION` section.
- Learner opens it inside the existing course learning shell.
- Unity runs as a WebGL build on the same origin or a trusted asset origin.
- The simulation emits objective/progress/completion events through a JavaScript bridge.
- The LMS records those events using the existing learning-activity/progress model.
- Offline download stores the simulation package in browser storage, alongside the current course package.

This should not be implemented first as generic `EMBED` or raw `iframe` content. Unity WebGL needs careful headers, cache rules, launch context, and progress telemetry. Treating it as a typed simulation package gives us control over security, offline, versioning, and completion.

## Local Project Findings

### HoliLihu LMS

The LMS already has the right foundations:

- Angular 20 frontend with PWA service worker, Dexie/IndexedDB, `idb`, and `jszip`.
- Course model: `Course -> Chapter -> Lesson -> Section`.
- Existing `CourseDownloadService` downloads course content into IndexedDB and already handles publication-aware stale packages.
- Existing `OfflineLessonSection` now carries `SIMULATION` metadata and package cache status.
- Existing `LearningActivityUseCase` records heartbeat, reading progress, and interactive-video events into `learning_events`.
- Existing progress endpoints can mark a lesson or a section complete.
- Existing publication model stores learner-facing snapshots and offline package metadata.
- Existing Caddy/nginx deployment gives us a place to add Unity-specific static headers.

Current limitation:

- Frontend authoring can now preserve `SIMULATION` sections, but still needs an approved package picker/manager before teachers should create them freely.
- Learner runtime can show simulation launch/support/offline notices, but cannot be smoke-tested end to end until the Unity team exports the first WebGL package.
- Backend accepts and publishes `SIMULATION` payloads; rich attempt analytics still need the later telemetry phase.
- Static server config and CSP now have the first Unity WebGL baseline, but every Unity export still needs a deployment smoke test because compression, workers, and browser storage fail silently when package settings drift.

### Unity Maritime Project

The Unity side is close to web export readiness, but not yet LMS-ready:

- Installed editor: Unity `6000.4.4f1`.
- WebGL support module exists at `C:\Program Files\Unity\Hub\Editor\6000.4.4f1\Editor\Data\PlaybackEngines\WebGLSupport`.
- Build settings include only `Assets/Project/Scenes/MaritimeBridgeLMS.unity`, which is good for a focused WebGL export.
- `ProjectSettings.asset` already has WebGL platform entries.
- There is no custom WebGL template under `Assets/WebGLTemplates`.
- There is no JavaScript bridge or `.jslib` plugin yet.
- `LessonScore` is already a pure serializable model and explicitly says it can be serialized by xAPI/cmi5 telemetry later.
- `MaritimeLMSManager` and `ColregRule15LessonController` already expose objective completion and scenario state that can become telemetry.

Current limitation:

- The desktop mock VR control path must remain the web input path. Browser WebGL should not depend on Oculus/Meta runtime.
- Unity WebGL is primarily a desktop-browser target. Unity's own compatibility docs warn that WebGL builds are not supported on mobile devices in the same way as desktop browsers.
- A WebGL build opened from `file://` is not a reliable offline format. It needs HTTP headers and browser APIs. Offline should be PWA/package-based, not "double click index.html".

## Standards And External References

The design should follow the standards and vendor guidance below:

- Unity WebGL deployment docs: WebGL builds need correct compression and response headers; Brotli/gzip native decompression depends on server configuration. Unity also documents custom WebGL templates and browser-JavaScript interaction through `SendMessage`.
- Unity WebGL cache behavior docs: Unity can cache `.data` and AssetBundle data through browser storage/IndexedDB, but limits and eviction are browser-dependent.
- W3C Web App Manifest: installable web apps are described through a JSON manifest with app identity, icons, launch URL, display mode, and related metadata.
- MDN Service Worker and Cache API docs: offline behavior comes from service workers and Cache API, with persistent storage still subject to browser quota/eviction.
- MDN Storage Quotas docs: IndexedDB/Cache storage can fail with quota limits; persistent storage via `navigator.storage.persist()` improves retention but is not absolute.
- ADL xAPI specification: xAPI is the right vocabulary inspiration for rich simulation activity records, because it records learner activity across technologies as statements.
- cmi5: useful later if HoliLihu must launch third-party xAPI content packages. For our own platform-first Unity lesson, we should not implement full cmi5 first.
- 1EdTech LTI: useful later for external tool integrations. It is not the right first step for same-platform Unity content.
- IMO e-learning and IMO Model Course references: maritime simulator exercises are a legitimate training modality; Bridge Resource Management Model Course 1.22 includes theory plus ship-handling simulator exercises.

Reference URLs:

- Unity WebGL deploy: https://docs.unity.cn/Manual/webgl-deploying.html
- Unity WebGL server configuration samples: https://docs.unity.cn/Manual/webgl-server-configuration-code-samples.html
- Cloudflare R2 Workers API: https://developers.cloudflare.com/r2/get-started/workers-api/
- Cloudflare R2 public buckets and custom domains: https://developers.cloudflare.com/r2/buckets/public-buckets/
- Unity WebGL browser compatibility: https://docs.unity3d.com/ja/2023.2/Manual/webgl-browsercompatibility.html
- Unity WebGL cache behavior: https://docs.unity3d.com/ja/2022.3/Manual/webgl-caching.html
- Unity WebGL browser scripting: https://docs.unity.cn/Manual/web-interacting-browser-unity-to-js.html
- W3C Web App Manifest: https://www.w3.org/TR/appmanifest/
- MDN Service Workers: https://developer.mozilla.org/docs/Web/API/Service_Worker_API/Using_Service_Workers
- MDN Cache API: https://developer.mozilla.org/en-US/docs/Web/API/Cache
- MDN storage quotas: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- ADL xAPI Spec: https://github.com/adlnet/xAPI-Spec
- cmi5 current spec: https://aicc.github.io/CMI-5_Spec_Current/
- 1EdTech LTI standards: https://standards.1edtech.org/
- IMO e-learning: https://www.imo.org/en/OurWork/TechnicalCooperation/Pages/IMOe-LEARNING.aspx
- IMO Bridge Resource Management model course: https://imo-epublications.org/content/books/9789280117592

## Product Shape

## Device Support Matrix And Requirements

Important distinction:

- The HoliLihu LMS web/PWA shell can support desktop, tablet, and mobile learning flows.
- The Unity WebGL simulation section should target desktop and laptop browsers first. Mobile browser support is not a production promise for Unity WebGL.
- VR headset support is possible, but it should be treated as a separate native XR/lab delivery mode, not as the same browser WebGL lesson.

### Supported Targets For Simulation V1

| Device class | Support | Requirement notes |
| --- | --- | --- |
| Windows desktop/laptop | Primary | 64-bit Windows 10/11, latest Chrome, Edge, or Firefox, WebGL 2, WebAssembly, hardware acceleration enabled. |
| macOS desktop/laptop | Primary | Recent macOS, latest Chrome, Edge, or Firefox. Safari is acceptable only on modern Safari versions with WebGL 2 support; Chrome/Edge should be the training default for consistency. |
| Linux desktop/laptop | Supported after QA | Latest Chrome, Edge, or Firefox, 64-bit browser, WebGL 2, WebAssembly, hardware acceleration. Some Linux installs may need AAC codec support for audio. |
| High-end Chromebook / ChromeOS | Conditional | Test device-by-device. Unity does not list ChromeOS as a primary desktop target; low-memory Chromebooks are risky. |
| Android phone/tablet | LMS yes, simulation no for V1 | Text, video, quiz, and offline course shell can work. Unity WebGL simulation may load on some high-end devices, but should not be sold as supported. |
| iPhone/iPad | LMS yes, simulation no for V1 | PWA learning shell can work. Unity WebGL simulation should be treated as unsupported for production training, even if some high-end iPads can load a tuned build. |
| Meta Quest / Oculus native VR | Supported as separate lab mode | The Unity project already includes Meta/Oculus XR packages and Oculus settings. Ship this as a native headset build with LMS launch/reporting glue, not as the WebGL package. |
| VR headset browser | Research only | Browser WebGL is a flat canvas target. WebXR would be a separate proof-of-concept and must not be promised for production until tested on real headsets. |
| Smart TV / kiosk browser | Not supported | Too much variation in browser, memory, input, and WebGL support. |

### Support Notice Strategy

The product must communicate device support before the learner wastes time downloading or launching a heavy simulation.

Where to show the notice:

- Course detail page: show a compact badge on simulation lessons: `Requires desktop/laptop` or `VR lab available`.
- Lesson list/sidebar: show a small device icon and support label next to `SIMULATION` sections.
- Before launch: run preflight and show an explicit modal if the current device is unsupported.
- Offline download dialog: show estimated package size, storage requirement, and whether the package is web-offline or VR-lab-only.
- Teacher editor: show support target while authoring: `Web desktop`, `VR headset`, or `Fallback only`.
- Admin/package manager: each simulation package must carry supported targets and tested device matrix.

Suggested learner copy for unsupported phones/tablets:

> This simulation is temporarily supported only on desktop/laptop browsers. You can still study the lesson notes, watch the walkthrough, and complete the quiz on this device. To run the bridge simulator, open this lesson on a supported computer.

Suggested learner copy for low storage/offline:

> This simulator package is large and needs browser storage before it can run offline. Free up storage or run it online on a supported desktop/laptop.

Suggested learner copy for VR support:

> This exercise has a VR lab version for supported Meta/Oculus headsets. The web version runs on desktop/laptop. To use VR, launch it from a prepared training headset or follow the lab instructor's setup.

Suggested teacher/admin copy:

> Simulation support is device-specific. Do not mark phone/tablet or headset browser support as available until the package passes QA on those devices. Provide a video walkthrough and quiz fallback for unsupported learners.

### VR Delivery Strategy

Do not mix the deployment promises:

1. Web LMS simulation.
   - Format: Unity WebGL.
   - Target: desktop/laptop browsers.
   - Offline: PWA/cache storage.
   - Input: mouse/keyboard/desktop mock VR controls.
   - LMS completion: JavaScript bridge events.

2. VR lab simulation.
   - Format: native Unity XR build, likely Android/Meta Quest for the current project direction.
   - Target: prepared VR headset in a training lab or controlled learner-owned headset.
   - Offline: installed headset build plus local or deferred LMS sync.
   - Input: headset tracking, controllers, hand tracking if tested.
   - LMS completion: local token/session pairing, QR code, or headset-side authenticated API sync.

V1 should publish the same learning scenario as two packages only when both are tested:

- `colreg-rule-15-crossing-web-v1`
- `colreg-rule-15-crossing-quest-v1`

Both packages should report the same objective IDs and score schema so the LMS gradebook/debrief stays consistent.

### Learner Device Requirements

Minimum practical baseline for a reliable simulation class:

- 64-bit desktop browser.
- WebGL 2 enabled.
- WebAssembly enabled.
- Hardware acceleration enabled.
- 8 GB RAM minimum.
- Modern integrated GPU or better.
- Keyboard plus mouse or trackpad.
- At least 1 GB free browser storage per downloaded simulation package during early rollout.
- Broadband connection for first download.

Recommended training-lab baseline:

- Windows 10/11 or macOS laptop/desktop.
- Latest Chrome or Edge.
- 16 GB RAM.
- Modern integrated GPU such as Intel Iris Xe, Apple Silicon, AMD Radeon integrated graphics, or any recent discrete GPU.
- Stable 20 Mbps+ network for first package download and updates.
- Headphones/speakers if the simulation uses audio cues.

Offline requirement:

- The learner must open the course online once and explicitly download the offline package.
- Browser storage must have enough quota.
- Persistent storage should be requested with `navigator.storage.persist()`.
- Offline progress must be queued and synced when online again.
- Direct `file://` opening of Unity WebGL output is not a supported offline mode.

### Preflight Gate

Before showing a simulation, the LMS should run a lightweight compatibility check:

- Browser family and version.
- 64-bit desktop-like environment.
- WebGL 2 context creation.
- WebAssembly support.
- Hardware acceleration signal where available.
- Available storage estimate through the Storage API.
- Network state and package size.
- Unsupported mobile/tablet warning with an alternative learning path.

If the check fails, show a professional fallback instead of a broken canvas:

- "Open on desktop/laptop" prompt.
- Teacher-provided video walkthrough or interactive video fallback.
- Quiz/debrief section still available.
- Download size and device requirement explanation.

### Learner Experience

The simulation should appear as a normal lesson section in the learning shell:

- Header: lesson title, competency badge, objective status.
- Main area: full-width simulation canvas with a loading/progress overlay.
- Side/bottom area: instructions, current objective, CPA/risk summary, completion state.
- Controls: browser-friendly mouse/keyboard controls, with a clear "Reset scenario" command.
- Completion: the LMS marks the section complete only when Unity reports a valid scenario completion event.
- Debrief: show score, objectives completed, time, wrong-hand penalties, collision/near-miss status, and recommended retry if failed.

### Teacher Experience

The course editor should add a `Simulation` section type:

- Select an existing simulation package, such as `COLREG Rule 15 - Crossing Situation`.
- Configure required completion policy: complete all objectives, minimum score, no collision, minimum debrief viewed.
- Show estimated offline size.
- Mark whether offline download is allowed.
- Preview the simulation in a teacher-safe runtime.

For v1, teachers should select from approved simulation packages. Arbitrary upload should come later because Unity WebGL packages are large, security-sensitive, and require server headers.

### Offline Experience

Supported offline modes:

1. PWA offline package, primary path.
   - Learner clicks the existing "Download course" flow.
   - LMS stores simulation manifest and required build assets in browser Cache API/IndexedDB.
   - Unity player loads from local cached responses when offline.
   - Simulation events queue in existing offline sync and replay when online.

2. Exportable offline ZIP, later path.
   - Useful for controlled labs or USB distribution.
   - Must include a tiny local static server or launcher because Unity WebGL is not reliable from `file://`.
   - Progress can be local-only unless the package later reconnects and syncs.

Unsupported as a serious target:

- "Open index.html directly offline" for WebGL. It will fail or behave inconsistently because WASM/data loading, compression, CORS, and browser storage need HTTP semantics.

## Data Contract

Add a typed section payload:

```json
{
  "type": "SIMULATION",
  "title": "COLREG Rule 15 - Crossing Situation",
  "simulationPackageId": "colreg-rule-15-crossing-v1",
  "simulationVersion": "2026.05.12.1",
  "entryUrl": "/simulations/colreg-rule-15-crossing/v2026.05.12.1/index.html",
  "manifestUrl": "/simulations/colreg-rule-15-crossing/v2026.05.12.1/holilihu-simulation.json",
  "estimatedSizeBytes": 180000000,
  "allowOffline": true,
  "completionPolicy": {
    "requireAllObjectives": true,
    "minimumScorePercent": 80,
    "failOnCollisionIncident": true,
    "requireDebriefViewed": true
  }
}
```

Simulation package manifest:

```json
{
  "id": "colreg-rule-15-crossing-v1",
  "version": "2026.05.12.1",
  "engine": "unity-webgl",
  "entrypoint": "index.html",
  "unityBuild": {
    "loader": "Build/MaritimeBridgeLMS.loader.js",
    "data": "Build/MaritimeBridgeLMS.data.br",
    "framework": "Build/MaritimeBridgeLMS.framework.js.br",
    "wasm": "Build/MaritimeBridgeLMS.wasm.br",
    "compression": "br"
  },
  "assets": [
    { "url": "Build/MaritimeBridgeLMS.loader.js", "bytes": 120000, "sha256": "..." },
    { "url": "Build/MaritimeBridgeLMS.data.br", "bytes": 150000000, "sha256": "..." },
    { "url": "Build/MaritimeBridgeLMS.framework.js.br", "bytes": 3500000, "sha256": "..." },
    { "url": "Build/MaritimeBridgeLMS.wasm.br", "bytes": 25000000, "sha256": "..." }
  ],
  "events": ["started", "objective.completed", "risk.updated", "completed", "failed", "debrief.viewed"],
  "offline": {
    "supported": true,
    "requiresPersistentStorage": true
  }
}
```

Simulation event envelope:

```json
{
  "lessonId": "uuid",
  "sectionId": "content-block-id",
  "simulationPackageId": "colreg-rule-15-crossing-v1",
  "simulationVersion": "2026.05.12.1",
  "eventType": "objective.completed",
  "eventId": "client-generated-uuid",
  "occurredAt": "2026-05-12T09:20:00.000Z",
  "sequence": 12,
  "data": {
    "objectiveId": "stop-engine",
    "objectiveLabel": "Set engine telegraph to Stop",
    "scorePercent": 75,
    "cpaMeters": 38.2,
    "tcpaSeconds": 41.5,
    "collisionIncident": false
  }
}
```

xAPI-compatible mapping can be derived later:

- `started` -> `initialized`
- `objective.completed` -> `completed`
- `risk.updated` -> `experienced` or project-specific maritime verb
- `completed` -> `completed` plus score result
- `failed` -> `failed`

## Unity Bridge

Unity should add a small platform boundary, not scatter browser calls through gameplay code:

- `HoliLihuWebBridge.cs`
  - Collects launch context from JavaScript.
  - Sends event JSON to JavaScript.
  - Falls back to `Debug.Log` in Editor/Standalone.
- `Assets/Plugins/WebGL/HoliLihuWebBridge.jslib`
  - Exposes `HoliLihuEmitEvent(string json)`.
  - Calls `window.parent.postMessage(...)` or a same-window callback.
- Custom WebGL template
  - Loads Unity.
  - Receives LMS launch context.
  - Provides a stable JS API for Angular.

Bridge flow:

1. Angular loads simulation wrapper with `lessonId`, `sectionId`, auth/session token context, and package metadata.
2. Unity starts and calls `ready`.
3. Angular sends launch context into Unity using `unityInstance.SendMessage`.
4. Unity emits objective/progress/completion events.
5. Angular validates origin/package/session and records events.
6. On completion, Angular calls the existing section-complete endpoint.
7. Offline mode queues events locally and syncs later.

## Backend Changes

Minimum backend v1:

- Accept `SIMULATION` as a content block type.
- Add payload validation for:
  - `simulationPackageId`
  - `simulationVersion`
  - `entryUrl` or `manifestUrl`
  - `estimatedSizeBytes`
  - `allowOffline`
  - `completionPolicy`
- Include simulation fields in course content, lesson detail, and publication snapshots.
- Add event recording:
  - Either extend `LearningActivityUseCase` with `SIMULATION` events, or add a sibling endpoint under `/api/v3/learning-activity/simulation/events`.
  - Store event data in `learning_events` first. Add a dedicated `simulation_attempts` table only when reporting requires richer attempt-level queries.
- Completion remains forward-only and section-scoped:
  - The section is complete when a valid `completed` event satisfies the section policy.
  - Failed/near-miss events are stored but should not mark complete.

Better backend v2:

- Add `simulation_packages` table for approved package inventory.
- Store `artifactBaseUrl`, `manifestSha256`, `estimatedSizeBytes`, `offlineSupported`, `engine`, `status`, and created metadata.
- Add admin/teacher UI for package selection and version pinning.
- Add attempt summary table:
  - `studentId`, `courseId`, `lessonId`, `sectionId`, `packageId`, `packageVersion`, `attemptNumber`, `status`, `score`, `startedAt`, `completedAt`, `summaryJson`.

## Frontend Changes

Minimum frontend v1:

- Extend section types:
  - `SectionEditorType = 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE' | 'SIMULATION'`.
  - `SectionContent.type` and `OfflineLessonSection.type` include `SIMULATION`.
- Add `SimulationPlayerComponent`.
  - Loads manifest.
  - Renders Unity iframe or same-page loader container.
  - Handles bridge messages.
  - Records heartbeat and simulation events.
  - Marks section complete when policy passes.
  - Shows fallback if mobile/unsupported browser.
- Add teacher section editor panel for approved simulation package selection.
- Add course offline downloader support:
  - Fetch simulation manifest.
  - Check quota before caching.
  - Cache build assets with integrity metadata.
  - Store `simulationOfflineBaseUrl` or cache keys in `OfflineLessonSection`.
- Add PWA stale logic:
  - If package version changes, mark offline package stale using existing publication metadata.

## Hosting And Headers

Unity WebGL must have explicit server handling. The production stack should use one canonical path:

- Cloudflare Worker route `/simulations/*` bound to the existing private `lms-storage` R2 bucket.
- `fe/nginx.conf` and the root `Caddyfile` stay compatible for local/fallback serving and CSP, but official packages should not be baked into the frontend image.

Recommended v1 hosting:

- Put approved simulation builds under `simulations/{packageId}/{version}/` in R2 and expose them as `/simulations/{packageId}/{version}/`.
- Serve with immutable cache headers because versioned paths are content-addressed or release-addressed.
- Serve `index.html` and manifest with short/no-cache headers.
- Serve build artifacts with correct MIME and compression headers.
- Keep the route same-origin on `holilihu.online`; avoid `r2.dev` for production.

Header requirements:

- `.wasm`: `Content-Type: application/wasm`.
- `.js`: `Content-Type: application/javascript`.
- `.data`: `Content-Type: application/octet-stream`.
- `.br`: `Content-Encoding: br` when using native Brotli compressed Unity output.
- `.gz`: `Content-Encoding: gzip` when using native gzip compressed Unity output.
- Avoid double-compressing already compressed Unity artifacts.
- `Cache-Control: public, max-age=31536000, immutable` for versioned build assets.
- `Cache-Control: no-cache` for manifests and entry HTML.

CSP review:

- Unity may require worker support and WebAssembly execution policy.
- Keep same-origin if possible to avoid cross-origin isolation complexity.
- If iframe isolation is used, use strict `sandbox` allowances and `postMessage` origin checks.

## Security

Simulation packages are executable web code. Treat them more like app releases than teacher-uploaded documents.

Required controls:

- Only admins or trusted maintainers can publish simulation packages in v1.
- Package manifest must list all files, sizes, and hashes.
- Build paths must be immutable.
- Angular bridge accepts messages only from the expected origin and package frame.
- Event payloads are validated and size-limited.
- Learner identity comes from LMS auth/session, not from Unity.
- Unity never receives long-lived backend credentials.
- Offline event replay uses existing authenticated sync after reconnect.

## Accessibility And Device Support

Unity WebGL is not enough by itself for an LMS-quality lesson:

- Provide text instructions outside the canvas.
- Provide keyboard controls and a visible control legend.
- Provide an accessible completion/debrief panel in Angular.
- Provide unsupported-device fallback with screenshots/video/reading alternative.
- Do not require mobile WebGL support for first release. The LMS should explain that the simulator requires desktop Chrome/Edge/Firefox/Safari with WebGL 2 and WebAssembly.

## Implementation Plan

### Phase 0 - Technical spike

Goal: prove the Unity build can load from the LMS domain and send one event.

Tasks:

- Add Unity WebGL template and `HoliLihuWebBridge`.
- Build `MaritimeBridgeLMS` to WebGL.
- Serve from a local static path with correct headers.
- Create a temporary Angular harness component.
- Verify `ready`, `started`, and `completed` event flow.
- Measure build size, memory, first-load time, and repeat-load time.

Exit criteria:

- Loads on desktop Chrome/Edge.
- No purple/missing shader blockers.
- JavaScript receives Unity event JSON.
- Browser console has no critical errors.
- Build size and load time are documented.

### Phase 1 - LMS-native simulation section

Goal: ship one approved simulation lesson online.

Tasks:

- Add `SIMULATION` types to backend/frontend.
- Add typed simulation payload in authoring.
- Add `SimulationPlayerComponent` in learner runtime.
- Record events through learning activity.
- Mark section complete only on valid Unity completion.
- Add production headers/CSP for `/simulations/**`.

Exit criteria:

- Teacher can attach/select `COLREG Rule 15`.
- Student can launch it inside a lesson.
- Completion updates progress.
- Deployment smoke passes on `holilihu.online`.

### Phase 2 - Offline PWA package

Goal: simulation works from the existing course download flow.

Tasks:

- Cache simulation manifest and build files.
- Store package metadata in `OfflineLessonSection`.
- Add quota check and clear error messages.
- Queue simulation events offline.
- Replay events on reconnect.
- Mark package stale when publication/package version changes.

Exit criteria:

- Downloaded course opens the simulation without network.
- Completion queues offline and syncs when online.
- Version update marks old offline package stale.

### Phase 3 - Attempt analytics and standards bridge

Goal: professional reporting, xAPI-compatible export.

Tasks:

- Add attempt summary table or materialized report.
- Add xAPI-like event export mapping.
- Add instructor attempt dashboard.
- Consider cmi5 only if third-party LMS/package interoperability becomes a requirement.

Exit criteria:

- Teacher sees per-student attempts, score, objectives, time, failures, and retry count.
- Admin can export events in xAPI-compatible shape.

## Feasibility Risks

- WebGL build size may be high. Mitigation: asset stripping, texture compression, Brotli, versioned CDN/cache, lazy download.
- Browser quota may be insufficient for offline on some devices. Mitigation: estimate size before download, request persistent storage, allow "text/video only" package, show clear quota recovery.
- Safari iframe IndexedDB limitations can break Unity data caching. Mitigation: same-page loader or same-origin route, not nested cross-origin iframe.
- Mobile WebGL support is weak. Mitigation: desktop-only simulation requirement plus fallback lesson materials.
- CSP and compression headers can silently break Unity load. Mitigation: dedicated `/simulations/**` server block and Playwright smoke.
- Progress spoofing is possible if the browser can emit completion events. Mitigation: v1 accepts this as equivalent to normal client progress, but signs package/session context and validates event order; v2 can add server-side attempt policy and anomaly detection.

## Recommended Next Step

Start with Phase 0 in a separate integration branch. Do not wait for every Unity visual fix to finish. The technical spike can use the current scene and a single test event, while the scene team continues art/logic polish.

The first concrete deliverable should be:

- Unity WebGL build for `MaritimeBridgeLMS`.
- Minimal `HoliLihuWebBridge`.
- Local Angular harness in `LMS_hohulili`.
- A measured report: build size, first load, repeat load, memory behavior, browser compatibility, and event bridge proof.

After that, we can safely make `SIMULATION` a real section type in production.
