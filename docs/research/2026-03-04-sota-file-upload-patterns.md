# SOTA File Upload Patterns Research (2025-2026)

> **Date**: 2026-03-04 | **Context**: Spring Boot 3.2 + Angular 20 + Cloudflare R2

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Platform Analysis](#2-platform-analysis)
3. [Architecture Patterns](#3-architecture-patterns)
4. [Security Patterns](#4-security-patterns)
5. [UX Patterns](#5-ux-patterns)
6. [CDN & Image Optimization](#6-cdn--image-optimization)
7. [Recommended Architecture for LMS](#7-recommended-architecture-for-lms)

---

## 1. Executive Summary

The industry has converged on **presigned URL direct upload** as the SOTA pattern. Every major platform (Canvas LMS, Shopify, Coursera, Udemy) uses some variant of client-to-cloud direct upload. The key architectural shift is: **the backend never touches file bytes** -- it only generates upload credentials and records metadata post-upload.

**Current LMS state**: Server-relay pattern (Client -> Spring Boot MultipartFile -> R2 PutObject). This works but creates a bottleneck: the backend must buffer the entire file in memory, consumes server bandwidth, and blocks a thread during upload.

**Recommended upgrade**: Three-phase presigned URL pattern with post-upload validation.

---

## 2. Platform Analysis

### 2.1 Canvas LMS (Instructure)

**Architecture**: Three-step presigned URL upload (the most documented open pattern).

**Flow**:
```
Step 1: POST /api/v1/courses/:id/files  (metadata: name, size, content_type)
        -> Returns { upload_url, upload_params }
        -> File enters "pending" state, invisible in UI
        -> Signature valid for 30 minutes

Step 2: POST multipart/form-data to upload_url with upload_params
        -> "file" parameter MUST be last in multipart sequence
        -> No auth token sent with this request
        -> Request is signed; any param modification = 403 denied
        -> upload_url may be S3, local, or other storage

Step 3: Follow redirect (3XX) or read 201 Created
        -> GET to Location header (authenticated)
        -> Returns file metadata: { id, url, content-type, display_name, size }
```

**Security details**:
- Content-type auto-detected if omitted, validated if provided
- Path traversal: `/` and `\` treated as literal characters, not path delimiters
- `on_duplicate` handling: `overwrite` (default) or `rename`
- Upload params are opaque -- clients must not add/remove/modify them
- Endpoint-specific permissions (submission files vs course files)

**Key insight**: Canvas treats upload_params as opaque signed data. The client doesn't need to understand them. This is the gold standard for security.

Source: [Canvas LMS File Upload API](https://canvas.instructure.com/doc/api/file.file_uploads.html)

### 2.2 Shopify

**Architecture**: Two-step staged upload via GraphQL, with async post-processing.

**Flow**:
```
Step 1: stagedUploadsCreate mutation
        Input:  { filename, mimeType, resource: VIDEO|IMAGE, fileSize }
        Output: { stagedTargets: [{ url, resourceUrl, parameters }] }

Step 2: Direct upload to Google Cloud Storage
        - Videos/3D: POST multipart form data with parameters as form fields
        - Images: PUT with parameters as HTTP headers

Step 3: fileCreate mutation (register file)
        Input: { originalSource: resourceUrl }
        Output: { id, status }

Step 4: Poll fileStatus until READY
        Status progression: UPLOADED -> PROCESSING -> READY | FAILED
```

**Key innovations**:
- **Unified file system**: Upload once, reference by ID from multiple products/variants
- **Async processing pipeline**: Server handles resize/transcode/optimize after upload
- **Resource type awareness**: Different upload methods for different media types
- **Bulk operations**: `stagedUploadsCreate` accepts arrays for parallel uploads
- fileSize required for videos/3D (quota enforcement), optional for images

Source: [Shopify Manage Media](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections/manage-media)

### 2.3 Udemy

**Upload requirements**:
- Course images: 2048x1152 pixels, high resolution
- Bulk uploader supports cloud integrations: Dropbox, Google Drive, Box, Amazon Cloud Drive, OneDrive
- Multiple files uploadable simultaneously via bulk file uploader

**Architecture** (inferred from public docs): Server-mediated upload with cloud storage integration bridges. Udemy appears to use a server-relay for images (smaller files) and cloud-bridge for videos (large files).

Source: [Udemy Upload Course Image](https://support.udemy.com/hc/en-us/articles/229232487-Upload-a-Course-Image)

### 2.4 Google Classroom

**Architecture**: Google Drive-native with add-on attachment API.

- Files are fundamentally Google Drive objects
- Teachers control sharing permissions per-file: view-only, edit, or individual copies
- Attachment limit: 10 per assignment (max 8 of single type)
- Two attachment types: activity (requires student submission) and content (view-only)
- External attachments supported via add-on API

**Key insight**: Google Classroom delegates file storage entirely to Google Drive. The LMS layer only manages references and permissions.

Source: [Google Classroom Attachments](https://developers.google.com/workspace/classroom/add-ons/get-started/attachments-journey)

### 2.5 UploadThing (Modern SaaS Pattern)

**Architecture**: Declarative file router with middleware-based validation.

**Pattern**:
```typescript
// Server: Define upload routes with validation
export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const user = await auth(req);
      if (!user) throw new UploadThingError("Unauthorized");
      return { userId: user.id };  // metadata available in onComplete
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Runs on server after upload; return data goes to client
      return { uploadedBy: metadata.userId };
    }),
};

// Client: Type-safe generated components
const UploadButton = generateUploadButton<OurFileRouter>();
```

**Key innovations**:
- **Type-safe file routing**: Server defines constraints, client auto-enforces
- **Middleware pattern**: Auth + validation runs before upload starts
- **CDN-backed delivery + resumable uploads** for large files
- **Separation of concerns**: Route config doesn't leak to client (SSR plugin)

Source: [UploadThing Docs](https://docs.uploadthing.com/getting-started/appdir)

---

## 3. Architecture Patterns

### 3.1 Pattern Comparison

| Pattern | Used By | Pros | Cons |
|---------|---------|------|------|
| **Server-Relay** (current LMS) | Legacy apps, small files | Simple, full server control | Blocks threads, memory pressure, bandwidth cost |
| **Presigned URL (PUT)** | Cloudflare R2, AWS S3 | Zero server load, direct edge upload | No multipart form, harder progress tracking |
| **Presigned POST (multipart)** | Canvas LMS, AWS S3 | Policy conditions, form-compatible | R2 does NOT support presigned POST |
| **Staged Upload** | Shopify | Full lifecycle management, async processing | More complex, requires polling |
| **Declarative Router** | UploadThing | Type-safe, middleware validation | Framework-specific, vendor lock-in |

### 3.2 Presigned URL Flow (Best for R2)

Since Cloudflare R2 supports presigned PUT but NOT presigned POST, the recommended flow is:

```
Client                    Spring Boot                 Cloudflare R2
  |                          |                            |
  |--- POST /upload/init --->|                            |
  |    { filename,           |                            |
  |      contentType,        |--- Generate presigned  --->|
  |      size }              |    PUT URL (5 min TTL)     |
  |                          |                            |
  |<-- { uploadUrl,      ---|                            |
  |      key,                |                            |
  |      expiresAt }         |                            |
  |                          |                            |
  |--- PUT file bytes ---------------------------------->|
  |    (direct to R2,        |                            |
  |     no auth token)       |                            |
  |                          |                            |
  |<-- 200 OK --------------|-----(from R2)              |
  |                          |                            |
  |--- POST /upload/confirm->|                            |
  |    { key, originalName } |--- HEAD object ---------->|
  |                          |    (verify existence)      |
  |                          |                            |
  |<-- { id, url,        ---|                            |
  |      publicUrl }         |                            |
```

### 3.3 Spring Boot Presigned URL Generation (Java SDK v2)

```java
// R2Config.java - Add S3Presigner bean
@Bean
public S3Presigner r2Presigner() {
    return S3Presigner.builder()
        .endpointOverride(URI.create("https://" + accountId + ".r2.cloudflarestorage.com"))
        .credentialsProvider(StaticCredentialsProvider.create(
            AwsBasicCredentials.create(accessKey, secretKey)))
        .region(Region.of("auto"))
        .build();
}

// Service: Generate presigned PUT URL
public PresignedUploadResult generateUploadUrl(String folder, String contentType, long fileSize) {
    String key = folder + "/" + UUID.randomUUID() + extensionFromMime(contentType);

    PutObjectRequest putRequest = PutObjectRequest.builder()
        .bucket(bucket)
        .key(key)
        .contentType(contentType)       // Enforced in signature
        .contentLength(fileSize)        // Enforced in signature
        .build();

    PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
        .signatureDuration(Duration.ofMinutes(5))   // Short-lived!
        .putObjectRequest(putRequest)
        .build();

    PresignedPutObjectRequest presigned = presigner.presignPutObject(presignRequest);

    return new PresignedUploadResult(
        presigned.url().toString(),
        key,
        presigned.expiration()
    );
}
```

Source: [AWS SDK Java Presigned URLs](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/examples-s3-presign.html)

### 3.4 Angular Client Upload with Progress

```typescript
// upload.service.ts - Direct upload to presigned URL with progress
uploadToPresignedUrl(url: string, file: File, onProgress: (pct: number) => void): Observable<void> {
  return new Observable(observer => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        observer.next();
        observer.complete();
      } else {
        observer.error(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => observer.error(new Error('Network error')));
    xhr.addEventListener('abort', () => observer.error(new Error('Upload aborted')));

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
```

**Why XMLHttpRequest instead of fetch()**: The Fetch API does not support upload progress events. `xhr.upload.onprogress` is the only way to get real-time upload progress in browsers (as of 2026).

---

## 4. Security Patterns

### 4.1 Pre-Upload Validation (Backend)

Before generating a presigned URL, the backend MUST validate:

```java
// 1. Authentication: User must be logged in
// 2. Authorization: User has permission to upload to this resource
// 3. MIME type whitelist
private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
    "image/jpeg", "image/png", "image/webp", "image/gif"
);

// 4. File size limits per category
private static final Map<String, Long> MAX_SIZES = Map.of(
    "thumbnail", 5L * 1024 * 1024,      // 5MB
    "course-image", 10L * 1024 * 1024,   // 10MB
    "document", 50L * 1024 * 1024,       // 50MB
    "video", 500L * 1024 * 1024          // 500MB
);

// 5. Rate limiting: Max uploads per user per hour
// 6. Filename sanitization: Replace with UUID (never trust client filenames)
```

### 4.2 Presigned URL Security (from AWS + Cloudflare best practices)

| Practice | Detail |
|----------|--------|
| **Short expiration** | 5 minutes for uploads (not 30 min like Canvas) |
| **Content-Type in signature** | R2 rejects mismatched MIME types with 403 |
| **Content-Length in signature** | Prevents upload of larger-than-declared files |
| **UUID keys** | Never use client-provided filenames in storage keys |
| **One-time conceptual use** | Track issued presigned URLs in Redis; mark used on confirm |
| **HTTPS only** | R2 endpoints are HTTPS by default |
| **CORS lockdown** | AllowedOrigins: your domain only, AllowedMethods: PUT only |

Source: [Cloudflare R2 Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [AWS Presigned URL Best Practices](https://aws.amazon.com/blogs/compute/securing-amazon-s3-presigned-urls-for-serverless-applications/)

### 4.3 Post-Upload Validation

Since presigned URLs only enforce structure (content-type, size), deep validation must happen after upload:

```
Upload completes -> Client calls /upload/confirm -> Backend:
  1. HEAD object on R2 (verify existence + actual size)
  2. Read magic bytes (first 8 bytes) to verify actual file type
  3. For images: validate dimensions, reject if > 10000x10000
  4. Record in file_attachments table with status = ACTIVE
  5. Return public URL
```

**Virus scanning** (production pattern from AWS):
```
S3/R2 Event Notification -> SQS Queue -> Lambda/Worker:
  1. Download file to /tmp
  2. Run ClamAV scan
  3. If clean: tag object with scan-status=clean
  4. If infected: delete object, mark DB record as QUARANTINED
  5. Notify user
```

For R2 specifically, a Cloudflare Worker can be triggered on `object.create` events to perform lightweight validation.

Source: [S3 Upload Pipeline with Lambda](https://brightinventions.pl/blog/efficient-S3-file-uploads-with-async-processing/)

### 4.4 CORS Configuration for R2

```json
[
  {
    "AllowedOrigins": ["https://holilihu.online", "http://localhost:4200"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

**Critical**: R2 presigned URLs only work on the S3 API domain (`<account-id>.r2.cloudflarestorage.com`), NOT on custom domains. Custom domain access uses different auth (WAF HMAC).

---

## 5. UX Patterns

### 5.1 Industry Standard Upload UX (2025-2026)

| Feature | Coursera/Udemy | Shopify | Canvas | Recommended |
|---------|---------------|---------|--------|-------------|
| Drag & drop | Yes | Yes | Yes | Required |
| Click to browse | Yes | Yes | Yes | Required |
| Progress bar | Yes | Yes | Yes | Required (real %) |
| Image preview | Yes | Yes | No | Required for images |
| Crop/resize | No | No | No | Nice-to-have |
| Multiple files | Video bulk | Yes (20/batch) | Yes | Per use case |
| Cancel upload | Yes | Yes | Yes | Required |
| File type indicator | Icons | File type badge | Icons | Required |
| Error messaging | Inline | Inline + toast | Modal | Inline preferred |
| Retry on failure | Auto | Manual | Manual | Manual + auto option |
| Cloud import | No | Yes (URL) | Yes (URL) | Nice-to-have |

### 5.2 Recommended LMS Upload Component UX

```
+--------------------------------------------------+
|  +--------------------------------------------+  |
|  |    [cloud icon]                             |  |
|  |                                             |  |
|  |    Keo tha anh khoa hoc vao day            |  |
|  |    hoac nhan de chon file                  |  |
|  |                                             |  |
|  |    JPG, PNG, WebP - Toi da 5MB             |  |
|  |    Kich thuoc khuyen nghi: 1280x720        |  |
|  +--------------------------------------------+  |
|                                                   |
|  [Preview]  filename.jpg  2.4MB  [X remove]       |
|  [==========>          ] 67%   [Cancel]            |
|                                                   |
+--------------------------------------------------+
```

**Key UX principles** (from Uploadcare research):
- Show accepted formats and size limits BEFORE upload attempt
- Provide instant client-side preview using `URL.createObjectURL()`
- Show real progress percentage (not fake/indeterminate)
- Allow cancel mid-upload (xhr.abort())
- Clear error messages: "File vượt quá 5MB" not "Upload failed"
- After upload: show thumbnail + filename + size + remove button

Source: [Uploadcare UX Best Practices](https://uploadcare.com/blog/file-uploader-ux-best-practices/), [Filestack Modern Upload UI](https://blog.filestack.com/building-modern-drag-and-drop-upload-ui/)

---

## 6. CDN & Image Optimization

### 6.1 Cloudflare Images + R2 Architecture

Cloudflare provides URL-based image transformation that works directly with R2:

```
Original stored in R2:
  r2://bucket/courses/uuid-123.jpg

Transformed via URL:
  https://holilihu.online/cdn-cgi/image/width=400,quality=80,format=auto/courses/uuid-123.jpg
```

**Request flow**:
```
Client -> Cloudflare CDN (nearest PoP)
  |-- Cache HIT -> Return cached transformed image
  |-- Cache MISS -> Fetch from R2 origin
                    -> Apply transformation
                    -> Cache result
                    -> Return to client
```

**Transformation options**:
| Option | Example | Use Case |
|--------|---------|----------|
| `width` | `width=400` | Thumbnail |
| `height` | `height=300` | Constrained |
| `fit` | `fit=cover` | Crop to fill |
| `quality` | `quality=80` | Compression |
| `format` | `format=auto` | WebP/AVIF auto-negotiation |
| `dpr` | `dpr=2` | Retina displays |

**Pricing**: $0.50 per 1,000 unique transformations/month. Only originals stored in R2 (no resized variants).

**Key insight**: Only store the original image. Generate all variants (thumbnail, card, hero) via URL parameters at request time. Cloudflare CDN caches the results globally.

Source: [Cloudflare R2 + Image Resizing Architecture](https://developers.cloudflare.com/reference-architecture/diagrams/content-delivery/optimizing-image-delivery-with-cloudflare-image-resizing-and-r2/)

### 6.2 Responsive Image Pattern

```html
<!-- Course card thumbnail -->
<img
  srcset="
    /cdn-cgi/image/width=320,quality=80,format=auto/courses/img.jpg 320w,
    /cdn-cgi/image/width=640,quality=80,format=auto/courses/img.jpg 640w,
    /cdn-cgi/image/width=960,quality=80,format=auto/courses/img.jpg 960w
  "
  sizes="(max-width: 640px) 320px, (max-width: 1024px) 640px, 960px"
  src="/cdn-cgi/image/width=640,quality=80,format=auto/courses/img.jpg"
  alt="Course thumbnail"
  loading="lazy"
/>
```

### 6.3 Image Optimization on Upload (via Cloudflare Worker)

For pre-processing before storage (watermarks, format conversion):

```typescript
// Cloudflare Worker: Transform before storing in R2
const transformed = await env.IMAGES
  .input(uploadedFileStream)
  .output({ format: "image/avif", quality: 80 })
  .response();

await env.R2.put(`courses/${uuid}.avif`, transformed.body);
```

Source: [Cloudflare Transform User Uploads](https://developers.cloudflare.com/images/tutorials/optimize-user-uploaded-image/)

---

## 7. Recommended Architecture for LMS

### 7.1 Target Architecture

```
Phase 1 (Minimum Viable):  Presigned URL for images (thumbnails, course images)
Phase 2 (Enhancement):     Presigned URL for all file types + progress bar
Phase 3 (Advanced):        Cloudflare Image Transformations + CDN delivery
```

### 7.2 Phase 1: Presigned URL Upload for Images

#### Backend Changes

**New endpoint: `POST /api/v3/files/upload/init`**
```java
@PostMapping("/upload/init")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
public ResponseEntity<PresignedUploadResponse> initUpload(
    @RequestBody @Valid InitUploadRequest request,
    @AuthenticationPrincipal UserJpaEntity user
) {
    // 1. Validate content type
    // 2. Validate size limit
    // 3. Generate UUID key
    // 4. Generate presigned PUT URL (5 min TTL)
    // 5. Record pending upload in DB
    // 6. Return { uploadUrl, key, expiresAt }
}
```

**New endpoint: `POST /api/v3/files/upload/confirm`**
```java
@PostMapping("/upload/confirm")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
public ResponseEntity<FileUploadResponse> confirmUpload(
    @RequestBody @Valid ConfirmUploadRequest request,
    @AuthenticationPrincipal UserJpaEntity user
) {
    // 1. Verify key exists in pending uploads for this user
    // 2. HEAD object on R2 to verify file exists
    // 3. Verify actual size matches declared size
    // 4. Update DB record: pending -> active
    // 5. Return { id, publicUrl, storageKey }
}
```

**Keep existing server-relay endpoint** (`POST /upload/editor`) as fallback for:
- CKEditor/EditorJS inline images (these use their own upload adapters)
- Small files < 1MB where presigned URL overhead isn't worth it
- Environments where CORS isn't configured on R2

#### Frontend Changes

```typescript
// presigned-upload.service.ts
@Injectable({ providedIn: 'root' })
export class PresignedUploadService {
  private apiClient = inject(ApiClient);

  uploadImage(file: File, folder: string): Observable<UploadResult> {
    return new Observable(observer => {
      // Step 1: Get presigned URL
      this.apiClient.post('/files/upload/init', {
        filename: file.name,
        contentType: file.type,
        size: file.size,
        folder
      }).subscribe({
        next: (init) => {
          // Step 2: Upload directly to R2
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              observer.next({ type: 'progress', progress: (e.loaded/e.total)*100 });
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              // Step 3: Confirm upload
              this.apiClient.post('/files/upload/confirm', {
                key: init.key,
                originalName: file.name
              }).subscribe({
                next: (result) => {
                  observer.next({ type: 'complete', ...result });
                  observer.complete();
                },
                error: (err) => observer.error(err)
              });
            }
          };
          xhr.open('PUT', init.uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);
        },
        error: (err) => observer.error(err)
      });
    });
  }
}
```

### 7.3 R2 Configuration Changes

**R2Config.java - Add presigner bean**:
```java
@Bean
public S3Presigner r2Presigner() {
    return S3Presigner.builder()
        .endpointOverride(URI.create("https://" + accountId + ".r2.cloudflarestorage.com"))
        .credentialsProvider(StaticCredentialsProvider.create(
            AwsBasicCredentials.create(accessKey, secretKey)))
        .region(Region.of("auto"))
        .serviceConfiguration(S3Configuration.builder()
            .pathStyleAccessEnabled(true)
            .build())
        .build();
}
```

**R2 Bucket CORS** (set via Cloudflare dashboard or API):
```json
[
  {
    "AllowedOrigins": ["https://holilihu.online", "http://localhost:4200"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

### 7.4 Database Schema Addition

```sql
-- V74__presigned_upload_tracking.sql
CREATE TABLE upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_key VARCHAR(512) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    content_type VARCHAR(128) NOT NULL,
    declared_size BIGINT NOT NULL,
    folder VARCHAR(128) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, CONFIRMED, EXPIRED
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_upload_sessions_user_status ON upload_sessions(user_id, status);
CREATE INDEX idx_upload_sessions_expires ON upload_sessions(expires_at) WHERE status = 'PENDING';
```

### 7.5 Migration Path (Zero Downtime)

1. **Add presigner bean** alongside existing S3Client (both use same credentials)
2. **Add new init/confirm endpoints** (new URLs, no conflict with existing)
3. **Update FE upload service** to use presigned for images, keep server-relay for others
4. **Add CORS to R2 bucket** via Cloudflare dashboard
5. **Scheduled cleanup**: Cron job to expire PENDING upload_sessions after 1 hour
6. **Keep existing `/upload/editor`** endpoint for CKEditor compatibility

### 7.6 Performance Comparison

| Metric | Server-Relay (Current) | Presigned URL (Proposed) |
|--------|----------------------|--------------------------|
| Backend memory per upload | file_size bytes | ~0 bytes |
| Backend CPU per upload | Full stream processing | 1 presign + 1 HEAD call |
| Upload latency | Client -> Server -> R2 | Client -> R2 (direct) |
| Thread blocking | Full upload duration | None (async) |
| Max concurrent uploads | Limited by server RAM | Unlimited (R2 handles) |
| Progress tracking | Server must relay | Native XHR progress |
| Network cost | Double bandwidth | Single trip |

---

## Appendix A: Platform Architecture Summary

| Platform | Upload Pattern | Storage | CDN | Async Processing |
|----------|---------------|---------|-----|-----------------|
| **Canvas LMS** | 3-step presigned POST | S3 (configurable) | CloudFront | No |
| **Shopify** | 2-step staged + GraphQL | Google Cloud Storage | Shopify CDN | Yes (resize/transcode) |
| **Udemy** | Server-relay + cloud bridges | AWS S3 | CloudFront | Yes (transcode) |
| **Google Classroom** | Google Drive native | Google Drive | Google CDN | Yes (Drive processing) |
| **UploadThing** | Declarative router + direct | S3-compatible | UT CDN | Yes (via callbacks) |
| **LMS (proposed)** | 3-step presigned PUT | Cloudflare R2 | Cloudflare CDN | Optional (Workers) |

## Appendix B: Key Sources

- Canvas LMS API: https://canvas.instructure.com/doc/api/file.file_uploads.html
- Cloudflare R2 Presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Cloudflare Image Optimization with R2: https://developers.cloudflare.com/reference-architecture/diagrams/content-delivery/optimizing-image-delivery-with-cloudflare-image-resizing-and-r2/
- AWS SDK Java Presigned URLs: https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/examples-s3-presign.html
- AWS Securing Presigned URLs: https://aws.amazon.com/blogs/compute/securing-amazon-s3-presigned-urls-for-serverless-applications/
- Shopify Staged Uploads: https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections/manage-media
- UploadThing Docs: https://docs.uploadthing.com/getting-started/appdir
- R2 Direct Upload Guide: https://ruanmartinelli.com/blog/cloudflare-r2-pre-signed-urls/
- S3 Pipeline with Lambda: https://brightinventions.pl/blog/efficient-S3-file-uploads-with-async-processing/
- Upload UX Best Practices: https://uploadcare.com/blog/file-uploader-ux-best-practices/
- Cloudflare Transform Uploads: https://developers.cloudflare.com/images/tutorials/optimize-user-uploaded-image/
