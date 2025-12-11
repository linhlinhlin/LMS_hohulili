# PHAN HOI: Thinking Streaming Enhancement

**Ngay:** 11/12/2025  
**Tu:** Team Backend AI  
**Den:** Team LMS Backend  
**Chu de:** Tra loi cau hoi ve Thinking Streaming

---

## 1. TRA LOI CAC CAU HOI

### 2.1. Thinking Streaming - Co the lam khong?

**Tra loi: PHAN NANG**

| Feature | Kha nang | Giai thich |
|---------|----------|------------|
| Thinking chunks (real-time AI reasoning) | Chua kha thi | Gemini khong expose thinking stream |
| Thinking status messages | DA CO | "Dang phan tich...", "Dang tra cuu..." |
| `<thinking>` tags content | DA CO | Extract tu AI response |

**Ly do:**

Gemini 2.5 Flash (LLM dang dung) **khong ho tro streaming thinking process** nhu Qwen/DeepSeek.

- Qwen: Co "Deep Thinking" mode voi token streaming
- Gemini: Thinking la internal, khong expose ra ngoai
- OpenAI o1: Tuong tu, thinking an di

**Hien tai chung toi da co:**
1. Status messages ("Dang phan tich...", "Dang tra cuu...")
2. Extract `<thinking>` tags tu final response

---

### 2.2. Token Budget - Co the cung cap khong?

**Tra loi: PHAN NANG**

| Metric | Kha nang | Notes |
|--------|----------|-------|
| thinking_tokens | Khong | Gemini khong report |
| answer_tokens | Khong | Can estimate tu response length |
| total_tokens | Kho | Gemini API khong tra ve usage trong streaming |
| processing_time | DA CO | Da co trong metadata |

**Workaround:** Co the estimate tokens = len(text) / 4 (rough estimate)

---

### 2.3. thinking_start/thinking_end Events

**Tra loi: CO THE IMPLEMENT**

Se them:
- `thinking_start`: Gui khi bat dau processing
- `thinking_end`: Gui khi ket thuc thinking phase

---

## 2. DE XUAT GIAI PHAP

### 2.1. Enhanced Thinking Events (Co the implement ngay)

```
event: thinking_start
data: {"status": "starting", "estimated_time": 5}

event: thinking
data: {"content": "Dang phan tich cau hoi...", "step": 1}

event: thinking
data: {"content": "Dang tra cuu co so du lieu...", "step": 2}

event: thinking_end
data: {"duration_ms": 3500}

event: answer
data: {"content": "Theo Dieu 15..."}
```

### 2.2. Enhanced Metadata (Co the implement)

```json
{
  "event": "metadata",
  "data": {
    "processing_time": 5.234,
    "thinking_duration_ms": 3500,
    "answer_tokens_estimate": 500,
    "model": "gemini-2.5-flash",
    "confidence_score": 0.9
  }
}
```

---

## 3. WHAT WE CAN IMPLEMENT

| Feature | Priority | Status | ETA |
|---------|----------|--------|-----|
| `thinking_start` event | High | Can do | 1 day |
| `thinking_end` event | High | Can do | 1 day |
| `thinking.step` field | Medium | Can do | 1 day |
| `thinking_duration_ms` | Medium | Can do | 1 day |
| Real thinking streaming | Low | Not possible (LLM limit) | N/A |
| Token budget display | Low | Rough estimate only | 1 day |

---

## 4. WHAT WE CANNOT DO

| Feature | Reason |
|---------|--------|
| Real-time AI thinking stream | Gemini khong expose |
| Exact token count | Gemini API khong tra ve trong streaming |
| 81,920 token budget display | Chi Qwen/DeepSeek co feature nay |

---

## 5. RECOMMENDED APPROACH

### Cho LMS Frontend:

1. **Su dung `thinking` events hien tai** de hien thi status
2. **Hien thi collapsible panel** cho thinking content
3. **Fake token budget** neu can (hoac bo qua)

### Team AI se:

1. Them `thinking_start` va `thinking_end` events
2. Them `step` field vao thinking events
3. Them `thinking_duration_ms` vao metadata

---

## 6. TIMELINE

| Phase | Task | ETA |
|-------|------|-----|
| 1 | Implement thinking_start/end | Today |
| 2 | Add step field | Today |
| 3 | Add duration to metadata | Today |
| 4 | Test & Deploy | Today |

---

## 7. CAU HOI NGUOC LAI

1. **Co can fake token budget** (estimate) de UI nhin giong Qwen khong?
2. **Step names** muon co bao nhieu steps? (2-3 or more?)
3. **Priority** co can implement ngay hom nay khong?

---

*Team Backend AI*
