# Interactive Video Pause-Point Questions — SOTA Research (2026-04-25)

> **Mục đích**: discovery research cho feature **video tự động dừng tại điểm cấu hình → hiện câu hỏi → người học phải trả lời mới tiếp tục xem** (pattern Edpuzzle / PlayPosit / Coursera in-video questions). Phục vụ quyết định approach implementation cho LMS Maritime.
>
> **Stack hiện tại**: Spring Boot 3.2 + Angular 20.3 + PostgreSQL 16 + **Cloudflare Stream** cho video + PWA offline (IndexedDB Dexie v6). Có `adaptive-video-player.component.ts` với `(timeupdate)/(pause)/(seeking)` hooks + `WatchedSegmentsTracker` service.
>
> **Phương pháp**: research subagent web survey 12 platform + license/architecture/maintenance evaluation H5P sâu + Quiz.com deep-dive (xác minh qua source code bundle) + SOTA architecture patterns (cuepoint storage, state machine, anti-skip, branching, xAPI, offline) + UX reference catalog.
>
> **TL;DR (updated 2026-04-25 sau correction Quiz.com)**:
> - H5P **NO-GO** (license GPL-3.0 + jQuery iframe stack mismatch + HLS-incompatible với Cloudflare Stream + maintenance stagnant)
> - Quiz.com **CÓ** media-pause-and-answer pattern, nhưng là **single-clip-per-question** (1 short clip + 1 question per slide, không phải multi-cuepoint timeline). Pattern này là (a). Edpuzzle/PlayPosit là (b) multi-cuepoint timeline.
> - **2 MVP path khả thi**: MVP A = single-clip pattern (1 sprint, value cao cho audio/video identification — phù hợp Maritime: Morse code, ship horns, VHF call signs), MVP B = multi-cuepoint timeline Edpuzzle-style (2-3 sprint, phù hợp video bài giảng dài)
> - **Khuyến nghị**: build pattern (a) MVP A trước, (b) MVP B sau. **Shared infrastructure** — schema design từ đầu để cuepoint = array (length 1 = pattern a, length N = pattern b)
>
> **CORRECTION (added 2026-04-25 sau user feedback)**: Research ban đầu kết luận Quiz.com KHÔNG có pause-point engine — sai. User correct lại từ direct experience. Re-research bằng cách inspect Quiz.com Next.js bundle (`_app-da1e697acc4a8dc9.js`) verify pattern (a). Xem **§11 — Correction note** ở cuối doc.

---

## 1. Industry survey

### 1.1 Comparison table (12 platform)

| Platform | License | Self-host | Architecture | Question types | Standards | CDN | Pricing |
|---|---|---|---|---|---|---|---|
| **H5P core** | MIT (PHP/JS runtime) + **GPL-3.0 (content types)** | Yes (Drupal/Moodle/Node) | Iframe + JSON content | MCQ, T/F, fill-blank, drag, hotspot, branching | xAPI ✓ / SCORM / LTI 1.3 | MP4/YouTube only — **không HLS/DASH** | Free / SaaS $80-$370/mo |
| **PlayPosit** | Commercial SaaS | No | iframe over BYO video URL (HLS ✓) | MCQ, multi, fill, free, **AI-gen** | xAPI ✓ Caliper LTI Outcomes | YouTube/Vimeo/Wistia/MP4/HLS | $12+/instructor/mo |
| **Edpuzzle** | Commercial SaaS | No | iframe + overlay | MCQ, open, audio note, **AI Assistant** | LTI 1.3, gradebook (no xAPI) | YouTube/Vimeo/upload (no BYO-CDN) | $13.50/teacher Pro |
| **Quiz.com** | Commercial SaaS | No | Quiz-first; "Video Quiz" = quiz + YouTube banner. **KHÔNG có pause-point engine** | MCQ, T/F, type, slide, poll | LTI export, no native LTI 1.3 | YouTube/Vimeo URL | Pro $8/mo |
| **Wistia Interactive** | Commercial SaaS | No | Annotations + email gates + chapters | Email + simple MCQ poll (không graded) | None | Wistia-only | $24-399/mo |
| **Mux Interactive** | Commercial API | No | Mux Player + cuepoint API; **bạn build UI** | Bạn build | Standards-agnostic | Mux only | Encoding $0.04/min + delivery $0.0012/min |
| **Vimeo Interactive** | Commercial SaaS | No | Player + chapter/CTA/forms; branching limited | Email + link CTA + simple Q | LTI partial 3rd-party | Vimeo only | $20-65/mo |
| **Cloudflare Stream + custom** | n/a (build it) | **Yes (đã có sẵn)** | CF Stream Player hoặc HLS player + overlay layer bạn viết | Bạn build | Bạn implement | **CF Stream native** | $5/1000 min stored + $1/1000 min delivered |
| **TED-Ed Lessons** | Free public web | No (consumer) | YouTube + 4 tabs Watch/Think/Dig/Discuss. **KHÔNG pause-point** — Q sau video | MCQ, open | None | YouTube | Free |
| **Coursera in-video Q** | Proprietary | No | Cuepoints trên timeline auto-pause | MCQ chủ yếu, poll | None public | Coursera CDN | Platform-only |
| **Khan Academy** | Proprietary | No | "Mastery Challenge" *giữa* các video, không mid-video | MCQ, numeric, free, expression | None public | Khan CDN | Free |
| **YouTube native** | YouTube ToS | No | Cards/End screens; "Quizzes" Beta Studio for Education = MCQ overlay đơn giản | 1 MCQ/video (Beta) | None | YouTube | Free |

