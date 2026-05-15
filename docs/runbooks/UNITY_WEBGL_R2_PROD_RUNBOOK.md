# Unity WebGL R2 Production Runbook

Date: 2026-05-16
Status: Unity WebGPU package `colreg-rule-15-crossing/v2026.05.16.2` is published to the existing `lms-storage` R2 bucket for staging and production. Production Worker/R2 access is verified through Cloudflare on the proxied media host; live same-origin `/simulations/*` on `holilihu.online` remains gated by the root-domain proxy state.

## Decision

Use a private Cloudflare R2 bucket behind a Cloudflare Worker route:

```text
Learner browser
  -> https://holilihu.online/simulations/<package>/<version>/...
  -> Cloudflare Worker route: holilihu.online/simulations/*
  -> existing private R2 bucket binding: lms-storage
  -> object prefix: simulations/
```

This keeps the learner URL same-origin with the LMS, which is important for the PWA/offline cache, Unity-to-LMS bridge, CSP, and future telemetry. Do not ship the official Unity WebGL build inside the Angular Docker image.

## Why Worker + R2 Instead Of Public R2

- R2 stores the heavy Unity files outside the frontend bundle.
- Worker binding keeps the R2 bucket private; no R2 access keys are exposed to the browser.
- The URL stays under `holilihu.online`, so the service worker can cache `/simulations/**`.
- The Worker forces Unity-safe headers even if uploaded object metadata is incomplete.
- Staging and production can use separate prefixes in the existing private media bucket.

Cloudflare notes that direct public R2 production access should use a custom domain rather than `r2.dev`; Worker bindings are the safer same-origin option for LMS-controlled packages.

## Existing Buckets

This project already has the production R2 layout:

- `lms-cdn`: public/general LMS assets through `https://cdn.holilihu.online`.
- `lms-storage`: private video/media bucket used by adaptive R2/Shaka and `media.holilihu.online`.

Do not create a new simulation bucket unless we later need separate lifecycle, retention, or permission boundaries. For v1, upload Unity WebGL packages into `lms-storage` under:

```text
simulations/<package>/<version>/...
```

Keep `r2.dev` public access disabled on `lms-storage`.

## DNS And Proxy Gate

Cloudflare Worker routes only run for hostnames proxied through Cloudflare. On 2026-05-12, the current DNS check showed:

```text
holilihu.online       -> 35.187.245.201         direct VM, not Cloudflare proxied
cdn.holilihu.online   -> Cloudflare edge IPs     proxied
media.holilihu.online -> Cloudflare edge IPs     proxied
```

That means a Worker route such as `holilihu.online/simulations/*` can be deployed, but it will not receive learner traffic until the root hostname is orange-cloud proxied in Cloudflare. The staging fallback `https://holilihu.online/simulations-staging/*` has the same requirement because it also uses the root hostname.

Current verification:

```powershell
# Direct DNS path, currently reaches the VM/Caddy and does not execute the Worker.
curl.exe -I https://holilihu.online/simulations-staging/colreg-rule-15-crossing/v1/holilihu-simulation.json

# Forced Cloudflare-edge path, useful before the root DNS proxy cutover.
# Use one current Cloudflare edge IP from cdn.holilihu.online or media.holilihu.online.
curl.exe -I --resolve holilihu.online:443:104.21.41.24 https://holilihu.online/simulations-staging/colreg-rule-15-crossing/v1/holilihu-simulation.json
```

The forced-edge request should return `200 OK`, `Server: cloudflare`, and `X-HoliLihu-Simulation-Origin: r2`. The direct request will keep returning the origin app response until the root hostname is proxied.

For urgent QA without proxying the root hostname, the same Worker is also attached to a narrow path on the already-proxied media host:

```text
https://media.holilihu.online/simulations/<package>/<version>/...
https://media.holilihu.online/simulations-staging/<package>/<version>/...
```

That media-host route is suitable for demo and QA, but the final LMS/PWA architecture should still cut over to the same-origin `https://holilihu.online/simulations/*` route after the root proxy checklist passes.

Do not flip the root hostname proxy casually. Before enabling the root proxy, run a production cutover checklist for:

