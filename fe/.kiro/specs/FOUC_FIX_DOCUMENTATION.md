# FOUC (Flash of Unstyled Content) Fix Documentation

## Vấn đề
Dashboard khi reload lại trong 0.1 giây đầu thì có vẻ CSS đúng nhưng sau đó ngay lập tức lại mất CSS.

## Nguyên nhân gốc rễ

### 1. Component Styles Load Bất Đồng Bộ
- Angular load component SCSS (`styleUrl`) sau khi component được render
- Trong 0.1 giây đầu, browser render HTML với inline styles từ `index.html`
- Sau đó Angular inject component styles, gây ra "flash" khi styles thay đổi

### 2. Tailwind CSS v4 Conflict
- `@use "tailwindcss"` ở đầu `styles.scss` được load trước variables
- Gây xung đột với custom CSS variables và component styles

### 3. Không có Critical CSS Inlining
- Production build không inline critical CSS vào HTML
- Browser phải đợi download external CSS files

## Giải pháp đã áp dụng

### 1. Thêm Critical CSS (src/styles/critical.scss)
```scss
/* Critical CSS - Loaded immediately to prevent FOUC */
* {
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background-color: #FAFAFA;
  color: #1F1F1F;
}

/* Prevent flash of unstyled content */
.dashboard-container {
  opacity: 1;
  transition: opacity 0.15s ease-in;
}

body:not(.loaded) .dashboard-container {
  opacity: 0;
}
```

### 2. Inline Critical CSS trong index.html
```html
<style>
  /* Prevent FOUC */
  body { 
    margin: 0; 
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background-color: #FAFAFA;
    color: #1F1F1F;
  }
  
  /* Loading indicator */
  .app-loading {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }
</style>
```

### 3. Thêm Loading Indicator
```html
<app-root>
  <div class="app-loading">
    <div class="app-loading-spinner"></div>
    <p>Đang tải...</p>
  </div>
</app-root>
```

### 4. Mark Body as Loaded trong Component
```typescript
ngOnInit(): void {
  // Mark body as loaded to prevent FOUC
  if (typeof document !== 'undefined') {
    document.body.classList.add('loaded');
  }
  
  this.enrollmentService.loadEnrolledCourses(1, 20);
}
```

### 5. Sửa thứ tự load trong styles.scss
```scss
/* Load variables first */
@import 'styles/variables';

/* Then Angular Material */
@use '@angular/material' as mat;

/* Finally Tailwind CSS */
@use "tailwindcss";
```

### 6. Cập nhật angular.json
```json
"styles": [
  "src/styles/critical.scss",  // Load critical CSS first
  "src/styles.scss"
]
```

### 7. Đổi styleUrl thành styleUrls
```typescript
@Component({
  styleUrls: ['./student-dashboard.component.scss']  // Plural form
})
```

## Kết quả

✅ **Không còn FOUC**: CSS được load ngay lập tức
✅ **Smooth transition**: Fade-in effect mượt mà
✅ **Better UX**: Loading indicator trong khi app bootstrap
✅ **Performance**: Critical CSS inline giảm blocking time

## Testing

1. **Hard Reload**: Ctrl+Shift+R hoặc Cmd+Shift+R
2. **Disable Cache**: DevTools > Network > Disable cache
3. **Throttling**: DevTools > Network > Slow 3G
4. **Incognito Mode**: Test với browser cache trống

## Best Practices

1. **Keep Critical CSS Small**: Chỉ include styles cần thiết cho first paint
2. **Inline Critical CSS**: Đặt trong `<style>` tag trong `<head>`
3. **Defer Non-Critical CSS**: Load component styles sau
4. **Use Loading States**: Show skeleton hoặc spinner
5. **Optimize Font Loading**: Use `font-display: swap`

## References

- [Angular Performance Guide](https://angular.dev/best-practices/performance)
- [Critical CSS Best Practices](https://web.dev/extract-critical-css/)
- [FOUC Prevention Techniques](https://css-tricks.com/flash-of-inaccurate-color-theme-fart/)