### 1.2 3 archetype kiến trúc

1. **Player-with-cuepoints** (chủ đạo): HTML5 video + `timeupdate` listener + array `{time, questionId}` từ DB → render overlay khi `currentTime >= cuepoint.time`. **Coursera, Edpuzzle, PlayPosit, Mux, Khan Academy**. Linh hoạt nhất, dễ integrate CDN có sẵn.
2. **Self-contained content package**: Video + question + scoring + branching trong 1 JSON/ZIP, runtime render trong iframe. **H5P (.h5p file), SCORM/cmi5**. Content portable mạnh; UX cứng.
3. **SaaS iframe**: External tool launched qua LTI; LMS chỉ nhận score qua xAPI/LTI Outcomes. **PlayPosit, Edpuzzle, Quiz.com, Wistia**. 0 engineering nhưng lock-in + cost + offline impossible.

---

## 2. H5P deep-dive — verdict NO-GO

### 2.1 License (chỗ confuse nhất)

H5P là **federation đa license**, không phải 1 OSS project.

- **H5P PHP/JS Core** (`h5p-php-library`): MIT — embed OK
- **H5P content type libraries** (`H5P.InteractiveVideo`, `H5P.MultiChoice`, `H5P.Branching Scenario`): **GPL-3.0**. Đây là cái bạn thực sự cần
- **Lumi `@lumieducation/h5p-server`** (Node port duy nhất viable): **GPL-3.0**
- **H5P.com SaaS by Joubel**: proprietary, có closed enhancements không OSS

**Implication LMS Maritime**: Embed content types = compile GPL-3.0 vào running app. Có thể làm sản phẩm Vietnamese maritime education trở thành GPL-tainted — yellow flag cho commercial license tương lai.

### 2.2 Maintenance status (April 2026)

- `h5p-php-library` last release: **Jan 2025**, chỉ bug fix + translation. Không content type mới 12+ tháng.
- `H5P.InteractiveVideo` 1.27.x last late 2024. Codebase **jQuery + ES5**. JIRA backlog 700+ issues.
- Lumi Node port last npm publish ~Q3 2025, community nhỏ.
- H5P Group (Joubel) shift focus sang SaaS h5p.com → OSS contributions slowing.

### 2.3 Tech debt + DX

- jQuery 3.x + RequireJS-style modules. Bundle ~750 KB minified cho InteractiveVideo alone, **trước** content.
- Iframe-isolated runtime — sandboxing OK, mọi interaction qua postMessage. Theming bó hẹp.
- **Không có Angular component official**. Wrap iframe + listen `H5P.externalDispatcher` events. Work nhưng không idiomatic Angular signals/OnPush — bạn integrate jQuery widget 2010s.
- Mobile UX issues lâu năm với overlay sizing iOS Safari + controls bar clipping landscape.
- xAPI: emit qua `H5P.externalDispatcher` clean, well-formed — đây là điểm sáng duy nhất.

### 2.4 Security

- Multiple medium CVE 2020-2024 (XSS authoring, SSRF media imports, prototype pollution). Drupal H5P module stored-XSS 2023. Sandboxing iframe rely vào bạn thật sự iframe.
- Content uploads accept arbitrary `.h5p` ZIP → moderation surface mới.

### 2.5 Cloudflare Stream incompatibility