- current Caddy/Nginx origin behavior and redirects,
- TLS mode and certificate validity,
- login, OAuth callbacks, payment callbacks, and API cookies,
- WebSocket/SSE endpoints if present,
- upload/download size limits,
- cache bypass rules for dynamic app/API routes,
- rollback path to DNS-only if the site behaves unexpectedly.

Safe deployment options:

- Preferred final architecture: proxy `holilihu.online`, then serve simulations at same-origin `/simulations/*`.
- Safe interim architecture: provision a proxied subdomain such as `simulations.holilihu.online`, then update LMS/CSP/offline policy to treat it as a trusted simulation origin.
- Avoid for final PWA/offline: serving Unity packages from `cdn.holilihu.online` or `media.holilihu.online` without LMS changes, because that loses the same-origin service-worker cache model.

## Worker

1. Go to `cloudflare/workers`.
2. Copy `wrangler.simulation-r2.example.jsonc` to `wrangler.jsonc`.
3. Review routes, bucket name `lms-storage`, route prefixes, and object prefixes.
4. Confirm the target hostname is Cloudflare proxied before expecting the route to answer:

```powershell
Resolve-DnsName holilihu.online
curl.exe -I https://holilihu.online/
```

The HTTP response should include Cloudflare headers such as `Server: cloudflare` and `CF-RAY`.

5. Deploy staging first:

```powershell
cd cloudflare/workers
npx wrangler deploy --env staging
```

6. After staging smoke passes, deploy production:

```powershell
npx wrangler deploy --env production
```

The Worker source is `cloudflare/workers/simulation-r2-worker.js`.

Staging is configured for `https://holilihu.online/simulations-staging/*` so it does not require a separate staging DNS record. It still requires the root hostname to be proxied through Cloudflare before the route can answer. Production remains `https://holilihu.online/simulations/*`.

The LMS readiness page is available at `/simulation-courses` without login for QA/stakeholder review. The authenticated student sidebar entry remains `/student/simulation-courses`. The page now points to the official Unity WebGPU package rather than a hand-made smoke demo.

## Object Layout

Upload official Unity packages under this R2 key layout:

```text
simulations/colreg-rule-15-crossing/v2026.05.12.1/index.html
simulations/colreg-rule-15-crossing/v2026.05.12.1/Build/...
simulations/colreg-rule-15-crossing/v2026.05.12.1/TemplateData/...
simulations/colreg-rule-15-crossing/v2026.05.12.1/holilihu-simulation.json
```

Current published package:

```text
simulations/colreg-rule-15-crossing/v2026.05.16.2/index.html
simulations/colreg-rule-15-crossing/v2026.05.16.2/Build/HoliLihuWebGPU_Full.wasm
simulations/colreg-rule-15-crossing/v2026.05.16.2/Build/HoliLihuWebGPU_Full.data
simulations/colreg-rule-15-crossing/v2026.05.16.2/holilihu-simulation.json
```

Never mutate a version after publishing to learners. If Unity exports a fix, publish a new version folder and update the LMS package record.

## Upload

From the repo root, after Unity team exports the official WebGL folder:

```powershell
.\scripts\publish-unity-simulation-r2.ps1 `
  -BuildRoot "E:\path\to\UnityWebGLExport" `
  -PackageId "colreg-rule-15-crossing" `
  -Version "v2026.05.12.1" `
  -Bucket "lms-storage" `
  -ObjectPrefix "staging/simulations" `
  -PublicPathPrefix "simulations-staging"
```

That dry-runs the exact `wrangler r2 object put` commands and writes `holilihu-simulation.json`. Upload mode uses remote Cloudflare R2 by default; pass `-Local` only when intentionally testing Wrangler's local R2 simulation.

Upload to staging:

```powershell
.\scripts\publish-unity-simulation-r2.ps1 `
  -BuildRoot "E:\path\to\UnityWebGLExport" `
  -PackageId "colreg-rule-15-crossing" `
  -Version "v2026.05.12.1" `
  -Bucket "lms-storage" `
  -ObjectPrefix "staging/simulations" `
  -PublicPathPrefix "simulations-staging" `
  -Upload
```

Upload to production only after smoke passes:

```powershell
.\scripts\publish-unity-simulation-r2.ps1 `
  -BuildRoot "E:\path\to\UnityWebGLExport" `
  -PackageId "colreg-rule-15-crossing" `
  -Version "v2026.05.12.1" `
  -Bucket "lms-storage" `
  -ObjectPrefix "simulations" `
  -PublicPathPrefix "simulations" `
  -Upload
```

