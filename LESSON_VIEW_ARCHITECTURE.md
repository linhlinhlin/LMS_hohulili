# Lesson View — Architecture & Design Brief

> **For**: Product Designer | **Date**: 2026-02-28 | **Status**: Current Production

---

## 1. OVERVIEW

The **Lesson View** is the core learning interface where students consume course content. It follows a **Coursera/Udemy-inspired** two-panel layout: sidebar (course structure) + main content area (lesson display).

**URL Pattern**: `/student/learn/course/:courseId/lesson/:lessonId`

---

## 2. LAYOUT STRUCTURE

```
┌─────────────────────────────────────────────────────────────────┐
│ LEARNING CONTAINER (100vh, flex row)                            │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│   SIDEBAR    │              MAIN CONTENT AREA                   │
│   (300px)    │              (flex: 1, scrollable)               │
│              │                                                  │
│  ┌─────────┐ │  ┌──────────────────────────────────────────┐    │
│  │ Header  │ │  │  VIDEO PLAYER (if video section)         │    │
│  │ + Back  │ │  │  ┌────────────────────────────────┐      │    │
│  │ + Title │ │  │  │  YouTube / HTML5 Video          │      │    │
│  │ + Prog% │ │  │  └────────────────────────────────┘      │    │
│  ├─────────┤ │  │  Progress bar: "X% đã xem"              │    │
│  │ Search  │ │  └──────────────────────────────────────────┘    │
│  ├─────────┤ │                                                  │
│  │ Paywall │ │  ┌──────────────────────────────────────────┐    │
│  │ Banner  │ │  │  CONTENT CONTAINER (padded)              │    │
│  ├─────────┤ │  │                                          │    │
│  │ "CẤU    │ │  │  Section Nav: [Phần 1/5] ●●●●○ [BADGE]  │    │
│  │  TRÚC   │ │  │                                          │    │
│  │  KHÓA   │ │  │  Section Title: "Bài 3.3: Title..."     │    │
│  │  HỌC"   │ │  │                                          │    │
│  ├─────────┤ │  │  ┌────────────────────────────────┐      │    │
│  │         │ │  │  │  TEXT: White card with HTML     │      │    │
│  │ Chapter │ │  │  │  VIDEO: YouTube embed           │      │    │
│  │ Accordn │ │  │  │  QUIZ: Blue gradient CTA card   │      │    │
│  │         │ │  │  │  FILE: Download card             │      │    │
│  │ └Lesson │ │  │  │  ASSIGNMENT: Yellow border card  │      │    │
│  │   └Sect │ │  │  └────────────────────────────────┘      │    │
│  │         │ │  └──────────────────────────────────────────┘    │
│  │         │ │                                                  │
│  │         │ │  ┌──────────────────────────────────────────┐    │
│  │         │ │  │  NAVIGATION BAR                          │    │
│  │         │ │  │  [< Trước] [Đánh dấu hoàn thành] [Tiếp >]│   │
│  │         │ │  └──────────────────────────────────────────┘    │
│  └─────────┘ │                                                  │
├──────────────┴──────────────────────────────────────────────────┤
│                    PAYMENT MODAL (overlay, if needed)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. CONTENT HIERARCHY (3 Levels)

```
Course
├── Chapter 1 (Section/Accordion)          ← Level 1: Collapsible chapter
│   ├── Lesson 1.1                         ← Level 2: Clickable lesson item
│   │   ├── Section: "Giới thiệu" (TEXT)   ← Level 3: Content block
│   │   ├── Section: "Video bài giảng" (VIDEO)
│   │   ├── Section: "Kiểm tra" (QUIZ)
│   │   └── Section: "Tài liệu" (FILE)
│   ├── Lesson 1.2
│   └── Lesson 1.3
├── Chapter 2
│   ├── Lesson 2.1 (simple, no sections)
│   └── Lesson 2.2
└── Chapter 3
    └── ...
```

### Content Types (Section Level)

| Type | Icon | Badge Color | Content Display |
|------|------|-------------|-----------------|
| **VIDEO** | ▶ play | Pink `#fce7f3` | YouTube iframe or HTML5 `<video>`, rounded-xl shadow |
| **TEXT** | 📄 document | Blue `#dbeafe` | White card with HTML prose, scrollable |
| **QUIZ** | 📋 clipboard | Orange `#fef3c7` | Blue gradient CTA card "Làm bài trắc nghiệm" |
| **FILE** | 📁 folder | Green `#d1fae5` | Download card with file info |
| **ASSIGNMENT** | 📝 edit | Purple `#e0e7ff` | Yellow-bordered card with HTML instructions |

