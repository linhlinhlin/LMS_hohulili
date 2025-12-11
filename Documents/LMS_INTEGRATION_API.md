# Maritime AI Tutor - API Documentation for LMS Integration

> **Version:** 0.9.8 | **Last Updated:** 2025-12-10  
> **Base URL:** `https://maritime-ai-chatbot.onrender.com`  
> **Architecture:** Multimodal RAG with Source Highlighting & Citation Jumping

---

## Table of Contents

1. [Authentication](#authentication)
2. [API Overview](#api-overview)
3. [User APIs](#user-apis)
4. [Admin APIs](#admin-apis)
5. [Frontend Integration Guide](#frontend-integration-guide)
6. [Response Handling Best Practices](#response-handling-best-practices)
7. [Error Codes](#error-codes)

---

## Authentication

All APIs require API Key authentication (except Health Check).

```http
X-API-Key: your_api_key_here
```

| Role | Permissions |
|------|-------------|
| `student` | Chat, View Sources, View own Memories |
| `teacher` | Chat, View Sources, View any Memories |
| `admin` | All permissions + Knowledge Management |

---

## API Overview

### User APIs (For End Users)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/chat/` | POST | AI Chat với RAG |
| `/api/v1/sources/` | GET | Danh sách sources |
| `/api/v1/sources/{document_id}` | GET | Sources theo document |
| `/api/v1/memories/{user_id}` | GET | AI insights về user |
| `/api/v1/health` | GET | Health check |

### Admin APIs (For Administrators)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/knowledge/ingest-multimodal` | POST | Upload PDF |
| `/api/v1/knowledge/stats` | GET | Knowledge statistics |
| `/api/v1/knowledge/{document_id}` | DELETE | Delete document |
| `/api/v1/health/db` | GET | Deep health check |

---

## User APIs

### 1. POST /api/v1/chat/

**Main AI Chat Endpoint** - Core của hệ thống.

#### Request

```json
{
  "user_id": "student_12345",
  "message": "Điều 15 Luật Hàng hải 2015 quy định gì về chủ tàu?",
  "role": "student",
  "session_id": "session_abc123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | string | ✅ | Unique user identifier từ LMS |
| `message` | string | ✅ | User message |
| `role` | string | ✅ | `student` / `teacher` / `admin` |
| `session_id` | string | ❌ | Optional, for conversation continuity |

#### Response

```json
{
  "status": "success",
  "data": {
    "answer": "<thinking>\nNgười dùng hỏi về Điều 15...\nTôi cần tra cứu database...\n</thinking>\n\n**Điều 15** của Bộ luật Hàng hải Việt Nam 2015...",
    "sources": [
      {
        "title": "📑 ### Điều 15. Chủ tàu",
        "content": "Chủ tàu là người sở hữu tàu biển...",
        "image_url": "https://xyz.supabase.co/storage/v1/object/public/maritime-docs/luat-hang-hai-2015-p1/page_8.jpg",
        "page_number": 8,
        "document_id": "luat-hang-hai-2015-p1",
        "bounding_boxes": [
          {"x0": 10.5, "y0": 15.2, "x1": 89.5, "y1": 35.8}
        ]
      }
    ],
    "suggested_questions": [
      "Thuyền viên cần những điều kiện gì?",
      "Thủ tục đăng ký tàu biển như thế nào?"
    ]
  },
  "metadata": {
    "processing_time": 5.234,
    "model": "maritime-rag-v1",
    "agent_type": "rag",
    "tools_used": [
      {"name": "tool_maritime_search", "description": "Retrieved 4 sources"}
    ]
  }
}
```

---

### 2. GET /api/v1/sources/

**Retrieve Sources with Bounding Boxes** - Cho source highlighting.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `document_id` | string | - | Filter theo document |
| `page_number` | int | - | Filter theo page |
| `limit` | int | 10 | Số results |

#### Response

```json
{
  "sources": [
    {
      "id": "chunk_uuid_123",
      "title": "Điều 15. Chủ tàu",
      "content": "...",
      "document_id": "luat-hang-hai-2015-p1",
      "page_number": 8,
      "image_url": "https://..../page_8.jpg",
      "bounding_boxes": [
        {"x0": 10.5, "y0": 15.2, "x1": 89.5, "y1": 35.8}
      ]
    }
  ],
  "total": 150,
  "limit": 10
}
```

---

### 3. GET /api/v1/memories/{user_id}

**AI Behavioral Insights** - Thông tin AI học được từ user.

#### Response

```json
{
  "user_id": "student_123",
  "insights": [
    {
      "category": "learning_style",
      "content": "Thích học qua ví dụ thực tế và diagram",
      "confidence": 0.95,
      "created_at": "2025-12-10T10:00:00Z"
    },
    {
      "category": "knowledge_gap",
      "content": "Chưa nắm vững về quy tắc đèn hiệu",
      "confidence": 0.85,
      "created_at": "2025-12-09T15:00:00Z"
    }
  ],
  "total_count": 12
}
```

**Insight Categories:**
| Category | Description |
|----------|-------------|
| `learning_style` | Cách học ưa thích |
| `knowledge_gap` | Lỗ hổng kiến thức |
| `goal_evolution` | Mục tiêu học tập |
| `habit` | Thói quen học |
| `preference` | Sở thích |

---

## Admin APIs

### 1. POST /api/v1/knowledge/ingest-multimodal

**Upload PDF with Multimodal Processing** - Chỉ Admin.

#### Request (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | PDF file (max 50MB) |
| `document_id` | string | ✅ | Unique document ID |
| `role` | string | ✅ | Must be `admin` |
| `resume` | boolean | ❌ | Resume from checkpoint |

#### Response

```json
{
  "status": "completed",
  "document_id": "luat-hang-hai-2015-p1",
  "total_pages": 50,
  "successful_pages": 50,
  "failed_pages": 0,
  "success_rate": 100.0,
  "message": "Processed 50/50 pages successfully"
}
```

### 2. GET /api/v1/knowledge/stats

```json
{
  "total_chunks": 1250,
  "total_documents": 5,
  "documents": [
    {"id": "luat-hang-hai-2015-p1", "chunks": 450},
    {"id": "colregs-2024", "chunks": 800}
  ]
}
```

### 3. DELETE /api/v1/knowledge/{document_id}

Delete document và tất cả chunks liên quan.

---

## Frontend Integration Guide

### 1. Xử lý `<thinking>` Tags (Like ChatGPT/Claude)

AI response có thể chứa `<thinking>...</thinking>` tags - đây là reasoning process.

**Recommended UI:**

```javascript
function parseResponse(answer) {
  const thinkingMatch = answer.match(/<thinking>([\s\S]*?)<\/thinking>/);
  const thinking = thinkingMatch ? thinkingMatch[1].trim() : null;
  const mainAnswer = answer.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
  
  return { thinking, mainAnswer };
}

// UI Implementation
const { thinking, mainAnswer } = parseResponse(response.data.answer);

// Option 1: Collapsible (default collapsed)
<details>
  <summary>💭 View AI Reasoning</summary>
  <div className="thinking-content">{thinking}</div>
</details>

// Option 2: Toggle button
<button onClick={() => setShowThinking(!showThinking)}>
  {showThinking ? 'Hide' : 'Show'} Reasoning
</button>
```

**CSS Suggestion:**
```css
.thinking-content {
  background: #f8f9fa;
  border-left: 3px solid #6c757d;
  padding: 12px;
  font-style: italic;
  color: #666;
  margin-bottom: 16px;
}
```

---

### 2. Source Highlighting with Citation Jumping

Đây là tính năng **Source Highlighting with Citation Jumping** - chuẩn MM-RAG 2025.

**Flow:**

```
1. User clicks source → 
2. Open PDF viewer (PDF.js) → 
3. Jump to page_number → 
4. Draw highlight overlay using bounding_boxes
```

**Implementation với PDF.js:**

```javascript
import { pdfjs } from 'react-pdf';

async function highlightSource(source) {
  // 1. Load PDF
  const pdf = await pdfjs.getDocument(source.image_url).promise;
  
  // 2. Jump to page
  const page = await pdf.getPage(source.page_number);
  
  // 3. Draw bounding box highlights
  const { bounding_boxes } = source;
  bounding_boxes.forEach(bbox => {
    // Coords are percentages (0-100)
    drawHighlight(
      bbox.x0 / 100 * pageWidth,
      bbox.y0 / 100 * pageHeight,
      (bbox.x1 - bbox.x0) / 100 * pageWidth,
      (bbox.y1 - bbox.y0) / 100 * pageHeight
    );
  });
}

function drawHighlight(x, y, width, height) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    width: ${width}px;
    height: ${height}px;
    background: rgba(255, 255, 0, 0.3);
    border: 2px solid #ffd700;
    pointer-events: none;
  `;
  pdfContainer.appendChild(overlay);
}
```

**Alternative: Image-based highlighting (simpler)**

```javascript
// If using image_url directly
function renderSourceWithHighlight(source) {
  return (
    <div className="source-preview">
      <img src={source.image_url} alt={`Page ${source.page_number}`} />
      
      {/* Overlay bounding boxes */}
      {source.bounding_boxes.map((bbox, i) => (
        <div 
          key={i}
          className="highlight-box"
          style={{
            left: `${bbox.x0}%`,
            top: `${bbox.y0}%`,
            width: `${bbox.x1 - bbox.x0}%`,
            height: `${bbox.y1 - bbox.y0}%`,
          }}
        />
      ))}
    </div>
  );
}
```

---

### 3. Session Management

```javascript
// Same session = continuous conversation
const sessionId = localStorage.getItem('chatSessionId') || generateUUID();

// New conversation = new session
function startNewChat() {
  localStorage.setItem('chatSessionId', generateUUID());
}
```

---

### 4. Role-based Persona

| Role | AI Persona | Tone |
|------|------------|------|
| `student` | Captain AI (Tutor) | Thân thiện, khuyến khích, giải thích kỹ |
| `teacher` | Maritime Pro (Assistant) | Chuyên nghiệp, ngắn gọn |
| `admin` | Maritime Pro (Assistant) | Chuyên nghiệp + full capabilities |

---

## Response Handling Best Practices

### 1. Handle Empty Sources Gracefully

```javascript
if (!response.data.sources || response.data.sources.length === 0) {
  // AI answered from general knowledge
  showMessage("Câu trả lời này dựa trên kiến thức chung");
}
```

### 2. Rate Limiting

- **Limit:** 30 requests/minute per IP
- **On 429:** Implement exponential backoff

```javascript
async function chatWithRetry(message, retries = 3) {
  try {
    return await sendChat(message);
  } catch (error) {
    if (error.status === 429 && retries > 0) {
      await sleep(2000 * (4 - retries)); // 2s, 4s, 6s
      return chatWithRetry(message, retries - 1);
    }
    throw error;
  }
}
```

---

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| 200 | Success | - |
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Check API key |
| 403 | Forbidden | User doesn't have permission |
| 429 | Rate Limited | Wait and retry |
| 500 | Server Error | Contact support |

---

## Quick Test Commands

```bash
# Health check
curl https://maritime-ai-chatbot.onrender.com/api/v1/health

# Chat test
curl -X POST https://maritime-ai-chatbot.onrender.com/api/v1/chat/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{"user_id":"test","message":"Điều 15 là gì?","role":"student"}'

# Get sources
curl https://maritime-ai-chatbot.onrender.com/api/v1/sources/?document_id=luat-hang-hai-2015-p1 \
  -H "X-API-Key: YOUR_KEY"
```

---

## Support

- **Technical Issues:** [Backend Team]
- **Integration Help:** [LMS Team Lead]
- **API Documentation:** This file

---

*Last generated: 2025-12-10 | Maritime AI Tutor v0.9.8*