## Smoke Test

Probe headers after upload:

```powershell
.\scripts\smoke-unity-simulation-headers.ps1 `
  -ManifestUrl "https://holilihu.online/simulations-staging/colreg-rule-15-crossing/v2026.05.12.1/holilihu-simulation.json"
```

Expected:

- `.wasm`, `.wasm.br`, `.wasm.gz` return `Content-Type: application/wasm`.
- `.br` returns `Content-Encoding: br`.
- `.gz` returns `Content-Encoding: gzip`.
- `index.html` and `holilihu-simulation.json` are short-cache.
- versioned assets are immutable.
- response has `X-HoliLihu-Simulation-Origin: r2`.

If root DNS is not proxied yet, repeat the same smoke with `curl.exe --resolve holilihu.online:443:<cloudflare-edge-ip>` to validate the Worker without changing public traffic.

Then open the staging lesson in a desktop Chrome/Edge browser and confirm:

- no blank canvas,
- no CSP WebAssembly error,
- no MIME or compression error,
- Unity scene loads,
- desktop controls work,
- LMS bridge events are visible once the Unity bridge is added.

2026-05-14 verification for `v2026.05.14.1`:

- Staging Worker deployed as `holilihu-simulation-r2-staging`.
- Production Worker deployed as `holilihu-simulation-r2`.
- Production manifest, `index.html`, and `.wasm` return `200 OK` with `Server: cloudflare` and `X-HoliLihu-Simulation-Origin: r2` when served through Cloudflare.
- `.wasm` returns `Content-Type: application/wasm` and immutable cache headers.
- Direct root-domain requests still reach VM/Caddy until `holilihu.online` is proxied.

2026-05-16 verification for `v2026.05.16.1`:

- Staging and production packages were uploaded to `lms-storage`.
- `media.holilihu.online/simulations-staging/.../holilihu-simulation.json` and `media.holilihu.online/simulations/.../holilihu-simulation.json` return `200 OK`, `Server: cloudflare`, and `X-HoliLihu-Simulation-Origin: r2`.
- Production `index.html` returns `Content-Type: text/html; charset=utf-8` and short-cache headers.
- Production `.wasm` returns `Content-Type: application/wasm`, immutable cache headers, and `X-HoliLihu-Simulation-Origin: r2`.

2026-05-16 visual refresh for `v2026.05.16.2`:

- Staging and production packages were uploaded to `lms-storage`.
- Local Chrome WebGPU QA loaded the Unity canvas successfully and captured `VR_Maritime_LMS/Logs/chrome-webgpu-frames-only-v6.png`.
- `media.holilihu.online/simulations-staging/.../holilihu-simulation.json` and `media.holilihu.online/simulations/.../holilihu-simulation.json` return `200 OK`, `Server: cloudflare`, and `X-HoliLihu-Simulation-Origin: r2`.
- Production `index.html` returns `Content-Type: text/html; charset=utf-8` and short-cache headers.
- Production `.wasm` returns `Content-Type: application/wasm`, immutable cache headers, and `X-HoliLihu-Simulation-Origin: r2`.

## LMS Environment

Production `.env.prod` should include:

```dotenv
CLOUDFLARE_R2_SIMULATION_BUCKET=lms-storage
CLOUDFLARE_R2_SIMULATION_PUBLIC_URL=/simulations
CLOUDFLARE_R2_SIMULATION_PREFIX=simulations
```

The backend admin storage health endpoint now reports `simulationBucket` alongside the existing public and video buckets. For v1, `simulationBucket` intentionally points at the same physical bucket as `videoBucket` (`lms-storage`), but uses a different object prefix.

## References

- Cloudflare R2 public buckets: https://developers.cloudflare.com/r2/buckets/public-buckets/
- Cloudflare R2 cache/custom domain notes: https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/
- Cloudflare R2 Workers API: https://developers.cloudflare.com/r2/get-started/workers-api/
- Cloudflare R2 Workers API reference: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- Unity WebGL compressed build deployment: https://docs.unity.cn/Manual/webgl-deploying.html
- Unity WebGL server configuration samples: https://docs.unity.cn/Manual/webgl-server-configuration-code-samples.html
