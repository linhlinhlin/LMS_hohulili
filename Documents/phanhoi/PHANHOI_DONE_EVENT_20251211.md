# PHAN HOI: SSE Done Event Issue

**Ngay:** 11/12/2025  
**Tu:** Team Backend AI  
**Den:** Team LMS Frontend  
**Chu de:** Phan tich va fix loi done event

---

## 1. PHAN TICH LOG CUA LMS

LMS bao cao thay:
```
1. answer (nhieu chunks)
2. sources (4 sources)
3. suggested_questions (3 questions)
4. metadata
5. answer {} <-- LA GI?
```

**Van de:** `answer {}` KHONG PHAI la event chung toi gui!

---

## 2. DONE EVENT DA CO

Code hien tai (line 165-166):
```python
# Phase 7: Done - signal stream completion
yield format_sse("done", {"status": "complete"})
```

**Format gui:**
```
event: done
data: {"status": "complete"}

```

---

## 3. LY DO FRONTEND KHONG NHAN DUOC

### 3.1. Frontend co the dang parse SAI event type

```typescript
// SAI - neu dung onmessage, event.type se la "message"
eventSource.onmessage = (event) => {
  // event.type = "message" (khong phai "done")
}

// DUNG - phai listen specific event types
eventSource.addEventListener('done', (event) => {
  console.log('Done received:', event.data);
});
```

### 3.2. Fetch + ReadableStream parsing

Neu dung `fetch` + `ReadableStream`:

```typescript
const lines = text.split('\n');
for (const line of lines) {
  if (line.startsWith('event:')) {
    eventType = line.substring(6).trim(); // "done"
  }
  if (line.startsWith('data:')) {
    eventData = JSON.parse(line.substring(5));
    // eventType luc nay la "done"
  }
}
```

**Kiem tra:** Frontend co dang track `eventType` dung khong?

---

## 4. DA CAP NHAT

| Change | Before | After |
|--------|--------|-------|
| done event data | `{}` | `{"status": "complete"}` |

---

## 5. TEST COMMAND

Dung curl de xem done event:

```bash
curl -X POST https://maritime-ai-chatbot.onrender.com/api/v1/chat/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: maritime-lms-prod-2024" \
  -d '{"user_id":"test","message":"hello","role":"student"}' \
  2>&1 | tail -20
```

**Ky vong thay:**
```
event: metadata
data: {...}

event: done
data: {"status": "complete"}

```

---

## 6. DE XUAT FRONTEND FIX

### Code parsing SSE dung:

```typescript
async function* parseSSEStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';
    
    for (const block of lines) {
      const eventLines = block.split('\n');
      let eventType = 'message';
      let eventData = '';
      
      for (const line of eventLines) {
        if (line.startsWith('event:')) {
          eventType = line.substring(6).trim();
        }
        if (line.startsWith('data:')) {
          eventData = line.substring(5).trim();
        }
      }
      
      if (eventType === 'done') {
        console.log('Stream completed!');
        return; // Exit generator
      }
      
      yield { type: eventType, data: JSON.parse(eventData) };
    }
  }
}
```

---

## 7. CHECKLIST

- [x] Backend gui done event: `{"status": "complete"}`
- [ ] Frontend parse event type dung
- [ ] Frontend handle done event

---

*Team Backend AI*
