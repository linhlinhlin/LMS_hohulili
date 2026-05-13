# Unity Simulation Merge Execution Plan

Date: 2026-05-12
Status: Execution plan
Scope: Merge the maritime Unity lesson into HoliLihu as web/offline LMS content, while keeping VR support as a separate native lab mode.

## Decision

Merge through a typed LMS section named `SIMULATION`.

Do not merge the Unity build as a raw iframe, zip attachment, or standalone application. The LMS must know that this is a simulation package so it can show device notices, run compatibility checks, cache offline assets, and record objective-level progress.

## Package Shapes

Use two package channels when both are ready:

- `colreg-rule-15-crossing-web-v1`
  - Unity WebGL build.
  - Served under `/simulations/colreg-rule-15-crossing/vYYYY.MM.DD.N/`.
  - Used inside the HoliLihu web learning shell.
  - Supports desktop/laptop browsers first.

- `colreg-rule-15-crossing-quest-v1`
  - Native Unity XR build for Meta/Oculus headset lab use.
  - Installed or launched on prepared headsets.
  - Reports the same objective IDs and score schema as the web package.

## Repository Merge Points

### Unity Project

Source project:

- `E:\Sach\Sua\test\VR\VR_Maritime_LMS`

Required Unity-side outputs:

- WebGL build folder.
- `holilihu-simulation.json` package manifest.
- `HoliLihuWebBridge.jslib` for Unity-to-browser events.
- C# bridge wrapper that emits objective/progress/completion events.
- Optional native XR build artifact for Quest/Oculus lab mode.

Do not depend on Oculus/Meta runtime for the WebGL package. WebGL must use desktop-safe input.

### LMS Project

Target project:

- `E:\Sach\Sua\LMS_hohulili`

Package hosting:

- Local development: do not keep hand-made simulation demos in `fe/public/simulations`. Use a real Unity WebGL export folder for local smoke tests, or use the R2 staging prefix after upload.
- Production: existing private Cloudflare R2 bucket `lms-storage`, prefix `simulations/`, served through a Cloudflare Worker route on `/simulations/*`.
- Do not bake official Unity WebGL packages into the Angular Docker image. Keep large, versioned Unity assets outside the frontend image and publish them to R2.

Runtime URL:

- Public readiness page: `/simulation-courses`.
- Student workspace entry: `/student/simulation-courses`.
- `/simulations/<package>/<version>/index.html`
- `/simulations/<package>/<version>/holilihu-simulation.json`

Backend data contract:

- Section type: `SIMULATION`.
- Section payload contains `simulationData`.
- Publication snapshots preserve `simulationData`.
- Learning activity receives simulation events.

Frontend data contract:

- Learning models include `SIMULATION`.
- Offline models include `simulationData`.
- Course detail and learning shell show device support notices.
- Future simulation runtime component reads `manifestUrl` and launches the Unity package only after preflight passes.

## Merge Phases

### Phase 0 - Compatibility Foundation

Goal: the LMS can store, publish, display, and cache metadata for simulation sections without running Unity yet.

Done/started:

- Add `SIMULATION` to backend section constraint and dev runtime constraint.
- Add typed frontend simulation data models.
- Preserve `simulationData` in course query/publication responses.
- Add Unity WebGL response headers through the production `/simulations/*` Worker and keep nginx/Caddy compatible for local or fallback serving.
- Add CSP permission for WebAssembly compilation.
- Show a learner-facing readiness notice inside LMS instead of shipping a fake Unity demo package.

Exit criteria:

- TypeScript compiles.
- Backend compiles.
- A hand-made `SIMULATION` content block appears in course detail/lesson shell with a clear support notice.

### Phase 1 - WebGL Package Smoke

Goal: the Unity WebGL build can load from the LMS domain.

Steps:

- Build Unity WebGL from `Assets/Project/Scenes/MaritimeBridgeLMS.unity`.
- Disable WebGL reliance on VR-only input paths.
- Enable Brotli or gzip release compression.
- Publish the test package to `staging/simulations/colreg-rule-15-crossing/<version>/` in `lms-storage` for staging, then `simulations/colreg-rule-15-crossing/<version>/` for production.
- Add a manifest listing loader/data/framework/wasm assets with size and hash.
- Verify response headers:
  - `.wasm` has `Content-Type: application/wasm`.
  - `.br` has `Content-Encoding: br`.
  - `.gz` has `Content-Encoding: gzip`.
  - static build assets are immutable.
