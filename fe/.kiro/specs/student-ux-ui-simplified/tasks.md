# Implementation Plan - Student Portal (Simplified)

## Overview

Kế hoạch **UI/UX improvements only** theo Coursera design pattern. **KHÔNG thay đổi business logic.**

**Philosophy:** 
- UI/UX Only > Logic Changes
- Simple > Complex
- Working > Perfect
- Coursera Style > Custom Design

## Task List

- [x] 1. Setup Coursera Design System




  - Create design tokens (colors, typography, spacing)
  - Build base UI components
  - Replace emoji với SVG icons
  - **UI/UX only - no logic changes**
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 1.1 Create Coursera Design Tokens


  - File `_variables.scss` với Coursera colors
  - Primary: #0056D2 (Coursera blue)
  - Neutrals: Gray-50 to Gray-900
  - Typography: Source Sans Pro / Inter, 12-24px
  - Spacing: 8px grid (4, 8, 12, 16, 24, 32px)
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 1.2 Build Coursera-Style Base Components


  - ButtonComponent (primary blue, ghost)
  - CardComponent (8px radius, subtle shadow)
  - ProgressBarComponent (thin 4px bar - Coursera style)
  - LoadingSpinnerComponent
  - TabsComponent (Coursera tab style)
  - **Only UI components - no business logic**
  - _Requirements: 11.4_

- [x] 1.3 Replace Emoji với SVG Icons


  - Remove all emoji from templates
  - Add SVG icons (Heroicons recommended)
  - Update all components
  - _Requirements: 2.4_

- [ ] 2. Redesign Dashboard (Coursera Style)
  - Coursera-style header với avatar + greeting
  - Tab navigation (In Progress / Completed)
  - Coursera course card design
  - Responsive grid (1/2/3 columns)
  - **UI/UX only - keep existing data fetching logic**



  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2.1 Implement Coursera Header
  - Avatar circle + "Good morning, [Name]"
  - Optional: Career goal section (có thể bỏ)
  - Clean, minimal styling
  - **Use existing user data - no API changes**
  - _Requirements: 2.1, 2.2_

- [ ] 2.2 Add Tab Navigation
  - Tabs: "In Progress" / "Completed"
  - Coursera tab style (underline active)
  - Filter courses by status
  - **Use computed signals - no new API calls**
  - _Requirements: 2.3, 12.1_

- [ ] 2.3 Redesign Course Cards (Coursera Pattern)
  - 2 sections: metadata (top) + next item (bottom)
  - Metadata: partner logo, title, progress %, thin progress bar (4px)
  - Next item: icon, title, type, duration, Resume button
  - Menu button (⋮) ở góc phải
  - **UI only - use existing course data**
  - _Requirements: 2.1, 2.5_

- [ ] 2.4 Implement Responsive Grid
  - CSS Grid: 1 col mobile, 2 tablet, 3 desktop
  - 16px gap between cards
  - **Pure CSS - no logic changes**
  - _Requirements: 2.3_

- [ ] 2.5 Remove Gamification Elements
  - Remove: streaks, levels, achievements, badges, emoji
  - Keep: progress percentage, completion status
  - **Template changes only**
  - _Requirements: 2.4, 12.1_

- [ ] 3. Improve Learning Interface UI/UX
  - Better typography và spacing
  - Improved lesson list styling
  - Coursera-style buttons
  - Better responsive layout
  - **UI/UX only - keep existing video player and logic**
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3.1 Improve Layout Styling
  - Better visual hierarchy (headings, spacing)
  - Cleaner lesson list với completion indicators (✓)
  - Collapsible sidebar với smooth transition
  - **CSS/SCSS only - no structural changes**
  - _Requirements: 3.1, 3.2_

- [ ] 3.2 Keep Existing Video Player
  - **NO CHANGES** to video player
  - Use existing HTML5 video
  - Keep existing controls
  - **This task is just a reminder - no work needed**
  - _Requirements: 3.3_

- [ ] 3.3 Improve Navigation Buttons
  - Redesign buttons: Previous, Mark Complete, Next
  - Coursera button style (blue primary)
  - Better disabled states
  - **UI only - keep existing click handlers**
  - _Requirements: 3.4_

