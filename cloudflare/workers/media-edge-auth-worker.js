export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = buildCorsHeaders(env.MEDIA_ALLOWED_ORIGIN || "*");

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return textResponse("Method not allowed", 405, corsHeaders, {
        Allow: "GET, HEAD, OPTIONS",
      });
    }

    if (!url.pathname.startsWith("/video-packages/")) {
      return textResponse("Not found", 404, corsHeaders);
    }

    const verify = url.searchParams.get("verify");
    if (!verify) {
      return textResponse("Missing verify token", 403, corsHeaders);
    }

    if (!(await isTimedHmacValid(url.pathname, verify, env.MEDIA_EDGE_HMAC_SECRET, env.MEDIA_EDGE_TOKEN_EXPIRY_SECONDS))) {
      return textResponse("Invalid or expired token", 403, corsHeaders);
    }

    const isRangeRequest = request.headers.has("Range");
    const cacheableObject = isImmutableVideoObject(url.pathname);
    const cacheKey = new Request(`${url.origin}${url.pathname}`, { method: "GET" });
    if (cacheableObject && !isRangeRequest) {
      const cached = await caches.default.match(cacheKey);
      if (cached) {
        return responseForMethod(cached, request.method, corsHeaders, "HIT");
      }
    }

    const objectKey = url.pathname.slice(1);
    const object = await env.MEDIA_BUCKET.get(objectKey, isRangeRequest ? { range: request.headers } : undefined);
    if (!object) {
      return textResponse("Not found", 404, corsHeaders);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", cacheableObject
      ? "public, max-age=31536000, immutable"
      : "private, no-store");
    headers.set("X-Edge-Cache", "MISS");
    const status = applyBodyLengthHeaders(headers, object, isRangeRequest);
    for (const [key, value] of corsHeaders.entries()) {
      headers.set(key, value);
    }

    const response = new Response(request.method === "HEAD" ? null : object.body, {
      status,
      headers,
    });
    if (cacheableObject && request.method === "GET" && !isRangeRequest) {
      ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
    }
    return response;
  },
};

function textResponse(body, status, corsHeaders, extraHeaders = {}) {
  const headers = new Headers(corsHeaders);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "text/plain; charset=utf-8");
  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value);
  }
  return new Response(body, { status, headers });
}

function responseForMethod(response, method, corsHeaders, cacheState) {
  const headers = new Headers(response.headers);
  headers.set("X-Edge-Cache", cacheState);
  for (const [key, value] of corsHeaders.entries()) {
    headers.set(key, value);
  }
  return new Response(method === "HEAD" ? null : response.body, {
    status: response.status,
    headers,
  });
}

function applyBodyLengthHeaders(headers, object, isRangeRequest) {
  if (!isRangeRequest || !object.range) {
    headers.set("Content-Length", String(object.size));
    return 200;
  }

  const suffix = object.range.suffix ?? 0;
  const offset = object.range.offset ?? Math.max(object.size - suffix, 0);
  const length = object.range.length ?? object.size - offset;
  const end = Math.min(offset + length - 1, object.size - 1);
  headers.set("Content-Range", `bytes ${offset}-${end}/${object.size}`);
  headers.set("Content-Length", String(end - offset + 1));
  return 206;
}

function isImmutableVideoObject(pathname) {
  const lowerPath = pathname.toLowerCase();
  return lowerPath.endsWith(".mp4")
    || lowerPath.endsWith(".m4s")
    || lowerPath.endsWith(".ts")
    || lowerPath.endsWith(".m4a")
    || lowerPath.endsWith(".aac")
    || lowerPath.endsWith(".webm");
}

async function isTimedHmacValid(pathname, verify, secret, expirySecondsRaw) {
  if (!secret) {
    return false;
  }

  const dashIndex = verify.indexOf("-");
  if (dashIndex <= 0) {
    return false;
  }

  const issuedAtRaw = verify.slice(0, dashIndex);
  const macRaw = verify.slice(dashIndex + 1);
  const issuedAt = Number.parseInt(issuedAtRaw, 10);
  const ttl = Number.parseInt(expirySecondsRaw || "300", 10);

  if (!Number.isFinite(issuedAt) || !Number.isFinite(ttl) || ttl <= 0 || !macRaw) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (issuedAt > now || now - issuedAt > ttl) {
    return false;
  }

  const expectedMac = await hmacBase64(secret, `${pathname}${issuedAt}`);
  return timingSafeEqual(expectedMac, macRaw);
}

function hmacBase64(secret, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  return crypto.subtle
    .importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((key) => crypto.subtle.sign("HMAC", key, messageData))
    .then((signature) => uint8ArrayToBase64(new Uint8Array(signature)));
}

function uint8ArrayToBase64(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function timingSafeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

function buildCorsHeaders(allowedOrigin) {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  headers.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Range,Content-Type");
  headers.set("Access-Control-Expose-Headers", "Accept-Ranges,Content-Length,Content-Type,Content-Range,ETag,X-Edge-Cache");
  headers.set("Vary", "Origin");
  return headers;
}
