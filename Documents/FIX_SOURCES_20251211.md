# Fix Sources Không Hiển Thị - 11/12/2025

## Phân tích Log Chi Tiết

Từ log `Documents/chuyengia/log1.md`, tôi phát hiện:

### 1. Sources được detect và xử lý ĐÚNG
```
chat-api.client.ts:408 🎯🎯🎯 SOURCES detected from content! 4 sources
chat-api.client.ts:435 🎯🎯🎯 SOURCES EVENT WILL BE YIELDED! 🎯🎯🎯 {eventType: 'sources'...}
chat.service.ts:949 📚📚📚 SOURCES EVENT RECEIVED! 📚📚📚
chat.service.ts:959 📚 Mapped sources count: 4
chat.service.ts:973 📚 Message updated with sources at index: 1
```

### 2. Sources đã được lưu vào message metadata
```
chat.service.ts:974 📚 Updated message metadata: {...sources: [4 items]...}
```

### 3. Nhưng UI không hiển thị!
- Không thấy log `🔖 SourceCitationComponent sources:` - component không được render
- Không thấy log `📝 Finalizing message with sources:` - stream chưa kết thúc

## Root Cause

**Điều kiện render trong template quá nghiêm ngặt:**

```html
@if (message.sender === 'ai' && message.metadata?.sources?.length && !(isLast && chatService.isStreaming()))
```

Khi message cuối cùng đang streaming:
- `isLast = true`
- `chatService.isStreaming() = true`
- `!(isLast && chatService.isStreaming())` = `!(true && true)` = `false`
- → **Sources không hiển thị!**

Sources được nhận TRƯỚC KHI streaming kết thúc, nhưng điều kiện yêu cầu streaming phải kết thúc mới hiển thị.

## Fix đã thực hiện

### Fix 1: `chat.service.ts` - Update sources ngay lập tức

```typescript
// Check if sources are included in answer event
const answerSources = (event as any).sources;
if (answerSources && Array.isArray(answerSources) && answerSources.length > 0) {
  sources = this.mapSourcesToFrontend(answerSources);
  
  // IMPORTANT: Update message metadata with sources IMMEDIATELY
  this._messages.update((msgs) => {
    const updated = [...msgs];
    if (updated[messageIndex]) {
      updated[messageIndex] = {
        ...updated[messageIndex],
        metadata: {
          ...updated[messageIndex].metadata,
          sources: sources,
        },
      };
    }
    return updated;
  });
}
```

### Fix 2: `chat-page.component.html` - Bỏ điều kiện streaming

**Trước:**
```html
@if (message.sender === 'ai' && message.metadata?.sources?.length && !(isLast && chatService.isStreaming()))
```

**Sau:**
```html
@if (message.sender === 'ai' && message.metadata?.sources?.length)
```

Sources sẽ hiển thị ngay khi nhận được, không cần đợi streaming kết thúc.

## Bước tiếp theo

1. **Rebuild frontend**: `npm run build` hoặc restart dev server
2. **Test lại** với câu hỏi "Điều 15 Luật Hàng hải 2015"
3. **Kiểm tra console** - phải thấy:
   - `📚📚📚 SOURCES EVENT RECEIVED! 📚📚📚`
   - `📚 Mapped sources count: 4`
   - `📚 Message updated with sources at index: 1`
   - `🔖 SourceCitationComponent sources: [4 items]`
4. **UI sẽ hiển thị** nút "4 nguồn tham khảo" ngay khi sources được nhận
