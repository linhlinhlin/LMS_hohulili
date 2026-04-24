# ADR-006: Tách cấu hình SSR trong angular.json — chỉ enable ở production

## Status

Accepted — 2026-04-25. Được áp dụng tại commit `1e5e0e64` (PR #148, closes #147).

## Context

Dự án dùng Angular 20.3 với SSR production (Node.js Express :4000 + nginx :80 + Caddy HTTPS) để phục vụ SEO và first-paint nhanh. Dev mode dùng `ng serve` trên `localhost:4200` để iterate code.

Cấu hình `fe/angular.json` ban đầu đặt các SSR options ở **root `options`**, với `development` configuration override `ssr: false` và `outputMode: "static"`:

```jsonc
"options": {
  "browser": "src/main.ts",
  "server": "src/main.server.ts",
  "ssr": { "entry": "src/server.ts" },
  "outputMode": "server"            // <-- leak vào dev
},
"configurations": {
  "production": { /* ... */ },
  "development": {
    "ssr": false,                    // kỳ vọng gỡ SSR
    "outputMode": "static"           // kỳ vọng static CSR
  }
}
```

Kỳ vọng: dev chạy CSR thuần, prod chạy full SSR. Thực tế quan sát được (2026-04-25):

- Mỗi request HTML tới `http://localhost:4200/` có **TTFB ≈ 7.3 giây** (đo trên Windows dev, 5 lần consistent).
- Static assets (`/main.js`, `/favicon.ico`, `/ngsw.json`) vẫn nhanh (3-10 ms).
- Benchmark chỉ ra Node.js Express SSR (trong `src/server.ts`) được invoked cho mọi request không phải static, dù `ssr: false` đã set.

Root cause: `@angular/build:dev-server` builder của Angular 20.3 wire Express SSR middleware vào dev server dựa trên sự hiện diện của `outputMode` ở **bất kỳ level nào** trong resolved config. `development.ssr: false` không remove middleware — nó chỉ disable một phần server output khi build. Tương tự, `outputMode: "static"` trigger pre-render path cũng đi qua `src/server.ts`.

SSR thực thi trong dev không có giá trị kỹ thuật:

- Dev mode dùng HMR, source map, không cần SEO
- Hydration bị disabled trong dev (xem `app.config.ts:168`) vì zoneless CD + hydration gây lỗi `NG0506` timeout
- `baseUrlInterceptor` chuyển API call thành `http://backend:8080` khi `isPlatformServer()` — hostname này không resolve được ngoài Docker network → HTTP timeout ~5-7s mỗi request → giải thích đúng 7.3s observed

## Decision

Tách SSR config theo configuration:

1. **Root `options`** giữ `server` và `ssr.entry` (để builder biết entry file tồn tại cho prod build) nhưng **không** có `outputMode`.
2. **`production` configuration** set `outputMode: "server"` — emit đầy đủ `dist/lms-angular/server/*` + `browser/*` + `ngsw.json`.
3. **`development` configuration** chỉ set `ssr: false`, **không khai báo `outputMode` dưới bất kỳ dạng nào**. Absent `outputMode` ở dev là tín hiệu duy nhất đảm bảo builder skip SSR middleware.

Cấu hình hiện tại:

```jsonc
"options": {
  "browser": "src/main.ts",
  "server": "src/main.server.ts",
  "ssr": { "entry": "src/server.ts" }
  // KHÔNG có outputMode ở đây
},
"configurations": {
  "production": {
    "outputHashing": "all",
    "serviceWorker": "ngsw-config.json",
    "outputMode": "server"           // CHỈ ở đây
  },
  "development": {
    "optimization": false,
    "sourceMap": true,
    "ssr": false
    // KHÔNG có outputMode — nếu set "static" hay "server" đều trigger SSR
  }
}
```

## Rationale

| Aspect | Trước | Sau |
|---|---|---|
| Dev `/` TTFB | **~7,300 ms** | **~6 ms** (1200× nhanh hơn) |
| Dev HMR behaviour | Không thay đổi | Không thay đổi |
| Prod SSR output | `dist/lms-angular/server/` + `browser/` | Giữ nguyên, CI Docker Smoke xanh |
| Prod `ngsw.json` | Emit | Giữ nguyên |
| Prod runtime | Caddy → nginx → Node.js:4000 SSR → CSR fallback 502 | Giữ nguyên |

### Vì sao KHÔNG giải pháp khác?

- **Giữ nguyên + accept 7.3s**: mất thời gian dev hằng ngày (mỗi reload 7s × hàng chục reloads/ngày = nhiều phút chết, cản trở flow).
- **Tắt SSR hoàn toàn (kể cả prod)**: mất SEO, mất first-paint performance, mất Angular app engine manifest cho navigation. Không chấp nhận được cho LMS public-facing.
- **Dùng `outputMode: "static"` cho dev**: đã thử, vẫn 7.3s. Angular 20 treat cả `static` và `server` là "có SSR path".
- **Custom dev server (Vite thuần, không Angular builder)**: quá xâm lấn, mất HMR compatibility với Angular material/CDK.

## Consequences

### Positive

- Developer experience improved 1200× trên page load local
- Không regress prod: CI Docker Smoke Test (`ci.yml:82-115`) verify full stack boot
- Config gọn hơn: đặt `outputMode: "server"` đúng nơi duy nhất (production config)
- Tạo precedent: mọi SSR-only option (nếu Angular thêm trong tương lai) phải đặt ở `production` config, không root options

### Negative

- Dev mode không thể reproduce SSR-specific bugs (hydration mismatch, `isPlatformServer()` code path). Phải build prod local hoặc rely on CI Docker Smoke.
- Absence của `outputMode` ở dev là *intentional* nhưng không self-documenting — dễ bị "vô ý restore" bởi reviewer cho là thiếu sót. Comment trong `angular.json` không hỗ trợ JSON chuẩn, mitigate qua ADR này + `FRONTEND_GOTCHAS.md` reference.

### Risks

- Angular 21/22+ có thể đổi behavior của `@angular/build:dev-server` — lúc đó phải re-evaluate. Theo Angular release notes mỗi major upgrade.
- Nếu ai đó thêm `outputMode: "static"` vào dev config với ý định tốt (tưởng rằng explicit better than implicit) sẽ **re-introduce 7.3s bug**. Phải giáo dục qua doc + CodeRabbit rule.

## Compliance check khi code review

Khi review bất kỳ thay đổi nào trên `fe/angular.json`:

- [ ] Root `options` **không** có field `outputMode`
- [ ] Root `options` có `server: "src/main.server.ts"` + `ssr.entry: "src/server.ts"` (cần cho prod build)
- [ ] `production` configuration có `outputMode: "server"` + `serviceWorker: "ngsw-config.json"`
- [ ] `development` configuration có `ssr: false` và **không** có `outputMode`
- [ ] Sau thay đổi: chạy `curl -s -o /dev/null -w "%{time_starttransfer}s" http://localhost:4200/` trả về < 100ms
- [ ] Sau thay đổi: `ng build --configuration=production` vẫn emit `dist/lms-angular/server/*.mjs` + `browser/ngsw.json`

Nếu CodeRabbit có access vào repo, path instruction trong `.coderabbit.yaml` cho `fe/angular.json` nên reference ADR-006.

## Liên quan tới config khác

- `fe/proxy.conf.json`: đã thêm `/actuator` để probe health check trong dev (trước đây không proxy → 302 → HTML false-positive). Xem `FRONTEND_GOTCHAS.md §5`.
- `fe/src/app/core/services/network-status.service.ts`: probe logic refactor trong cùng PR #148 (xem §5 gotchas).
- `fe/src/app/api/interceptors/base-url.interceptor.ts`: SSR hostname hard-coded `http://backend:8080` — xem gotchas §4.

## References

- **PR #148**: `fix(fe): dev-mode SSR perf + probe reliability` — https://github.com/linhlinhlin/LMS_hohulili/pull/148
- **Issue #147**: `perf(dev): ng serve rendering HTML via SSR makes every page load ~7.3s` — https://github.com/linhlinhlin/LMS_hohulili/issues/147
- Commit: `1e5e0e64`
- Angular 20 build reference: https://angular.dev/reference/configs/angular-json
- `docs/reference/FRONTEND_GOTCHAS.md` — catalog đầy đủ các gotcha FE khác
- `CLAUDE.md` — section "COMMON ERRORS & FIXES" #12

## Supersedes

Không supersede ADR nào.

## Superseded by

Chưa — đang là current standard. Khi upgrade Angular major (21+), review lại ADR này.
