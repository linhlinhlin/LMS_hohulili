import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import worker from "./media-edge-auth-worker.js";

const SECRET = "worker-test-secret";
const OBJECT_PATH = "/video-packages/asset-1/segments/standard/init.mp4";
const OBJECT_KEY = OBJECT_PATH.slice(1);
const DASH_TEMPLATE_PATH = "/video-packages/asset-1/segments/audio/$Number$.m4s";
const DASH_ACTUAL_PATH = "/video-packages/asset-1/segments/audio/1.m4s";
const DASH_ACTUAL_KEY = DASH_ACTUAL_PATH.slice(1);

let cache;
let bucket;
let ctx;

beforeEach(() => {
  cache = createMemoryCache();
  bucket = createR2Bucket();
  ctx = createExecutionContext();
  globalThis.caches = { default: cache };
});

test("rejects unsigned media object requests before touching R2", async () => {
  const response = await worker.fetch(new Request(`https://media.example.com${OBJECT_PATH}`), env(), ctx);

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://lms.example.com");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(bucket.getCalls.length, 0);
  assert.equal(cache.matchCalls.length, 0);
});

test("validates token before serving cached media objects", async () => {
  const signedUrl = await signedObjectUrl();
  const first = await worker.fetch(new Request(signedUrl), env(), ctx);
  await ctx.flush();

  assert.equal(first.status, 200);
  assert.equal(first.headers.get("X-Edge-Cache"), "MISS");
  assert.equal(await first.text(), "abcdef");
  assert.equal(bucket.getCalls.length, 1);

  const invalid = await worker.fetch(new Request(`${signedUrl.slice(0, signedUrl.indexOf("?"))}?verify=bad-token`), env(), ctx);

  assert.equal(invalid.status, 403);
  assert.equal(bucket.getCalls.length, 1);
});

test("caches full object responses by pathname after token validation", async () => {
  const now = Math.floor(Date.now() / 1000);
  const firstUrl = await signedObjectUrl(now - 1);
  const secondUrl = await signedObjectUrl(now);

  const first = await worker.fetch(new Request(firstUrl), env(), ctx);
  await ctx.flush();
  const second = await worker.fetch(new Request(secondUrl), env(), ctx);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.headers.get("X-Edge-Cache"), "MISS");
  assert.equal(second.headers.get("X-Edge-Cache"), "HIT");
  assert.equal(await second.text(), "abcdef");
  assert.equal(bucket.getCalls.length, 1);
  assert.deepEqual(cache.keys(), [`https://media.example.com${OBJECT_PATH}`]);
});

test("serves HEAD from the cached full object without a response body", async () => {
  const signedUrl = await signedObjectUrl();
  await worker.fetch(new Request(signedUrl), env(), ctx);
  await ctx.flush();

  const response = await worker.fetch(new Request(signedUrl, { method: "HEAD" }), env(), ctx);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Edge-Cache"), "HIT");
  assert.equal(await response.text(), "");
  assert.equal(bucket.getCalls.length, 1);
});

test("bypasses Worker cache for range requests and returns partial content headers", async () => {
  const signedUrl = await signedObjectUrl();
  const request = new Request(signedUrl, {
    headers: {
      Range: "bytes=0-2",
    },
  });

  const response = await worker.fetch(request, env(), ctx);
  await ctx.flush();

  assert.equal(response.status, 206);
  assert.equal(response.headers.get("Accept-Ranges"), "bytes");
  assert.equal(response.headers.get("Content-Range"), "bytes 0-2/6");
  assert.equal(response.headers.get("Content-Length"), "3");
  assert.equal(response.headers.get("X-Edge-Cache"), "MISS");
  assert.equal(await response.text(), "abc");
  assert.equal(bucket.getCalls.length, 1);
  assert.equal(bucket.getCalls[0].options.range.get("Range"), "bytes=0-2");
  assert.equal(cache.putCalls.length, 0);
});

test("does not cache signed package manifests if a manifest path is requested directly", async () => {
  const manifestPath = "/video-packages/asset-1/hls/master.m3u8";
  const signedUrl = await signedObjectUrl(Math.floor(Date.now() / 1000), manifestPath);

  const first = await worker.fetch(new Request(signedUrl), env(), ctx);
  await ctx.flush();
  const second = await worker.fetch(new Request(signedUrl), env(), ctx);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.headers.get("Cache-Control"), "private, no-store");
  assert.equal(second.headers.get("X-Edge-Cache"), "MISS");
  assert.equal(bucket.getCalls.length, 2);
  assert.equal(cache.putCalls.length, 0);
});