---

## 4. SIDEBAR ANATOMY

### 4.1 Header
- **Back arrow** (← chevron) → navigates to course overview
- **Course title** (truncated, 1 line)
- **Progress bar** (thin 4px, blue gradient `#0056D2` → `#004BB5`)
- **Progress label** ("X% hoàn thành")
- **Collapse/Hamburger button** (top right)

### 4.2 Search Box
- SVG magnifying glass icon (left)
- Placeholder: "Tìm kiếm bài học..."
- Clear button (×) when query present
- Focus: blue ring `#0056D2`

### 4.3 Paywall Banner (conditional)
- Orange gradient (`#f59e0b` → `#d97706`)
- Lock icon + "Mở khóa toàn bộ khóa học" + chevron
- Only shown when `coursePaid && !hasPaid`

### 4.4 Structure Header
- **Label**: "CẤU TRÚC KHÓA HỌC" (uppercase, blue `#0056D2`, 0.6875rem)
- **Count**: "3 Chương · 8 Bài học" (gray, 0.75rem)

### 4.5 Chapter Accordion (Level 1)
- **Folder icon** (open/closed SVG, blue `#0056D2`)
- **Chapter title** (bold 600, 0.875rem)
- **Lesson count**: "0/3 bài học" (gray)
- **Chapter progress bar** (3px, blue)
- **Chevron** (rotate 180° when expanded)

### 4.6 Lesson Item (Level 2)
- **Status icon**: ✅ green circle (completed) | ● blue dot (active) | ○ gray circle (pending) | 🔒 lock (paid)
- **Lesson title** (0.8125rem, 2-line clamp)
- **Meta info**: "1 phần" or "LECTURE · 15 phút"
- **Chevron** (if lesson has sections)
- **Active state**: blue bg `rgba(0,86,210,0.1)`, blue title
- **Completed state**: muted gray title

### 4.7 Section Item (Level 3)
- **Status icon**: ✅ green checkmark (completed) | ○ gray circle (pending)
- **Type icon**: colored per type (▶ blue, 📄 gray, 📋 orange, 📁 green)
- **Section title** (0.8rem)
- **Type badge**: "VĂN BẢN", "VIDEO", "TRẮC NGHIỆM" (color-coded)
- **Active state**: blue bg + blue text

---

## 5. MAIN CONTENT AREA

### 5.1 Video Section (top, full-width)
- **Container**: `bg-#f8fafc`, 1.5rem padding
- **Video card**: `border-radius: 12px`, `box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25)`
- **YouTube**: responsive iframe via `app-youtube-player`
- **HTML5**: `<video>` with `controlsList="nodownload"`
- **Progress bar** below video:
  - Track: 6px height, `#e9ecef`
  - Fill: blue gradient `#0056D2` → `#004BB5`
  - Info: "X% đã xem" (left) | "Hoàn thành" or "Cần 50% để tiếp tục" (right)

### 5.2 Section Navigation Bar
- **Counter badge**: "Phần 1/5" (blue bg, 0.7rem bold)
- **Progress dots**: ●○○○○ (clickable, blue=active, green=completed, gray=pending)
- **Type badge**: "VĂN BẢN" / "VIDEO" / "TRẮC NGHIỆM" (right-aligned, color-coded)

### 5.3 Section Title
- **Format**: "Bài {chapter}.{lesson}: {Section Title}"
- **Style**: 1.625rem, font-weight 700, `#1f2937`

### 5.4 Content Display (by type)

#### TEXT
- White card: `bg-white`, `border-radius: 12px`, `border: 1px solid #e5e7eb`
- Prose typography: 0.9375rem, line-height 1.7
- Rich HTML support: headings, lists, images, tables, code blocks, blockquotes
- Auto-complete at 80% scroll depth

#### VIDEO
- YouTube embed or HTML5 `<video>`
- Progress tracking (per-second granular)
- Resume from last position
- 50% completion required to proceed

#### QUIZ
- Gradient card: `linear-gradient(135deg, #0056D2, #004BB5)`
- Decorative radial gradient circles (glass morphism)
- Icon: clipboard in frosted glass square (64×64px)
- Title + description in white
- CTA button: white on blue, "Làm bài trắc nghiệm →"

