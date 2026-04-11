# Editor Page Design Guide — LMS Maritime

> Quy tắc thiết kế cho tất cả trang editor (Course Info, Curriculum, Settings, v.v.).
> Áp dụng nguyên tắc SOTA từ Udemy, Coursera, Canvas, GitHub Settings, GOV.UK Design System.
> **Last Updated**: 2026-04-12 | **Session**: Course Info UX Deep Audit

---

## 1. Quy trình thiết kế (bắt buộc)

```
Research → Design → Approve → Implement → Verify
```

### SKILLs sử dụng theo thứ tự:

| Bước | SKILL | Mục đích |
|------|-------|---------|
| 1 | `cot-research` | Nghiên cứu SOTA — so sánh Udemy/Coursera/Canvas/GOV.UK |
| 2 | `brainstorming` | Đánh giá nhiều phương án, chọn tối ưu |
| 3 | `audit` | Đánh giá accessibility, responsive, visual hierarchy |
| 4 | `frontend-design` | Implement nếu cần redesign lớn |
| 5 | `agent-browser` | Screenshot trước/sau, verify trên browser |

### Nguyên tắc nghiên cứu:

- **Luôn tham khảo ≥3 platform SOTA** trước khi quyết định
- So sánh dạng bảng: Platform | Pattern | Lý do
- Ưu tiên: Udemy (course editor SOTA) → Canvas (LMS SOTA) → Coursera → GOV.UK (form UX)
- Không code trước khi nghiên cứu xong — tránh patch fix

---

## 2. Layout Pattern: Scroll-spy Sidebar

### Khi nào dùng:
- Trang có ≥3 sections/cards cùng chủ đề
- Form settings/info với nhiều nhóm fields
- SOTA: GitHub Settings, Stripe Dashboard, VS Code Settings, Udemy Course Landing Page

### Cấu trúc:

```
┌────────────────────────────────────────────────────────┐
│ [Header — compact, max 48px]                           │
│ [Tabs — nếu có nhiều trang con]                        │
├──────────┬─────────────────────────────────────────────┤
│ Sidebar  │ Content (scrollable)                        │
│ 180-200px│                                             │
│ sticky   │ [Card 1 — Section đầu tiên]                 │
│          │ [Card 2 — Section tiếp theo]                 │
│ ● Cơ bản │ [Card 3 — ...]                              │
│ ○ Ảnh    │ ...                                         │
│ ● Mô tả │                                             │
│ ○ Cài đặt│                                             │
├──────────┴─────────────────────────────────────────────┤
│ [Save Bar — sticky bottom, chỉ hiện khi có thay đổi]  │
└────────────────────────────────────────────────────────┘
```

### CSS Grid:

```scss
// Mobile: single column, sidebar ẩn
.layout { display: grid; grid-template-columns: 1fr; }

// Desktop (≥768px)
@media (min-width: 768px) {
  .layout { grid-template-columns: 180px minmax(0, 720px); max-width: 960px; margin: 0 auto; }
}

// Wide (≥1280px)
@media (min-width: 1280px) {
  .layout { grid-template-columns: 200px minmax(0, 760px); max-width: 1040px; }
}
```

### Sidebar styling:

```scss
.sidebar {
  display: none; // Mobile: ẩn
  @media (min-width: 768px) { display: block; position: sticky; top: 1.25rem; align-self: start; }
}
.sidebar__item {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgb(100 116 139);
  border-radius: 0.375rem;
}
.sidebar__item--active {
  color: rgb(0 86 210);
  background: rgba(0, 86, 210, 0.06);
  font-weight: 600;
}
```

### Scroll-spy logic (Angular):

```typescript
// Scroll event trên container cha, threshold 20% viewport
private setupScrollSpy() {
  const scrollRoot = this.el.nativeElement.closest('.overflow-y-auto');
  const updateActive = () => {
    const rootRect = scrollRoot.getBoundingClientRect();
    const threshold = rootRect.top + rootRect.height * 0.2;
    let activeKey = this.sectionNav[0].key;
    for (const item of this.sectionNav) {
      const el = document.getElementById('section-' + item.key);
      if (el && el.getBoundingClientRect().top <= threshold) activeKey = item.key;
    }
    this.activeSection.set(activeKey);
  };
  scrollRoot.addEventListener('scroll', updateActive, { passive: true });
}
```

### Completion dots:

```
● Xanh dương (active)  — section đang xem (#0056D2)
● Xanh lá (filled)     — section đã có nội dung (#10b981)
● Xám (empty)          — section chưa điền (rgb(203 213 225))
```

Dùng `[style.background]` binding thay vì CSS class (Angular esbuild strip unused CSS classes).

---

## 3. Card Pattern: Editor Card

### Cấu trúc:

```html
<section class="editor-card">
  <div class="editor-card__header">
    <div>
      <h2 class="editor-card__title">Tiêu đề section</h2>
      <p class="editor-card__subtitle">Mô tả ngắn — viết cho giảng viên đọc</p>
    </div>
    <!-- Optional: action button (Mở rộng, Xem trước) -->
  </div>
  <div class="editor-card__body editor-stack">
    <!-- Fields -->
  </div>
</section>
```

### CSS Variables:

```scss
--editor-card-radius: 0.625rem;      // 10px
--editor-control-radius: 0.5rem;     // 8px
--editor-card-border: rgb(217 226 236);
--editor-control-border: rgb(193 204 218);
```

### Card header:

```scss
.editor-card__header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--editor-card-header-border);
  background: rgb(248 250 252); // slate-50
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
```

---

## 4. Form Controls

### Input/Select/Textarea:

```scss
min-height: 2.75rem;          // 44px — touch-friendly
padding: 0.75rem;
font-size: 0.875rem;          // 14px
border: 1px solid var(--editor-control-border);
border-radius: var(--editor-control-radius);
// Focus: border-color: #0056D2; box-shadow: 0 0 0 3px rgba(0,86,210,0.1)
// Error: border-color: rgb(239 68 68)
```

### Labels:

```scss
.editor-label { font-size: 0.875rem; font-weight: 600; color: rgb(51 65 85); }
.editor-hint  { font-size: 0.75rem; color: rgb(100 116 139); }
.editor-field-error { font-size: 0.75rem; color: rgb(220 38 38); }
```

### Choice Cards (radio/checkbox):

```scss
.choice-card {
  padding: 0.75rem;
  border: 1px solid var(--editor-control-border);
  border-radius: var(--editor-control-radius);
  // Selected: border-color: #0056D2; box-shadow: 0 0 0 1px rgba(0,86,210,0.15)
}
// Grid: 1 col mobile, 2 col desktop (min-width: 640px)
```

---

## 5. Skeleton Loading

### Quy tắc:
- Skeleton **phải match layout thật** (sidebar + content grid)
- Dùng `animate-pulse` cho shimmer effect
- Hiện ≥2 card placeholders (gợi ý có nhiều sections)
- Sidebar skeleton: 5-6 dòng text placeholder
- Card skeleton: header bar + 2-3 field placeholders

### Ví dụ:

```html
<div class="layout animate-pulse">
  <nav class="sidebar" aria-hidden="true">
    <div class="flex flex-col gap-2 pt-1">
      <div class="h-4 w-20 bg-slate-200 rounded"></div>
      <div class="h-4 w-24 bg-slate-200 rounded"></div>
      <!-- ... -->
    </div>
  </nav>
  <div class="content">
    <div class="editor-card">
      <div class="editor-card__header"><div class="h-4 w-32 bg-slate-200 rounded"></div></div>
      <div class="editor-card__body editor-stack">
        <div class="h-10 bg-slate-100 rounded-lg"></div>
        <div class="h-20 bg-slate-100 rounded-lg"></div>
      </div>
    </div>
    <div class="editor-card"><!-- card 2 skeleton --></div>
  </div>
</div>
```

---

## 6. Vietnamese Text Rules (Bắt buộc)

### Nguyên tắc chung:
- **Viết cho giảng viên 50 tuổi đọc** — không phải developer
- Tiếng Việt có dấu, capitalize first word only
- Không jargon: "metadata" → "thông tin", "pipeline" → bỏ, "asset" → "video đã tải lên"
- Subtitle mô tả **kết quả** (học viên sẽ thấy gì) thay vì **cơ chế** (hệ thống làm gì)

### Checklist text:
- [ ] Label/title: ngắn, rõ ý (≤5 từ)
- [ ] Subtitle: 1 câu, mô tả nội dung hiển thị ở đâu
- [ ] Placeholder: gợi ý nội dung cần nhập
- [ ] Hint: giải thích thêm, ≤2 câu
- [ ] Error: nói rõ cần làm gì ("Nhập tên khóa học." thay vì "Field required")

### Từ vựng chuẩn:

| Tiếng Anh | Tiếng Việt chuẩn | KHÔNG dùng |
|-----------|-----------------|-----------|
| subtitle / short description | Giới thiệu ngắn | Mô tả ngắn (trùng), subtitle |
| course description | Mô tả khóa học | Nội dung chi tiết |
| what you'll learn | Bạn sẽ học được gì | Learning outcomes |
| thumbnail | Ảnh bìa | Thumbnail, hình ảnh đại diện |
| promo video | Video giới thiệu | Promo video |
| category | Danh mục | Category |
| tags | Thẻ chủ đề | Tags |
| visibility | Hiển thị | Visibility |
| public | Công khai | Public |
| private | Riêng tư | Private |
| pricing | Học phí | Pricing |
| free | Miễn phí | Free |
| save | Lưu thay đổi | Save |
| discard | Hủy thay đổi | Discard, Reset |
| publish | Xuất bản | Publish |
| expand | Mở rộng | Expand, Fullscreen |