H5P InteractiveVideo expect **MP4 URL hoặc YouTube ID**. **KHÔNG play HLS/DASH manifest** — mà CF Stream chỉ emit HLS/DASH. Workaround = dùng per-quality MP4 download URL → mất adaptive bitrate. Đây là hard-blocker.

### 2.6 Lock-in

Mixed. `.h5p` format mở, có `h5p-cli` inspect → portable cho H5P-runtime-compatible LMS khác. Migrate khỏi H5P = **re-author tất cả content**.

### 2.7 Verdict NO-GO

6 lý do:

1. **License risk**: GPL-3.0 content types client-side → ambiguity legal cho commercial
2. **Stack mismatch**: jQuery+iframe trong Angular 20 signals → không reuse design tokens, auth, offline DB, i18n inside iframe
3. **Stagnant maintenance**: Joubel monetize SaaS, OSS slow
4. **Offline khó**: H5P resolve library deps runtime qua server → khó cache vào IndexedDB/Cache API
5. **CF Stream incompatible**: chỉ MP4/YouTube, không HLS
6. **Không nhanh hơn build**: Custom Angular ~600-900 LOC vs wrapping H5P + theming = comparable effort, worse DX

**User skepticism là đúng.**

---

## 3. Quiz.com deep-dive

### 3.1 Quiz.com làm gì với video

- **"Quiz with video question"**: 1 quiz Q có YouTube/Vimeo URL làm media. Video play, Q hiện bên cạnh. **KHÔNG auto-pause-and-ask mid-video**.
- **"Video Quiz" mode**: format teacher-paced live mode (host play video, learners answer trên device). Không phải embedded pause-points self-study.
- **"Quiz Map"**: Duolingo-style learning path (sequence of quizzes). Unrelated.

**Quiz.com KHÔNG phải interactive video platform.** Thiếu pattern "watch → auto-pause @ 1:23 → answer → continue".

### 3.2 Standards

- Closed SaaS, no self-host
- Embed iframe `/embed/<quiz-id>` + webhook
- **Không LTI 1.3 launch** (chỉ Tool Provider for live mode beta)
- Không xAPI public emitter
- Pro $8/mo, Business $25/mo

### 3.3 Verdict

**Không fit cho pause-point feature**. Dùng làm **UX reference only** cho:
- Question rendering animations
- Gamified streak
- Answer feedback micro-interactions

KHÔNG integrate as partner, KHÔNG iframe-embed.

---

## 4. SOTA architecture patterns (April 2026)

### 4.1 Cuepoint storage — 3 options

**(a) Sidecar JSON trong DB** — phổ biến nhất (Coursera, Edpuzzle, Khan, custom builds).

```sql
CREATE TABLE interactive_video_cuepoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  time_seconds NUMERIC(10,3) NOT NULL,        -- 0.001s precision
  question_id UUID NOT NULL REFERENCES questions(id),
  pause_mode TEXT NOT NULL CHECK (pause_mode IN ('hard','soft','optional')),
  retry_policy TEXT NOT NULL CHECK (retry_policy IN ('one_shot','infinite','n_attempts')),
  max_attempts INT,
  skip_after_correct BOOLEAN NOT NULL DEFAULT TRUE,
  branch_correct_seek_to NUMERIC(10,3),
  branch_wrong_seek_to NUMERIC(10,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id, time_seconds)
);
CREATE INDEX idx_cuepoints_lesson_time ON interactive_video_cuepoints(lesson_id, time_seconds);
```

**(b) WebVTT chapter markers** — stream-friendly, content portable. CF Stream support custom VTT.

```
WEBVTT
NOTE Cuepoint at 1:23 — Q-1f3a
00:01:23.000 --> 00:01:23.001
{"questionId":"1f3a","pauseMode":"hard"}
```

**(c) HLS ID3 in-stream tags** — Mux Interactive pattern. Overkill cho VOD.

**Khuyến nghị LMS Maritime**: **(a) DB sidecar**. Queryable, dễ edit, decouple khỏi video file (re-encode safe).

### 4.2 Player integration pattern

```ts
private cuepoints = signal<Cuepoint[]>([]);
private answered = signal<Set<string>>(new Set());
private activeCuepoint = signal<Cuepoint | null>(null);

onTimeUpdate(t: number) {
  if (this.activeCuepoint()) return;
  const next = this.cuepoints().find(cp =>
    !this.answered().has(cp.id) &&
    Math.abs(t - cp.timeSeconds) < 0.5      // 500ms window cho safari rounding
  );
  if (next) {
    this.videoEl.pause();
    this.activeCuepoint.set(next);
  }
}

onAnswered(cp: Cuepoint, correct: boolean) {
  this.answered.update(s => new Set(s).add(cp.id));
  this.activeCuepoint.set(null);
  if (cp.branchWrongSeekTo != null && !correct) {
    this.videoEl.currentTime = cp.branchWrongSeekTo;
  } else if (cp.branchCorrectSeekTo != null && correct) {
    this.videoEl.currentTime = cp.branchCorrectSeekTo;
  }
  this.videoEl.play();
}
```

