# 📱 Frontend Integration Guide - Lấy Khóa Học & Bài Giảng

> Hướng dẫn nhanh gọn cho frontend developer về cách gọi API để lấy khóa học và bài giảng

---

## 🎯 Quick Start

### 1. Học Sinh - Danh Sách Khóa Học Đã Đăng Ký

**Endpoint:** `GET /api/v1/courses/enrolled-courses`

**JavaScript/Fetch:**
```javascript
async function getEnrolledCourses(page = 1, limit = 10) {
  const token = localStorage.getItem('authToken'); // Lấy JWT từ localStorage
  
  const response = await fetch(
    `http://localhost:8089/api/v1/courses/enrolled-courses?page=${page}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.data; // { content: [...], pageable: {...}, totalPages: ... }
}

// Sử dụng
try {
  const courses = await getEnrolledCourses(1, 10);
  console.log('Khóa học đã đăng ký:', courses.content);
  console.log('Tổng số trang:', courses.totalPages);
} catch (error) {
  console.error('Lỗi:', error);
}
```

**React Hook:**
```jsx
import { useState, useEffect } from 'react';

function EnrolledCoursesList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(
          `http://localhost:8089/api/v1/courses/enrolled-courses?page=${page}&limit=10`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const { data } = await response.json();
        setCourses(data.content);
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error('Lỗi:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [page]);

  if (loading) return <div>Đang tải...</div>;

  return (
    <div>
      <h1>Khóa Học Của Tôi</h1>
      <div className="courses-grid">
        {courses.map(course => (
          <div key={course.id} className="course-card">
            <h3>{course.title}</h3>
            <p>{course.description}</p>
            <p>👨‍🏫 {course.teacher.fullName}</p>
            <p>📊 {course.enrolledCount} học sinh | {course.lessonCount} bài giảng</p>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button 
          disabled={page === 1} 
          onClick={() => setPage(page - 1)}
        >
          Trước
        </button>
        <span>Trang {page} / {totalPages}</span>
        <button 
          disabled={page === totalPages} 
          onClick={() => setPage(page + 1)}
        >
          Tiếp
        </button>
      </div>
    </div>
  );
}

export default EnrolledCoursesList;
```

---

### 2. Giáo Viên - Danh Sách Khóa Học Của Mình

**Endpoint:** `GET /api/v1/courses/my-courses`

**JavaScript:**
```javascript
async function getMyCourses(page = 1, limit = 10) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `http://localhost:8089/api/v1/courses/my-courses?page=${page}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data.data;
}

// Sử dụng
getMyCourses().then(courses => {
  courses.content.forEach(course => {
    console.log(`${course.title} - ${course.enrolledCount} học sinh`);
  });
});
```

**Vue 3 Composition API:**
```vue
<template>
  <div class="teacher-courses">
    <h1>Khóa Học Của Tôi</h1>
    
    <div v-if="loading" class="loader">Đang tải...</div>
    <div v-else-if="courses.length === 0" class="empty">
      Bạn chưa tạo khóa học nào
    </div>
    <div v-else class="courses-list">
      <div v-for="course in courses" :key="course.id" class="course-item">
        <h3>{{ course.title }}</h3>
        <p>{{ course.description }}</p>
        <div class="course-meta">
          <span>👥 {{ course.enrolledCount }} học sinh</span>
          <span>📚 {{ course.lessonCount }} bài giảng</span>
          <span>📄 {{ course.sectionCount }} chương</span>
        </div>
        <router-link :to="`/courses/${course.id}`" class="btn-view">
          Xem Chi Tiết
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const courses = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(
      'http://localhost:8089/api/v1/courses/my-courses',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const { data } = await response.json();
    courses.value = data.content;
  } catch (error) {
    console.error('Lỗi:', error);
  } finally {
    loading.value = false;
  }
});
</script>
```

---

### 3. Lấy Cấu Trúc Khóa Học (Sections + Lessons)

**Endpoint:** `GET /api/v1/courses/{courseId}/content`

**JavaScript:**
```javascript
async function getCourseContent(courseId) {
  const response = await fetch(
    `http://localhost:8089/api/v1/courses/${courseId}/content`
  );
  
  const { data } = await response.json();
  return data; // { sections: [...], title: "...", ... }
}

// Sử dụng
getCourseContent('550e8400-e29b-41d4-a716-446655440000').then(course => {
  console.log('Khóa học:', course.title);
  console.log('Số chương:', course.sections.length);
  
  course.sections.forEach(section => {
    console.log(`📖 ${section.title}`);
    section.lessons.forEach(lesson => {
      console.log(`  - ${lesson.title} (${lesson.durationMinutes} phút)`);
    });
  });
});
```

**React Component:**
```jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function CourseContent() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    fetch(`http://localhost:8089/api/v1/courses/${courseId}/content`)
      .then(res => res.json())
      .then(({ data }) => setCourse(data))
      .catch(err => console.error('Lỗi:', err));
  }, [courseId]);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  if (!course) return <div>Đang tải...</div>;

  return (
    <div className="course-content">
      <h1>{course.title}</h1>
      <p>{course.description}</p>

      {course.sections.map(section => (
        <div key={section.id} className="section">
          <div 
            className="section-header"
            onClick={() => toggleSection(section.id)}
          >
            <span className="toggle">
              {expandedSections[section.id] ? '▼' : '▶'}
            </span>
            <h2>{section.title}</h2>
            <span className="lesson-count">({section.lessonsCount} bài)</span>
          </div>

          {expandedSections[section.id] && (
            <div className="lessons">
              {section.lessons.map(lesson => (
                <div key={lesson.id} className="lesson">
                  <div className="lesson-icon">
                    {lesson.lessonType === 'LECTURE' && '📚'}
                    {lesson.lessonType === 'QUIZ' && '❓'}
                    {lesson.lessonType === 'ASSIGNMENT' && '✏️'}
                  </div>
                  <div className="lesson-info">
                    <h4>{lesson.title}</h4>
                    <p>{lesson.description}</p>
                    <small>⏱ {lesson.durationMinutes} phút</small>
                  </div>
                  <button 
                    onClick={() => navigateToLesson(lesson.id)}
                    className="btn-view"
                  >
                    Xem
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

### 4. Lấy Chi Tiết Bài Giảng

**Endpoint:** `GET /api/v1/courses/sections/lessons/{lessonId}`

**JavaScript:**
```javascript
async function getLessonDetail(lessonId, token) {
  const response = await fetch(
    `http://localhost:8089/api/v1/courses/sections/lessons/${lessonId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const { data } = await response.json();
  return data;
}

// Sử dụng
getLessonDetail('550e8400-e29b-41d4-a716-446655440003', token).then(lesson => {
  console.log('Bài giảng:', lesson.title);
  console.log('Nội dung HTML:', lesson.content);
  console.log('Video URL:', lesson.videoUrl);
  console.log('Tài liệu đính kèm:', lesson.attachments);
});
```

**React Component:**
```jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function LessonDetail() {
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    fetch(
      `http://localhost:8089/api/v1/courses/sections/lessons/${lessonId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )
      .then(res => res.json())
      .then(({ data }) => setLesson(data))
      .catch(err => console.error('Lỗi:', err));
  }, [lessonId]);

  if (!lesson) return <div>Đang tải...</div>;

  return (
    <div className="lesson-detail">
      <h1>{lesson.title}</h1>
      <p className="breadcrumb">
        {lesson.courseTitle} → {lesson.sectionTitle}
      </p>

      {/* Video */}
      {lesson.videoUrl && (
        <div className="video-container">
          <video controls width="100%">
            <source src={lesson.videoUrl} type="video/mp4" />
            Trình duyệt của bạn không hỗ trợ video
          </video>
        </div>
      )}

      {/* Nội Dung */}
      <div className="lesson-content">
        <h2>Nội Dung Bài Giảng</h2>
        <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
      </div>

      {/* Tài Liệu Đính Kèm */}
      {lesson.attachments.length > 0 && (
        <div className="attachments">
          <h3>Tài Liệu Đính Kèm</h3>
          <ul>
            {lesson.attachments.map(attachment => (
              <li key={attachment.id}>
                <a href={attachment.fileUrl} download>
                  📎 {attachment.fileName} ({(attachment.fileSize / 1024 / 1024).toFixed(2)} MB)
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata */}
      <div className="metadata">
        <p>⏱ Thời lượng: {lesson.durationMinutes} phút</p>
        <p>📅 Cập nhật: {new Date(lesson.updatedAt).toLocaleDateString('vi-VN')}</p>
      </div>
    </div>
  );
}
```

---

## 🔄 API Response Structure

### Paginated Response
```javascript
{
  success: true,
  message: "Success",
  data: {
    content: [...],           // Mảng items
    pageable: {...},          // Thông tin pagination
    totalPages: 5,            // Tổng số trang
    totalElements: 47,        // Tổng số items
    first: true,              // Trang đầu tiên?
    last: false,              // Trang cuối cùng?
    size: 10,                 // Items trên mỗi trang
    number: 0,                // Số trang hiện tại (0-indexed)
    numberOfElements: 10,     // Số items trên trang này
    empty: false              // Danh sách rỗng?
  },
  timestamp: "2025-11-12T10:30:00Z"
}
```

### Non-Paginated Response
```javascript
{
  success: true,
  message: "Success",
  data: {
    // Object data trực tiếp
    id: "...",
    title: "...",
    ...
  },
  timestamp: "2025-11-12T10:30:00Z"
}
```

---

## ⚠️ Error Handling

```javascript
async function apiCall(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    // Kiểm tra status code
    if (!response.ok) {
      if (response.status === 401) {
        // Token hết hạn - redirect to login
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        throw new Error('Token hết hạn. Vui lòng đăng nhập lại.');
      }
      if (response.status === 403) {
        throw new Error('Bạn không có quyền truy cập tài nguyên này');
      }
      if (response.status === 404) {
        throw new Error('Không tìm thấy tài nguyên');
      }
      if (response.status === 400) {
        throw new Error('Dữ liệu không hợp lệ');
      }
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Lỗi không xác định');
    }

    return data.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Sử dụng
try {
  const courses = await apiCall('http://localhost:8089/api/v1/courses/enrolled-courses');
  console.log(courses);
} catch (error) {
  console.error('Lỗi:', error.message);
  // Hiển thị toast/notification cho user
}
```

---

## 🎬 Complete Workflow Example

```javascript
// Flow: Học sinh xem khóa học → Xem cấu trúc → Xem bài giảng chi tiết

class CourseManager {
  constructor(baseUrl = 'http://localhost:8089', token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async fetchAPI(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    const { data } = await response.json();
    return data;
  }

  async getEnrolledCourses(page = 1) {
    return this.fetchAPI(`/api/v1/courses/enrolled-courses?page=${page}&limit=10`);
  }

  async getCourseContent(courseId) {
    return this.fetchAPI(`/api/v1/courses/${courseId}/content`);
  }

  async getLessonDetail(lessonId) {
    return this.fetchAPI(`/api/v1/courses/sections/lessons/${lessonId}`);
  }
}

// Sử dụng
const manager = new CourseManager('http://localhost:8089', authToken);

// Bước 1: Lấy khóa học đã đăng ký
const enrolledCourses = await manager.getEnrolledCourses();
const selectedCourse = enrolledCourses.content[0];

// Bước 2: Lấy cấu trúc khóa học
const courseContent = await manager.getCourseContent(selectedCourse.id);
const firstSection = courseContent.sections[0];
const firstLesson = firstSection.lessons[0];

// Bước 3: Lấy chi tiết bài giảng
const lessonDetail = await manager.getLessonDetail(firstLesson.id);
console.log('Bài giảng:', lessonDetail.title);
console.log('Video:', lessonDetail.videoUrl);
console.log('Tài liệu:', lessonDetail.attachments);
```

---

## 🚀 Environment Configuration

```javascript
// config.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8089';
const API_TIMEOUT = 30000; // 30 seconds

export const API_ENDPOINTS = {
  ENROLLED_COURSES: '/api/v1/courses/enrolled-courses',
  MY_COURSES: '/api/v1/courses/my-courses',
  COURSE_CONTENT: (courseId) => `/api/v1/courses/${courseId}/content`,
  LESSON_DETAIL: (lessonId) => `/api/v1/courses/sections/lessons/${lessonId}`,
  COURSE_DETAIL: (courseId) => `/api/v1/courses/${courseId}`
};

export default {
  API_BASE_URL,
  API_TIMEOUT,
  API_ENDPOINTS
};
```

**.env file:**
```
REACT_APP_API_URL=http://localhost:8089
REACT_APP_AUTH_TOKEN_KEY=authToken
```

---

**Cập nhật lần cuối:** 12/11/2025  
**Backend Port:** 8089  
**API Version:** v1
