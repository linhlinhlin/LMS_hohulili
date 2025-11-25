# 🎉 Teacher Student List API - NOW LIVE!

**Status:** ✅ **IMPLEMENTED & READY TO USE**  
**Date:** November 12, 2025  
**Backend Port:** 8088  

---

## 📢 Announcement

**The Teacher Student List API has been successfully implemented!**

Teachers can now retrieve the list of students enrolled in their courses directly via API. This document provides complete integration details for the frontend team.

---

## 🔗 API Endpoint

### Get Course Students

```
GET /api/v1/courses/{courseId}/students
```

**Authentication:** ✅ Required (JWT Bearer Token)  
**Authorization:** ✅ TEACHER or ADMIN role (Course teacher only)  
**Port:** 8088

---

## 📋 Request Parameters

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `courseId` | UUID | Yes | The course ID to fetch students from |

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | Integer | 0 | Page number (0-indexed) |
| `size` | Integer | 20 | Number of items per page |
| `search` | String | Optional | Search by student name or email |

### Headers
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

---

## ✅ Full Request Examples

### Example 1: Get All Students (No Search)

```bash
curl -X GET "http://localhost:8088/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/students?page=0&size=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**PowerShell:**
```powershell
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    "Content-Type" = "application/json"
}

$response = Invoke-WebRequest -Uri "http://localhost:8088/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/students?page=0&size=20" `
    -Method GET `
    -Headers $headers

$response.Content | ConvertFrom-Json
```

**JavaScript/Fetch:**
```javascript
const courseId = '550e8400-e29b-41d4-a716-446655440000';
const token = localStorage.getItem('authToken');

const response = await fetch(
    `http://localhost:8088/api/v1/courses/${courseId}/students?page=0&size=20`,
    {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    }
);

const data = await response.json();
console.log(data);
```

### Example 2: Search Students by Name

```bash
curl -X GET "http://localhost:8088/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/students?page=0&size=20&search=Nguyen" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**JavaScript with Search:**
```javascript
const searchTerm = 'Nguyen';
const response = await fetch(
    `http://localhost:8088/api/v1/courses/${courseId}/students?page=0&size=20&search=${encodeURIComponent(searchTerm)}`,
    {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    }
);

const data = await response.json();
```

### Example 3: Pagination

```bash
# Page 2 (items 21-40)
curl -X GET "http://localhost:8088/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/students?page=1&size=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

---

## 📤 Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "fullName": "Nguyễn Văn A",
        "email": "student1@example.com",
        "role": "STUDENT",
        "status": "ACTIVE",
        "progressPercentage": 65,
        "lessonsCompleted": 13,
        "totalLessons": 20,
        "quizScore": null,
        "assignmentScore": null,
        "lastActivityAt": null
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440011",
        "fullName": "Nguyễn Văn B",
        "email": "student2@example.com",
        "role": "STUDENT",
        "status": "ACTIVE",
        "progressPercentage": 45,
        "lessonsCompleted": 9,
        "totalLessons": 20,
        "quizScore": null,
        "assignmentScore": null,
        "lastActivityAt": null
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440012",
        "fullName": "Nguyễn Văn C",
        "email": "student3@example.com",
        "role": "STUDENT",
        "status": "ACTIVE",
        "progressPercentage": 80,
        "lessonsCompleted": 16,
        "totalLessons": 20,
        "quizScore": null,
        "assignmentScore": null,
        "lastActivityAt": null
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 20,
      "totalElements": 42,
      "totalPages": 3,
      "numberOfElements": 20,
      "first": true,
      "last": false,
      "empty": false
    }
  },
  "message": null
}
```

### Success Response Fields

```typescript
{
  success: boolean,           // Always true for successful responses
  data: {
    content: StudentEnrollmentDetail[],  // Array of students
    pageable: {
      pageNumber: number,     // Current page (0-indexed)
      pageSize: number,       // Items per page
      totalElements: number,  // Total students in course
      totalPages: number,     // Total pages available
      numberOfElements: number, // Items in this page
      first: boolean,         // Is this first page?
      last: boolean,          // Is this last page?
      empty: boolean          // Is list empty?
    }
  },
  message: string | null
}
```

### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "data": null,
  "message": "Bạn không có quyền xem danh sách học viên của khóa học này"
}
```

