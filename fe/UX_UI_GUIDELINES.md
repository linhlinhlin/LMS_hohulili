# UX/UI Guidelines — LMS Maritime

> Quy tắc thiết kế đồng bộ cho toàn bộ ứng dụng. Cập nhật khi có quyết định mới.
> Áp dụng cho tất cả pages: student, teacher, admin, public.

---

## 1. Design Tokens

```
Primary:        #0056D2
Primary Hover:  #004BB5
Primary Light:  bg-[#0056D2]/5, /10, /20
Focus Ring:     focus:ring-[#0056D2] focus:border-[#0056D2]
Cards:          bg-white rounded-xl border border-gray-200 shadow-sm
Page BG:        bg-slate-50
Dark Section:   bg-[#0a1628] (hero, CTA, maritime dark)
Red:            CHỈ cho semantic (errors, destructive actions)
Green:          CHỈ cho semantic (success, completed, miễn phí)
```

---

## 2. Button Layout — Action Buttons Pattern

### Nguyên tắc cốt lõi

- **Primary CTA luôn ở vị trí cố định** (right edge trên desktop)
- Secondary buttons có thể dịch chuyển — chỉ CTA cần muscle memory
- Sử dụng `min-width` + `justify-content: flex-end` để anchor CTA

### Thứ tự nút (trái → phải = ít → nhiều quan trọng)

```
Desktop:  [Expand ▼] [Secondary?] [Primary CTA]
                                   ↑ always right edge

Mobile:   [Primary CTA ~~~~~~~~] [▼]   ← CTA flex:1, expand inline
          [Secondary centered]          ← own row below if exists
```

### CSS Pattern

```scss
.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  min-width: 200px;          // consistent container width
  justify-content: flex-end; // anchor to right edge
}

// Mobile
@media (max-width: 640px) {
  .action-buttons {
    min-width: unset;
    flex-wrap: wrap;
    
    app-button { order: 1; flex: 1; }      // CTA full width
    .dropdown-button { order: 2; }          // expand inline
    app-download { order: 3; flex-basis: 100%; } // own row
  }
}
```

### Tại sao secondary buttons dịch chuyển là OK?

- Fitts's Law: target quan trọng nhất ở edge/corner (dễ click)
- Muscle memory chỉ cần cho hành động lặp đi lặp lại (CTA)
- GitHub, Notion, Linear đều cho secondary buttons dịch chuyển
- Cố định tất cả nút = invisible spacers = phức tạp không cần thiết

---

## 3. Typography — Tiếng Việt

### Quy tắc viết hoa

- **Tên danh mục**: Viết hoa chữ đầu, còn lại thường
  - "An toàn hàng hải" (không phải "An toàn Hàng hải")
  - "Điều khiển tàu" (không phải "Điều khiển Tàu")
  - "Kỹ thuật máy tàu", "Logistics hàng hải", "Luật hàng hải"
  - Ngoại lệ: STCW, IMO, ECDIS (viết tắt quốc tế giữ nguyên)

- **Giá cả**: "Miễn phí" (không phải "Miễn Phí"), "Liên hệ"
- **Nút bấm**: Viết hoa chữ đầu: "Tiếp tục học", "Bắt đầu ngay", "Xem lại"
- **Headings**: Viết hoa chữ đầu mỗi từ quan trọng HOẶC chỉ chữ đầu câu (chọn 1, giữ nhất quán)

### Encoding

- **BẮT BUỘC**: Tất cả file .ts/.html phải UTF-8 without BOM
- Kiểm tra garbled text (ví dụ: `Ã`, `á»`, `Ä`) — dấu hiệu double-encoding
- Dùng `Write` tool (tạo file mới) để fix file bị encoding lỗi

---

## 4. Responsive Design

### Breakpoints

```
Desktop:  > 768px   — Horizontal card layout, sidebar visible
Tablet:   641-768px — Smaller thumbnails, condensed spacing
Mobile:   ≤ 640px   — Vertical card layout, stacked buttons
```

### Card Layout Pattern

```
Desktop:  [Thumbnail 160×90] [Metadata flex:1] [Actions min-w:200]
Tablet:   [Thumbnail 120×72] [Metadata flex:1] [Actions]
Mobile:   [Thumbnail 100% × 140]
          [Metadata]
          [Actions full-width, wrapped]
```

### Mobile Navigation (Coursera Pattern)

**3 layers — không trùng lặp:**
- **Top header**: Minimal — `[Hamburger] [Logo] [Avatar]` (KHÔNG logout, KHÔNG notification bell)
- **Bottom nav bar**: 5 tabs — Khóa học, Cần làm, **Wiii AI**, Khám phá, Hồ sơ
- **Sidebar overlay**: Full navigation (hamburger mở) — chứa logout, settings, items ít dùng

