# Requirements Document - Teacher Portal UX/UI Enhancement

## Introduction

Dự án này tập trung vào việc cải thiện trải nghiệm người dùng (UX) và giao diện (UI) cho Teacher Portal trong LMS Maritime. Mục tiêu là tạo ra một giao diện chuyên nghiệp, đơn giản, dễ sử dụng theo phong cách Coursera/Udemy, đồng bộ hoàn toàn với Student Portal, đồng thời đảm bảo code dễ maintain và mở rộng.

**Design Philosophy:**
- Clean, minimal, professional (như Coursera/Udemy)
- Simple architecture, không over-engineering
- Focus on core features, bỏ advanced features không cần thiết
- Practical implementation, ưu tiên working code
- Đồng bộ với Student Portal về design system và components

## Glossary

- **Teacher Portal**: Giao diện dành cho giảng viên để quản lý khóa học, bài tập, học viên
- **LMS System**: Learning Management System - Hệ thống quản lý học tập
- **Page Component**: Smart component chứa business logic và state
- **UI Component**: Dumb component chỉ hiển thị và emit events
- **Service**: Class chứa business logic và API calls
- **Model**: TypeScript interface định nghĩa data structure
- **WCAG 2.1 AA**: Web Content Accessibility Guidelines - Tiêu chuẩn accessibility
- **Coursera Style**: Phong cách thiết kế chuyên nghiệp, clean, minimal của Coursera

## Requirements

### Requirement 1: Simple Architecture Implementation

**User Story:** As a developer, I want a simple, maintainable architecture for teacher portal, so that I can easily understand and modify the code

#### Acceptance Criteria

1. THE Teacher Portal SHALL organize code into Pages, Components, Services, and Models layers only
2. THE Teacher Portal SHALL use Page Components as smart containers that handle state and business logic
3. THE Teacher Portal SHALL use UI Components as presentational components that only display data and emit events
4. THE Teacher Portal SHALL use Services for API calls and business logic
5. THE Teacher Portal SHALL use TypeScript interfaces for data models without complex domain logic

### Requirement 2: Professional Dashboard Design

**User Story:** As a teacher, I want a clean, professional dashboard similar to Coursera, so that I can quickly see teaching statistics and access key functions

#### Acceptance Criteria

1. THE Dashboard SHALL display key metrics in KPI cards (Total Courses, Total Students, Pending Assignments, Average Rating)
2. THE Dashboard SHALL show recent courses list with clear visual hierarchy
3. THE Dashboard SHALL display pending assignments with submission status
4. THE Dashboard SHALL use professional icons (SVG) instead of emoji for all visual elements
5. THE Dashboard SHALL maintain consistent spacing, typography, and color scheme following Coursera style

### Requirement 3: Clean Course Management Interface

**User Story:** As a teacher, I want a simple course management interface, so that I can easily create and manage my courses

#### Acceptance Criteria

1. THE Course Management SHALL display courses in a clean table with essential information (Code, Title, Status, Students)
2. THE Course Management SHALL provide simple filtering by status (Active, Draft, Archived)
3. THE Course Management SHALL show action menu (⋮) with options (Edit, Manage Content, Publish, Delete)
4. THE Course Creation SHALL use clean form layout with inline validation
5. THE Course Editor SHALL provide clear section and lesson management UI

### Requirement 4: Simple Assignment Management

**User Story:** As a teacher, I want to easily create and manage assignments, so that I can assess student learning efficiently

#### Acceptance Criteria

1. THE Assignment List SHALL display assignments in a clean table with essential information (Title, Course, Due Date, Status, Submissions)
2. THE Assignment List SHALL provide simple filtering by status (Pending, Submitted, Graded)
3. THE Assignment Creation SHALL use clean form layout with date picker and rich text editor
4. THE Assignment Submissions SHALL show student submissions in a clear list format
5. THE Assignment Management SHALL use color coding for status (Green: Graded, Yellow: Pending, Blue: Submitted)

### Requirement 5: Straightforward Student Management

**User Story:** As a teacher, I want to easily view and monitor student progress, so that I can provide timely support

#### Acceptance Criteria

1. THE Student List SHALL display students in a clean table with essential information (Name, Email, Progress, Grade, Status)
2. THE Student List SHALL provide filtering by course and status
3. THE Student Detail SHALL show student information, enrolled courses, and performance data
4. THE Student Management SHALL use progress bars to visualize completion
5. THE Student Management SHALL use color coding for grades (Green: >8, Yellow: 6-8, Red: <6)

### Requirement 6: Simple Grading Interface

**User Story:** As a teacher, I want a simple grading interface, so that I can grade student work efficiently

#### Acceptance Criteria

1. THE Grading Interface SHALL display student submission clearly with file attachments and text content
2. THE Grading Interface SHALL provide grade input field with validation (0-10)
3. THE Grading Interface SHALL include feedback text area for comments
4. THE Grading Interface SHALL provide navigation buttons (Previous, Next Student)
5. THE Grading Interface SHALL show grading progress (X/Y graded)

### Requirement 7: Quiz Management

**User Story:** As a teacher, I want to create and manage quizzes, so that I can assess student knowledge

#### Acceptance Criteria

