# 🎨 DESIGN BRIEF: AI CHAT INTERFACE

**Từ:** Team Backend LMS (PM)  
**Gửi:** Chuyên gia UX/UI  
**Ngày:** 05/12/2025  
**Dự án:** Maritime LMS - AI Tutor Chat

---

## 📋 TÓM TẮT DỰ ÁN

Chúng ta cần thiết kế một **trang AI Chat hoàn chỉnh** cho hệ thống LMS Hàng hải. Đây là AI Tutor giúp sinh viên học về luật hàng hải (COLREGs, SOLAS, MARPOL).

**Mục tiêu:** Tạo trải nghiệm chat AI chuyên nghiệp như ChatGPT/Claude/Gemini, nhưng phù hợp với ngữ cảnh giáo dục hàng hải.

---

## 👥 USER PERSONAS

### 1. Sinh viên Hàng hải (Primary User)
- **Tuổi:** 18-25
- **Mục tiêu:** Học và ôn tập luật hàng hải
- **Pain points:** Tài liệu khô khan, khó hiểu
- **Expectations:** AI giải thích dễ hiểu, có ví dụ thực tế

### 2. Giảng viên (Secondary User)
- **Tuổi:** 30-55
- **Mục tiêu:** Tra cứu nhanh quy định, hỗ trợ giảng dạy
- **Pain points:** Cần thông tin chính xác, có trích dẫn nguồn
- **Expectations:** AI chuyên nghiệp, trả lời ngắn gọn

### 3. Admin (Tertiary User)
- **Mục tiêu:** Quản lý knowledge base, theo dõi usage
- **Expectations:** Dashboard thống kê, upload tài liệu

---

## 🎯 DESIGN GOALS

### 1. Clarity (Rõ ràng)
- Giao diện trực quan, dễ sử dụng
- Phân biệt rõ user message vs AI response
- Hiển thị nguồn tham khảo một cách có tổ chức

### 2. Trust (Tin cậy)
- AI responses có trích dẫn nguồn (citations)
- Hiển thị processing time
- Disclaimer về AI limitations

### 3. Engagement (Tương tác)
- Suggested questions để khuyến khích học tiếp
- Smooth animations tạo cảm giác "alive"
- Feedback mechanisms (helpful/not helpful)

### 4. Accessibility
- Contrast ratio đạt WCAG AA
- Keyboard navigation
- Screen reader friendly

---

## 🖼️ WIREFRAME CONCEPTS

### Concept A: Classic ChatGPT Style
```
┌─────────────────────────────────────────────────────────────┐
│ [≡] Maritime AI Tutor                              [👤] [⚙] │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  + New Chat  │     🎓 Xin chào! Tôi là Maritime AI Tutor   │
│              │                                              │
│  ─────────── │     Tôi có thể giúp bạn:                    │
│  Today       │     • Giải thích luật hàng hải              │
│  • Chat 1    │     • Ôn tập COLREGs, SOLAS, MARPOL         │
│  • Chat 2    │     • Trả lời câu hỏi về an toàn hàng hải   │
│              │                                              │
│  Yesterday   │     ┌─────────────────────────────────────┐  │
│  • Chat 3    │     │ Hỏi về quy tắc tránh va...         │  │
│              │     └─────────────────────────────────────┘  │
│              │                                              │
│              │     💡 Gợi ý:                                │
│              │     [Quy tắc 15?] [SOLAS là gì?] [MARPOL?]  │
│              │                                              │
│              │  ┌────────────────────────────────┐ [Send]   │
│              │  │ Nhập câu hỏi của bạn...        │          │
│              │  └────────────────────────────────┘          │
└──────────────┴──────────────────────────────────────────────┘
```