**Bottom bar tabs:**
```
[Khóa học] [Cần làm] [✨ Wiii AI] [Khám phá] [Hồ sơ]
                      ↑ center, toggles chat panel
```
- AI tab ở **vị trí trung tâm** (Google App pattern) — toggle mobile chat panel, không navigate
- 4 tab còn lại là navigation links (routerLink)
- KHÔNG dùng floating bubble trên mobile — AI đã có tab riêng

**Rules:**
- Bottom bar ẩn khi đang trong learning/quiz interface (`shouldHideSidebar()`)
- Active tab: `text-[#0056D2]`, inactive: `text-gray-400`
- Label: `text-[10px] font-medium`, icon: `w-5 h-5`
- Notch safe area: `padding-bottom: env(safe-area-inset-bottom)`
- Scroll-to-top on route navigation (`scrollPositionRestoration: 'top'`)

**Notification Bell:**
- Đã xóa — feature chưa có pipeline hoạt động (không ai trigger `POST /check-streak`)
- Khi implement gamification pipeline → thêm bell lại vào header

---

## 5. SEO Rules

### Public pages (SSR — `RenderMode.Server`)

- `SeoService.setPageMeta(title, description, ogImage?, pageUrl?)` — BẮT BUỘC
- `SeoService.setCanonical(url)` — BẮT BUỘC
- `og:url` phải match `canonical` (bao gồm trailing slash)
- JSON-LD cho listing pages (ItemList + Course schema)
- Sitemap chỉ chứa URL thật (không query param routes)

### Authenticated pages (`RenderMode.Client`)

- Không cần SEO meta (Google không index)
- Vẫn cần `<title>` cho browser tab (Angular route `title` property)

### Meta description pattern

```
"[Tên trang] — [mô tả ngắn] | LMS Maritime"
Độ dài: 120-160 ký tự
Bao gồm keyword chính + giá trị
```

---

## 6. Component Patterns

### Icons

- Dùng SVG inline hoặc `<app-icon>` component — KHÔNG dùng emoji trong UI
- Exception: emoji chỉ dùng trong user-generated content
- Social media icons: SVG inline với `aria-label`

### Empty States

```html
<div class="empty-state">
  <app-icon name="..." size="lg" />
  <h3>Tiêu đề trạng thái</h3>
  <p>Mô tả ngắn gọn + gợi ý hành động</p>
  <app-button variant="primary">Call to action</app-button>
</div>
```

### Loading States

- Skeleton animation cho card grids (`animate-pulse`)
- Spinner cho single-item loading
- Không để blank screen khi loading

---

## 7. Footer Rules

### Quick Links

- Chỉ link tới trang thật (đã implement)
- Không link tới trang placeholder ("Giảng viên", "Tin tức" — chưa có)
- Privacy/Terms ở bottom bar, không lặp lại ở quick links

### Social Media

- Chỉ link tới tài khoản thật
- YouTube, Facebook, X (Twitter), LinkedIn
- SVG icon + `aria-label` + `target="_blank" rel="noopener noreferrer"`

### Address

- "Hải Phòng, Việt Nam" (không dùng địa chỉ cụ thể)
- Brand: "The Wiii Lab" (parent company)

---

## 8. Header Rules

### Avatar

- Hiện avatar thật (`userAvatar()`) khi user có upload
- Fallback: initials circle (`getUserInitials()`)
- Desktop: 36px rounded-full, Mobile: 32-40px

### Scroll Behavior

- Top bar ẩn khi scroll down, hiện khi scroll up
- Header sticky với `backdrop-blur`

---

## 9. Public Page Design Pattern

### Hero Section (maritime theme)

```
bg-[#0a1628] gradient → wave SVG → white content
```

- Uppercase tracking-widest subtitle (blue-300/70)
- Bold white heading (text-4xl → text-6xl)
- Description text (blue-100/70)
- CTA buttons: white primary + border secondary

### Content Sections

- Alternating: `bg-white` → `bg-slate-50` → `bg-white`
- `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- `py-20 lg:py-28` for sections
- Cards: `rounded-2xl border border-gray-200 bg-white p-8 shadow-sm`

---

## 10. Cookies & Privacy

- Không có cookie consent banner (app dùng localStorage, không tracking cookies)
- Footer link: "Chính sách bảo mật", "Điều khoản sử dụng", "Chính sách hoàn tiền"
- Language switcher: CHỈ hiện khi có i18n thật (hiện tại: chỉ tiếng Việt)

---

*Cập nhật lần cuối: 2026-04-07 | Áp dụng từ session UX/UI overhaul*
