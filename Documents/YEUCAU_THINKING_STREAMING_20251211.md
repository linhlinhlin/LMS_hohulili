# 📋 YÊU CẦU: Streaming Thinking Process (Qwen-style)

**Ngày:** 11/12/2025  
**Từ:** Team LMS Backend  
**Đến:** Team AI Backend  
**Chủ đề:** Cải thiện Streaming Thinking Process

---

## 1. TÌNH HÌNH HIỆN TẠI

### ✅ Đã hoạt động:
- Streaming endpoint `/api/v1/chat/stream` hoạt động tốt
- Events: `thinking`, `answer`, `sources`, `suggested_questions`, `metadata`, `done`
- Test script xác nhận streaming OK

### ❓ Câu hỏi:

Chúng tôi muốn hiển thị thinking process giống như **Qwen** (xem hình tham khảo):
- Thinking được stream từng phần (real-time)
- Hiển thị trong panel collapsible
- Có thể mở rộng/thu gọn
- Hiển thị token budget (nếu có)

---

## 2. CÂU HỎI CHO TEAM AI

### 2.1. Thinking Streaming

**Câu hỏi:** Thinking content có được stream từng chunk không, hay gửi một lần?

**Hiện tại chúng tôi nhận được:**
```
event: thinking
data: {"content": "Đang phân tích câu hỏi..."}

event: thinking
data: {"content": "Đang tra cứu cơ sở dữ liệu..."}
```

**Mong muốn:** Thinking được stream từng phần như answer, để user thấy AI đang "suy nghĩ" real-time.

### 2.2. Thinking Token Budget

**Câu hỏi:** Có thể cung cấp thông tin về thinking token budget không?

**Ví dụ Qwen:**
```
Thinking completed · 81,920 tokens budget
```

**Mong muốn:** Thêm field `thinking_tokens` hoặc `token_budget` trong metadata event.

### 2.3. Thinking Status

**Câu hỏi:** Có thể thêm event `thinking_start` và `thinking_end` không?

**Mong muốn:**
```
event: thinking_start
data: {"token_budget": 81920}

event: thinking
data: {"content": "Đang phân tích..."}

event: thinking
data: {"content": "Đang tra cứu..."}

event: thinking_end
data: {"tokens_used": 1500}
```

---

## 3. ĐỀ XUẤT FORMAT MỚI

### 3.1. Thinking Events (Enhanced)

```json
// Bắt đầu thinking
{
  "type": "thinking_start",
  "token_budget": 81920
}

// Thinking chunks (stream từng phần)
{
  "type": "thinking",
  "content": "Đang phân tích câu hỏi của người dùng...",
  "step": 1
}

{
  "type": "thinking",
  "content": "Tìm kiếm trong cơ sở dữ liệu pháp luật hàng hải...",
  "step": 2
}

// Kết thúc thinking
{
  "type": "thinking_end",
  "tokens_used": 1500,
  "duration_ms": 2500
}
```

### 3.2. Metadata Event (Enhanced)

```json
{
  "type": "metadata",
  "processing_time": 5.234,
  "thinking_tokens": 1500,
  "answer_tokens": 500,
  "total_tokens": 2000,
  "model": "qwen-max",
  "confidence_score": 0.95
}
```

---

## 4. UI REFERENCE (Qwen Style)

```
┌─────────────────────────────────────────────────────┐
│ 💭 Thinking completed · 81,920 tokens budget    [▼] │
├─────────────────────────────────────────────────────┤
│ ✓ Đang phân tích câu hỏi của người dùng...          │
│   ─────────────────────────────────────             │
│ ✓ Tìm kiếm trong cơ sở dữ liệu pháp luật...         │
│   ─────────────────────────────────────             │
│ ✓ Tổng hợp thông tin từ các nguồn...                │
└─────────────────────────────────────────────────────┘
```

---

## 5. PRIORITY

| Feature | Priority | Notes |
|---------|----------|-------|
| Thinking streaming (chunks) | 🔴 High | Cần để hiển thị real-time |
| thinking_start/end events | 🟡 Medium | Nice to have |
| Token budget info | 🟢 Low | Optional |

---

## 6. TIMELINE

- **Mong muốn:** Trong sprint tiếp theo
- **Deadline:** Không gấp, có thể thảo luận thêm

---

## 7. LIÊN HỆ

Nếu có câu hỏi, vui lòng liên hệ:
- **Email:** [Team LMS Backend]
- **Slack:** #lms-ai-integration

---

**Cảm ơn Team AI!** 🙏