**Anti-skip** (Coursera): track `lastValidPosition` + on `seeking` snap back nếu jump qua cuepoint chưa answered.

### 4.3 State machine

```
IDLE → PLAYING → APPROACHING_CUEPOINT → PAUSED_AT_CUEPOINT → ANSWERING
   → ANSWERED_CORRECT → PLAYING (or branch_correct_seek)
   → ANSWERED_WRONG → ANSWERING (retry) | LOCKED (one-shot) | PLAYING (soft)
```

Pause modes:
- `hard`: cannot resume without correct answer (graded)
- `soft`: skip OK nhưng count wrong
- `optional`: banner only, no pause ("did you know" insertions)

### 4.4 Anti-skip + seek policy

- **Forced sequential**: re-snap `seeking` event. Standard cho graded modules.
- **Allow rewatch**: track answered-once bằng cuepoint ID, không re-trigger trên rewind.
- **Multi-attempt**: `attempt_count` per `(student, cuepoint)`. PlayPosit default 2 attempts.

### 4.5 Branching video

- **In-video branching** (single video, jump-to-time): trivial — `videoEl.currentTime = seek`
- **Multi-video branching** (decision tree separate files): edge complexity, preloading, transition. **OUT OF SCOPE MVP**.

### 4.6 Analytics — xAPI standard

```json
{
  "actor": { "mbox": "mailto:student@maritime.edu" },
  "verb": {
    "id": "http://adlnet.gov/expapi/verbs/answered",
    "display": { "vi-VN": "đã trả lời", "en-US": "answered" }
  },
  "object": {
    "id": "https://holilihu.online/lessons/abc/cuepoints/123",
    "definition": {
      "type": "http://adlnet.gov/expapi/activities/cmi.interaction",
      "interactionType": "choice",
      "name": { "vi-VN": "Tín hiệu cờ chữ A có nghĩa là gì?" },
      "correctResponsesPattern": ["A"]
    }
  },
  "result": {
    "success": true, "completion": true,
    "response": "A", "duration": "PT4.2S"
  },
  "context": {
    "extensions": {
      "https://holilihu.online/xapi/extensions/video-time": 83.5,
      "https://holilihu.online/xapi/extensions/attempt": 1
    }
  }
}
```

Không cần LRS để start — emit vào `learning_events` table, shape xAPI cho future export.

### 4.7 Offline mode (LMS Maritime PWA — strong fit)

LMS Maritime đã cache video Cache API + quiz IndexedDB. Pause-question offline pattern:

1. **Download**: include cuepoints JSON cùng `course-download.service.ts` payload; store `offlineDb.lessonCuepoints` table key `[userId+lessonId]`
2. **Play**: cùng `onTimeUpdate` pattern, fully offline. Overlay đọc questions từ IndexedDB
3. **Submit**: queue answer vào `syncQueue` `{entityType: 'cuepointAnswer', payload: {cuepointId, response, attempt, videoTime}}`
4. **Sync**: on reconnect, replay qua `SyncUseCase` (mirror quiz attempt sync đã có)

**Edpuzzle + PlayPosit không offline.** LMS Maritime sẽ ahead competitors cho maritime-at-sea use case.

---

## 5. Recommendation cho LMS Maritime

### 5.1 Trade-off matrix

| Approach | Build cost | Feature parity | Lock-in | Maintenance | Offline | $ ongoing | Verdict |
|---|---|---|---|---|---|---|---|
| **Build in-house CF Stream + Angular** | 2-3 sprint MVP | High (build cái mình cần) | None | Yours forever | ✓ fit PWA sẵn | $0 | **RECOMMENDED** |
| Embed H5P (Lumi Node) | 2 sprint + battles | Medium-high | Medium | Joubel-paced jQuery | Hard | $0 OSS / $80+/mo | NO-GO §2.7 |
| Iframe Edpuzzle LTI 1.3 | 1 sprint | High (theirs) | High | Their pace | None | $13.50/teacher/mo | Fallback nếu 0 eng capacity |
| Iframe PlayPosit LTI 1.3 | 1 sprint | High (HLS ✓ + AI gen) | High | Their pace | None | $12+/instructor/mo | Same Edpuzzle, accept HLS |
| Mux Interactive | 2 sprint (vẫn build UI) | High | Migrate khỏi CF Stream = big move | Yours mostly | ✓ buildable | Mux pricing | NO — bỏ CF Stream đang work |

