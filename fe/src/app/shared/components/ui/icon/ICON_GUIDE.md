# Icon Component Guide

This guide shows how to use the Icon component and which icons replace which emoji.

## Usage

```typescript
import { IconComponent } from '@shared/components/ui/icon/icon.component';

@Component({
  imports: [IconComponent],
  template: `
    <app-icon name="fire" size="md" ariaLabel="Streak" />
  `
})
```

## Available Sizes
- `xs` - 14px
- `sm` - 16px
- `md` - 20px (default)
- `lg` - 24px
- `xl` - 32px

## Emoji to Icon Mapping

| Emoji | Icon Name | Usage |
|-------|-----------|-------|
| 🎓 | `academic-cap` | Education, graduation, courses |
| 📚 | `book-open` | Books, reading, course content |
| 📝 | `pencil` | Edit, write, assignments |
| ✅ | `check-circle` | Success, completed, verified |
| ❌ | `x-circle` | Error, failed, cancelled |
| 🔥 | `fire` | Streak, hot, trending |
| ⭐ | `star` | Rating, favorite, featured |
| 🏆 | `trophy` | Achievement, award, winner |
| 📊 | `chart-bar` | Statistics, analytics, data |
| 📈 | `arrow-trending-up` | Progress, growth, improvement |
| ⚡ | `bolt` | Quick, fast, instant |
| ✨ | `sparkles` | New, special, highlight |
| ⏰ | `clock` | Time, duration, deadline |
| 📅 | `calendar` | Date, schedule, event |
| 👤 | `user` | User, profile, account |
| 👥 | `users` | Group, team, community |
| ▶️ | `play` | Video, play, start |
| 📄 | `document-text` | Document, file, content |
| 📋 | `clipboard-document-check` | Quiz, test, checklist |
| → | `arrow-right` | Next, forward, continue |
| ← | `arrow-left` | Previous, back, return |
| ⋮ | `ellipsis-vertical` | Menu, more options |
| ☰ | `bars-3` | Hamburger menu, navigation |
| × | `x-mark` | Close, dismiss, delete |
| 🔍 | `magnifying-glass` | Search, find, explore |
| 🔔 | `bell` | Notification, alert, reminder |
| ⚙️ | `cog-6-tooth` | Settings, configuration |
| 🔄 | `arrow-path` | Refresh, retry, reload |
| ⚠️ | `exclamation-circle` | Warning, caution, alert |
| ℹ️ | `information-circle` | Info, help, details |
| ✓ | `check` | Check, done, confirmed |
| + | `plus` | Add, create, new |
| - | `minus` | Remove, delete, subtract |

## Examples

### Basic Usage
```html
<app-icon name="fire" />
```

### With Size
```html
<app-icon name="trophy" size="lg" />
```

### With Accessibility Label
```html
<app-icon name="check-circle" ariaLabel="Completed" />
```

### In Buttons
```html
<button>
  <app-icon name="arrow-right" size="sm" />
  Next Lesson
</button>
```

### In Badges
```html
<span class="badge">
  <app-icon name="fire" size="sm" ariaLabel="Streak" />
  7 days
</span>
```

### Color Styling
Icons inherit the current text color, so you can style them with CSS:

```html
<app-icon name="star" class="text-yellow-500" />
<app-icon name="check-circle" class="text-green-600" />
<app-icon name="x-circle" class="text-red-600" />
```

## Notes

- All icons are from Heroicons (outline style)
- Icons are inline SVG elements
- Icons inherit the current text color
- Use `ariaLabel` for accessibility when the icon conveys meaning
- Set `ariaLabel` to empty string if icon is purely decorative