#### FILE
- Gradient card: `linear-gradient(135deg, #f0f9ff, #e0f2fe)`
- Border: `2px solid #bae6fd`
- File icon (64px) + title + description
- Download button: `#0284c7`

#### ASSIGNMENT
- White card with `border: 2px solid #fde68a`
- Header: gradient `#fef3c7` → `#fde68a`
- Assignment icon (40px, `#d97706`)
- HTML content body

### 5.5 Attachments Section
- Section title: "Tài liệu đính kèm (N)"
- List of attachment items: icon + name + size + download button
- Download button: `#0056D2` with shadow

### 5.6 Bottom Navigation Bar
- **Previous**: gray bg, chevron left, "Trước"
- **Mark Complete**: blue gradient CTA, "Đánh dấu hoàn thành" (or green "Đã hoàn thành" ✓)
- **Next**: gray bg, chevron right, "Tiếp theo"
- All buttons: `border-radius: 8px`, `min-height: 38px`

---

## 6. STATES & INTERACTIONS

### 6.1 Sidebar States

| State | Behavior |
|-------|----------|
| **Expanded** (default) | 300px width, full content visible |
| **Collapsed** | 0px width, hidden. Top bar shows: sidebar icon + "Đang học: {course title}" |
| **Mobile** | Fixed overlay (320px), slide-in from left, dark backdrop overlay |

### 6.2 Lesson States

| State | Visual |
|-------|--------|
| **Loading** | Centered spinner + "Đang tải bài học..." |
| **Error** | Error icon + message + "Thử lại" button |
| **No lesson selected** | Book icon + "Chọn bài học để bắt đầu" |
| **Lesson loaded** | Full content display |

### 6.3 Progress States

| State | Visual |
|-------|--------|
| **Not started** | Gray dot ○, full opacity title |
| **In progress** | Blue dot ●, blue title (active) |
| **Completed** | Green checkmark ✅, muted gray title |
| **Locked (paid)** | Lock icon 🔒, non-clickable |

### 6.4 Video Completion Rule
- Student must watch ≥50% of video before:
  - Navigating to next section/lesson
  - Marking lesson as complete
- Progress bar shows: "Cần 50% để tiếp tục"
- After 50%: "Hoàn thành" in green

### 6.5 Reading Auto-Complete
- Text sections track scroll depth via IntersectionObserver
- At 80% scroll → auto-mark section as read
- Server records reading progress

### 6.6 Keyboard Shortcuts
- `←` Arrow Left: Previous lesson
- `→` Arrow Right: Next lesson
- `Escape`: Close mobile sidebar

---

## 7. DATA FLOW

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│   BACKEND    │     │   ANGULAR FE     │     │   BROWSER   │
│   (API)      │     │   (Services)     │     │   (UI)      │
├──────────────┤     ├──────────────────┤     ├─────────────┤
│              │     │                  │     │             │
│ GET /courses │────▶│ LearningService  │────▶│  Sidebar    │
│ /:id/content │     │ .loadCourse()    │     │  chapters   │
│              │     │                  │     │  & lessons  │
│ GET /lessons │────▶│ LearningService  │────▶│  Main area  │
│ /:id         │     │ .loadLesson()    │     │  content    │
│              │     │                  │     │             │
│ POST /video- │◀────│ WatchedSegments  │◀────│  Video      │
│ progress/    │     │ Tracker (10s)    │     │  timeupdate │
│ track        │     │                  │     │             │
│              │     │                  │     │             │
│ POST /learn- │◀────│ HeartbeatTracker │◀────│  Page       │
│ ing-activity/│     │ (30s)            │     │  visible    │
│ heartbeat    │     │                  │     │             │
│              │     │                  │     │             │
│ POST /learn- │◀────│ ReadingProgress  │◀────│  Scroll     │
│ ing-activity/│     │ Tracker (80%)    │     │  events     │
│ reading-prog │     │                  │     │             │
│              │     │                  │     │             │
│ PATCH /prog- │◀────│ markComplete()   │◀────│  "Hoàn      │
│ ress/lessons │     │                  │     │  thành" btn │
│ /:id         │     │                  │     │             │
│              │     │                  │     │             │
│ GET /video-  │────▶│ canProceedTo     │────▶│  Next btn   │
│ progress/:id │     │ Next()           │     │  enabled?   │
│ /can-proceed │     │                  │     │             │
└──────────────┘     └──────────────────┘     └─────────────┘
```

---

## 8. API ENDPOINTS USED

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v3/courses/:courseId` | GET | Course overview |
| `/api/v3/courses/:courseId/content` | GET | Full structure: chapters → lessons → sections |
| `/api/v3/lessons/:lessonId` | GET | Lesson detail with content & attachments |
| `/api/v3/student/progress/courses/:courseId/completed-ids` | GET | List of completed lesson IDs |
| `/api/v3/student/progress/lessons/:lessonId` | PATCH | Mark lesson complete |
| `/api/v3/student/progress/lessons/:lessonId/sections/:sectionId/complete` | POST | Mark section complete |
| `/api/v3/video-progress/track` | POST | Record video watched segments |
| `/api/v3/video-progress/:sectionId/can-proceed` | GET | Check 50% video rule |
| `/api/v3/video-progress/:sectionId/resume` | GET | Get resume position |
| `/api/v3/learning-activity/heartbeat` | POST | Time-on-task tracking (30s) |
| `/api/v3/learning-activity/reading-progress` | POST | Reading scroll progress |
| `/api/v3/learning-activity/continue` | GET | "Continue where left off" data |
| `/api/v3/quizzes/lesson/:lessonId` | GET | Check if lesson has quiz |
| `/api/v3/enrollments/:courseId/payment-status` | GET | Payment gating check |