1. THE Quiz Bank SHALL display quizzes in a clean list/grid format
2. THE Quiz Creation SHALL provide simple form for quiz settings (title, time limit, questions)
3. THE Question Editor SHALL support multiple question types (MCQ, True/False, Essay)
4. THE Quiz Preview SHALL show quiz as students will see it
5. THE Quiz Management SHALL use clean, minimal design without complex features

### Requirement 8: Analytics Dashboard

**User Story:** As a teacher, I want to see teaching analytics, so that I can understand course performance

#### Acceptance Criteria

1. THE Analytics Dashboard SHALL display key metrics in KPI cards
2. THE Analytics Dashboard SHALL show course performance data
3. THE Analytics Dashboard SHALL display student engagement statistics
4. THE Analytics Dashboard SHALL use simple charts for data visualization
5. THE Analytics Dashboard SHALL maintain clean, professional design

### Requirement 9: Responsive Mobile Design

**User Story:** As a teacher, I want to access the portal on my mobile device, so that I can manage courses on the go

#### Acceptance Criteria

1. THE Teacher Portal SHALL display properly on mobile devices (320px - 768px width)
2. THE Teacher Portal SHALL use responsive grid layouts that stack vertically on mobile
3. THE Teacher Portal SHALL ensure all touch targets are at least 44x44px for easy tapping
4. THE Teacher Portal SHALL provide mobile-friendly navigation (bottom nav bar)
5. THE Teacher Portal SHALL transform tables to card layout on mobile

### Requirement 10: Basic Accessibility Support

**User Story:** As a teacher with disabilities, I want to access the portal using keyboard and screen readers, so that I can teach independently

#### Acceptance Criteria

1. THE Teacher Portal SHALL support full keyboard navigation for all interactive elements
2. THE Teacher Portal SHALL provide proper ARIA labels for icons and interactive elements
3. THE Teacher Portal SHALL maintain color contrast ratio of at least 4.5:1 for normal text
4. THE Teacher Portal SHALL use semantic HTML (headings, lists, buttons) for proper structure
5. THE Teacher Portal SHALL provide visible focus indicators for keyboard navigation

### Requirement 11: Simple State Management

**User Story:** As a developer, I want simple state management, so that I can easily track and update UI state

#### Acceptance Criteria

1. THE Teacher Portal SHALL use Angular Signals for reactive state management
2. THE Teacher Portal SHALL keep state in Page Components, not in complex state management libraries
3. THE Teacher Portal SHALL use Services to share state between components when needed
4. THE Teacher Portal SHALL avoid complex state patterns (Redux, NgRx) for simple CRUD operations
5. THE Teacher Portal SHALL use computed signals for derived state instead of manual calculations

### Requirement 12: Practical Error Handling

**User Story:** As a teacher, I want clear error messages when something goes wrong, so that I know what to do next

#### Acceptance Criteria

1. THE Teacher Portal SHALL display user-friendly error messages for common errors (network, authentication, validation)
2. THE Teacher Portal SHALL provide actionable error messages with suggestions
3. THE Teacher Portal SHALL show loading states during API calls to indicate progress
4. THE Teacher Portal SHALL handle errors gracefully without crashing the application
5. THE Teacher Portal SHALL provide retry buttons for recoverable errors

### Requirement 13: Performance Optimization

**User Story:** As a teacher, I want the portal to load quickly, so that I can start working without waiting

#### Acceptance Criteria

1. THE Teacher Portal SHALL load initial page in less than 2 seconds on 3G connection
2. THE Teacher Portal SHALL use lazy loading for routes to reduce initial bundle size
3. THE Teacher Portal SHALL optimize images using WebP format and appropriate sizes
4. THE Teacher Portal SHALL implement OnPush change detection for all components
5. THE Teacher Portal SHALL cache API responses to reduce redundant network requests

### Requirement 14: Consistent Visual Design

**User Story:** As a teacher, I want a consistent visual design across all pages, so that I can easily navigate and understand the interface

#### Acceptance Criteria

1. THE Teacher Portal SHALL use the same color palette as Student Portal (Blue primary, neutral grays)
2. THE Teacher Portal SHALL maintain consistent spacing using 8px grid system (8px, 16px, 24px, 32px)
3. THE Teacher Portal SHALL use consistent typography with clear hierarchy (headings, body, captions)
4. THE Teacher Portal SHALL use consistent component styles (buttons, cards, forms) across all pages
5. THE Teacher Portal SHALL follow Coursera design patterns for familiar user experience

### Requirement 15: Core Features Only (MVP)

**User Story:** As a product owner, I want to focus on core features first, so that we can deliver value quickly

#### Acceptance Criteria

1. THE Teacher Portal SHALL include only essential features: Dashboard, Courses, Assignments, Students, Quiz, Grading, Analytics
2. THE Teacher Portal SHALL exclude advanced features: Gamification, Advanced analytics, Social features, AI recommendations
3. THE Teacher Portal SHALL exclude complex features: Bulk operations, Advanced reporting, Custom workflows
4. THE Teacher Portal SHALL focus on working, tested code over perfect architecture
5. THE Teacher Portal SHALL prioritize features that directly support teaching workflow

---

**Document Version**: 1.0 (Simplified & Aligned with Student)  
**Created**: November 12, 2025  
**Status**: Ready for Implementation  
**Philosophy**: Simple, Professional, Practical, Consistent with Student Portal