### 5.2 Khuyến nghị cụ thể: build in-house

**Architecture**:

- **Player**: giữ `adaptive-video-player.component.ts`. `(timeupdate)/(pause)/(seeking)` đã đủ. Add sibling `<app-cuepoint-overlay>` listen player events.
- **Storage**: 3 table mới
  - `interactive_video_cuepoints` (xem §4.1)
  - `cuepoint_questions` (subset of `questions`, hoặc reuse `questions` với `usage_context` column)
  - `cuepoint_attempts (student_id, cuepoint_id, response, is_correct, attempted_at, video_time_seconds)`
- **Authoring**: extend `curriculum-section-modal` với timeline scrubber. Click timeline → "Add question @ HH:MM:SS" → **reuse existing Question Bank**. Đây là leverage UX choice quan trọng nhất — **đừng build parallel question authoring flow**.
- **Player overlay**: modal-over-video desktop, full-screen sheet mobile. Focus trap, Esc close chỉ khi `pauseMode='soft'`, captions remain visible khi paused (a11y).
- **Analytics**: xAPI-shaped events vào `cuepoint_attempts`. Không cần LRS yet, shape JSON ngay.
- **Offline**: extend `course-download.service.ts` fetch `/api/v3/lessons/{id}/cuepoints` cùng download bundle. Dexie schema bump v7 với `lessonCuepoints` table. Sync qua `SyncUseCase` pattern với `cuepointAnswer` entityType branch mới.

### 5.3 MVP scope

| In | Out (v2) |
|---|---|
| 1 MCQ per cuepoint | Multi-Q per cuepoint |
| MCQ + T/F + Fill-blank | Hotspot, drag-drop |
| Hard pause + retry-infinite | Soft pause, multi-attempt limits |
| Sequential (anti-skip on `seeking`) | Branching seek |
| FE-emit analytics + answer log | Full xAPI LRS export |
| Offline cache + sync (free, infra có) | Offline branching |
| Authoring timeline + reuse Q Bank | AI question generation |

**Effort estimate**:
- ~600 LOC FE (overlay + state machine + authoring UI hooks)
- ~400 LOC BE (entity, mapper, controller, use case CRUD + attempt)
- ~120 LOC migration
- **2 sprint MVP, 1 sprint polish**

### 5.4 Defer (out of scope)

- Branching scenarios (instructor maritime ít author tree → defer)
- AI question generation từ video transcript (Edpuzzle 2024 launch; cần CF Stream transcript availability — separate sprint)
- Live teacher-paced mode (Quiz.com / Kahoot territory — feature khác, đừng conflate)

---

## 6. Reference UX patterns

### 6.1 Catalog với "what to copy"

| Platform | Overlay style | Mobile reflow | Anti-skip | A11y | Steal |
|---|---|---|---|---|---|
| **Edpuzzle** | Modal **overlay translucent trên video**, video stay visible behind, "Answer to continue" CTA only | Full-screen bottom sheet | Hard pause; Skip optional | Focus trap good; captions still render | **Translucent overlay** giữ visual context của frame |
| **PlayPosit "Bulb"** | Lightbulb icon glow ~2s trước pause; full-card overlay; green/red feedback card sau answer | Bottom sheet full width | Configurable per Bulb | Decent | **Pre-pause glow warning** — giảm startle |
| **Coursera** | Center-modal branded shadow; minimal Q + 4 choices + Submit | Full-screen modal | Hard pause; can't drag past | Focus trap clean; **captions hide khi pause** (downgrade) | Crisp typography, single-CTA discipline |
| **TED-Ed** | Tabs **bên cạnh** video (Watch/Think/Dig/Discuss). Q sau video, không mid-video | Tabs collapse top | n/a | Excellent SR | Side-panel cho "review mode" |
| **Khan Academy** | "Mastery Challenge" trang riêng giữa video. Không mid-video | Full-page | Sequential gating | Best-in-class | **Mastery framing** — recover wrong answer via review video clip |
| **H5P Interactive Video** | Pause icon + Q card slide-up bottom | OK tablet, awkward phone | Configurable | iframe = SR problems | **Skip — UX dated** |
| **Quiz.com** (reference only) | Card-based Q, large answer chips, animated correct/wrong | Native mobile-first | n/a | Reasonable | **Answer-chip animation + feedback micro-interactions** |

