# Frontend Gotchas

> Tài liệu catalog các **pitfall đã từng gặp** trên frontend stack (Angular 20.3 + TypeScript + PWA + SSR). Mỗi entry có: triệu chứng, nguyên nhân gốc, cách sửa, file tham chiếu.
>
> **Mục đích**: giảm thời gian re-diagnose khi dev/agent mới gặp lại cùng vấn đề. Thay vì mất 1-2 giờ grep/bisect, vào đây, tìm triệu chứng, áp dụng fix.
>
> **Khi nào thêm entry mới**: sau mỗi PR fix một issue non-obvious — nếu lý do gốc khác kỳ vọng, nên doc hóa ở đây (kèm link PR/commit).
>
> **Khi nào xóa entry**: nếu Angular/tooling upgrade làm gotcha không còn relevant (phải verify bằng grep, không chỉ đoán).

## Mục lục

1. [Build & Dev Server](#1-build--dev-server)
2. [Dependency Management](#2-dependency-management)
3. [PWA / Service Worker](#3-pwa--service-worker)
4. [SSR Runtime](#4-ssr-runtime)
5. [Online/Offline Detection](#5-onlineoffline-detection)
6. [IndexedDB / Offline Data](#6-indexeddb--offline-data)
7. [Angular Convention Traps](#7-angular-convention-traps)

---

## 1. Build & Dev Server

### 1.1 Dev server TTFB ~7 giây vì `outputMode` leak vào dev config

**Triệu chứng**: Mọi request HTML (`/`, `/login`, bất kỳ route SPA nào) qua `http://localhost:4200` có TTFB 7-8 giây, trong khi static asset (`.js`, `.css`, `.ico`) trả về trong <10 ms.

**Nguyên nhân**: Angular 20 `@angular/build:dev-server` wire Express SSR middleware (`src/server.ts`) vào dev server khi `outputMode` có mặt ở **bất kỳ level nào** (root `options`, `development` config, hoặc cả hai). Khi SSR chạy trên Windows dev (ngoài Docker network), `baseUrlInterceptor` gọi `http://backend:8080` → DNS fail → Angular `ApplicationRef.isStable()` chờ HTTP timeout ~5-7s.

**Fix**: `outputMode` chỉ đặt ở `production` configuration. Root `options` và `development` configuration **không** được có field này. Xem `ADR-006-angular-dev-server-ssr-separation.md` để chi tiết.

**Chứng thực**:
```bash
curl -s -o /dev/null -w "%{time_starttransfer}s\n" http://localhost:4200/
# Phải < 0.1s. Nếu ~7s → outputMode đang leak.
```

**Tham chiếu**: PR #148, ADR-006, `fe/angular.json`.

### 1.2 `ng build --configuration=production` budget warning 1.25MB → `maximumError 2MB`

**Triệu chứng**: Build prod fail với `Budget exceeded: initial bundle ... maximum allowed 2mb`.

**Nguyên nhân**: Bundle chính (main + polyfills + critical CSS inline) vượt 2MB do thêm feature nặng (vd: thêm chart library, tiptap extension).

**Fix**: 
- Chạy `npx source-map-explorer dist/lms-angular/browser/main-*.js` để tìm module nặng
- Lazy-load route chưa lazy (xem `app.routes.ts`)
- Dynamic import 3rd-party: `const mod = await import('heavy-lib')`
- Chỉ khi thật sự cần, tăng budget trong `angular.json` kèm PR explain

### 1.3 Sass `@import` deprecation warning spam

**Triệu chứng**: Console dev server hiển thị hàng chục dòng `Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0`.

**Nguyên nhân**: File `.scss` trong `course-editor` dùng `@import '../course-info/editor-shared'` thay vì `@use`.

**Fix**: Migration sang `@use` / `@forward`. Sass team cung cấp automated migrator: https://sass-lang.com/d/import. Theo dõi trong backlog — chưa priority vì chưa break.

**Tham chiếu**: `fe/src/app/features/teacher/course-editor/pages/course-settings/course-settings.component.scss:1`.

---

## 2. Dependency Management

### 2.1 `npm install @angular/X@Y` fail với peer-dep conflict → cần `--legacy-peer-deps`

**Triệu chứng**: Khi coordinate bump 10 `@angular/*` packages (vd 20.3.17 → 20.3.19 cho XSS fix GHSA-g93w-mfhg-p222), `npm install` fail:

```
npm error ERESOLVE could not resolve
npm error While resolving: @angular/material@20.2.14
npm error Found: @angular/core@20.3.19
npm error peerDep requires: @angular/core@20.3.17
```

**Nguyên nhân**: Diamond peer-dependency. `@angular/material@20.2.14` và `@angular/platform-server@20.3.17` pin peer `@angular/core@20.3.17` exact. Khi bump `@angular/core` tới 20.3.19, peer ngắt.

**Fix**: Install tất cả `@angular/*` cùng lúc với flag:

```bash
npm install \
  @angular/core@~20.3.19 \
  @angular/common@~20.3.19 \
  @angular/compiler@~20.3.19 \
  @angular/platform-browser@~20.3.19 \
  @angular/platform-server@~20.3.19 \
  @angular/router@~20.3.19 \
  @angular/forms@~20.3.19 \
  @angular/animations@~20.3.19 \
  @angular/service-worker@~20.3.19 \
  @angular/cdk@~20.3.19 \
  --legacy-peer-deps
```

Sau khi merge, Angular material sẽ release bản mới align peer; có thể gỡ `--legacy-peer-deps` ở lần patch tiếp theo. **Không** dùng `--force` (đè lỗi thực).

**Tham chiếu**: PR #138.

### 2.2 Dependabot minor-and-patch group có thể downgrade subpackage

**Triệu chứng**: Dependabot mở PR "bump 41 deps" nhưng trong đó có `@types/jasmine: "^6.0.0" → "~5.1.0"` (downgrade).

**Nguyên nhân**: Dependabot tạo PR trước một PR khác đã merge bump manual, state không sync giữa 2 branch. Group update đọc lock file outdated.

**Fix**: Close PR Dependabot (`gh pr close <num>`). Dependabot sẽ recreate bản đúng ở chu kỳ sau. **Không** merge PR có dấu hiệu downgrade — đọc kỹ diff `package.json` trước khi approve.

**Tham chiếu**: PR #132 (closed without merge).

### 2.3 `springdoc-openapi` 3.x kéo Spring Boot 4 transitive → Docker Smoke fail

**Triệu chứng** (thuộc backend nhưng affect FE build chain): Docker Smoke fail với `EndpointCondition must be used on @Bean methods`. Backend boot log chứa `ClassNotFoundException` cho class của Spring Boot 4.

**Nguyên nhân**: `springdoc-openapi-starter-webmvc-ui:3.0.3` khai báo peer Spring Boot 4 trong `spring-boot-{servlet,webmvc,jackson,validation}:4.0.5` transitives. Maven nhận transitive này và mix classpath Boot 3.2 + Boot 4, gây xung đột.

**Fix**: Pin `springdoc.version` về `2.5.0` trong `backend/pom.xml`:

```xml
<!-- DO NOT bump springdoc to 3.x until Spring Boot 4 upgrade.
     3.x pulls Spring Boot 4 transitives that clash with 3.2.6. -->
<springdoc.version>2.5.0</springdoc.version>
```

Kiểm tra: `mvn dependency:tree | grep 'spring-boot-.*:4\.'` phải return rỗng.

**Tham chiếu**: PR #142.

---

## 3. PWA / Service Worker

### 3.1 NGSW install fail 404 trên phantom CSS chunk

**Triệu chứng**: Service worker register trên prod nhưng install activity fail. Console: `Failed to prefetch /some-chunk.css` 404.

**Nguyên nhân**: Angular 20 esbuild merge các CSS chunk nhỏ vào main bundle nhưng vẫn list tên chunk gốc trong `ngsw.json`. Missing file → 404 → NGSW install fail hoàn toàn (atomic operation).

**Fix**: Đã tự động xử lý bởi `fe/scripts/fix-ngsw.js` post-build (chạy qua `npm run build`). Script grep các CSS entry trong `ngsw.json`, verify file tồn tại trong `dist/`, xóa entry orphan.

**Chứng thực**:
```bash
cd fe && npm run build
cat dist/lms-angular/browser/ngsw.json | jq '.assetGroups[].files' | grep -c '.css$'
# Số CSS phải khớp với file thực trong dist/.
```

**Tham chiếu**: `fe/scripts/fix-ngsw.js`, CLAUDE.md §"Common Errors" #7.

### 3.2 NGSW dataGroups `strategy: freshness` + `timeout` short → stale data nếu BE chậm

**Triệu chứng**: User load course list; nếu backend response chậm > 5s (timeout config), NGSW serve data từ cache không báo. User không biết data stale.

**Nguyên nhân**: `ngsw-config.json` config:
```json
{
  "cacheConfig": {
    "strategy": "freshness",
    "timeout": "5s"
  }
}
```

Freshness fetch network trước; nếu quá timeout (5s), fallback sang cache. Hợp lý cho offline UX nhưng ẩn latency spike khỏi user.

**Fix**: Chưa fix — accept tradeoff. Nếu cần detect stale, bổ sung header `X-Served-From-Cache` từ SW custom (xem `sw-wrapper.js`) và hiển thị banner "Data có thể chưa mới nhất" khi trigger.

**Tham chiếu**: `fe/ngsw-config.json`.

### 3.3 `navigationUrls` **phải** exclude `/api/**` và `/actuator/**`

**Triệu chứng**: `GET /api/v3/courses` trả về HTML index thay vì JSON khi offline.

**Nguyên nhân**: NGSW default capture mọi navigation và fallback index.html. Nếu không exclude API paths, SW capture nhầm.

**Fix**: Trong `ngsw-config.json`:
```json
"navigationUrls": [
  "/**",
  "!/__**",
  "!/api/**",
  "!/actuator/**"
]
```

**Tham chiếu**: `fe/ngsw-config.json:84-89`.

### 3.4 `sw-wrapper.js` là active SW — KHÔNG phải `sw.js` hay `ngsw-worker.js`

**Triệu chứng**: Dev sửa `sw.js` (tưởng là entry) nhưng không có effect prod.

**Nguyên nhân**: `app.config.ts:179` register `sw-wrapper.js`:

```ts
provideServiceWorker('sw-wrapper.js', {
  enabled: true,
  registrationStrategy: 'registerImmediately'
})
```

`sw-wrapper.js` handle custom route (`/offline-video/*`, `/offline-file/*`, HTTP 206 range) + import NGSW cuối file qua `importScripts('ngsw-worker.js')`. File `sw.js` là artifact legacy đã deprecate.

**Fix**: Mọi thay đổi SW behavior phải edit `fe/public/sw-wrapper.js`.

**Tham chiếu**: `fe/public/sw-wrapper.js`, CLAUDE.md §"PWA Offline System".

---

## 4. SSR Runtime

### 4.1 `outputMode: "server"` bắt buộc ở production (nếu không, missing manifest)

**Triệu chứng** (prod only): Backend Node.js SSR crash:
```
Error: Angular app engine manifest is not set. Please ensure manifest is provided and is not `null`.
```

**Nguyên nhân**: `angular.json` production config thiếu `outputMode: "server"`. Build không inject manifest vào `server.mjs`.

**Fix**: `production` configuration phải có:
```json
{
  "outputMode": "server"
}
```

Xem ADR-006.

**Tham chiếu**: CLAUDE.md §"Common Errors" #10.

### 4.2 `NG_ALLOWED_HOSTS` env var bắt buộc cho SSR prod (SSRF protection)

**Triệu chứng** (prod only): Request tới `holilihu.online` trả lỗi `URL with hostname 'holilihu.online' is not allowed`.

**Nguyên nhân**: Angular 20 SSRF protection blocks mọi hostname khi `outputMode: "server"`, mặc định `allowedHosts: []`.

**Fix**: Set env var trong `docker-entrypoint.sh` + `docker-compose.prod.yml`:

```bash
NG_ALLOWED_HOSTS=holilihu.online,localhost
```

Nếu thêm subdomain mới (vd `wiii.holilihu.online`), phải extend env var.

**Tham chiếu**: `fe/docker-entrypoint.sh`, CLAUDE.md §"Common Errors" #11.

### 4.3 `baseUrlInterceptor` hard-code `http://backend:8080` cho SSR — chỉ work trong Docker network

**Triệu chứng**: Chạy `node dist/lms-angular/server/server.mjs` local (ngoài Docker) → SSR hang 7s mỗi request.

**Nguyên nhân**: 
```ts
// fe/src/app/api/interceptors/base-url.interceptor.ts
const base = isPlatformServer(platformId) ? 'http://backend:8080' : environment.apiUrl;
```

Hostname `backend` chỉ resolve qua Docker compose network. Ngoài Docker → DNS fail → HTTP timeout.

**Fix cho debug local**: 
- Option A: Add hosts entry `127.0.0.1 backend` (Windows: `C:\Windows\System32\drivers\etc\hosts`; Linux/Mac: `/etc/hosts`), chạy backend port 8080.
- Option B: Chạy full stack qua `docker compose -f docker-compose.yml -f docker-compose.prod.yml up` (cần `.env.prod`).
- Option C: Tin vào CI Docker Smoke Test (`ci.yml:82-115`) — không cần reproduce local.

**Không fix**: Đổi thành env var override phá assumption `server:4000 ↔ backend:8080` của docker-compose.prod.yml. Nếu cần flexibility, mở issue riêng.

**Tham chiếu**: `fe/src/app/api/interceptors/base-url.interceptor.ts:10`.

### 4.4 Hydration disabled trong dev vì zoneless + NG0506

**Triệu chứng**: Dev mode show warning hoặc throw `NG0506: Hydration timeout` khi bật hydration.

**Nguyên nhân**: Angular 20 zoneless change detection + hydration trong dev (không có server DOM) gây timeout chờ app stability.

**Fix**: `app.config.ts:168` conditional:
```ts
...(!isDevMode() ? [provideClientHydration(withEventReplay())] : []),
```

Chỉ bật hydration ở prod (có SSR thực). Dev bypass hoàn toàn.

**Tham chiếu**: `fe/src/app/app.config.ts:168`.

---

## 5. Online/Offline Detection

### 5.1 `navigator.onLine` không đáng tin — fire event giả (Wi-Fi transition, VPN toggle)

**Triệu chứng**: Banner "Ngoại tuyến" flash đỏ trong 1-2 giây khi user đổi Wi-Fi network hoặc OS sleep/wake.

**Nguyên nhân**: Browser `offline`/`online` event chỉ reflect OS network interface state, không check Internet thật. Interface flap (Wi-Fi roaming, VPN toggle) trigger event dù connection vẫn ổn.

**Fix**: `NetworkStatusService` (refactor PR #148):
- Debounce 1.5s grace trước khi react với `offline` event
- Confirm bằng probe `/actuator/health` (not trust browser event alone)
- Shrink recent-offline window 15s → 5s

**Tham chiếu**: `fe/src/app/core/services/network-status.service.ts`, PR #148, ADR-006 §"Liên quan".

### 5.2 Probe `/actuator/health` phải được proxy trong dev (không thì false-positive)

**Triệu chứng**: Dev mode: shutdown backend, FE vẫn không show offline banner.

**Nguyên nhân**: `proxy.conf.json` cũ chỉ proxy `/api` và `/ws`. Probe `/actuator/health` hit Angular dev server → 302 redirect → `/` → `index.html` (HTML 200) → `fetch` follow redirect → `response.ok === true` → probe false-report "backend alive".

**Fix**: Thêm `/actuator` vào `proxy.conf.json`:
```json
{
  "/actuator": {
    "target": "http://localhost:8088",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "info"
  }
}
```

Kết hợp với `fetch('/actuator/health', { redirect: 'error' })` trong service để reject bất kỳ redirect bất thường.

**Tham chiếu**: `fe/proxy.conf.json`, `fe/src/app/core/services/network-status.service.ts:138`, PR #148.

### 5.3 Probe endpoint trong prod: verify reachability

**Checklist cho prod deploy**: mỗi layer phải route `/actuator/health` → backend:8080 không redirect:

| Layer | File | Verify |
|---|---|---|
| Caddy (edge) | `Caddyfile:39-42` | `handle /actuator/health { reverse_proxy backend:8080 }` |
| nginx (container) | `fe/nginx.conf:150-154` | `location = /actuator/health { proxy_pass http://backend:8080/actuator/health; }` — exact match |
| Spring Security | `backend/.../PublicApiEndpointMatcher.java:42` | `/actuator/health` trong whitelist |
| Spring Boot | `application-prod.yml:134-138` | `management.endpoints.web.exposure.include: health,info` |
| NGSW | `fe/ngsw-config.json:88` | `navigationUrls` có `!/actuator/**` |

Nếu bất kỳ layer nào miss, probe false-offline trong prod. CI Docker Smoke Test (`ci.yml:105`) verify layer Caddy+nginx+Spring qua `curl http://localhost:4200/actuator/health`.

**Tham chiếu**: ADR-006 §"Liên quan tới config khác".

---

## 6. IndexedDB / Offline Data

### 6.1 Dexie schema bump đòi compound key isolate user

**Gotcha**: Khi thêm table offline mới, PHẢI dùng compound key `[userId+...]` để multi-user isolation.

**Lý do**: Một device có thể login nhiều tài khoản. Không isolate → user A thấy data user B.

**Pattern đúng** (xem `fe/src/app/core/db/lms-offline.db.ts`):
```ts
offlineLesson: '[userId+lessonId], userId, courseId, ...',
quizData: '[userId+quizId], userId, lessonId',
syncQueue: '++id, userId, entityType, ...',
```

Primary key **bắt buộc** bắt đầu bằng `userId`. Secondary index không cần.

**Chưa fix**: nếu nâng version, phải viết Dexie migration (upgrade function) — không auto-migrate schema change.

**Tham chiếu**: `fe/src/app/core/db/lms-offline.db.ts`, CLAUDE.md §"PWA Offline System".

### 6.2 Video offline stored trong Cache API, KHÔNG phải IndexedDB

**Lý do**: Video lớn (50MB-500MB/lesson). IndexedDB load toàn bộ vào RAM khi read → OOM.

**Pattern**: SW `sw-wrapper.js` intercept route `/offline-video/{lessonId}` và stream từ Cache API với HTTP 206 Range response. Zero-RAM footprint.

**Gotcha khi remove course offline**: Phải delete Cache API entries **trước** delete IndexedDB lesson rows. Nếu ngược lại, orphan cache không được GC.

**Xem**: `fe/src/app/core/services/course-download.service.ts:removeCourse()` + `sw-wrapper.js:11-22`.

**Tham chiếu**: CLAUDE.md §"PWA Offline System" #4.

### 6.3 Quiz offline submit: 3-step BE path (`SyncUseCase.processQuizAttempt`)

**Bug đã fix** (S124-S126): Offline quiz submit → sync push → server expect `attemptId` (không tồn tại offline). Fix: server 2-step (`startAttempt(quizId)` → `submitAttempt`), FE convert `Map<qId,optionKey>` → `List<SubmissionAnswer>`.

**Tham chiếu**: `backend/.../SyncUseCase.java:processQuizAttempt`, `fe/.../offline-sync.service.ts:syncItem`, CLAUDE.md §"Quiz Offline Flow".

---

## 7. Angular Convention Traps

### 7.1 `standalone: true` **KHÔNG** explicit — đã là default trong Angular 20+

**Sai**:
```ts
@Component({
  selector: 'app-foo',
  standalone: true,  // redundant, sẽ gây warning ở Angular 21+
  ...
})
```

**Đúng**:
```ts
@Component({
  selector: 'app-foo',
  ...
})
```

**Tham chiếu**: ADR-004 §"Decision" point 8.

### 7.2 `CommonModule` chỉ import khi dùng pipe / `[ngClass]` / `[ngStyle]`

**Sai**: Import `CommonModule` chỉ vì template có `@if`/`@for` — không cần, đó là built-in control flow.

**Khi nào cần `CommonModule`**:
- Template dùng pipe: `| date`, `| number`, `| currency`, `| slice`, `| async`, `| json`
- Template dùng `[ngClass]="..."` hoặc `[ngStyle]="..."`

**Khi nào không cần**:
- Chỉ dùng `@if`, `@for`, `@switch`, `@empty` — built-in, không cần import

**Tham chiếu**: ADR-004, CLAUDE.md §"CommonModule Rules".

### 7.3 `*ngIf`/`*ngFor`/`*ngSwitch` đã retired — dùng `@if`/`@for`/`@switch`

**Sai**:
```html
<div *ngIf="condition">...</div>
<div *ngFor="let item of items; trackBy: trackById">...</div>
```

**Đúng**:
```html
@if (condition()) { <div>...</div> }
@for (item of items(); track item.id) { <div>...</div> } @empty { <p>Empty</p> }
```

Toàn repo đã migrate 100% (audit 2026-04-24). Mọi code mới vi phạm sẽ reject qua CodeRabbit rule.

**Tham chiếu**: ADR-004, `.coderabbit.yaml` path_instructions.

### 7.4 DI: `inject()` function, KHÔNG phải constructor parameter

**Sai**:
```ts
constructor(private service: MyService, private http: HttpClient) {}
```

**Đúng**:
```ts
private service = inject(MyService);
private http = inject(HttpClient);
```

**Lý do**: `inject()` works trong functional interceptors, guards, resolvers. Constructor DI không consistent.

**Tham chiếu**: ADR-004 §"Decision" point 4.

### 7.5 `@Input()`/`@Output()`/`@ViewChild()` decorator đã deprecate cho component new

**Dùng signal-based API**:
```ts
// Input
data = input.required<Data>();
count = input<number>(0);  // optional với default

// Output
selected = output<Item>();

// ViewChild
container = viewChild<ElementRef>('container');
buttons = viewChildren<MatButton>('btn');
```

**Lý do**: Type-safe required, reactive, không cần `ngOnChanges` / `ngAfterViewInit`.

**Tham chiếu**: ADR-004 §"Decision" point 4-5.

---

## Khi ship fix cho gotcha mới

1. Tìm section phù hợp trong doc này, thêm entry mới với **4 phần bắt buộc**:
   - **Triệu chứng**: log message hoặc observable behavior
   - **Nguyên nhân**: root cause ngắn gọn
   - **Fix**: specific change hoặc workaround
   - **Tham chiếu**: PR number, commit hash, file:line

2. Nếu fix liên quan tới architectural decision (ví dụ: đổi config mặc định), cân nhắc mở ADR mới. Gotcha là tactical, ADR là strategic.

3. Cross-link: CLAUDE.md "Common Errors & Fixes" section là quick-ref top-level. Gotchas ở đây là deep-dive. Không trùng — CLAUDE.md ~2-3 dòng, doc này dài hơn.

## References

- `CLAUDE.md` §"COMMON ERRORS & FIXES"
- `backend/docs/adr/ADR-004-angular-signals-adoption.md`
- `backend/docs/adr/ADR-005-pwa-offline-strategy.md`
- `backend/docs/adr/ADR-006-angular-dev-server-ssr-separation.md`
- `docs/reference/DOCUMENTATION_POLICY.md` — quy tắc tài liệu chung
- `.coderabbit.yaml` — path_instructions cho FE review rule
