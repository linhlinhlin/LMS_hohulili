# XAC NHAN: Sources Event Hoat Dong

**Ngay:** 11/12/2025  
**Tu:** Team Backend AI  
**Den:** Team LMS Backend  
**Chu de:** Xac nhan sources event trong streaming API

---

## 1. KET QUA TEST

| Check | Result |
|-------|--------|
| Has sources event | **YES** |
| Total lines in response | 103 |
| Sources data format | **CORRECT** |

---

## 2. SOURCES DATA VERIFIED

```json
{
  "sources": [
    {
      "title": "",
      "content": "Maritime Knowledge Base",
      "image_url": "https://xxx.supabase.co/storage/v1/object/public/maritime-docs/luat-hang-hai-2015-p1/page_4.jpg",
      "page_number": 4,
      "document_id": "luat-hang-hai-2015-p1",
      "bounding_boxes": [{"x0": 10.77, "x1": 89...}]
    }
  ]
}
```

**Tat ca fields deu co:**
- `image_url` - OK
- `page_number` - OK  
- `document_id` - OK
- `bounding_boxes` - OK

---

## 3. VAN DE PHIA LMS?

Sources event **DA DUOC GUI** tu AI Service. Neu frontend khong nhan duoc, co the la:

### 3.1. Stream bi dong qua som

Frontend co the dong connection truoc khi nhan sources event.

**Giai phap:** Dam bao doi cho den khi nhan `event: done`

```typescript
case 'done':
  // Dong giong stream SAU khi nhan done
  break;
```

### 3.2. Event parsing loi

Kiem tra SSE parsing:

```typescript
// Kiem tra event type chinh xac
if (event === 'sources') {
  console.log('Received sources:', data);
}
```

### 3.3. Sources o cuoi stream

Sources event nam o cuoi stream (sau tat ca answer chunks). 

**Thu tu events:**
1. thinking (2-3 events)
2. answer (nhieu chunks)
3. **sources** <-- O DAY
4. suggested_questions
5. metadata
6. done

---

## 4. DEBUG CHO LMS

Them console.log de debug:

```typescript
eventSource.onmessage = (event) => {
  console.log('Event type:', event.type);
  console.log('Event data:', event.data);
};
```

Hoac dung curl de xem raw response:

```bash
curl -X POST https://maritime-ai-chatbot.onrender.com/api/v1/chat/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: maritime-lms-prod-2024" \
  -d '{"user_id":"test","message":"Dieu 15 Luat Hang hai 2015","role":"student"}' \
  2>&1 | grep -A1 "event: sources"
```

---

## 5. TOM TAT

| Item | Status | Notes |
|------|--------|-------|
| Sources event | **WORKING** | Verified by test |
| Data format | **CORRECT** | All fields present |
| Position in stream | After answer | Before done |

**Van de co the o phia frontend LMS parsing.**

---

*Team Backend AI*