---

## 7. Section Ordering (SOTA)

Theo Udemy/Coursera/Thinkific funnel pattern:

```
1. Identity      → Tên, danh mục, hình thức (ai? cái gì?)
2. Visual        → Ảnh bìa, video giới thiệu (trông như thế nào?)
3. Content       → Mô tả, kết quả học tập (dạy gì?)
4. Distribution  → Hiển thị, thẻ chủ đề (ai thấy?)
5. Commercial    → Học phí (giá bao nhiêu?) — LUÔN cuối
```

---

## 8. Responsive Breakpoints

| Breakpoint | Layout | Sidebar |
|-----------|--------|---------|
| < 768px (mobile) | Single column, full-width | Ẩn hoàn toàn |
| ≥ 768px (tablet) | Grid: 180px + content | Hiện, sticky |
| ≥ 1280px (desktop) | Grid: 200px + content | Hiện, sticky |

### Mobile-specific:
- Save bar: `flex-direction: column`, buttons stretch full-width
- Cards: padding giảm `1rem` thay vì `1.25rem`
- Scroll tự nhiên, không cần sidebar navigation

---

## 9. Save Bar Pattern

```
[● Chưa lưu]          [Hủy thay đổi] [Lưu thay đổi]
```

- `position: sticky; bottom: 0`
- `backdrop-filter: blur(8px)` + `background: rgba(255,255,255,0.94)`
- Chỉ hiện khi `form.dirty || isUploading()`
- Mobile: stack vertical, buttons full-width

---

## 10. Fullscreen Editor Pattern

Khi rich text editor cần nhiều không gian:

```scss
.editor-card--expanded {
  position: fixed;
  inset: 0;
  z-index: 50;
  border-radius: 0;
  display: flex;
  flex-direction: column;
}
```

- Nút "Mở rộng" / "Thu nhỏ" ở card header (phải)
- **Escape key** đóng fullscreen
- Editor height tăng khi expanded (360 → 800)

---

## 11. Audit Checklist (cho mỗi trang editor)

### Layout & Structure:
- [ ] Sidebar hiện đúng số items, highlight đúng section khi scroll
- [ ] Scroll-spy chính xác (20% threshold)
- [ ] Completion dots phản ánh đúng trạng thái
- [ ] Skeleton match layout thật
- [ ] Grid responsive: mobile → tablet → desktop

### Form & Interaction:
- [ ] Tất cả fields có label + placeholder
- [ ] Required fields có dấu `*` đỏ
- [ ] Error messages rõ ràng, viết cho giảng viên
- [ ] Save bar hiện khi dirty, ẩn khi saved
- [ ] Discard reset đúng giá trị gốc
- [ ] Validation summary hiện đúng lỗi, click scroll tới field

### Accessibility:
- [ ] Focus ring visible (`#0056D2`)
- [ ] Choice cards: keyboard navigation (Tab + Space/Enter)
- [ ] ARIA labels cho interactive elements
- [ ] Color contrast WCAG AA (4.5:1 text, 3:1 non-text)

### Vietnamese:
- [ ] Tất cả text tiếng Việt có dấu
- [ ] Không jargon kỹ thuật
- [ ] Subtitles mô tả kết quả, không mô tả cơ chế
- [ ] Capitalize first word only

### Performance:
- [ ] Tiptap editor không load trước khi visible (nếu có lazy option)
- [ ] Upload có progress + cancel
- [ ] Form changes debounced nếu auto-save

---

## 12. Anti-patterns (KHÔNG làm)

| Anti-pattern | Thay thế |
|-------------|---------|
| Pill tabs cho ≤3 sections | Stacked cards + scroll |
| Tách mỗi section ra trang riêng | Stacked + scroll-spy sidebar |
| Gradient cards, dual shadows | Flat cards, 1px border, subtle shadow |
| "Mở rộng" cho mọi section | Chỉ cho rich text editor (Tiptap) |
| Icon-only sidebar | Text labels (readable) |
| Custom dropdown khi native đủ | Native `<select>` |
| Red/orange cho non-error UI | Chỉ dùng red cho semantic errors |
| Vertical centering form ít fields | Top-aligned, stacked cards fill space |

---

*Tài liệu này được tạo từ SOTA research session 2026-04-12.*
*Tham khảo: Udemy, Coursera, Canvas LMS, GitHub Settings, Stripe Dashboard, GOV.UK Design System, NNGroup.*
