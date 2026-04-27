# Bài học rút ra — Phiên 2026-04-27 (Pre-TTTN)

> **Ngữ cảnh**: Phiên fix tổng hợp 1 ngày trước báo cáo TTTN VIMARU
> (28/04/2026). Bao gồm 4 lớp defense chống NonSerializableObjectException
> (Phase 8), bug Tiptap save mất content, blank lesson preview, CSP block
> avatar third-party, và pattern SWR cho content sync.
>
> **Mục đích doc**: Liệt kê các lỗi đã mắc + kỹ thuật SOTA khám phá được,
> để team không lặp lại và áp dụng tiếp cho các module sau.

---

## Phần 1 — Những lỗi lầm đã mắc phải

### Lỗi #1: Hibernate JSONB `NonSerializableObjectException` (3 incidents trong 1 ngày)

**Triệu chứng**: Production 500 errors trên nhiều endpoint student progress
(`POST /api/v3/student/progress/lessons/{id}/complete`, quiz submit, rubric
update). Error: `org.springframework.beans.factory.BeanCreationException:
... NonSerializableObjectException`.

**Root cause**: Hypersistence-utils v3.15.2 (lib quản lý JSONB cho Hibernate)
dùng `SerializationUtils.clone()` (Java Serialization) để **deep-copy** JSONB
values khi Hibernate MERGE entity (UPDATE path). Yêu cầu mọi POJO stored
trong field `@Type(JsonType.class)` phải `implements java.io.Serializable`.

POJO trong codebase **không** implement Serializable:
- `EnrollmentJpaEntity.LessonProgressData`
- `AssignmentRubricJpaEntity.RubricCriterion` + `RubricLevel`
- `QuizAttempt.AttemptItem`

**Bug pattern silent**: Chỉ surface khi UPDATE (MERGE), không khi INSERT
(PERSIST). Test INSERT pass → deploy → user UPDATE → 500 error trong prod.
Lặp lại 3 lần với 3 POJO khác nhau trước khi nhận ra đây là **bug class**,
không phải bug lẻ.

**Lý do sai**: Hibernate JSONB serialization mechanism không phải kiến thức
phổ biến. Library hypersistence-utils dùng Java Serialization làm default
clone — không document rõ ràng yêu cầu `Serializable` cho payload POJOs.
Junior developer add JSONB field thêm chỉ test happy-path INSERT.

