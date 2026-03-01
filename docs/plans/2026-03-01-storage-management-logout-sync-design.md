# P1 Storage Management UI + Logout Sync Check — Design

> **Date**: 2026-03-01 | **Session**: S113 | **Scope**: FE-only

## Problem

1. **No storage management UI**: Users can download courses and videos for offline use but have NO way to see how much storage they're using, manage individual downloads, or clean up space. `StorageManagerService` exists but has zero end-user UI.

2. **No pre-logout sync check**: When users logout, pending offline changes (progress, quiz attempts, video progress) in the sync queue are silently preserved but users get no warning. Could lead to confusion about whether their work was saved.

## SOTA Research

### Storage Management (Moodle Mobile, Spotify, Netflix, YouTube, Apple Music)
- **Moodle Mobile**: Hierarchical per-course storage with individual delete
- **Spotify**: Segmented storage bar (songs/podcasts/other), per-playlist delete
- **Netflix**: Storage budget slider, auto-cleanup, per-title delete
- **YouTube**: Per-video delete in Downloads tab
- **Apple Music/Podcasts**: "Optimize Storage" with auto-remove listened

### Logout + Offline Data (Google, Microsoft, Slack, Canvas)
- **Three-tier logout**: Lock Screen / Sign Out / Clear All Data
- **Pre-logout sync check**: Warn about unsynced data before logout
- **Clear-Site-Data header**: Server-side mechanism for client cleanup
- **Per-user isolation**: Compound primary keys (implemented in S112 P0)

## Chosen Approach

### Storage UI: Moodle-Style Hierarchical Page
- Dedicated `/student/storage` page
- Segmented storage bar (Spotify pattern)
- Per-course and per-video cards with sizes and delete buttons
- Warning banners at 80%/95% quota thresholds
- "Delete all offline data" button

### Logout: Pre-Logout Sync Check
- Check `pendingCount()` before logout
- If pending + online: attempt sync first
- If pending + offline: show informational dialog
- Keep IndexedDB data on logout (S112 decision: "khong xoa, giu nguyen")
- Explicit cleanup via Storage Management UI

## Architecture

### New Files
| File | Purpose |
|------|---------|
| `fe/src/app/features/student/storage/student-storage-management.component.ts` | Full storage management page |

### Modified Files
| File | Changes |
|------|---------|
| `fe/src/app/shared/components/navigation/sidebar.config.ts` | Add "Lưu trữ ngoại tuyến" nav item |
| `fe/src/app/features/student/student.routes.ts` | Add `/storage` route |
| `fe/src/app/features/student/shared/student-layout-simple.component.ts` | Pre-logout sync check |
| `fe/src/app/core/services/course-download.service.ts` | `removeAllCourses()` method |

### Data Flow

```
StorageManagerService.estimate() ──→ Storage bar (used/quota/%)
CourseDownloadService.downloadedCourses() ──→ Course cards
OfflineVideoService.downloads() ──→ Video cards
OfflineSyncService.pendingCount() + failedCount() ──→ Sync queue section
```

### Pre-Logout Flow

```
User clicks "Đăng xuất"
    │
    ├── pendingCount() > 0?
    │     ├── YES + online → syncAll() → proceed or warn on failure
    │     └── YES + offline → ConfirmDialog (informational)
    │
    └── pendingCount() === 0 → proceed to logout
```

## UI Mockup

```
┌──────────────────────────────────────────────┐
│  Lưu trữ ngoại tuyến                        │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  ███████████░░░░░░░░░░  45% (230 MB)  │  │
│  │  ■ Khóa học  ■ Video  ■ Đồng bộ  □ Trống │
│  └────────────────────────────────────────┘  │
│                                              │
│  ── Khóa học đã tải ─────────────────────   │
│  ┌────────────────────────────────────────┐  │
│  │ 📚 An toàn hàng hải        45 MB      │  │
│  │    12 bài học · Tải 2 ngày trước       │  │
│  │                           [Xóa]       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ── Video đã tải ────────────────────────   │
│  ┌────────────────────────────────────────┐  │
│  │ 🎬 Bài 3.2: Xử lý sự cố   120 MB     │  │
│  │                           [Xóa]       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ── Hàng đợi đồng bộ ───────────────────   │
│  │  0 mục chờ · 0 mục lỗi               │  │
│                                              │
│  [🗑 Xóa tất cả dữ liệu ngoại tuyến]      │
└──────────────────────────────────────────────┘
```

## Security

- All IndexedDB operations scoped by userId (S112 compound keys)
- ConfirmDialog required for all destructive actions
- No cross-user data access possible