---

## 9. COMPONENT TREE

```
CourseLearningComponent (821 lines)
│   Role: Main container — layout, sidebar, navigation, payment
│   State: course, sections, currentLesson, expandedSections,
│          expandedLessons, completedSections, sidebarCollapsed,
│          showMobileSidebar, isMobileView, coursePaid, hasPaid
│
├── LessonContentComponent (316 lines)
│   │   Role: Render lesson content (video/text/quiz/file/assignment)
│   │   Inputs: lesson, isCompleted, hasQuiz, chapterIndex, lessonIndex
│   │   Model: sectionIndex (two-way binding)
│   │   Outputs: markComplete, videoEnded, goToQuiz, sectionReadComplete
│   │
│   └── YouTubePlayerComponent
│       Role: YouTube iframe wrapper with progress tracking
│       Inputs: videoUrl, lessonId, sectionId
│
├── PaymentModalComponent (conditional)
│   Role: Payment checkout for locked courses
│
└── [Services - not rendered]
    ├── LearningService (~920 lines)
    │   Role: Central state + API orchestration + Download-First cache
    │
    ├── WatchedSegmentsTracker
    │   Role: Per-second video tracking, sync every 10s
    │
    ├── HeartbeatTracker
    │   Role: Time-on-task (30s heartbeat, Page Visibility aware)
    │
    └── ReadingProgressTracker
        Role: IntersectionObserver scroll tracking, 80% auto-complete
```

---

## 10. FILE INVENTORY

```
fe/src/app/features/learning/
├── pages/
│   ├── course-learning.component.ts        (821 lines — main container)
│   ├── course-learning.component.html      (364 lines — template)
│   └── course-learning.component.scss      (1071 lines — styles)
├── components/
│   ├── lesson-content/
│   │   ├── lesson-content.component.ts     (316 lines — content renderer)
│   │   ├── lesson-content.component.html   (243 lines — template)
│   │   └── lesson-content.component.scss   (930 lines — styles)
│   ├── youtube-player/
│   │   └── youtube-player.component.ts     (YouTube embed + tracking)
│   ├── bookmark-system.component.ts        (bookmarks CRUD)
│   └── note-taking.component.ts            (notes CRUD)
├── services/
│   ├── learning.service.ts                 (~920 lines — state management)
│   ├── watched-segments-tracker.service.ts (video progress)
│   ├── heartbeat-tracker.service.ts        (engagement time)
│   └── reading-progress-tracker.service.ts (scroll tracking)
├── models/
│   ├── learning.models.ts                  (15+ interfaces)
│   └── lesson-types.enum.ts               (LessonType, FileType enums)
├── quiz/                                   (DDD structure)
│   ├── presentation/components/
│   │   ├── quiz-list.component.ts
│   │   └── quiz-result.component.ts
│   ├── domain/, application/, infrastructure/
│   └── types/index.ts                     (quiz models + enums)
├── domain/                                 (DDD entities)
│   ├── entities/ (bookmark, learning-session, progress)
│   ├── repositories/ (ports)
│   └── value-objects/ (progress-percentage, session-duration)
└── learning.routes.ts                      (route definitions)
```

