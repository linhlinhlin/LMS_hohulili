# Coursera-Style UI Components

This directory contains the base UI components for the Student Portal, designed following Coursera's design patterns.

## Components

### 1. Button Component (`button.component.ts`)
Professional button component with multiple variants and sizes.

**Variants:**
- `primary` - Blue primary button (Coursera blue #0056D2)
- `ghost` - Transparent button with hover effect
- `outline` - Outlined button
- `text` - Text-only button

**Sizes:**
- `sm` - Small (32px height)
- `md` - Medium (40px height) - default
- `lg` - Large (48px height)

**Usage:**
```html
<app-button variant="primary" size="md" (clicked)="handleClick()">
  Click Me
</app-button>
```

### 2. Card Component (`card.component.ts`)
Clean card container with Coursera-style shadow and hover effects.

**Features:**
- 8px border radius
- Subtle shadow (0 1px 3px)
- Hover effect (optional)
- Bordered variant (optional)
- Padding control

**Usage:**
```html
<app-card [hover]="true" [padding]="true">
  <h3>Card Title</h3>
  <p>Card content</p>
</app-card>
```

### 3. Progress Bar Component (`progress-bar.component.ts`)
Thin progress bar (4px) following Coursera's design.

**Features:**
- Thin 4px height (Coursera style)
- Optional label with percentage
- Smooth animation
- Shimmer effect
- Accessible (ARIA attributes)

**Usage:**
```html
<app-progress-bar 
  [progress]="75" 
  [showLabel]="true" 
  label="Course Progress"
  [thin]="true" />
```

### 4. Loading Spinner Component (`loading-spinner.component.ts`)
Animated loading spinner with multiple display modes.

**Sizes:**
- `sm` - 16px
- `md` - 24px (default)
- `lg` - 40px

**Modes:**
- Inline - Display inline with content
- Centered - Fixed center position
- Overlay - Full-screen overlay

**Usage:**
```html
<app-loading-spinner size="md" text="Loading..." />
```

### 5. Tabs Component (`tabs.component.ts`)
Coursera-style tab navigation with underline indicator.

**Features:**
- Underline active tab (Coursera style)
- Badge support
- Disabled state
- Keyboard accessible
- Mobile responsive

**Usage:**
```typescript
tabs = [
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed', badge: 5 }
];
```

```html
<app-tabs 
  [tabs]="tabs" 
  [activeTabId]="'in_progress'"
  (tabChanged)="onTabChange($event)">
  <div>Tab content here</div>
</app-tabs>
```

### 6. Icon Component (`icon.component.ts`)
SVG icon component replacing emoji throughout the application.

**Features:**
- 40+ Heroicons
- 5 sizes (xs, sm, md, lg, xl)
- Inherits text color
- Accessible

**Usage:**
```html
<app-icon name="fire" size="md" ariaLabel="Streak" />
```

See [ICON_GUIDE.md](./icon/ICON_GUIDE.md) for complete icon list and emoji mappings.

## Design Tokens

All components use design tokens from `src/styles/_variables.scss`:

### Colors
- Primary: `$blue-primary` (#0056D2)
- Neutrals: `$gray-50` to `$gray-900`
- Semantic: `$success`, `$warning`, `$error`, `$info`

### Typography
- Font: Source Sans Pro / Inter
- Sizes: 12px to 30px
- Weights: 400, 500, 600, 700

### Spacing
- 8px grid system
- Variables: `$spacing-1` (4px) to `$spacing-16` (64px)

### Other Tokens
- Border radius: 4px to 16px
- Shadows: Subtle to prominent
- Transitions: 150ms to 300ms

## Import

All components can be imported from the index:

```typescript
import { 
  ButtonComponent, 
  CardComponent, 
  ProgressBarComponent,
  LoadingSpinnerComponent,
  TabsComponent,
  IconComponent 
} from '@shared/components/ui';
```

## Design Philosophy

These components follow the Coursera design system:
- **Clean & Minimal** - No unnecessary decorations
- **Professional** - Consistent, polished appearance
- **Accessible** - WCAG 2.1 AA compliant
- **Responsive** - Mobile-first design
- **Performant** - Lightweight, optimized

## Notes

- All components are standalone Angular components
- Components use Angular Signals for reactivity
- Styles use SCSS with design tokens
- No business logic - pure UI components
- Fully typed with TypeScript