### 6.2 Khuyến nghị UX cho LMS Maritime

Theo design tokens (`#0056D2` primary, `bg-white rounded-xl border border-gray-200 shadow-sm`):

- **Overlay style**: Edpuzzle-style **translucent overlay over paused video** (backdrop `bg-slate-900/70`, card `bg-white rounded-2xl shadow-2xl max-w-md`). Giữ video frame visible — quan trọng cho context-dependent Q ("cờ tín hiệu này nghĩa gì?").
- **Pre-pause glow warning** (PlayPosit): 2s trước cuepoint, fade in `#0056D2` pulse player bottom-right. Reduces startle, đặc biệt long video.
- **Mobile reflow**: bottom sheet 60% viewport height, video shrink top 40%. **KHÔNG fullscreen-modal mobile** — learners lose video.
- **Captions stay rendered** during pause (a11y). Coursera làm sai, đừng copy.
- **Focus trap + Escape**: ARIA `role="dialog" aria-modal="true"`. Esc close chỉ trên `soft` pause-mode. Tab cycle answer choices → Submit.
- **Vietnamese microcopy**: "Trả lời để tiếp tục", "Nộp câu trả lời", "Đúng rồi! Tiếp tục", "Chưa đúng — thử lại nhé". Không jargon.
- **Feedback animations**: Quiz.com-style answer-chip color fill (green `#16a34a`, red **chỉ ở đây** as semantic-correct per design tokens) với 200ms ease-out. Đừng celebrate excessively — Maritime learners là adult.

### 6.3 Component spec sơ bộ

```
[ Component: app-cuepoint-overlay ]
- Backdrop: bg-slate-900/70 backdrop-blur-sm
- Card: bg-white rounded-2xl shadow-2xl border border-gray-200
        max-w-md w-[90vw] max-h-[80vh] overflow-y-auto
        mobile: bottom-sheet (rounded-t-2xl, w-full, max-h-[60vh])
- Header: question-type badge + timestamp
- Body: question stem (rich text, math via Tiptap), answer choices (answer-chip pattern)
- Footer: single "Nộp câu trả lời" CTA (bg-[#0056D2])
- Feedback state: replace footer với "Đúng rồi" / "Chưa đúng" + tiếp tục button sau 1.5s
- Focus trap, Escape disabled trên hard-pause, ARIA dialog
```

---

## 7. File touched dự kiến (cho implementation)

### Frontend
- `fe/src/app/features/learning/components/adaptive-video-player/adaptive-video-player.component.ts` — add cuepoint events
- `fe/src/app/features/learning/services/watched-segments-tracker.service.ts` — sibling pattern cho cuepoint tracker
- `fe/src/app/features/learning/components/cuepoint-overlay/` (NEW) — overlay component
- `fe/src/app/features/teacher/course-editor/.../cuepoint-editor/` (NEW) — authoring timeline
- `fe/src/app/core/services/course-download.service.ts` — add cuepoint payload bundle
- `fe/src/app/core/db/lms-offline.db.ts` — Dexie schema v7 với `lessonCuepoints` + sync queue extension

### Backend
- `backend/src/main/java/com/example/lms/learning_delivery/interactive_video/` (NEW subpackage, DDD layout)
  - `domain/model/Cuepoint.java`
  - `domain/repository/CuepointRepository.java`
  - `application/usecase/{CreateCuepointUseCase, AnswerCuepointUseCase, ListLessonCuepointsUseCase}.java`
  - `infrastructure/persistence/entity/CuepointJpaEntity.java` + `mapper/CuepointEntityMapper.java` + `CuepointRepositoryAdapter.java`
  - `infrastructure/web/CuepointControllerV3.java`
- `backend/src/main/java/com/example/lms/shared/application/usecase/SyncUseCase.java` — add `cuepointAnswer` entityType branch
- `backend/src/main/resources/db/migration/V75__interactive_video_cuepoints.sql` (NEW)

---

## 8. TL;DR cho decision meeting

