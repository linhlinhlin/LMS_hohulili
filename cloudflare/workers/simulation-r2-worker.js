const DEFAULT_ALLOWED_ORIGINS = "https://holilihu.online";
const DEFAULT_OBJECT_PREFIX = "simulations";
const DEFAULT_ROUTE_PREFIX = "simulations";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), request, env);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return withCors(new Response("Method not allowed", { status: 405 }), request, env);
    }

    const objectKey = resolveObjectKey(
      url.pathname,
      env.SIMULATION_OBJECT_PREFIX || DEFAULT_OBJECT_PREFIX,
      env.SIMULATION_ROUTE_PREFIX || DEFAULT_ROUTE_PREFIX,
    );
    if (!objectKey) {
      return withCors(new Response("Not found", { status: 404 }), request, env);
    }

    const cache = caches.default;
    const canUseEdgeCache = request.method === "GET" && isImmutableAsset(objectKey);
    const cacheKey = new Request(cacheUrlFor(request.url), { method: "GET" });

    if (canUseEdgeCache) {
      const cached = await cache.match(cacheKey);
      if (cached) {
        return withCors(cloneForMethod(cached, request.method), request, env);
      }
    }

    const object = await env.SIMULATION_BUCKET.get(objectKey);
    if (!object) {
      return withCors(new Response("Not found", { status: 404 }), request, env);
    }

    const headers = buildObjectHeaders(objectKey, object);
    const response = new Response(request.method === "HEAD" ? null : object.body, {
      status: 200,
      headers,
    });

    if (canUseEdgeCache) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return withCors(response, request, env);
  },
};

function resolveObjectKey(pathname, configuredPrefix, configuredRoutePrefix) {
  const routePrefix = String(configuredRoutePrefix || DEFAULT_ROUTE_PREFIX).replace(/^\/+|\/+$/g, "");
  const routeRoot = `/${routePrefix}/`;
  if (!pathname.startsWith(routeRoot)) {
    return null;
  }

  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  if (
    decodedPathname.includes("..")
    || decodedPathname.includes("\\")
    || /[\u0000-\u001f\u007f]/.test(decodedPathname)
  ) {
    return null;
  }

  const prefix = String(configuredPrefix || DEFAULT_OBJECT_PREFIX).replace(/^\/+|\/+$/g, "");
  const routeRelativePath = decodedPathname.slice(routeRoot.length);
  if (!routeRelativePath || routeRelativePath.startsWith("/")) {
    return null;
  }
  return `${prefix}/${routeRelativePath}`;
}

function buildObjectHeaders(objectKey, object) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);

  if (object.httpEtag) {
    headers.set("ETag", object.httpEtag);
  }
  if (typeof object.size === "number") {
    headers.set("Content-Length", String(object.size));
  }

  const lowerKey = objectKey.toLowerCase();
  const contentType = inferContentType(lowerKey);
  const contentEncoding = inferContentEncoding(lowerKey);

  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  if (contentEncoding) {
    headers.set("Content-Encoding", contentEncoding);
  }

  headers.set("Cache-Control", isImmutableAsset(lowerKey)
    ? "public, max-age=31536000, immutable"
    : "public, max-age=60, must-revalidate");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cross-Origin-Resource-Policy", "same-site");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-HoliLihu-Simulation-Origin", "r2");
  return headers;
}

function inferContentType(lowerKey) {
  if (lowerKey.endsWith(".wasm") || lowerKey.endsWith(".wasm.br") || lowerKey.endsWith(".wasm.gz")) {
    return "application/wasm";
  }
  if (lowerKey.endsWith(".js") || lowerKey.endsWith(".js.br") || lowerKey.endsWith(".js.gz")) {
    return "application/javascript; charset=utf-8";
  }
  if (lowerKey.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (lowerKey.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  if (lowerKey.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (lowerKey.endsWith(".png")) {
    return "image/png";
  }
  if (lowerKey.endsWith(".jpg") || lowerKey.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lowerKey.endsWith(".webp")) {
    return "image/webp";
  }
  if (
    lowerKey.endsWith(".data")
    || lowerKey.endsWith(".data.br")
    || lowerKey.endsWith(".data.gz")
    || lowerKey.endsWith(".unityweb")
    || lowerKey.endsWith(".symbols.json.br")
    || lowerKey.endsWith(".symbols.json.gz")
  ) {
    return "application/octet-stream";
  }
  return "application/octet-stream";
}

function inferContentEncoding(lowerKey) {
  if (lowerKey.endsWith(".br")) {
    return "br";
  }
  if (lowerKey.endsWith(".gz")) {
    return "gzip";
  }
  return null;
}

function isImmutableAsset(objectKey) {
  const lowerKey = objectKey.toLowerCase();
  return !(
    lowerKey.endsWith("/index.html")
    || lowerKey.endsWith("/holilihu-simulation.json")
    || lowerKey.endsWith(".manifest.json")
  );
}

function cacheUrlFor(rawUrl) {
  const url = new URL(rawUrl);
  url.search = "";
  return url.toString();
}

function cloneForMethod(response, method) {
  return new Response(method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  const origin = request.headers.get("Origin");
  const allowedOrigins = parseAllowedOrigins(env.SIMULATION_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS);

  if (origin && (allowedOrigins.includes("*") || allowedOrigins.includes(origin))) {
    headers.set("Access-Control-Allow-Origin", allowedOrigins.includes("*") ? "*" : origin);
    headers.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Range,Content-Type");
    headers.set("Access-Control-Expose-Headers", "Content-Encoding,Content-Length,Content-Type,ETag,CF-Cache-Status");
    headers.append("Vary", "Origin");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function parseAllowedOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