**Status Code:** 403 (Forbidden)

### Error Response (404 Not Found)

```json
{
  "success": false,
  "data": null,
  "message": "Khóa học không tồn tại"
}
```

**Status Code:** 404

---

## 🎯 Student Enrollment Detail DTO

Each student in the response has the following structure:

```typescript
interface StudentEnrollmentDetail {
  id: string;                    // Student UUID
  fullName: string;              // Student's full name
  email: string;                 // Student's email address
  role: string;                  // "STUDENT"
  status: string;                // "ACTIVE", "DROPPED", or "COMPLETED"
  progressPercentage: number;    // 0-100 (% of course completed)
  lessonsCompleted: number;      // Number of lessons completed
  totalLessons: number;          // Total lessons in course
  quizScore: number | null;      // Quiz score percentage (if any)
  assignmentScore: number | null; // Assignment score percentage (if any)
  lastActivityAt: string | null; // ISO timestamp of last activity
}
```

---

## 💻 Frontend Integration Examples

### React Component Example

```javascript
import React, { useState, useEffect } from 'react';

function CourseStudentsList({ courseId, token }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const pageSize = 20;

  useEffect(() => {
    fetchStudents();
  }, [page, search, courseId, token]);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const url = `http://localhost:8088/api/v1/courses/${courseId}/students?page=${page}&size=${pageSize}${searchParam}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setStudents(data.data.content);
      } else {
        setError(data.message || 'Failed to fetch students');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div>
      <h2>Course Students</h2>
      
      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
        style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
      />

      {/* Students Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Progress</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Lessons</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px' }}>{student.fullName}</td>
              <td style={{ padding: '12px' }}>{student.email}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                {student.progressPercentage}%
              </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                {student.lessonsCompleted}/{student.totalLessons}
              </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: student.status === 'ACTIVE' ? '#4CAF50' : '#999',
                  color: 'white',
                  fontSize: '12px'
                }}>
                  {student.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button 
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          style={{ padding: '8px 16px', marginRight: '8px' }}
        >
          Previous
        </button>
        <span style={{ margin: '0 16px' }}>
          Page {page + 1}
        </span>
        <button 
          onClick={() => setPage(page + 1)}
          style={{ padding: '8px 16px' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default CourseStudentsList;
```

### Vue 3 Component Example

```vue
<template>
  <div class="course-students">
    <h2>Course Students</h2>
    
    <!-- Search Bar -->
    <input
      v-model="search"
      type="text"
      placeholder="Search by name or email..."
      @input="handleSearch"
      class="search-input"
    />

    <!-- Loading State -->
    <div v-if="loading" class="loading">Loading...</div>

    <!-- Error State -->
    <div v-if="error" class="error">{{ error }}</div>

    <!-- Students Table -->
    <table v-if="students.length > 0" class="students-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Progress</th>
          <th>Lessons</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="student in students" :key="student.id">
          <td>{{ student.fullName }}</td>
          <td>{{ student.email }}</td>
          <td class="center">{{ student.progressPercentage }}%</td>
          <td class="center">{{ student.lessonsCompleted }}/{{ student.totalLessons }}</td>
          <td class="center">
            <span :class="['badge', student.status.toLowerCase()]">
              {{ student.status }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Pagination -->
    <div class="pagination">
      <button 
        @click="prevPage"
        :disabled="page === 0"
      >
        Previous
      </button>
      <span>Page {{ page + 1 }}</span>
      <button @click="nextPage">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  courseId: String,
  token: String
});

const students = ref([]);
const loading = ref(false);
const error = ref(null);
const page = ref(0);
const search = ref('');
const pageSize = 20;

const fetchStudents = async () => {
  loading.value = true;
  error.value = null;
  try {
    const searchParam = search.value ? `&search=${encodeURIComponent(search.value)}` : '';
    const url = `http://localhost:8088/api/v1/courses/${props.courseId}/students?page=${page.value}&size=${pageSize}${searchParam}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${props.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (data.success) {
      students.value = data.data.content;
    } else {
      error.value = data.message || 'Failed to fetch students';
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  page.value = 0;
  fetchStudents();
};

const prevPage = () => {
  if (page.value > 0) {
    page.value--;
    fetchStudents();
  }
};

const nextPage = () => {
  page.value++;
  fetchStudents();
};

onMounted(fetchStudents);
</script>

<style scoped>
.search-input {
  width: 100%;
  padding: 8px;
  margin-bottom: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.students-table {
  width: 100%;
  border-collapse: collapse;
}

.students-table th {
  background-color: #f5f5f5;
  padding: 12px;
  text-align: left;
  border-bottom: 2px solid #ddd;
}

.students-table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.center {
  text-align: center;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
}

.badge.active {
  background-color: #4CAF50;
}

.badge.inactive {
  background-color: #999;
}

.pagination {
  margin-top: 20px;
  text-align: center;
}

.pagination button {
  padding: 8px 16px;
  margin: 0 8px;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  padding: 20px;
  text-align: center;
  color: #666;
}

.error {
  padding: 12px;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 4px;
}
</style>
```

---

## 🔒 Authorization & Security

### Role-Based Access

✅ **ALLOWED:**
- **TEACHER**: Can view students in their own courses
- **ADMIN**: Can view students in any course

❌ **NOT ALLOWED:**
- **STUDENT**: Cannot access this endpoint
- **TEACHER**: Cannot view students in courses they don't teach
- **Unauthenticated users**: Must provide valid JWT token

### Example Error Response (403 Forbidden)

```json
{
  "success": false,
  "data": null,
  "message": "Bạn không có quyền xem danh sách học viên của khóa học này"
}
```

---

## 📊 Pagination Details

### How Pagination Works

- **page**: 0-indexed (0 = first page, 1 = second page, etc.)
- **size**: Number of items per page (default: 20)
- **totalElements**: Total number of students in course
- **totalPages**: Total number of pages available

### Example: Get 3rd Page with 10 Items Per Page

```bash
curl -X GET "http://localhost:8088/api/v1/courses/{courseId}/students?page=2&size=10"
```

This returns items 21-30 from the total list.

---

## 🔍 Search Feature

### Search Behavior

- Case-insensitive search
- Searches in both `fullName` and `email` fields
- Partial match (e.g., search "ngu" matches "Nguyễn")

### Examples

**Search by Name:**
```
GET /api/v1/courses/{courseId}/students?search=Nguyễn
```

**Search by Email:**
```
GET /api/v1/courses/{courseId}/students?search=student@example.com
```

**Combine Search with Pagination:**
```
GET /api/v1/courses/{courseId}/students?search=Nguyễn&page=0&size=20
```

---

## 🧪 Testing the API

### Using Postman

1. **Open Postman**
2. **Create New Request:**
   - Method: `GET`
   - URL: `http://localhost:8088/api/v1/courses/{courseId}/students?page=0&size=20`
3. **Add Authorization Header:**
   - Key: `Authorization`
   - Value: `Bearer {YOUR_JWT_TOKEN}`
4. **Click Send**

### Using cURL

```bash
TOKEN="your_jwt_token_here"
COURSE_ID="550e8400-e29b-41d4-a716-446655440000"

curl -X GET "http://localhost:8088/api/v1/courses/$COURSE_ID/students?page=0&size=20" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Using JavaScript Console

```javascript
const courseId = '550e8400-e29b-41d4-a716-446655440000';
const token = localStorage.getItem('authToken');

fetch(`http://localhost:8088/api/v1/courses/${courseId}/students?page=0&size=20`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log(data))
.catch(e => console.error(e));
```

---

## 🛠️ Common Integration Patterns

### Pattern 1: Service Layer Abstraction

```javascript
// studentService.js
class StudentService {
  constructor(apiBaseUrl, token) {
    this.apiBaseUrl = apiBaseUrl;
    this.token = token;
  }

  async getCourseStudents(courseId, page = 0, size = 20, search = '') {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const url = `${this.apiBaseUrl}/api/v1/courses/${courseId}/students?page=${page}&size=${size}${searchParam}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch students: ${response.status}`);
    }

    return response.json();
  }

  async searchStudents(courseId, searchTerm) {
    return this.getCourseStudents(courseId, 0, 20, searchTerm);
  }
}

// Usage
const service = new StudentService('http://localhost:8088', token);
const result = await service.getCourseStudents(courseId);
```

### Pattern 2: React Hook

```javascript
// useStudents.js
import { useState, useEffect } from 'react';

function useStudents(courseId, token) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchStudents = async (pageNum = 0, searchTerm = '') => {
    setLoading(true);
    try {
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const response = await fetch(
        `http://localhost:8088/api/v1/courses/${courseId}/students?page=${pageNum}&size=20${searchParam}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setStudents(data.data.content);
        setTotalPages(data.data.pageable.totalPages);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(page);
  }, [courseId, token, page]);

  return {
    students,
    loading,
    error,
    page,
    setPage,
    totalPages,
    fetchStudents
  };
}

// Usage in component
function StudentsList({ courseId, token }) {
  const { students, loading, error, page, setPage } = useStudents(courseId, token);

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {students.map(s => (
          <li key={s.id}>{s.fullName} ({s.email})</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## ✨ What's Changed (Backend Implementation)

### Files Created/Modified

1. **NEW:** `src/main/java/com/example/lms/dto/response/StudentEnrollmentDetail.java`
   - DTO for student enrollment details
   - Fields: id, fullName, email, role, status, progressPercentage, etc.

2. **MODIFIED:** `src/main/java/com/example/lms/repository/CourseRepository.java`
   - Added `findEnrolledStudents()` - Get paginated students
   - Added `searchEnrolledStudents()` - Search students by name/email

3. **MODIFIED:** `src/main/java/com/example/lms/service/CourseService.java`
   - Added `getCourseStudents()` - Service method for fetching students with search support

4. **MODIFIED:** `src/main/java/com/example/lms/controller/CourseController.java`
   - Added `GET /api/v1/courses/{courseId}/students` endpoint
   - Authorization check (teacher/admin only)
   - Pagination and search support

### Build Status

✅ **Compile:** SUCCESS  
✅ **Backend Start:** SUCCESS  
✅ **Health Check:** UP

---

## 🚀 Next Steps for Frontend Team

1. **Update StudentService** to use the new endpoint
2. **Build Student List Component** with pagination and search
3. **Add to Teacher Dashboard** for course management
4. **Test with real data** after integration

---

## 📞 Support & Questions

For any issues or questions about this API:

1. Check this documentation first
2. Review the code examples above
3. Test using cURL or Postman
4. Check backend logs: `mvn spring-boot:run`

---

## 🎯 Success Criteria

✅ API Endpoint Created: `/api/v1/courses/{courseId}/students`  
✅ Pagination Support: Yes (page, size parameters)  
✅ Search Support: Yes (search by name/email)  
✅ Authorization: Yes (teacher/admin only)  
✅ DTO Created: `StudentEnrollmentDetail`  
✅ Backend Running: Yes (port 8088)  
✅ Compilation: Successful  
✅ Documentation: Complete  

---

**API Status: 🟢 LIVE & READY**

**Last Updated:** November 12, 2025, 11:09 AM  
**Backend Port:** 8088  
**API Version:** v1
