# BAO CAO GIAI PHAP: AI CHAT SESSION ISOLATION

**Tu:** Team LMS (Backend + Frontend)
**Gui:** Co van Kien truc
**Ngay:** 05/12/2025
**Trang thai:** HOAN THANH

---

## 1. VAN DE DA PHAT HIEN

### Mo ta van de
Khi nhieu nguoi dung (student, teacher, admin) su dung cung mot may tinh de truy cap he thong LMS, tat ca deu thay chung mot lich su chat voi AI. Day la loi bao mat nghiem trong vi:

- User A co the doc duoc noi dung chat cua User B
- Xoa cache trinh duyet se mat toan bo du lieu chat
- Khong co su ca nhan hoa theo tung nguoi dung

### Nguyen nhan goc
Frontend luu tru chat sessions trong localStorage voi key co dinh `ai_chat_session`, khong phan biet theo userId.

---

## 2. GIAI PHAP DA TRIEN KHAI

### 2.1. User Isolation trong localStorage

**File:** `fe/src/app/features/ai-chat/infrastructure/repositories/chat-storage.repository.ts`

**Thay doi:**
- Storage keys gio co format: `ai_chat_session_{userId}`
- Them method `setCurrentUserId(userId)` de thiet lap user hien tai
- Them method `clearAllSessions()` de xoa toan bo sessions khi logout
- Them kiem tra userId khi load session de dam bao khong load nham data

**Code mau:**
```typescript
// Truoc: Key co dinh cho tat ca users
const STORAGE_KEY = 'ai_chat_session';

// Sau: Key rieng cho tung user
private getStorageKey(keyType: string): string {
  const userId = this.currentUserId || 'anonymous';
  return `${STORAGE_KEY_PREFIX[keyType]}_${userId}`;
}
```

### 2.2. Auth Integration

**File:** `fe/src/app/features/ai-chat/application/services/session-management.service.ts`

**Thay doi:**
- Subscribe `AuthService.currentUser$` de phat hien login/logout
- Khi user login: Thiet lap isolated storage voi userId
- Khi user logout: Clear session data va reset userId

**Code mau:**
```typescript
constructor() {
  this.authSubscription = this.authService.currentUser$.subscribe(user => {
    if (user) {
      this.handleUserLogin(user.id.toString(), user.role);
    } else {
      this.handleUserLogout();
    }
  });
}
```

### 2.3. User Change Detection

**File:** `fe/src/app/features/ai-chat/application/services/chat.service.ts`

**Thay doi:**
- Them effect de react khi userId thay doi
- Tu dong clear messages va reload data cho user moi

---

## 3. CACH HOAT DONG

### Login Flow
```
1. User login -> AuthService emit currentUser$
2. SessionManagementService nhan event
3. Goi storage.setCurrentUserId(userId)
4. Load session tu localStorage voi key: ai_chat_session_{userId}
5. User thay chat history cua rieng ho
```

### Logout Flow
```
1. User logout -> AuthService emit null
2. SessionManagementService nhan event
3. Clear current session
4. Reset userId = ''
5. User tiep theo login se co storage rieng
```

### Storage Keys Example
```
User 123:
  ai_chat_session_123
  ai_chat_messages_123
  ai_chat_last_session_id_123

User 456:
  ai_chat_session_456
  ai_chat_messages_456
  ai_chat_last_session_id_456
```

---

## 4. BACKEND AI - KHONG CAN THAY DOI

Backend AI (Maritime AI Tutor Service) da nhan `user_id` trong moi request:

```json
{
  "user_id": "123",
  "message": "Xin chao",
  "role": "student",
  "session_id": "uuid-xxx-xxx"
}
```

Backend LMS da gui day du thong tin user trong `AIServiceRequest.java`:
```java
public record AIServiceRequest(
    @JsonProperty("user_id") String userId,
    String message,
    String role,
    @JsonProperty("session_id") String sessionId,
    AIContextRequest context
) {}
```

---

## 5. TESTING

### Test Case 1: User Isolation
1. Login as student1
2. Chat: "Hello, I'm student1"
3. Logout
4. Login as student2
5. Ket qua mong doi: Chat history trong
6. Chat: "Hello, I'm student2"
7. Logout
8. Login as student1
9. Ket qua mong doi: Chi thay "Hello, I'm student1"

### Test Case 2: Cross-Role Isolation
1. Login as teacher
2. Chat voi AI
3. Logout
4. Login as admin
5. Ket qua mong doi: Khong thay chat cua teacher

---

## 6. SECURITY CHECKLIST

- [x] User isolation trong localStorage
- [x] Auto-clear khi logout
- [x] Verify userId khi load session
- [x] Backend gui user_id trong requests
- [x] Sessions luu server-side voi userId

---

## 7. FILES DA THAY DOI

### Frontend (Angular)
1. `fe/src/app/features/ai-chat/infrastructure/repositories/chat-storage.repository.ts`
2. `fe/src/app/features/ai-chat/application/services/session-management.service.ts`
3. `fe/src/app/features/ai-chat/application/services/chat.service.ts`

### Backend (Java Spring Boot)
- Khong can thay doi (da co san user_id trong AIServiceRequest)

### Backend AI (Python FastAPI)
- Khong can thay doi (da nhan user_id tu LMS Backend)

---

## 8. KET LUAN

Giai phap da duoc trien khai hoan chinh, dam bao:
- Moi user co chat history rieng biet
- Bao mat du lieu ca nhan giua cac users
- Tuong thich voi kien truc hien tai (khong can thay doi Backend)
- Hoat dong giong cac chatbot lon nhu ChatGPT, Claude

**Trang thai:** SAN SANG DE DEPLOY VA TEST

---

**Chu ky:**
Team LMS Backend + Frontend
Ngay: 05/12/2025