1. **H5P: NO-GO**. License GPL-3.0 + jQuery iframe stack mismatch + HLS-incompatible CF Stream + maintenance stagnant + offline khó.
2. **Quiz.com KHÔNG phải interactive video platform**. "Video question" = quiz có video bên cạnh, không pause-points. Dùng **UX reference only** cho answer-chip animations.
3. **Build in-house** trên CF Stream + Angular adaptive-video-player hiện có. Storage DB-sidecar cuepoint table. Authoring extend curriculum editor + reuse Question Bank. Player existing `(timeupdate)/(seeking)` + new `app-cuepoint-overlay`. Offline ride existing PWA pipeline.
4. **MVP**: MCQ + T/F + Fill-blank, hard-pause, sequential gating, infinite retry, xAPI-shaped logging, offline support. **~2 sprint**.
5. **Defer**: branching trees, AI Q gen, live teacher-paced mode, full LRS.
6. **UX reference**: Edpuzzle (translucent overlay) + PlayPosit (pre-pause glow) + Quiz.com (answer-chip feedback). KHÔNG H5P, KHÔNG TED-Ed.

---

## 9. Implementation roadmap (gợi ý)

```
Sprint 1 (MVP foundation):
  BE: V75 migration + Cuepoint entity/mapper/adapter/repo
      + ListLessonCuepointsUseCase + AnswerCuepointUseCase
      + CuepointControllerV3 (CRUD endpoints)
  FE: Cuepoint type + service + adaptive-video-player extend
      + cuepoint-overlay component (MCQ + T/F + Fill-blank)
      + state machine + anti-skip
  Test: e2e với 1 lesson có 3 cuepoint

Sprint 2 (authoring + offline):
  FE: cuepoint-editor component (timeline scrubber + add Q from Q Bank)
      + integrate vào curriculum-section-modal
      + Dexie v7 + lessonCuepoints table
      + course-download.service include cuepoints
      + sync queue cuepointAnswer branch
  BE: SyncUseCase processCuepointAnswer
      + analytics emit xAPI shape vào learning_events

Sprint 3 (polish + UX):
  FE: pre-pause glow warning
      + feedback animations (answer-chip)
      + mobile bottom-sheet polish
      + Vietnamese microcopy review
      + a11y audit (focus trap, ARIA, captions)
  Doc: ADR mới + entry FRONTEND_GOTCHAS.md cuepoint pattern
```

---

## 10. References (citations)

### Platform docs
- H5P licensing: https://h5p.org/MIT-licensed + https://github.com/h5p/h5p-php-library/blob/master/LICENSE.txt
- Lumi H5P Node: https://github.com/Lumieducation/H5P-Nodejs-library (GPL-3.0)
- PlayPosit LTI 1.3: https://help.playposit.com/hc/en-us/articles/360051569011
- Edpuzzle features: https://edpuzzle.com/about + 2024 product release notes
- Mux cuepoint API: https://docs.mux.com/guides/video/use-cue-points
- Cloudflare Stream + WebVTT: https://developers.cloudflare.com/stream/edit-videos/captions/
- xAPI spec: https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md
- Coursera in-video Q paper: Koller et al., "Retention and Intention in Massive Open Online Courses", Comm. ACM 2013
- TED-Ed format: https://ed.ted.com/about
- Quiz.com video Q: https://help.quiz.com/ ("Add a video to a question" — không auto-pause feature documented)

### Internal
- `docs/research/2026-03-04-sota-file-upload-patterns.md` (precedent research format)
- `backend/docs/adr/ADR-005-pwa-offline-strategy.md` (offline pattern hiện tại)
- `MEMORY.md` — quiz offline flow + Cloudflare Stream integration

---

## 11. Correction note — Quiz.com (2026-04-25 16:00)

User feedback: research ban đầu kết luận **Quiz.com KHÔNG có pause-point engine — sai**. User mô tả từ direct experience pattern: "Đây là bài nhạc gì → nhạc phát 4 giây → dừng → user trả lời → tiếp tục".

Re-research bằng cách inspect Quiz.com Next.js bundle (`_app-da1e697acc4a8dc9.js`, 592KB, fetched 2026-04-25):

### 11.1 Bằng chứng từ source code

- **8 slide types**: `Buttons, Checkboxes, Reorder, Range, Location, Pinpoint, Type answer, Info slide` (không có "Audio Quiz" / "Video Quiz" riêng)
- **State machine**:
  ```
  load slide → show question → show media → wait for media
    → youtube end 1 → youtube end 2 → show answers → wait for answer
    → show correct answer → ...
  ```