- [ ] 3.4 Add Loading States
  - Loading spinner during lesson load
  - Skeleton screens for content
  - Smooth transitions
  - **UI only - use existing loading flags**
  - _Requirements: 3.5_

- [ ] 4. Simplify Assignment List
  - Remove complex filters/bulk actions
  - Simple list view
  - Basic status filtering
  - Clean card design
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 4.1 Remove Complex Features
  - Remove: bulk selection, saved filters, priority badges, countdown
  - Keep: status filter (All, Pending, Submitted, Graded)
  - _Requirements: 4.1, 12.1_

- [ ] 4.2 Simple List View
  - List layout (not grid)
  - Info: title, course, due date, status, button
  - Status badges: gray/blue/green
  - _Requirements: 4.2, 4.5_

- [ ] 4.3 Basic Filtering
  - 4 buttons: All, Pending, Submitted, Graded
  - Active filter highlighted
  - _Requirements: 4.2_

- [ ] 4.4 Clean Card Design
  - Remove: bookmark, priority, progress bar
  - Keep: title, course, due date, status, button
  - _Requirements: 4.3, 4.4_

- [ ] 5. Simplify Quiz Interface
  - Remove preview/practice mode
  - Simple quiz taking
  - One question at a time
  - Simple results
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5.1 Remove Advanced Features
  - Remove: preview, practice, history, difficulty
  - Keep: list, take, results
  - _Requirements: 5.1, 12.1_

- [ ] 5.2 Simple Quiz List
  - Basic info: title, questions, time, due date
  - "Start Quiz" button
  - _Requirements: 5.1_

- [ ] 5.3 Quiz Taking
  - One question per page
  - Radio buttons for multiple choice
  - Progress: "Question X of Y"
  - Timer if timed
  - _Requirements: 5.2, 5.3_

- [ ] 5.4 Simple Results
  - Score, correct/incorrect count, pass/fail
  - List questions với indicators
  - _Requirements: 5.4_

- [ ] 6. Responsive Design
  - Mobile-first
  - Responsive grid
  - Touch-friendly
  - Mobile nav
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6.1 Responsive Grid
  - Course grid: 1/2/3 columns
  - CSS Grid với media queries
  - _Requirements: 6.1, 6.2_

- [ ] 6.2 Touch-Friendly
  - Buttons minimum 44x44px
  - Adequate spacing
  - _Requirements: 6.3_

- [ ] 6.3 Mobile Navigation
  - Hamburger menu
  - Bottom nav (optional)
  - _Requirements: 6.4_

- [ ] 6.4 Test Mobile
  - Test 320px, 375px, 768px
  - Fix layout issues
  - Text minimum 16px
  - _Requirements: 6.5_

- [ ] 7. Basic Accessibility
  - Semantic HTML
  - ARIA labels
  - Keyboard nav
  - Color contrast
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7.1 Semantic HTML
  - Proper headings (h1, h2, h3)
  - nav, main, section elements
  - button/a elements
  - _Requirements: 7.4_

- [ ] 7.2 ARIA Labels
  - aria-label for icon buttons
  - aria-label for progress bars
  - role="navigation"
  - _Requirements: 7.2_

- [ ] 7.3 Keyboard Navigation
  - All elements keyboard accessible
  - Visible focus indicators
  - Logical tab order
  - _Requirements: 7.1_

- [ ] 7.4 Color Contrast
  - Verify WCAG AA (4.5:1)
  - Fix contrast issues
  - _Requirements: 7.3_

- [ ] 8. Performance
  - Lazy load routes
  - OnPush detection
  - Optimize images
  - Basic caching
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 8.1 Lazy Loading
  - Lazy load feature routes
  - Lazy load heavy components
  - _Requirements: 10.2_

- [ ] 8.2 OnPush Detection
  - Add OnPush to all components
  - _Requirements: 10.4_

- [ ] 8.3 Optimize Images
  - Appropriate sizes
  - loading="lazy"
  - Consider WebP
  - _Requirements: 10.3_

- [ ] 8.4 Basic Caching
  - Cache API responses
  - In-memory cache
  - _Requirements: 10.5_

- [ ] 9. Error Handling
  - User-friendly messages
  - Loading states
  - Retry buttons
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 9.1 Error Messages
  - Map errors to friendly messages
  - Network: "Check connection"
  - Auth: "Please log in"
  - _Requirements: 9.1, 9.2_