- Open the package through the LMS shell on Chrome/Edge desktop.
- Confirm `/simulations/**` is same-origin on `holilihu.online`, not `r2.dev` and not a cross-origin iframe.

Exit criteria:

- No blank canvas.
- No CSP WebAssembly error.
- No MIME/compression error.
- Scene loads and basic desktop controls work.

### Phase 2 - LMS Runtime Bridge

Goal: LMS records professional simulation progress.

Events:

- `ready`
- `started`
- `objective.completed`
- `risk.updated`
- `completed`
- `failed`
- `debrief.viewed`

Required payload fields:

- `eventId`
- `sequence`
- `lessonId`
- `sectionId`
- `simulationPackageId`
- `simulationVersion`
- `occurredAt`
- `data`

Exit criteria:

- Objective completion appears in `learning_events`.
- Section completion only happens after valid `completed` event.
- Retry/fail/debrief data is visible to LMS reporting later.

### Phase 3 - Offline Web Package

Goal: desktop learners can download the simulation package as part of the existing PWA offline flow.

Steps:

- Add `OfflineSimulationService` for manifest fetch/cache.
- Cache package assets in `offline-simulations:<userId>`.
- Persist package availability metadata on offline lesson sections.
- Request persistent storage through the existing offline storage flow.
- Queue simulation events when offline.
- Sync queued events when online.

Implemented baseline on 2026-05-12:

- Course download dialog can include or skip simulation packages and shows size/support warnings before download.
- Package download fetches the simulation manifest, validates same-origin assets, enforces a 500 MB guardrail, and stores assets in Cache API.
- Service worker serves `/simulations/**` from the network first and falls back to the offline simulation cache.
- Lesson player blocks unsupported mobile/tablet or non-WebGL2/non-WebAssembly devices before launch and shows fallback/walkthrough messaging.

Exit criteria:

- Download course includes simulation metadata.
- Offline launch works after first online download.
- Progress syncs after reconnection.
- Stale package detection blocks old simulation attempts when publication changes.

### Phase 4 - VR Lab Mode

Goal: training centers can use supported Meta/Oculus headsets while still reporting to LMS.

Steps:

- Build native Quest/Oculus package from the same scenario.
- Preserve objective IDs and scoring schema.
- Pair headset session with LMS account/course/lesson by QR code or lab token.
- Sync results through authenticated API when online.
- Provide instructor-facing lab checklist.

Exit criteria:

- Native headset build runs without WebGL assumptions.
- LMS receives the same objective/completion schema as web.
- Learner sees VR lab availability clearly in the course.

## Device Notice Rules

Show notices before launch, not after failure.

- Mobile/tablet: explain that the LMS content works, but the simulation is temporarily desktop/laptop only.
- Desktop without WebGL 2/WebAssembly/hardware acceleration: block launch and show requirements.
- Low storage: block offline download and show estimated package size.
- VR headset: direct learner to the native VR lab flow, not the WebGL browser package.

## Current Next Work Item

After the Unity team exports the official WebGL build, publish it through the R2 runbook and then create the first hand-authored `SIMULATION` section payload in a dev course:

```json
{
  "title": "COLREG Rule 15 - Crossing Situation",
  "type": "SIMULATION",
  "simulationPackageId": "colreg-rule-15-crossing-web-v1",
  "simulationVersion": "v2026.05.12.1",
  "entryUrl": "/simulations/colreg-rule-15-crossing/v2026.05.12.1/index.html",
  "manifestUrl": "/simulations/colreg-rule-15-crossing/v2026.05.12.1/holilihu-simulation.json",
  "estimatedSizeBytes": 180000000,
  "allowOffline": true,
  "supportedTargets": ["WEB_DESKTOP"],
  "completionPolicy": {
    "requireAllObjectives": true,
    "minimumScorePercent": 80,
    "failOnCollisionIncident": true,
    "requireDebriefViewed": true
  },
  "fallback": {
    "walkthroughUrl": null,
    "quizSectionId": null
  }
}
```