- `mediaSource` field per slide — format `youtube/{videoId}`, `giphy/`, `street/` (Google Street View)
- **KHÔNG có** `mediaStart` / `mediaEnd` / `trimStart` / `trimEnd` / `setTimeout(pause,N)` — Quiz.com KHÔNG tự cắt video. Creator phải dùng pre-trimmed YouTube clip hoặc YouTube `?start=&end=` URL params.
- Music quiz examples public: [quiz.com/tag/music/](https://quiz.com/tag/music/), live samples confirm pattern.

### 11.2 Đặc điểm pattern Quiz.com vs Edpuzzle

| | Quiz.com | Edpuzzle/PlayPosit |
|---|---|---|
| **Pattern** | (a) **Single-clip-per-question** | (b) **Multi-cuepoint timeline** |
| Media unit | 1 short clip + 1 Q per slide | 1 long video + N Q tại N timestamps |
| Cuepoint engine | Không có — single play→ENDED→next | Bắt buộc — state machine quản nhiều cuepoints |
| User-config trim | Không (rely YouTube short clip) | Có (multi stop-points + start/end) |
| Use case | Music quiz, movie quiz, kahoot-style | Khóa học video, classroom homework |

### 11.3 Updated verdict + implication

Quiz.com là **(a) single-clip-per-question** — đơn giản hơn Edpuzzle nhiều. Không cần cuepoint engine, chỉ cần:
- HTML5 `<audio>`/`<video>` hoặc YouTube IFrame embed với `playerVars: {start, end}`
- State machine: `showQuestion → playMedia → onEnded() → showAnswers → waitForAnswer → showResult`
- Optional `setTimeout` fallback nếu media không emit `ended`

### 11.4 Maritime use cases cho pattern (a) — value cao

- "Identify this VHF call sign" (audio clip)
- "Recognize this ship horn pattern" (audio)
- "Name this navigational signal sound" (audio)
- "Identify this Morse code message" (audio)
- "What does this radar signature show?" (video clip)

→ **MVP A** ship được trong **1 sprint**, value cao cho domain maritime.

### 11.5 Khuyến nghị final (REVISED)

**Build pattern (a) MVP A trước, (b) MVP B sau. Shared infrastructure.**

Schema design ngay từ đầu để cuepoint = `[{timestamp, questionId, action}]` array:
- Pattern (a) = array length 1, timestamp = end-of-clip
- Pattern (b) = array length N

→ Cùng entity `MediaQuestionGroup`, cùng player engine, khác chỉ ở UI editor + question bundling.

### 11.6 Revised roadmap

- **Sprint 1 (MVP A — single-clip)**: V75 migration với cuepoint array support; `MediaClipQuestion` entity + simple player (single clip + auto-advance on `ended`); maritime use case ship được ngay.
- **Sprint 2-3 (MVP B — multi-cuepoint timeline)**: Generalize cuepoint array (length N), add timeline editor UI, anti-skip seek, branching seek; Edpuzzle-style use case (video bài giảng dài).
- **Sprint 4 (polish)**: pre-pause glow warning, feedback animations, mobile bottom-sheet, a11y.

### 11.7 Sources mới (correction)

- [Quiz.com homepage](https://quiz.com/) — slide types
- [Quiz.com video quizzes](https://quiz.com/tag/video/) — confirms video category
- [Quiz.com music quizzes](https://quiz.com/tag/music/) — confirms music category
- [Sample music video quiz](https://quiz.com/1e87e5b2-92ad-4c80-869d-d16a183dd471/) — live example
- [Sample soundtrack quiz](https://quiz.com/5fe905dd-9098-4422-bf9d-c59be4aca0c5/) — live example
- Quiz.com Next.js bundle `_app-da1e697acc4a8dc9.js` (592KB, fetched 2026-04-25) — authoritative source. Key strings: `SLIDE_TYPE_NAMES`, `"show media"`, `"wait for media"`, `"youtube end 1"`, `"youtube end 2"`, `mediaSource`, `Pinpoint`.

---

**Research completed**: 2026-04-25 14:00 ICT (initial), 16:00 ICT (Quiz.com correction).
**Methodology**: research subagent web survey + license analysis + UX pattern catalog + stack-fit evaluation + **source code bundle inspection** (Quiz.com correction).
**Recommended next step (REVISED)**:
1. Review meeting với @Nguyễn Hùng + team xác nhận build in-house — confirm 2-MVP roadmap (a → b)
2. Update feature issue #170 với MVP A/B sequencing mới
3. Sprint 1 BE PR đầu tiên: V75 migration với cuepoint array support (length 1 cho MVP A) + `MediaClipQuestion` entity skeleton
