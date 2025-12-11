# 📋 CHỈ THỊ CHO TEAM FRONTEND LMS

**Ngày:** 10/12/2025  
**Từ:** PM/Tech Lead Backend  
**Đến:** Team Frontend LMS (Angular)  
**Chủ đề:** Update AI Chat để hỗ trợ Source Highlighting

---

## 1. TỔNG QUAN

Backend LMS đã hoàn thành tích hợp với AI Service. Frontend cần update để:

1. ✅ Nhận và hiển thị source highlighting với bounding boxes
2. ✅ Handle `<thinking>` tags trong AI response
3. ✅ Hiển thị suggested questions

---

## 2. API RESPONSE FORMAT MỚI

### Chat Response

```typescript
interface ChatResponse {
  status: 'success' | 'error';
  data: {
    sessionId: string;
    messageId: string;
    answer: string;  // Có thể chứa <thinking>...</thinking>
    sources: Source[];
    suggestedQuestions: string[];
    metadata: {
      processingTime: number;
    };
  };
}

interface Source {
  title: string;
  content: string;
  url: string | null;
  imageUrl: string | null;      // NEW: URL ảnh trang PDF
  pageNumber: number | null;    // NEW: Số trang
  documentId: string | null;    // NEW: ID tài liệu
  boundingBoxes: BoundingBox[] | null;  // NEW: Tọa độ highlight
}

interface BoundingBox {
  x0: number;  // Left (percentage 0-100)
  y0: number;  // Top (percentage 0-100)
  x1: number;  // Right (percentage 0-100)
  y1: number;  // Bottom (percentage 0-100)
}
```

---

## 3. TASKS CẦN THỰC HIỆN

### Task 1: Update chat-api.client.ts

**File:** `fe/src/app/features/ai-chat/infrastructure/api/chat-api.client.ts`

Cập nhật interface để nhận fields mới:

```typescript
export interface SourceResponse {
  title: string;
  content: string;
  url?: string;
  // NEW fields
  imageUrl?: string;
  pageNumber?: number;
  documentId?: string;
  boundingBoxes?: Array<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }>;
}
```

### Task 2: Handle `<thinking>` Tags

**File:** `fe/src/app/features/ai-chat/utils/markdown-renderer.util.ts`

AI response có thể chứa `<thinking>...</thinking>` tags. Cần:

```typescript
export function parseAIResponse(answer: string): { thinking: string | null; mainAnswer: string } {
  const thinkingMatch = answer.match(/<thinking>([\s\S]*?)<\/thinking>/);
  const thinking = thinkingMatch ? thinkingMatch[1].trim() : null;
  const mainAnswer = answer.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
  
  return { thinking, mainAnswer };
}
```

**UI Implementation:**

```html
<!-- Default: Ẩn thinking, có toggle để xem -->
@if (thinking) {
  <details class="thinking-section">
    <summary class="cursor-pointer text-gray-500 text-sm">
      💭 Xem quá trình suy luận
    </summary>
    <div class="thinking-content bg-gray-50 border-l-3 border-gray-400 p-3 mt-2 italic text-gray-600">
      {{ thinking }}
    </div>
  </details>
}

<div class="main-answer">
  {{ mainAnswer }}
</div>
```

### Task 3: Source Highlighting Component

**File:** `fe/src/app/features/ai-chat/presentation/components/source-citation/source-citation.component.ts`

Implement source highlighting với bounding boxes:

```typescript
@Component({
  selector: 'app-source-citation',
  template: `
    <div class="source-preview relative">
      @if (source.imageUrl) {
        <img [src]="source.imageUrl" [alt]="'Page ' + source.pageNumber" class="w-full" />
        
        <!-- Overlay bounding boxes -->
        @for (box of source.boundingBoxes; track $index) {
          <div 
            class="highlight-box absolute pointer-events-none"
            [style.left.%]="box.x0"
            [style.top.%]="box.y0"
            [style.width.%]="box.x1 - box.x0"
            [style.height.%]="box.y1 - box.y0"
          ></div>
        }
      }
      
      <div class="source-info p-2">
        <h4 class="font-medium">{{ source.title }}</h4>
        <p class="text-sm text-gray-600">{{ source.content }}</p>
        @if (source.pageNumber) {
          <span class="text-xs text-gray-400">Trang {{ source.pageNumber }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .highlight-box {
      background: rgba(255, 255, 0, 0.3);
      border: 2px solid #ffd700;
    }
  `]
})
export class SourceCitationComponent {
  @Input() source!: Source;
}
```

### Task 4: Suggested Questions

**File:** `fe/src/app/features/ai-chat/presentation/components/suggested-questions/suggested-questions.component.ts`

Hiển thị suggested questions từ AI:

```typescript
@Component({
  selector: 'app-suggested-questions',
  template: `
    @if (questions && questions.length > 0) {
      <div class="suggested-questions mt-4">
        <p class="text-sm text-gray-500 mb-2">Câu hỏi gợi ý:</p>
        <div class="flex flex-wrap gap-2">
          @for (question of questions; track question) {
            <button 
              (click)="onQuestionClick.emit(question)"
              class="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition"
            >
              {{ question }}
            </button>
          }
        </div>
      </div>
    }
  `
})
export class SuggestedQuestionsComponent {
  @Input() questions: string[] = [];
  @Output() onQuestionClick = new EventEmitter<string>();
}
```

---

## 4. PRIORITY

| Priority | Task | Effort |
|----------|------|--------|
| 🔴 High | Update interfaces | 30 min |
| 🔴 High | Handle `<thinking>` tags | 1 hour |
| 🟡 Medium | Source highlighting | 2 hours |
| 🟢 Low | Suggested questions | 30 min |

---

## 5. TESTING

### Test với Backend

```bash
# Start backend
cd api && mvn spring-boot:run

# Test chat endpoint
curl -X POST http://localhost:8088/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"message": "Điều 15 là gì?"}'
```

### Expected Response

- `sources[].boundingBoxes` có giá trị
- `sources[].imageUrl` có URL ảnh
- `answer` có thể chứa `<thinking>` tags

---

## 6. TIMELINE

- **Ngày 10/12:** Backend hoàn thành ✅
- **Ngày 11-12/12:** Frontend implement
- **Ngày 13/12:** Integration testing
- **Ngày 14/12:** Go-live

---

**Liên hệ:** PM/Tech Lead Backend nếu có câu hỏi.

*Vui lòng confirm khi nhận được chỉ thị này.*
