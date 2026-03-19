import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { Readable } from 'node:stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distRoot = path.resolve(__dirname, '..', 'dist', 'lms-angular', 'browser');
const indexFile = fs.existsSync(path.join(distRoot, 'index.html'))
  ? path.join(distRoot, 'index.html')
  : path.join(distRoot, 'index.csr.html');
const port = Number(process.argv[2] || process.env.PORT || 4300);
const backendOrigin = process.env.SMOKE_BACKEND_ORIGIN || 'http://127.0.0.1:8088';
const proxiedPrefixes = ['/api/', '/actuator/', '/uploads/'];

if (!fs.existsSync(indexFile)) {
  console.error(`Missing build output: ${indexFile}`);
  process.exit(1);
}

const app = express();

// Keep FE smoke close to production: same-origin app shell, proxied backend APIs/media.
app.use(async (request, response, next) => {
  if (!proxiedPrefixes.some((prefix) => request.path.startsWith(prefix))) {
    next();
    return;
  }

  try {
    const upstreamUrl = new URL(request.originalUrl, backendOrigin);
    const headers = new Headers();

    for (const [key, value] of Object.entries(request.headers)) {
      const lowerKey = key.toLowerCase();
      if (value === undefined || lowerKey === 'host' || lowerKey === 'accept-encoding') {
        continue;
      }

      if (Array.isArray(value)) {
        for (const entry of value) {
          headers.append(key, entry);
        }
      } else {
        headers.set(key, value);
      }
    }

    const needsBody = request.method !== 'GET' && request.method !== 'HEAD';
    const bodyChunks = [];

    if (needsBody) {
      for await (const chunk of request) {
        bodyChunks.push(chunk);
      }
    }

    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: needsBody ? Buffer.concat(bodyChunks) : undefined,
      redirect: 'manual',
    });

    response.status(upstream.status);

    upstream.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'transfer-encoding' || lowerKey === 'content-encoding' || lowerKey === 'content-length') {
        return;
      }
      response.setHeader(key, value);
    });

    if (!upstream.body) {
      response.end();
      return;
    }

    Readable.fromWeb(upstream.body).pipe(response);
  } catch (error) {
    console.error(`Smoke proxy failed for ${request.method} ${request.originalUrl}`, error);
    response.status(502).json({ error: 'Smoke proxy failure' });
  }
});

app.use(express.static(distRoot, {
  extensions: ['html'],
  index: false,
  maxAge: 0,
}));

app.use((_request, response) => {
  response.sendFile(indexFile);
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Smoke SPA server listening on http://127.0.0.1:${port}`);
});