---

## 11. DESIGN TOKENS (Current)

```
Primary:        #0056D2
Primary Hover:  #004BB5
Light BG:       rgba(0, 86, 210, 0.05/0.1)
Focus Ring:     rgba(0, 86, 210, 0.1)

Text Primary:   #1f2937
Text Secondary: #374151
Text Muted:     #6b7280
Text Light:     #9ca3af

BG Page:        #f8fafc / #f9fafb
BG Card:        white
Border:         #e5e7eb
Border Light:   #d1d5db

Success:        #10b981 (completed)
Warning:        #d97706 (quiz/assignment)
Danger:         #e11d48 (errors only)
Info:           #0284c7 (files)

Radius Small:   6px (section items)
Radius Medium:  8px (buttons, lesson items)
Radius Large:   12px (cards, video container)
Radius XL:      16px (quiz prompt card)

Shadow Card:    0 1px 3px rgba(0,0,0,0.05)
Shadow Video:   0 25px 50px -12px rgba(0,0,0,0.25)
Shadow Button:  0 2px 8px rgba(0,86,210,0.25)

Sidebar Width:  300px (desktop), 320px (mobile overlay), 0px (collapsed)
```

---

## 12. RESPONSIVE BREAKPOINTS

| Breakpoint | Behavior |
|------------|----------|
| **Desktop (>768px)** | Sidebar 300px + main content flex-1, side by side |
| **Mobile (≤768px)** | Sidebar hidden, overlay slide-in. Fixed hamburger button top-left. Nav buttons wrap. |
| **Small Mobile (≤640px)** | Navigation stacks vertically, complete button on top |

---

## 13. CURRENT CAPABILITIES SUMMARY

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-chapter course structure | ✅ | 3-level accordion (Chapter → Lesson → Section) |
| Video playback (YouTube) | ✅ | Progress tracking, resume, 50% rule |
| Video playback (HTML5) | ✅ | Same tracking as YouTube |
| Text content (HTML) | ✅ | Rich prose, auto-complete at 80% scroll |
| Quiz sections | ✅ | CTA card → navigates to quiz page |
| File download sections | ✅ | Download card with file info |
| Assignment sections | ✅ | HTML instructions display |
| Section-level navigation | ✅ | Dot pagination + prev/next |
| Lesson completion tracking | ✅ | Server + localStorage + signals |
| Video resume position | ✅ | Server-side last position |
| Time-on-task heartbeat | ✅ | 30s intervals, Page Visibility aware |
| Reading progress tracking | ✅ | IntersectionObserver, 80% threshold |
| Payment/paywall gating | ✅ | Lock icon, payment modal |
| Sidebar search | ✅ | Filter lessons by title |
| Sidebar collapse/expand | ✅ | Desktop toggle + mobile overlay |
| Keyboard shortcuts | ✅ | ← → Escape |
| PWA Download-First | ✅ | IndexedDB cache, stale-while-revalidate |
| Offline video fallback | ✅ | Cache API blob URLs |
| Notes system | ✅ | Separate route /student/learn/notes |
| Bookmarks system | ✅ | Separate route /student/learn/bookmarks |
| Attachments | ✅ | File list at bottom of lesson |

---

## 14. KNOWN DESIGN ISSUES (Recently Fixed — S104)

| Issue | Fix Applied |
|-------|-------------|
| Video text said "90%" but code checks 50% | Fixed to "Cần 50% để tiếp tục" |
| Stale CSS file with old `#3b82f6` blue tokens | Deleted |
| Duplicate navigation CSS blocks (conflicting styles) | Removed outer duplicate |
| Search icon invisible (no icon font loaded) | Replaced with inline SVG |
| Chapter progress bars hidden (`display: none`) | Unhidden, styled as 3px bar |
| Lesson meta hidden (`display: none`) | Unhidden, shows "1 phần" or type+duration |
| Section type badges hidden (`display: none`) | Unhidden, color-coded badges |
| Section status icons hidden for pending state | Now visible for all states |
| Excessive `!important` in section items | Removed 8 instances |
| Dead `animate-fade-in` class in HTML | Removed |

---

*This document provides the complete technical context for the designer to create a new lesson view design. All behavioral logic, data flow, and component boundaries are documented above.*