**Cách phòng tránh tương lai**: Layer 2 ArchUnit guard (xem Phần 2 — Kỹ thuật
#2). Nếu PR thêm POJO vào JSONB không implement Serializable → CI fail
trước khi merge.

---

### Lỗi #2: Phase 8 Level 3 deploy đầu tiên không hoạt động (silent fail)

**Tóm tắt**: Sau khi commit Phase 8 L3 (Custom JsonSerializer dùng Jackson
clone bypass Java Serializable), startup log `[Phase 8 L3]
JacksonCloneJsonSerializer activated` **không xuất hiện**. JSONB merge
vẫn route qua default `ObjectMapperJsonSerializer` (Java Serialization
path). Bug pattern không được fix.

**Root cause**: Tôi đặt config Hibernate property trong `application.yml`:
```yaml
spring:
  jpa:
    properties:
      hibernate:
        hypersistence.utils.json.serializer: com.example.lms.config.JacksonCloneJsonSerializer
```

**Hypersistence-utils KHÔNG đọc** từ Spring `spring.jpa.properties.hibernate.*`
map. Nó đọc từ:
1. Classpath file: `hypersistence-utils.properties`
2. System properties (`-Dhypersistence.utils.json.serializer=...`)
3. Hibernate `Environment.getProperties()` (low-level)

Spring chỉ truyền properties vào `EntityManagerFactory` config — không vào
hypersistence's static `Configuration.INSTANCE` singleton.

**Cách phát hiện**:
1. SSH prod → grep startup log → không thấy `[Phase 8 L3]` line
2. Trigger JSONB merge (mark lesson complete via API) → vẫn không thấy log
3. Đọc source code `hypersistence-utils-hibernate-63 v3.15.2`:
   `Configuration.java#load()` — chỉ đọc `hypersistence-utils.properties`
   từ classpath
4. Fix: tạo file `backend/src/main/resources/hypersistence-utils.properties`

**Lý do sai**: Tôi giả định Spring → Hibernate property bridge sẽ propagate
mọi setting xuống lib level. Không verify bằng cách đọc lib source code
trước khi commit.

**Bài học**: Khi configure third-party lib qua Spring, **luôn verify** lib
đó đọc property từ Spring environment hay từ classpath/JVM args. Đừng
trust documentation pattern Spring auto-detect.

---

### Lỗi #3: Tiptap save mất content khi user insert callout/template/icon

**Triệu chứng**: Giáo viên báo: "gõ text thường thì save OK, nhưng nếu thêm
icon hoặc các block đặc biệt, text không lưu". Production DB section 2.4
trong "Bài 2: Nguyên lý điều khiển tàu" có `data.content = ""` mặc dù
giáo viên có gõ nội dung.

**Root cause hypothesis (chưa xác định 100%)**:

Race condition giữa `Tiptap.onUpdate` → Angular `[ngModel]` propagation →
signal `set()`. Pattern:

1. User insert callout/template via slash command → fires multiple ProseMirror
   transactions trong burst
2. User click Save trong cùng microtask tick
3. `onSave()` đọc `sectionContent()` signal **trước khi** ngModelChange
   microtask flush → giá trị stale (rỗng)
4. Backend nhận `content=""` → DB lưu empty

Plain text gõ tuần tự không bị vì giữa keystrokes có đủ thời gian flush.

**Cách phát hiện**: User report → đọc DB thấy `content=""` → trace flow
`section-editor.onSave()` → `svc.saveSection()` → `payload['content'] =
this.sectionContent()`. Hypothesis xác nhận bằng SOTA pattern Tiptap docs
2026 / Notion engineering blog: "treat editor instance as source of truth,
don't rely on framework binding sync".

**Fix**: Đọc trực tiếp `editor.getCurrentHTML()` từ ViewChild **trước khi**
gọi service.saveSection. Bypass ngModel pipeline.

**Lý do sai**: Tin tưởng Angular forms binding luôn sync. Không xét đến
edge case khi multiple programmatic transactions fires đồng thời với user
click event.

**Bài học**: **Editor là source of truth**, không phải signal/form. Pattern
này áp dụng cho mọi rich-text editor (Tiptap, ProseMirror, CKEditor, Slate,
Lexical). Khi save: đọc trực tiếp từ editor instance.

---

### Lỗi #4: Empty TEXT section → tab "Tổng quan" trắng hoàn toàn (no fallback UI)

**Triệu chứng**: Giáo viên screenshot: lesson preview "Tổng quan" tab hiển
thị **hoàn toàn trắng**, không có lỗi nào, không có placeholder.

**Root cause**: Template `lesson-content.component.html:79`:
```html
@if (section.type === 'TEXT' && section.content) {
  <div [innerHTML]="getSanitizedHtml(section.content)"></div>
}
```

Guard `&& section.content` false-rỗng khi content là `""`/null/undefined →
**không render gì cả**. Không có `@else` empty-state.

Cộng với Lỗi #3 ở trên — section thực sự có `content=""` trong DB → blank.

Còn tệ hơn: VIDEO/FILE/QUIZ/ASSIGNMENT branches cũng tương tự → nếu user
chọn section type khác và content rỗng → cũng blank.

**Lý do sai**: Design template chỉ nghĩ happy path. Không design empty-state.

**Bài học**: Mọi conditional render branch **phải có fallback UI**. Pattern
SOTA: empty-state với icon + message + CTA (Stripe, Linear, GitHub đều
có pattern này). Không bao giờ để user nhìn vào màn hình trắng không hiểu
là loading hay broken.

---

### Lỗi #5: CSP block third-party avatar service (PWA worker fetch)

**Triệu chứng**: DevTools console flood: "Refused to connect to
`ui-avatars.com` because it violates Content Security Policy directive
`connect-src`". Hiển thị 8+ errors mỗi page load. Avatars không hiện.

**Root cause**: Code dùng `https://ui-avatars.com/api/?name=...` làm fallback
cho user avatars (admin/teacher/student management, sidebar, profile).
Service Worker (NGSW) intercept fetch request để cache → CSP `connect-src`
chỉ allow `'self'` → block.

**Lý do sai**:
1. Implement nhanh với external service mà không nghĩ đến PWA implications
2. Thiếu third-party security audit khi onboard service mới
3. CSP policy không update khi add new external dependency

**Bài học**: PWA-friendly approach — generate avatar inline:

```typescript
function initialsAvatar(name, bg, fg, size) {
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('');
  const svg = `<svg xmlns=...>...</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
```

Pattern này dùng bởi Linear, GitHub fallbacks, Stripe, Notion. Zero network,
CSP-friendly, identical visual.

---

### Lỗi #6: SVG generator thiếu XSS escape (caught trong code review)

**Triệu chứng**: First version của `initialsAvatar()`:
```typescript
const svg = `<svg>...<text>${initials}</text></svg>`;
```

Nếu `name` chứa ký tự HTML special (`<`, `>`, `&`, `"`, `'`) → SVG bị
malformed XML hoặc tạo XSS vector qua data: URL.

**Lý do sai**: Tin "name chỉ lấy charAt(0)" → an toàn. Nhưng `'<'.charAt(0)
= '<'`. Một ký tự HTML special vẫn có thể vào SVG.

**Bài học**: **Defense-in-depth không phải attack-surface fix**. Dù caller
hiện tại chỉ pass hardcoded color và "trusted" name → util shared phải
escape cho mọi tương lai. Pattern OWASP: escape ở mọi chỗ output, không
trust input.

```typescript
function escapeSvgText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')...;
}
function safeColor(c: string, fallback: string): string {
  return /^#[0-9a-fA-F]{3,6}$/.test(c) ? c : fallback;
}
```

---

### Lỗi #7: Course detail SSR routing (4 iterations trước khi đơn giản)

**Triệu chứng**: SSR render trang `/courses/{uuid}` ra component listing
courses thay vì detail component.

**Iterations**:
1. Try `canMatch` guard với UUID regex → không hoạt động vì SSR pre-renders trước khi guard chạy
2. Try `UrlMatcher` custom → SSR conflict với route resolution
3. Try `pathMatch: 'full'` trên listing route → vẫn match
4. **Final**: đơn giản hóa thành `path: 'courses/:id'` không guard,
   xóa `courses/:slug` catch-all

**Lý do sai**: Over-engineer route guard. Angular route resolution với SSR
khác CSR. Không phải mọi pattern client-side đều work.

**Bài học**: Khi SSR routing không hoạt động, **đơn giản hóa trước khi
phức tạp hóa**. Test client-side trước, sau đó SSR. Đừng add guard/matcher
nếu route order trong array đã đủ.

---

### Lỗi #8: Mojibake encoding (32 files bị double-encoded UTF-8)

**Triệu chứng**: Nhiều file BE Java + FE TypeScript có ký tự bị mojibake
(`Ã¡` thay vì `á`, `Æ°` thay vì `ư`, etc.) trong comments tiếng Việt.

**Root cause**: File được mở bằng editor Windows-1252 → save lại UTF-8 →
lần sau mở lại UTF-8 → save → mojibake compounding.

**Fix**: Python `ftfy` library (`fix_text()`) đoán và đảo ngược.

**Lý do sai**: Editor settings không nhất quán giữa team. Git không enforce
UTF-8 BOM-less.

**Bài học**: `.editorconfig` + Git attribute `* text=auto eol=lf` +
EditorConfig plugin trên IDE. Pre-commit hook check UTF-8 validity nếu
serious về Vietnamese support.

---

## Phần 2 — Kỹ thuật SOTA đáng giá đã khám phá

### Kỹ thuật #1: 4-Layer Defense Pattern (Phase 8)

**Tinh thần**: Bug-class elimination thay vì point fix. Khi gặp bug pattern
lặp lại, design **multiple independent layers** để mỗi layer tự đủ ngăn
bug, và combination loại bỏ cả bug class.

**Layer 1 — Source code level**: POJO implements `Serializable`. Đủ để
fix immediate bug.

**Layer 2 — Build-time guard (ArchUnit)**: Test ArchUnit scan tất cả
`@Type(JsonType.class)` field, recurse vào generic type args, fail build
nếu POJO không implement Serializable. Ngăn regression khi developer mới
add JSONB field.

```java
@Test
void all_jsonb_pojos_must_be_serializable() {
    classes()
        .that().areAnnotatedWith(Type.class)
        .or(JsonbSerializableTest::isJsonTypeField)
        .should(implementSerializable())
        .check(importedClasses);
}
```

**Layer 3 — Runtime hardening (Custom JsonSerializer)**: Thay
`ObjectMapperJsonSerializer` (Java Serialization) bằng Jackson clone.
Bypass Serializable requirement entirely. Nếu Layer 1+2 fail → Layer 3
vẫn bảo vệ runtime.

**Layer 4 — Schema redesign (Phase 10 future)**: Refactor
`enrollments.progress JSONB` → `lesson_progress` 3NF table. Eliminate
JSONB POJO problem at root.

**Inspiration**: Google SRE "defense in depth", Anthropic safety
engineering "robustness through layered safeguards".

**Pattern reusable cho**: Bất kỳ bug pattern lặp lại nào — xác định
layers độc lập (code, build, runtime, schema/architecture) → implement
tất cả → bug class không thể tồn tại.

---

### Kỹ thuật #2: ArchUnit cho architectural rules

**Vấn đề thường gặp**: Developer mới add code phá vỡ architectural pattern
(cross-layer import, missing annotation, naming convention violation).
Code review bắt được nhưng không phải lúc nào cũng catch.

**Giải pháp SOTA**: ArchUnit — viết architectural rules dạng test:

```java
@Test
void domain_must_not_depend_on_infrastructure() {
    noClasses().that().resideInAPackage("..domain..")
        .should().dependOnClassesThat().resideInAPackage("..infrastructure..")
        .check(importedClasses);
}
```

Chạy như JUnit test → fail build trên CI → developer **không thể merge**
PR phá rule.

**Áp dụng trong project**: 15 architecture tests:
- 7 CleanArchitecture (domain → application → infrastructure direction)
- 7 DDD rules (Aggregates, Repositories, Value Objects)
- 1 JsonbSerializable (Phase 8 L2)

**Inspiration**: Adam Bien talks, ArchUnit official docs, Domain-Driven
Design enforcement pattern.

---

### Kỹ thuật #3: Editor as Source of Truth (Tiptap/ProseMirror pattern)

**Vấn đề**: Rich-text editors (Tiptap, ProseMirror, Slate, Lexical, CKEditor)
maintain internal document state. Frameworks (Angular Forms, React Hook
Form) maintain another copy via two-way binding. Sync giữa hai có thể có
race conditions, đặc biệt với:
- Programmatic insertContent (slash commands, templates)
- Paste events
- IME composition (Vietnamese, Chinese, Japanese)
- Multi-step transactions trong burst

**Solution**: Editor instance là **canonical state**. Framework binding chỉ
là cache. Tại save time, đọc thẳng `editor.getHTML()` (hoặc `getJSON()`),
không trust signal/formValue.

```typescript
// TiptapEditorComponent
getCurrentHTML(): string {
  if (!this.editor) return '';
  if (this.editor.isEmpty) return '';
  return this.editor.getHTML();
}

// Parent component
async onSave(): Promise<void> {
  const editor = this.tiptapEditor();
  if (editor) {
    const fresh = editor.getCurrentHTML();
    if (fresh !== this.signal()) this.signal.set(fresh);
  }
  await this.svc.save();
}
```

**Inspiration**: Tiptap docs 2026, Notion engineering blog, Coda
collaborative editing whitepaper, Atlassian Confluence editor architecture.

---

### Kỹ thuật #4: SWR Pattern (Stale-While-Revalidate)

**Trade-off truyền thống**: Cache freshness vs. UX latency.
- Cache strict: stale data
- No cache: spinner mỗi lần navigate

**Solution**: SWR — serve stale data **immediately** (instant render) +
background revalidation. Khi server response về, **silently** update UI
nếu khác.

```typescript
loadLesson(id: string) {
  const cached = cache.get(id);
  if (cached) {
    showInstant(cached.detail);
    if (Date.now() - cached.cachedAt > STALE_MS) {
      backgroundRefresh(id);  // silently update
    }
    return;
  }
  fetchFromApi(id);
}
```

**Combine với**: Refetch on visibility/focus change. Khi user switch tab
quay lại → re-check stale → silent refresh.

```typescript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshIfStale();
});
window.addEventListener('focus', refreshIfStale);
```

**Inspiration**: TanStack Query (`refetchOnWindowFocus: true` default),
SWR library (Vercel), Apollo Client, RTK Query.

**Use case**: Mọi data có thể stale (lesson content, course list, dashboard
metrics). KHÔNG dùng cho real-time data (chat, notifications) — đó là
WebSocket use case.

---

### Kỹ thuật #5: Hypersistence-utils properties file mechanism

**Khám phá**: Library này (và các lib Hibernate khác như Hibernate-Tools)
thường có **own properties file** ở classpath cấp cao hơn Spring
properties bridge.

**Cấu hình**: Tạo `src/main/resources/hypersistence-utils.properties`:
```properties
hypersistence.utils.json.serializer=com.example.lms.config.JacksonCloneJsonSerializer
hypersistence.utils.jackson.object.mapper=com.example.lms.config.HibernateJsonConfig
hypersistence.utils.print.banner=false
```

**Apply pattern này cho**: Bất kỳ Hibernate plugin/extension nào — Envers,
Hibernate-Search, hypersistence-utils. Đừng giả định Spring auto-detect.

---

### Kỹ thuật #6: Local SVG Avatar Fallback (Linear/GitHub pattern)

```typescript
export function initialsAvatar(name, bg, fg, size = 160): string {
  const initials = escapeSvgText(extractInitials(name));
  const svg = `<svg ...><text>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
```

**Lợi ích**:
- Zero network dependency → works offline (PWA-friendly)
- CSP-friendly (no `connect-src` whitelist needed)
- Privacy: không leak email/name to third-party
- Performance: instant render, no HTTP request
- Identical visual to ui-avatars.com

**Hardening**: XSS escape on text content + color whitelist regex + size
clamp. Defense-in-depth pattern.

---

### Kỹ thuật #7: Version-based Stale Detection cho PWA Offline

**Vấn đề**: Student download course để học offline. Teacher update content
trên server. Student reconnect — làm sao biết content cũ và đề xuất
re-download?

**Solution**: Server expose batch versions endpoint:
```
GET /api/v3/courses/versions?ids=c1&ids=c2&ids=c3
→ { c1: { contentVersion: 5, publicationId: ..., updatedAt: ... }, ... }
```

Client poll khi reconnect:
```typescript
async checkContentFreshness() {
  const local = await db.courses.toArray();
  const server = await api.getVersions(local.map(c => c.id));
  for (const c of local) {
    const isStale = server[c.id].contentVersion > c.contentVersion;
    if (isStale) {
      db.courses.update(c.id, { isStale: true });
      toast.info(`${c.title}: có cập nhật mới`);
    }
  }
}
```

**Inspiration**: Notion offline sync, Linear sync engine, Figma file
version tracking.

---

## Phần 3 — Quy trình rút ra cho team

### 3.1. Trước khi commit
1. Đọc third-party lib source nếu config qua framework bridge (Spring,
   Angular, etc.)
2. Test happy + edge case + empty state cho mọi conditional render
3. Audit mọi external dependency (CSP, privacy, offline behavior)
4. XSS escape ở mọi chỗ output user-controlled string vào DOM/SVG/SQL
5. Defense-in-depth cho shared utility — không trust caller

### 3.2. Khi gặp bug lặp lại
- Stop coding 5 phút, hỏi: "đây có phải bug class không?"
- Nếu có → design 4-layer defense (code + build guard + runtime hardening
  + architecture refactor)
- Document Phase plan vào `docs/architecture/`

### 3.3. Khi config third-party lib qua Spring Boot
- Default behavior: lib KHÔNG đọc từ `spring.*.properties.*` map
- Verify bằng cách:
  - Đọc lib source code (`Configuration.java`, `BeanFactory.java`)
  - Hoặc tìm doc keyword: "configuration file", "system property"
- Tạo lib-specific properties file ở classpath nếu cần

### 3.4. Khi review PR có rich text editor
- Xác minh save flow đọc trực tiếp từ editor instance, không qua signal/form
- Test với slash commands, programmatic insert, paste, IME composition

### 3.5. Khi design API caching strategy
- Pull-based với SWR là default cho non-realtime data
- WebSocket push chỉ cho data cần latency < 1s (chat, presence)
- Memory cache phải có TTL — không "live forever within session"

---

## Phần 4 — Self-criticism honestly

Những gì đã làm **không đủ SOTA**:

1. **Không có unit test** cho Tiptap save flush fix. Hypothesis race
   condition chưa verify 100% — fix có thể là defense-in-depth chứ không
   phải fix root cause thực.

2. **Server-side HTML sanitization vẫn missing**. `bypassSecurityTrustHtml`
   trong lesson-content.component trust toàn bộ HTML từ teacher. Stored
   XSS nếu teacher account bị compromise. Cần Jsoup whitelist hoặc DOMPurify.

3. **Content storage chỉ HTML, không JSON**. Notion/Coda lưu cả ProseMirror
   JSON (canonical) + HTML (cache for display). HTML có thể lose
   attribute order, normalize whitespace khi roundtrip.

4. **Không có integration test** cho Phase 8 L3 specifically. Chỉ verify
   bằng grep startup log.

5. **Memory cache TTL = 30s là hardcoded**, không cấu hình được. SOTA
   apps cho phép override per-query (TanStack Query: `staleTime` per query).

6. **A11y empty-state UI** thiếu `aria-live`. Screen reader không announce
   khi content thay đổi.

7. **Không profile performance** của Jackson clone vs Java clone. Claim
   "~50-200μs per merge acceptable" là estimate, không đo thực tế.

Roadmap tương lai để fix các gap này — track trong issues, không block
TTTN ngày mai.

---

## Tham khảo

- ArchUnit official: https://www.archunit.org
- Hypersistence-utils: https://github.com/vladmihalcea/hypersistence-utils
- Tiptap docs (editor as source of truth): https://tiptap.dev/docs/guides
- TanStack Query (SWR pattern): https://tanstack.com/query/latest
- SWR library (Vercel): https://swr.vercel.app
- Notion offline sync engineering: https://www.notion.so/blog/data-model-behind-notion
- Linear sync engine: https://linear.app/blog/scaling-the-linear-sync-engine
- Google SRE — defense in depth: https://sre.google/sre-book/

---

**Last updated**: 2026-04-27 21:00 (sau session pre-TTTN)
**Author**: Phiên debug + audit + fix tổng hợp
**Next review**: Sau TTTN defense — sửa các gaps trong Phần 4.
