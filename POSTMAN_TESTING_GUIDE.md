# 📮 Video Progress API - Postman Testing Guide

Backend running on: **http://localhost:8088**

## 🔧 Setup Postman

1. Mở Postman
2. Create New Collection: "Video Progress API"
3. Tạo Environment với biến:
   - `baseUrl`: `http://localhost:8088/api/v1`
   - `token`: (sẽ set sau khi login)
   - `sectionId`: (sẽ lấy từ database)

## 📝 Step-by-Step Testing

---

## Step 1️⃣: Login để lấy JWT Token

**Request:**
```
POST {{baseUrl}}/auth/login
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "admin@lms.com",
  "password": "admin123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@lms.com",
    "role": "ADMIN"
  },
  "message": "Login successful"
}
```

**Actions:**
1. Copy giá trị `token` từ response
2. Set vào Postman Environment: `token = eyJhbGci...`
3. Copy `userId` để sử dụng sau

---

## Step 2️⃣: Lấy Section ID từ database

Vào Supabase SQL Editor và chạy:

```sql
SELECT id, title, type FROM sections WHERE type = 'VIDEO' LIMIT 5;
```

**Example result:**
```
id: 8b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e
title: "Introduction to Course"
type: VIDEO
```

Copy một `id` và set vào Postman Environment:
```
sectionId = 8b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e
```

---

## Step 3️⃣: Track Progress at 40% (Should NOT complete)

**Request:**
```
POST {{baseUrl}}/video-progress/track
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Headers:**
| Key | Value |
|-----|-------|
| Authorization | Bearer {{token}} |
| Content-Type | application/json |

**Body (raw JSON):**
```json
{
  "sectionId": "{{sectionId}}",
  "videoUrl": "https://pub-a9b1e20e911c45f69a1008c8a993fe7d.r2.dev/courses/intro.mp4",
  "currentPosition": 120,
  "duration": 300
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "some-uuid",
    "userId": "user-uuid",
    "sectionId": "{{sectionId}}",
    "videoUrl": "https://pub-a9b1e20e911c45f69a1008c8a993fe7d.r2.dev/courses/intro.mp4",
    "currentPosition": 120,
    "duration": 300,
    "progressPercentage": 40.00,
    "completed": false,  // ✅ Should be FALSE
    "lastWatchedAt": "2025-12-24T02:40:00",
    "completionDate": null
  },
  "message": null,
  "timestamp": "2025-12-24T02:40:00"
}
```

**Verify:**
- ✅ `progressPercentage = 40.00`
- ✅ `completed = false` (chưa đạt 75%)

---

## Step 4️⃣: Check Can Proceed (Should be FALSE at 40%)

**Request:**
```
GET {{baseUrl}}/video-progress/{{sectionId}}/can-proceed
Authorization: Bearer {{token}}
```

**Headers:**
| Key | Value |
|-----|-------|
| Authorization | Bearer {{token}} |

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "canProceed": false,  // ✅ Should be FALSE
    "currentProgress": 40.00,
    "message": "Watch 35% more to unlock next lesson"
  },
  "message": null,
  "timestamp": "2025-12-24T02:40:05"
}
```

**Verify:**
- ✅ `canProceed = false`
- ✅ Message hiển thị cần xem thêm 35%

---

## Step 5️⃣: Track Progress at 75% (Boundary Test)

**Request:**
```
POST {{baseUrl}}/video-progress/track
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "sectionId": "{{sectionId}}",
  "videoUrl": "https://pub-a9b1e20e911c45f69a1008c8a993fe7d.r2.dev/courses/intro.mp4",
  "currentPosition": 225,
  "duration": 300
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "progressPercentage": 75.00,
    "completed": true,  // ✅ Should be TRUE (exactly at threshold)
    "completionDate": "2025-12-24T02:40:10"
  }
}
```

**Verify:**
- ✅ `progressPercentage = 75.00`
- ✅ `completed = true` (đúng ngưỡng 75%)
- ✅ `completionDate` có giá trị

---

## Step 6️⃣: Check Can Proceed (Should be TRUE at 75%)

**Request:**
```
GET {{baseUrl}}/video-progress/{{sectionId}}/can-proceed
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "canProceed": true,  // ✅ Should be TRUE
    "currentProgress": 75.00,
    "message": "You can proceed to the next lesson"
  }
}
```

**Verify:**
- ✅ `canProceed = true`
- ✅ Message cho phép tiếp tục

---

## Step 7️⃣: Track Progress at 80% (Full Test)

**Request:**
```
POST {{baseUrl}}/video-progress/track
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "sectionId": "{{sectionId}}",
  "videoUrl": "https://pub-a9b1e20e911c45f69a1008c8a993fe7d.r2.dev/courses/intro.mp4",
  "currentPosition": 240,
  "duration": 300
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "progressPercentage": 80.00,
    "completed": true,  // ✅ Still TRUE
    "completionDate": "2025-12-24T02:40:10"  // Same as step 5
  }
}
```

**Verify:**
- ✅ `progressPercentage = 80.00`
- ✅ `completed` vẫn là `true`
- ✅ `completionDate` không thay đổi (lưu lần đầu đạt 75%)

