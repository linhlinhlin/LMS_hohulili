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
      return new Response("Method not allowed", { status: 405 });
    }

    if (!url.pathname.startsWith("/video-packages/")) {
      return new Response("Not found", { status: 404 });
    }

    const verify = url.searchParams.get("verify");
    if (!verify) {
      return new Response("Missing verify token", { status: 403 });
    }

    if (!(await isTimedHmacValid(url.pathname, verify, env.MEDIA_EDGE_HMAC_SECRET, env.MEDIA_EDGE_TOKEN_EXPIRY_SECONDS))) {
      return new Response("Invalid or expired token", { status: 403 });
    }

    const objectKey = url.pathname.slice(1);
    const object = await env.MEDIA_BUCKET.get(objectKey);
    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    for (const [key, value] of corsHeaders.entries()) {
      headers.set(key, value);
    }

    return new Response(request.method === "HEAD" ? null : object.body, {
      status: 200,
      headers,
    });
  },
};

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
  headers.set("Access-Control-Expose-Headers", "Accept-Ranges,Content-Length,Content-Type,Content-Range,ETag");
  headers.set("Vary", "Origin");
  return headers;
}
