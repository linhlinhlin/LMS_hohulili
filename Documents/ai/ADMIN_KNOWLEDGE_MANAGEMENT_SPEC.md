# 📋 SPEC: ADMIN KNOWLEDGE MANAGEMENT PAGE

**Từ:** Team Backend LMS (PM)  
**Gửi:** Team Frontend LMS  
**Ngày:** 05/12/2025  
**Độ ưu tiên:** 🟡 MEDIUM (Sau khi hoàn thành AI Chat Page)

---

## 🎯 MỤC TIÊU

Xây dựng trang Admin để quản lý AI Knowledge Base (Neo4j). Chỉ Admin mới có quyền truy cập.

---

## 📍 NAVIGATION

### Thêm Menu Item vào Admin Sidebar

**File:** `fe/src/app/shared/components/navigation/sidebar.config.ts`

**Thêm vào `adminSidebarConfig.menuItems`:**
```typescript
{
  label: 'Quản lý Tri thức AI',
  route: '/admin/ai-knowledge',
  icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4'
}
```

**Vị trí:** Sau "LMS AI" (AI Chat), trước "Cài đặt hệ thống"

---

## 🏗️ PAGE LAYOUT

```
┌─────────────────────────────────────────────────────────────────┐
│  Quản lý Tri thức AI                              [+ Upload]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  📊 THỐNG KÊ TỔNG QUAN                                   │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │    │
│  │  │    5     │  │   230    │  │    3     │               │    │
│  │  │Documents │  │  Nodes   │  │Categories│               │    │
│  │  └──────────┘  └──────────┘  └──────────┘               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  📁 DANH SÁCH TÀI LIỆU                                   │    │
│  │  ┌─────────────────────────────────────────────────────┐│    │
│  │  │ 📄 COLREGS_2020.pdf                                 ││    │
│  │  │    Category: COLREGs | Nodes: 45 | Admin           ││    │
│  │  │    [View] [Delete]                                  ││    │
│  │  ├─────────────────────────────────────────────────────┤│    │
│  │  │ 📄 SOLAS_Chapter_V.pdf                              ││    │
│  │  │    Category: SOLAS | Nodes: 80 | Admin             ││    │
│  │  │    [View] [Delete]                                  ││    │
│  │  └─────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  📤 UPLOAD MỚI                                           │    │
│  │  ┌─────────────────────────────────────────────────────┐│    │
│  │  │  Kéo thả file PDF vào đây hoặc [Chọn file]         ││    │
│  │  │  (Tối đa 50MB, chỉ hỗ trợ PDF)                     ││    │
│  │  └─────────────────────────────────────────────────────┘│    │
│  │  Category: [COLREGs ▼]                                   │    │
│  │  [Upload]                                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 COMPONENTS CẦN XÂY DỰNG

### 1. Admin Knowledge Page (Container)
**Path:** `fe/src/app/features/admin/ai-knowledge/`

```typescript
// ai-knowledge-page.component.ts
@Component({
  selector: 'app-ai-knowledge-page',
  template: `
    <div class="ai-knowledge-container">
      <app-knowledge-stats [stats]="stats()" />
      <app-knowledge-document-list 
        [documents]="documents()"
        (delete)="onDeleteDocument($event)"
      />
      <app-knowledge-upload 
        (upload)="onUploadDocument($event)"
        [isUploading]="isUploading()"
      />
    </div>
  `
})
```

### 2. Knowledge Stats Component
**Features:**
- Hiển thị tổng số documents
- Hiển thị tổng số nodes trong Neo4j
- Hiển thị số categories
- Biểu đồ phân bố theo category (optional)

### 3. Knowledge Document List Component
**Features:**
- Danh sách documents với pagination
- Filter theo category
- Search theo filename
- Actions: View details, Delete
- Confirm dialog trước khi xóa

### 4. Knowledge Upload Component
**Features:**
- Drag & drop file upload
- File type validation (PDF only)
- File size validation (max 50MB)
- Category selector dropdown
- Upload progress indicator
- Job status tracking

---

## 🔌 API ENDPOINTS (Backend Ready)

| Action | Method | Endpoint | Description |
|--------|--------|----------|-------------|
| Get Stats | GET | `/api/v1/ai/admin/knowledge/stats` | Thống kê tổng quan |
| List Documents | GET | `/api/v1/ai/admin/knowledge/list` | Danh sách documents |
| Upload Document | POST | `/api/v1/ai/admin/knowledge/upload` | Upload PDF mới |
| Get Job Status | GET | `/api/v1/ai/admin/knowledge/jobs/{jobId}` | Trạng thái xử lý |
| Delete Document | DELETE | `/api/v1/ai/admin/knowledge/{documentId}` | Xóa document |

### API Response Examples:

**Get Stats Response:**
```json
{
  "totalDocuments": 5,
  "totalNodes": 230,
  "categories": {
    "COLREGs": 120,
    "SOLAS": 80,
    "MARPOL": 30
  },
  "recentUploads": [
    {
      "id": "doc_123",
      "filename": "COLREGS_2020.pdf",
      "category": "COLREGS",
      "uploadedAt": "2025-12-05T10:30:00Z"
    }
  ]
}
```

**List Documents Response:**
```json
[
  {
    "id": "doc_123",
    "filename": "COLREGS_2020.pdf",
    "category": "COLREGS",
    "nodesCount": 45,
    "uploadedBy": "admin"
  }
]
```

**Upload Response:**
```json
{
  "status": "success",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Tài liệu đã được tải lên và đang được xử lý",
  "filename": "COLREGS_2020.pdf",
  "category": "COLREGS",
  "fileSize": 2048576,
  "uploadedBy": "admin",
  "uploadedAt": "2025-12-05T10:30:00Z"
}
```

---

## 🎨 UI/UX REQUIREMENTS

### Stats Cards
- Icon + Number + Label
- Color-coded by type
- Hover effect với tooltip

### Document List
- Table hoặc Card view
- Sortable columns
- Pagination (20 items/page)
- Empty state khi chưa có documents

### Upload Area
- Drag & drop zone với dashed border
- File preview trước khi upload
- Progress bar khi đang upload
- Success/Error toast notifications

### Delete Confirmation
- Modal dialog với warning message
- Hiển thị số nodes sẽ bị xóa
- Require type document name để confirm (optional)

---

## ✅ ACCEPTANCE CRITERIA

### Must Have (P0)
- [ ] Trang Admin Knowledge Management
- [ ] Hiển thị thống kê (documents, nodes, categories)
- [ ] Danh sách documents với pagination
- [ ] Upload PDF với category selection
- [ ] Delete document với confirmation
- [ ] Error handling và loading states

### Should Have (P1)
- [ ] Job status tracking (polling hoặc websocket)
- [ ] Filter documents theo category
- [ ] Search documents theo filename
- [ ] Upload progress indicator

### Nice to Have (P2)
- [ ] Biểu đồ phân bố categories
- [ ] Bulk delete
- [ ] Export document list
- [ ] Document preview

---

## 📁 FILE STRUCTURE

```
fe/src/app/features/admin/ai-knowledge/
├── ai-knowledge-page.component.ts       🆕 NEW
├── components/
│   ├── knowledge-stats.component.ts     🆕 NEW
│   ├── knowledge-document-list.component.ts  🆕 NEW
│   ├── knowledge-upload.component.ts    🆕 NEW
│   └── delete-confirm-modal.component.ts  🆕 NEW
├── services/
│   └── ai-knowledge.service.ts          🆕 NEW
└── index.ts
```

---

## 🗓️ TIMELINE ĐỀ XUẤT

| Phase | Tasks | Duration |
|-------|-------|----------|
| **Phase 1** | Stats + Document List | 2 days |
| **Phase 2** | Upload Component | 2 days |
| **Phase 3** | Delete + Confirmation | 1 day |
| **Phase 4** | Polish + Testing | 1 day |

**Total:** ~6 working days

**Lưu ý:** Nên làm SAU khi hoàn thành AI Chat Page vì đây là tính năng Admin-only, ít người dùng hơn.

---

## 📞 LIÊN HỆ

API Documentation chi tiết: `Documents/AI_ADMIN_API_SPEC.md`

Nếu có thắc mắc, liên hệ PM (Backend Team).