- [ ] 9.2 Loading States
  - Spinner during API calls
  - Disable buttons
  - _Requirements: 9.3_

- [ ] 9.3 Retry Functionality
  - Retry button for failures
  - Simple retry logic
  - _Requirements: 9.2_

- [ ] 9.4 Error Display
  - Error banner component
  - Red background, message, retry
  - _Requirements: 9.4_

- [ ] 10. Testing
  - Essential unit tests
  - Critical flow tests
  - Manual testing
  - Bug fixes
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [ ] 10.1 Unit Tests
  - Test key components
  - Test services
  - 50% coverage target
  - _Requirements: 1.1_

- [ ] 10.2 Flow Tests
  - Login → Dashboard → Course
  - Dashboard → Assignment → Submit
  - Dashboard → Quiz → Complete
  - _Requirements: 2.1, 3.1, 4.1, 5.1_

- [ ] 10.3 Manual Testing
  - Chrome, Firefox, Safari
  - Mobile devices
  - Keyboard navigation
  - _Requirements: 6.1, 7.1_

- [ ] 10.4 Fix Bugs
  - Fix blocking bugs
  - Fix accessibility issues
  - Fix mobile issues
  - _Requirements: 1.1, 2.1_

- [ ] 11. Documentation
  - Component docs
  - User guide
  - API docs
  - _Requirements: 1.1, 2.1_

- [ ] 11.1 Component Docs
  - JSDoc comments
  - Props/outputs docs
  - Usage examples
  - _Requirements: 1.1_

- [ ] 11.2 User Guide
  - How to: enroll, learn, submit, quiz
  - Simple guide
  - _Requirements: 2.1_

- [ ] 11.3 API Docs
  - List endpoints
  - Request/response formats
  - Error handling
  - _Requirements: 1.1_

## Timeline

### Week 1: Coursera Design System
Tasks 1.1-1.3 - Design tokens, base components, icons

### Week 2: Dashboard Redesign
Tasks 2.1-2.5 - Coursera header, tabs, course cards, grid

### Week 3: Learning Interface
Tasks 3.1-3.4 - Improve styling, buttons, loading states

### Week 4: Assignments & Quiz
Tasks 4.1-5.4 - UI improvements for assignments and quiz

### Week 5: Responsive & Accessibility
Tasks 6.1-7.4 - Mobile responsive, a11y improvements

### Week 6: Polish & Testing
Tasks 8.1-11.3 - Performance, error handling, testing, docs

**Total: 6 weeks**

**Note:** Vì chỉ làm UI/UX, không thay đổi logic, timeline có thể nhanh hơn.

## Success Criteria

- [ ] Coursera-style professional design
- [ ] No emoji, only SVG icons
- [ ] Thin progress bars (4px) như Coursera
- [ ] Tab navigation working (In Progress / Completed)
- [ ] Responsive grid (1/2/3 columns)
- [ ] Mobile responsive
- [ ] Basic accessibility (WCAG AA)
- [ ] **NO business logic changes**
- [ ] **NO API changes**
- [ ] **NO database schema changes**

## Out of Scope (VERY IMPORTANT!)

**NOT doing - UI/UX:**
- ❌ Gamification (streaks, levels, achievements, badges)
- ❌ Social features (forums, messaging, comments)
- ❌ Bookmarks/notes features
- ❌ Custom video controls
- ❌ Complex animations

**NOT doing - Logic/Backend:**
- ❌ **Thay đổi API endpoints**
- ❌ **Thay đổi business logic**
- ❌ **Thay đổi authentication/authorization**
- ❌ **Thay đổi database schema**
- ❌ **Thêm features mới**
- ❌ **Thay đổi data flow**
- ❌ Complex DDD architecture
- ❌ NgRx/Akita state management

**Focus on (UI/UX Only):**
- ✅ Coursera-style clean design
- ✅ Better typography và spacing
- ✅ Improved component styling
- ✅ Responsive layout
- ✅ Loading states và transitions
- ✅ Accessibility improvements
- ✅ **Keep all existing logic intact**

---

**Version**: 3.0 (Coursera-inspired, UI/UX Only)  
**Duration**: 6 weeks (có thể nhanh hơn vì chỉ UI/UX)  
**Philosophy**: UI/UX Only, Coursera Style, No Logic Changes