---

## Step 8️⃣: Get Progress Details

**Request:**
```
GET {{baseUrl}}/video-progress/{{sectionId}}
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "progress-uuid",
    "userId": "user-uuid",
    "sectionId": "{{sectionId}}",
    "videoUrl": "https://pub-a9b1e20e911c45f69a1008c8a993fe7d.r2.dev/courses/intro.mp4",
    "currentPosition": 240,  // Last position
    "duration": 300,
    "progressPercentage": 80.00,
    "completed": true,
    "lastWatchedAt": "2025-12-24T02:40:15",
    "completionDate": "2025-12-24T02:40:10"  // First time reached 75%
  }
}
```

**Verify:**
- ✅ Hiển thị đầy đủ thông tin progress
- ✅ `currentPosition` là vị trí cuối cùng tracked

---

## Step 9️⃣: Get All User Progress

**Request:**
```
GET {{baseUrl}}/video-progress/my-progress
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "progress-1-uuid",
      "sectionId": "section-1-uuid",
      "progressPercentage": 80.00,
      "completed": true
    },
    {
      "id": "progress-2-uuid",
      "sectionId": "section-2-uuid",
      "progressPercentage": 45.00,
      "completed": false
    }
  ]
}
```

**Verify:**
- ✅ Hiển thị tất cả progress của user hiện tại
- ✅ Sorted by `lastWatchedAt DESC` (mới nhất trước)

---

## Step 🔟: Reset Progress (Optional)

**Request:**
```
DELETE {{baseUrl}}/video-progress/{{sectionId}}
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Progress reset successfully"
}
```

**Actions:**
- Sau khi reset, có thể test lại từ Step 3

---

## 🧪 Test Scenarios

### ✅ Scenario 1: New User First Watch
1. Login
2. Track 20% → `completed = false`
3. Check can proceed → `false`
4. Track 50% → `completed = false`
5. Check can proceed → `false`
6. Track 76% → `completed = true` ✅
7. Check can proceed → `true` ✅

### ✅ Scenario 2: Resume Watching
1. Get progress → `currentPosition = 120`
2. Frontend video player seeks to 120s
3. Continue watching and track

### ✅ Scenario 3: Multiple Sections
1. Track section A to 80% → completed
2. Track section B to 40% → not completed
3. Get all progress → shows both

### ✅ Scenario 4: Boundary Test
- 74.9% → `completed = false`
- 75.0% → `completed = true` ✅
- 75.1% → `completed = true`

---

## 🎯 Success Criteria

| Test | Expected | Pass/Fail |
|------|----------|-----------|
| Login works | Get JWT token | ☐ |
| Track 40% | `completed = false` | ☐ |
| Can proceed at 40% | `false` | ☐ |
| Track 75% | `completed = true` | ☐ |
| Can proceed at 75% | `true` | ☐ |
| Get progress | Show details | ☐ |
| Get all progress | Show list | ☐ |
| Reset progress | Delete success | ☐ |

---

## 🐛 Troubleshooting

### 401 Unauthorized
- Token expired hoặc invalid
- Login lại để lấy token mới

### 404 Not Found
- `sectionId` không tồn tại trong database
- Check lại section ID trong Supabase

### 400 Bad Request
- Body JSON format sai
- Check field names: `currentPosition`, `duration`, `sectionId`

### 500 Internal Server Error
- Check backend logs
- Verify database connection
- Check `video_progress` table exists

---

## 📊 Verify trong Database

Sau khi test, kiểm tra trong Supabase:

```sql
-- Check progress record
SELECT * FROM video_progress 
WHERE user_id = 'your-user-uuid'
ORDER BY last_watched_at DESC;

-- Check completed videos
SELECT 
  vp.*,
  s.title as section_title
FROM video_progress vp
JOIN sections s ON vp.section_id = s.id
WHERE vp.completed = true
ORDER BY vp.completion_date DESC;
```

---

## 🚀 Import Postman Collection (Optional)

Save this as `video-progress-api.postman_collection.json`:

```json
{
  "info": {
    "name": "Video Progress API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Login",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "url": "{{baseUrl}}/auth/login",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"admin@lms.com\",\n  \"password\": \"admin123\"\n}"
        }
      }
    },
    {
      "name": "2. Track Progress 40%",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": "{{baseUrl}}/video-progress/track",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"sectionId\": \"{{sectionId}}\",\n  \"videoUrl\": \"https://pub-a9b1e20e911c45f69a1008c8a993fe7d.r2.dev/test.mp4\",\n  \"currentPosition\": 120,\n  \"duration\": 300\n}"
        }
      }
    },
    {
      "name": "3. Check Can Proceed",
      "request": {
        "method": "GET",
        "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
        "url": "{{baseUrl}}/video-progress/{{sectionId}}/can-proceed"
      }
    }
  ]
}
```

Import vào Postman: File → Import → Paste JSON

---

**Ready to test!** 🚀

Start với Step 1 (Login), sau đó test từng bước theo thứ tự.