### Concept B: Educational Focus
```
┌─────────────────────────────────────────────────────────────┐
│ 🎓 Maritime AI Tutor                    [History] [Settings]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📚 Chủ đề học tập                                   │   │
│  │  [COLREGs] [SOLAS] [MARPOL] [An toàn] [Khác]        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 Giải thích quy tắc 15 COLREGs                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🤖 **Quy tắc 15 - Tình huống cắt hướng**            │   │
│  │                                                      │   │
│  │ Khi hai tàu chạy cắt hướng nhau có nguy cơ va chạm: │   │
│  │ • Tàu nhìn thấy tàu kia ở bên **mạn phải** phải     │   │
│  │   nhường đường                                       │   │
│  │ • Tàu nhường đường phải tránh cắt hướng phía trước  │   │
│  │                                                      │   │
│  │ 📖 Nguồn: COLREGs Rule 15 - Crossing Situation      │   │
│  │                                                      │   │
│  │ 💡 Câu hỏi tiếp theo:                               │   │
│  │ [Tàu nào được quyền đi?] [Ví dụ thực tế?]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────┐ [Gửi]      │
│  │ Nhập câu hỏi...                            │            │
│  └────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 DESIGN SYSTEM SUGGESTIONS

### Color Palette

**Primary Colors:**
```
Maritime Blue:    #1e3a5f (Trust, Professional)
Ocean Teal:       #10a37f (Action, Success)
Warm White:       #f7f7f8 (Background)
```

**Semantic Colors:**
```
User Message:     #e3f2fd (Light blue tint)
AI Message:       #ffffff (Clean white)
Source Citation:  #fff3e0 (Warm highlight)
Suggested Q:      #e8f5e9 (Soft green)
```

**Dark Mode:**
```
Background:       #1a1a2e
Surface:          #16213e
Text:             #e4e4e7
```

### Typography

```
Headings:         Inter, 600 weight
Body:             Inter, 400 weight
Code:             JetBrains Mono
```

### Iconography
- Style: Outlined, 24px
- AI Avatar: Custom maritime-themed (anchor + AI)
- Actions: Material Icons hoặc Lucide

---

## 🔄 USER FLOWS

### Flow 1: First Time User
```
Landing → Welcome Screen → Suggested Topics → First Question → AI Response → Continue Learning
```

### Flow 2: Returning User
```
Landing → Session List → Select Previous Chat → Continue Conversation
```

### Flow 3: New Topic
```
Any Screen → New Chat Button → Empty State → New Question → AI Response
```

---

## 📱 RESPONSIVE CONSIDERATIONS

### Desktop (>1024px)
- Sidebar always visible
- Wide message area
- Keyboard shortcuts prominent

### Tablet (768px - 1024px)
- Collapsible sidebar
- Touch-friendly buttons
- Swipe gestures

### Mobile (<768px)
- Sidebar as drawer/overlay
- Full-width messages
- Bottom-fixed input
- Floating action button for new chat

---

## ✨ MICRO-INTERACTIONS

### 1. Message Sending
```
Input → Button press → Ripple effect → Message appears → Scroll to bottom
```

### 2. AI Typing
```
User message sent → Typing indicator (3 dots pulsing) → Response streams in
```

### 3. Source Expansion
```
Citation chip → Click → Smooth expand → Show full source → Click again → Collapse
```

### 4. Suggested Question
```
Chip hover → Subtle scale up → Click → Auto-fill input → Send
```

---

## 🚫 ANTI-PATTERNS TO AVOID

1. **Don't:** Make AI feel robotic
   **Do:** Use friendly, educational tone

2. **Don't:** Hide sources/citations
   **Do:** Make them prominent but not intrusive

3. **Don't:** Overwhelm with features
   **Do:** Progressive disclosure

4. **Don't:** Generic chatbot look
   **Do:** Maritime/educational branding

---

## 📊 SUCCESS METRICS

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first message | < 10 seconds | Analytics |
| Messages per session | > 5 | Backend logs |
| Session return rate | > 40% | User tracking |
| User satisfaction | > 4.0/5.0 | In-app survey |

---

## 🎯 DELIVERABLES REQUESTED

1. **High-fidelity mockups** cho Desktop, Tablet, Mobile
2. **Component library** với states (default, hover, active, disabled)
3. **Animation specs** cho micro-interactions
4. **Dark mode variants**
5. **Accessibility audit** của designs

---

## 📅 TIMELINE

| Phase | Deliverable | Duration |
|-------|-------------|----------|
| Discovery | Wireframes + Concepts | 3 days |
| Design | Hi-fi Mockups | 5 days |
| Review | Feedback + Iterations | 2 days |
| Handoff | Design specs + Assets | 2 days |

---

## 📎 REFERENCES & INSPIRATION

### AI Chat Interfaces
- ChatGPT: https://chat.openai.com
- Claude: https://claude.ai
- Gemini: https://gemini.google.com
- Perplexity: https://perplexity.ai

### Educational Platforms
- Duolingo (Gamification)
- Khan Academy (Learning flow)
- Coursera (Professional feel)

### Maritime Theme
- IMO website: https://www.imo.org
- Maritime color schemes (blues, teals)

---

**Ghi chú:** Chúng tôi mong muốn một thiết kế vừa chuyên nghiệp vừa thân thiện với sinh viên. AI Tutor nên cảm thấy như một "người thầy ảo" đáng tin cậy, không phải một chatbot lạnh lùng.

Mọi thắc mắc xin liên hệ PM.

---

**Chữ ký:**  
Team Backend LMS  
Project Manager