test("accepts DASH template tokens after the player substitutes the segment number", async () => {
  const verify = await mintToken(DASH_TEMPLATE_PATH, Math.floor(Date.now() / 1000));
  const response = await worker.fetch(
    new Request(`https://media.example.com${DASH_ACTUAL_PATH}?verify=${encodeURIComponent(verify)}`),
    env(),
    ctx,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Edge-Cache"), "MISS");
  assert.equal(await response.text(), "dash-segment-1");
  assert.equal(bucket.getCalls.length, 1);
  assert.equal(bucket.getCalls[0].key, DASH_ACTUAL_KEY);
});

test("does not allow DASH template tokens to cross rendition directories", async () => {
  const verify = await mintToken(DASH_TEMPLATE_PATH, Math.floor(Date.now() / 1000));
  const targetUrl = "https://media.example.com"
    + `/video-packages/asset-1/segments/standard/1.m4s?verify=${encodeURIComponent(verify)}`;
  const response = await worker.fetch(
    new Request(targetUrl),
    env(),
    ctx,
  );

  assert.equal(response.status, 403);
  assert.equal(bucket.getCalls.length, 0);
});

test("echoes a matching request origin from a comma-separated CORS allowlist", async () => {
  const response = await worker.fetch(
    new Request(await signedObjectUrl(), {
      headers: {
        Origin: "https://www.example.com",
      },
    }),
    env({ MEDIA_ALLOWED_ORIGIN: "https://lms.example.com, https://www.example.com" }),
    ctx,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://www.example.com");
});

test("omits Access-Control-Allow-Origin for unlisted browser origins", async () => {
  const response = await worker.fetch(
    new Request(await signedObjectUrl(), {
      headers: {
        Origin: "https://evil.example.com",
      },
    }),
    env({ MEDIA_ALLOWED_ORIGIN: "https://lms.example.com, https://www.example.com" }),
    ctx,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.has("Access-Control-Allow-Origin"), false);
});

function env(overrides = {}) {
  return {
    MEDIA_ALLOWED_ORIGIN: "https://lms.example.com",
    MEDIA_EDGE_HMAC_SECRET: SECRET,
    MEDIA_EDGE_TOKEN_EXPIRY_SECONDS: "300",
    MEDIA_BUCKET: bucket,
    ...overrides,
  };
}

async function signedObjectUrl(issuedAt = Math.floor(Date.now() / 1000), pathname = OBJECT_PATH) {
  const verify = await mintToken(pathname, issuedAt);
  return `https://media.example.com${pathname}?verify=${encodeURIComponent(verify)}`;
}

async function mintToken(pathname, issuedAt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${pathname}${issuedAt}`));
  return `${issuedAt}-${Buffer.from(signature).toString("base64")}`;
}

function createR2Bucket() {
  return {
    getCalls: [],
    async get(key, options) {
      this.getCalls.push({ key, options });
      if (key === "video-packages/asset-1/hls/master.m3u8") {
        return {
          body: "#EXTM3U\n",
          httpEtag: '"manifest-etag"',
          size: 8,
          writeHttpMetadata(headers) {
            headers.set("Content-Type", "application/vnd.apple.mpegurl");
          },
        };
      }
      if (key === DASH_ACTUAL_KEY) {
        return {
          body: "dash-segment-1",
          httpEtag: '"dash-segment-etag"',
          size: 14,
          writeHttpMetadata(headers) {
            headers.set("Content-Type", "video/iso.segment");
          },
        };
      }
      if (key !== OBJECT_KEY) {
        return null;
      }
      const isRange = options?.range?.get("Range") === "bytes=0-2";
      return {
        body: isRange ? "abc" : "abcdef",
        httpEtag: '"test-etag"',
        range: isRange ? { offset: 0, length: 3 } : undefined,
        size: 6,
        writeHttpMetadata(headers) {
          headers.set("Content-Type", "video/mp4");
        },
      };
    },
  };
}

function createMemoryCache() {
  const store = new Map();
  return {
    matchCalls: [],
    putCalls: [],
    async match(request) {
      this.matchCalls.push(request.url);
      const cached = store.get(request.url);
      return cached ? cached.clone() : undefined;
    },
    async put(request, response) {
      this.putCalls.push(request.url);
      store.set(request.url, response.clone());
    },
    keys() {
      return [...store.keys()];
    },
  };
}

function createExecutionContext() {
  const promises = [];
  return {
    waitUntil(promise) {
      promises.push(promise);
    },
    async flush() {
      await Promise.all(promises.splice(0));
    },
  };
}
